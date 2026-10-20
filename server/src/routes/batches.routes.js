import express from 'express';
import { supabase } from '../config/supabase.js';
import {
  CURRENT_SCHEMA_VERSION,
  buildCanonicalBatchPayload,
  generateSHA256Hash,
  verifyBatchIntegrity,
  canonicalJsonStringify,
  to0xHash,
} from '../utils/hash.js';
import { getStoredBatches, findStoredBatch, upsertStoredBatch } from '../data/batchesStore.js';

const router = express.Router();

/**
 * Generate a unique application batch code.
 * Format: PJG-YYYYMMDD-XXXX (e.g. PJG-20261020-4F8A)
 */
function generateUniqueBatchCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');
  return `PJG-${dateStr}-${randomHex}`;
}

/**
 * GET /api/batches/generate-code
 * Utility to generate a unique batch code for the client.
 */
router.get('/generate-code', (req, res) => {
  let code = generateUniqueBatchCode();
  // Ensure it doesn't collide with existing stored batches
  while (findStoredBatch(code)) {
    code = generateUniqueBatchCode();
  }
  res.json({ batchCode: code });
});

/**
 * GET /api/batches
 * List batches with optional filters: status, producerId, limit, page
 */
router.get('/', async (req, res) => {
  const { status, producerId, limit = 50, page = 1 } = req.query;

  let dbBatches = [];
  let dbCount = 0;

  // 1. Try querying Supabase
  if (supabase) {
    try {
      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      let query = supabase
        .from('batches')
        .select(
          `*, producer:profiles!batches_producer_id_fkey(id, full_name, organization_name, wallet_address),
           farm:farms(id, farm_name, region, state)`,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to);

      if (status) query = query.eq('status', status);
      if (producerId) query = query.eq('producer_id', producerId);

      const { data, error, count } = await query;
      if (!error && Array.isArray(data)) {
        dbBatches = data;
        dbCount = count || data.length;
      }
    } catch (err) {
      console.warn('[batches] Supabase select notice:', err.message);
    }
  }

  // 2. Fetch local persistent batches
  const localBatches = getStoredBatches();

  // 3. Merge without duplicates (Supabase takes precedence, local batches fill in)
  const seenCodes = new Set(dbBatches.map((b) => (b.batch_number || b.batchId || '').toUpperCase()));
  const merged = [...dbBatches];

  for (const b of localBatches) {
    const code = (b.batch_number || b.batchId || '').toUpperCase();
    if (code && !seenCodes.has(code)) {
      if (!status || b.status === status || b.lifecycle_status === status) {
        seenCodes.add(code);
        merged.push(b);
      }
    }
  }

  res.json({
    batches: merged.slice(0, Number(limit)),
    total: Math.max(dbCount, merged.length),
    page: Number(page),
    limit: Number(limit),
  });
});

/**
 * GET /api/batches/number/:batchNumber
 * Fetch a single batch by its batch number
 */
router.get('/number/:batchNumber', async (req, res) => {
  const reqNum = req.params.batchNumber.trim().toUpperCase();

  // 1. Try Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          producer:profiles!batches_producer_id_fkey(id, full_name, organization_name, wallet_address, phone),
          farm:farms(id, farm_name, region, state, latitude, longitude, organic_certified, palm_tree_count),
          batch_trace_logs(id, stage_name, stage_order, location_name, stage_timestamp, notes, metadata)
        `)
        .eq('batch_number', reqNum)
        .maybeSingle();

      if (!error && data) {
        if (data.batch_trace_logs) {
          data.batch_trace_logs.sort((a, b) => a.stage_order - b.stage_order);
        }
        return res.json({ batch: data });
      }
    } catch (err) {
      console.warn('[batches] Supabase notice for /number:', err.message);
    }
  }

  // 2. Try local store
  const found = findStoredBatch(reqNum);
  if (found) {
    return res.json({ batch: found });
  }

  res.status(404).json({ error: `Batch ${reqNum} not found` });
});

/**
 * GET /api/batches/:id
 * Fetch a single batch by UUID or batch code
 */
router.get('/:id', async (req, res) => {
  const query = req.params.id;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          producer:profiles!batches_producer_id_fkey(id, full_name, organization_name, wallet_address, phone),
          farm:farms(id, farm_name, region, state, latitude, longitude, organic_certified, palm_tree_count),
          batch_trace_logs(id, stage_name, stage_order, location_name, stage_timestamp, notes, metadata)
        `)
        .or(`id.eq.${query},batch_number.eq.${query.toUpperCase()}`)
        .maybeSingle();

      if (!error && data) {
        if (data.batch_trace_logs) {
          data.batch_trace_logs.sort((a, b) => a.stage_order - b.stage_order);
        }
        return res.json({ batch: data });
      }
    } catch (err) {
      console.warn('[batches] Supabase notice for /:id:', err.message);
    }
  }

  const found = findStoredBatch(query);
  if (found) {
    return res.json({ batch: found });
  }

  res.status(404).json({ error: 'Batch not found' });
});

/**
 * POST /api/batches
 * Complete Production Batch Creation Flow
 * 
 * 1. Validate all input data.
 * 2. Generate/Validate unique application batch code.
 * 3. Serialize canonical versioned metadata.
 * 4. Compute SHA-256 hash.
 * 5. Save detailed production record and transaction reference in Supabase and local store.
 */
router.post('/', async (req, res) => {
  try {
    const {
      batch_number,
      batchId,
      production_date,
      productionDate,
      harvest_date,
      harvestDate,
      trees_used,
      treesUsed,
      selectedTrees,
      neera_liters,
      neeraLiters,
      sapVolumeLiters,
      jaggery_kg,
      jaggeryKg,
      outputKg,
      production_notes,
      productionNotes,
      producerNotes,
      stages,
      document_refs,
      documentRefs,
      producer_address,
      producerAddress,
      farm_id,
      producer_id,
      onchain_tx_hash,
      onchain_block_number,
      onchain_data_hash,
    } = req.body;

    // 1. Resolve and Validate Core Parameters
    const batchCode = String(batch_number || batchId || generateUniqueBatchCode()).trim().toUpperCase();
    const prodDate = String(production_date || productionDate || harvest_date || harvestDate || '').trim();
    const neera = parseFloat(neera_liters ?? neeraLiters ?? sapVolumeLiters);
    const jaggery = parseFloat(jaggery_kg ?? jaggeryKg ?? outputKg);
    const trees = trees_used || treesUsed || selectedTrees || [];

    const errors = {};
    if (!batchCode) errors.batch_number = 'Batch Identifier is required';
    if (!prodDate) errors.production_date = 'Production Date is required';
    if (isNaN(neera) || neera <= 0) errors.neera_liters = 'Neera collected in liters must be greater than 0';
    if (isNaN(jaggery) || jaggery <= 0) errors.jaggery_kg = 'Jaggery produced in kg must be greater than 0';
    if (!Array.isArray(trees) || trees.length === 0) errors.trees_used = 'At least one source tree identifier must be specified';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', validationErrors: errors });
    }

    // 2. Build Canonical Versioned Payload
    const canonicalPayload = buildCanonicalBatchPayload({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      batchId: batchCode,
      producerAddress: producer_address || producerAddress || '',
      productionDate: prodDate,
      treesUsed: trees,
      neeraLiters: neera,
      jaggeryKg: jaggery,
      productionNotes: production_notes || productionNotes || producerNotes || '',
      stages: stages || [],
      documentRefs: document_refs || documentRefs || [],
    });

    const canonicalJson = canonicalJsonStringify(canonicalPayload);
    const sha256_hash = generateSHA256Hash(canonicalJson);

    // 3. Assemble Full Batch Document
    const isAnchored = Boolean(onchain_tx_hash);
    const batchRecord = {
      id: `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      batch_number: batchCode,
      batchId: batchCode,
      schema_version: CURRENT_SCHEMA_VERSION,
      production_date: prodDate,
      harvest_date: prodDate,
      processing_date: prodDate,
      trees_used: canonicalPayload.treesUsed,
      sourceTreeIds: canonicalPayload.treesUsed,
      tree_count: canonicalPayload.treesUsed.length,
      neera_liters: neera,
      sapVolumeLiters: neera,
      total_quantity_kg: jaggery,
      jaggery_kg: jaggery,
      outputKg: jaggery,
      production_notes: canonicalPayload.productionNotes,
      stages: canonicalPayload.stages,
      timeline: canonicalPayload.stages.map((s) => ({
        step: s.order,
        title: s.name,
        date: s.date,
        location: s.location,
        operator: s.operator,
        description: s.notes,
        parameters: s.parameters,
        stageType: s.stageType,
        isVerified: s.isVerified,
      })),
      document_refs: canonicalPayload.documentRefs,
      canonical_metadata: canonicalPayload,
      canonical_json: canonicalJson,
      sha256_hash: sha256_hash,
      sha256Hash: sha256_hash,
      onchain_tx_hash: onchain_tx_hash || null,
      onchainTxHash: onchain_tx_hash || null,
      onchain_block_number: onchain_block_number || null,
      onchainBlockNumber: onchain_block_number || null,
      onchain_data_hash: onchain_data_hash || to0xHash(sha256_hash),
      is_onchain_anchored: isAnchored,
      is_anchored: isAnchored,
      status: isAnchored ? 'anchored' : 'draft',
      producer_address: canonicalPayload.producerAddress,
      producerAddress: canonicalPayload.producerAddress,
      producer: {
        wallet_address: canonicalPayload.producerAddress,
        full_name: 'PalmChain Verified Producer',
      },
      farm_id: farm_id || null,
      producer_id: producer_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 4. Always persist locally first so data is NEVER lost
    const savedLocal = upsertStoredBatch(batchRecord);

    // 5. Attempt Supabase persistence
    let savedInSupabase = false;
    let supabaseError = null;

    if (supabase) {
      try {
        const { data: producerProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, wallet_address, role, is_active')
          .ilike('wallet_address', canonicalPayload.producerAddress)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!producerProfile || producerProfile.role !== 'producer' || !producerProfile.is_active) {
          throw new Error('An active producer profile must be synced before saving this batch');
        }
        if (producer_id && producer_id !== producerProfile.id) {
          return res.status(403).json({ error: 'Batch producer does not match the connected wallet profile' });
        }

        let farmQuery = supabase.from('farms').select('id').eq('producer_id', producerProfile.id);
        if (farm_id) farmQuery = farmQuery.eq('id', farm_id);
        const { data: producerFarm, error: farmError } = await farmQuery
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (farmError) throw farmError;
        if (!producerFarm) throw new Error('Create a farm profile before saving a production batch');

        const { data: supaData, error: supaErr } = await supabase
          .from('batches')
          .insert({
            batch_number: batchCode,
            farm_id: producerFarm.id,
            producer_id: producerProfile.id,
            harvest_date: prodDate,
            processing_date: prodDate,
            total_quantity_kg: jaggery,
            available_stock_kg: jaggery,
            canonical_metadata: canonicalPayload,
            sha256_hash,
            onchain_tx_hash: onchain_tx_hash || null,
            onchain_block_number: onchain_block_number || null,
            is_onchain_anchored: isAnchored,
            status: isAnchored ? 'anchored' : 'draft',
            qr_code_payload: `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${batchCode}`,
          })
          .select()
          .single();

        if (supaErr) throw supaErr;
        if (supaData) {
          savedInSupabase = true;
          batchRecord.id = supaData.id;
          batchRecord.producer_id = producerProfile.id;
          batchRecord.farm_id = producerFarm.id;

          const traceLogs = canonicalPayload.stages.map((stage) => ({
            batch_id: supaData.id,
            stage_name: stage.name,
            stage_order: stage.order,
            location_name: stage.location,
            recorded_by: producerProfile.id,
            stage_timestamp: new Date(stage.date || prodDate).toISOString(),
            metadata: stage.parameters || {},
            notes: stage.notes,
          }));
          const { error: traceError } = await supabase.from('batch_trace_logs').insert(traceLogs);
          if (traceError) {
            supabaseError = `Batch saved but production timeline could not be saved: ${traceError.message}`;
          }
        }
      } catch (dbErr) {
        supabaseError = dbErr.message;
        console.warn('[batches] Supabase insert exception:', dbErr.message);
      }
    }

    res.status(201).json({
      success: true,
      batch: batchRecord,
      sha256_hash,
      canonical_json: canonicalJson,
      storage: {
        supabase: savedInSupabase,
        localStore: true,
        supabaseNotice: supabaseError ? `Supabase persistence failed: ${supabaseError}` : null,
      },
    });
  } catch (err) {
    console.error('[batches] POST / error:', err);
    res.status(500).json({ error: err.message || 'Internal error creating batch' });
  }
});

/**
 * POST /api/batches/:id/anchor
 * Record on-chain transaction reference once mined on Ethereum Sepolia.
 */
router.post('/:id/anchor', async (req, res) => {
  const query = req.params.id;
  const { onchain_tx_hash, onchain_block_number, onchain_data_hash } = req.body;

  if (!onchain_tx_hash) {
    return res.status(400).json({ error: 'onchain_tx_hash is required to confirm anchoring' });
  }

  // 1. Update in local store
  const existing = findStoredBatch(query);
  const updatedData = {
    ...(existing || {}),
    batch_number: (existing?.batch_number || query).toUpperCase(),
    onchain_tx_hash,
    onchainTxHash: onchain_tx_hash,
    onchain_block_number: onchain_block_number || null,
    onchainBlockNumber: onchain_block_number || null,
    onchain_data_hash: onchain_data_hash || null,
    is_onchain_anchored: true,
    is_anchored: true,
    status: 'anchored',
    updated_at: new Date().toISOString(),
  };

  const saved = upsertStoredBatch(updatedData);

  // 2. Update in Supabase if reachable
  let supabaseUpdated = false;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('batches')
        .update({
          onchain_tx_hash,
          onchain_block_number: onchain_block_number || null,
          is_onchain_anchored: true,
          status: 'anchored',
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${query},batch_number.eq.${query.toUpperCase()}`)
        .select()
        .single();

      if (!error && data) {
        supabaseUpdated = true;
      }
    } catch (err) {
      console.warn('[batches] Supabase anchor update notice:', err.message);
    }
  }

  res.json({
    success: true,
    batch: saved,
    storage: {
      supabase: supabaseUpdated,
      localStore: true,
    },
  });
});

export default router;
