import express from 'express';
import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import { verifyWalletSignature } from '../middleware/verifyWalletSignature.js';
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

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const BATCH_REGISTRY_ADDRESS =
  process.env.PALMCHAIN_BATCH_REGISTRY_ADDRESS ||
  process.env.VITE_BATCH_REGISTRY_ADDRESS ||
  '0xB77f75af51Ea8680665A3c5749de7b3e3b2C7829';
const BATCH_REGISTRY_ABI = [
  'event BatchCreated(string indexed batchId, bytes32 indexed dataHash, address indexed producer, uint256 neeraLiters, uint256 jaggeryKg, uint256 timestamp)',
];

async function verifyBatchCreationOnChain({ txHash, batchCode, producerAddress, dataHash, neeraLiters, jaggeryKg }) {
  if (!ethers.isAddress(producerAddress)) throw new Error('A valid producer wallet is required');
  if (!ethers.isHexString(txHash, 32)) throw new Error('A valid on-chain transaction hash is required');

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error('Batch anchoring is restricted to Ethereum Sepolia');

  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!tx || !receipt || receipt.status !== 1) throw new Error('The batch transaction was not successfully mined');
  if (tx.to?.toLowerCase() !== BATCH_REGISTRY_ADDRESS.toLowerCase()) throw new Error('Transaction target is not the configured BatchRegistry');
  if (tx.from.toLowerCase() !== ethers.getAddress(producerAddress).toLowerCase()) throw new Error('Transaction sender does not match the signed producer wallet');

  const iface = new ethers.Interface(BATCH_REGISTRY_ABI);
  const event = receipt.logs.map((log) => {
    try { return iface.parseLog(log); } catch { return null; }
  }).find((parsed) => parsed?.name === 'BatchCreated');
  if (!event) throw new Error('BatchCreated event was not found in the transaction receipt');

  const args = event.args;
  if (String(args.batchId).toUpperCase() !== batchCode) throw new Error('On-chain batch identifier does not match the database record');
  if (String(args.dataHash).toLowerCase() !== to0xHash(dataHash).toLowerCase()) throw new Error('On-chain data hash does not match the canonical database hash');
  if (ethers.getAddress(args.producer) !== ethers.getAddress(producerAddress)) throw new Error('On-chain producer does not match the signed producer wallet');
  if (args.neeraLiters !== BigInt(Math.round(Number(neeraLiters) * 100))) throw new Error('On-chain Neera quantity does not match the database record');
  if (args.jaggeryKg !== BigInt(Math.round(Number(jaggeryKg) * 100))) throw new Error('On-chain jaggery quantity does not match the database record');

  return { blockNumber: receipt.blockNumber, dataHash: String(args.dataHash) };
}

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

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Batch database is temporarily unavailable' });
  }

  // 2. Fetch local persistent batches only during local development.
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

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Batch database is temporarily unavailable' });
  }

  // 2. Try local store only during local development.
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

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Batch database is temporarily unavailable' });
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
    const signedWallet = await verifyWalletSignature(req);
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

    const requestedProducer = producer_address || producerAddress || '';
    if (!ethers.isAddress(requestedProducer) || ethers.getAddress(requestedProducer) !== signedWallet) {
      return res.status(403).json({ error: 'The signed wallet must match producer_address' });
    }
    if (!onchain_tx_hash) {
      return res.status(400).json({ error: 'A successfully mined on-chain batch transaction is required' });
    }

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
      producerAddress: signedWallet,
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

    const chainAnchor = await verifyBatchCreationOnChain({
      txHash: onchain_tx_hash,
      batchCode,
      producerAddress: signedWallet,
      dataHash: to0xHash(sha256_hash),
      neeraLiters: neera,
      jaggeryKg: jaggery,
    });

    // 3. Assemble the full record only after the Sepolia event is verified.
    const isAnchored = true;
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
      onchain_block_number: chainAnchor.blockNumber,
      onchainBlockNumber: chainAnchor.blockNumber,
      onchain_data_hash: chainAnchor.dataHash,
      is_onchain_anchored: isAnchored,
      is_anchored: isAnchored,
      status: isAnchored ? 'anchored' : 'draft',
      producer_address: canonicalPayload.producerAddress,
      producerAddress: signedWallet,
      producer: {
        wallet_address: canonicalPayload.producerAddress,
        full_name: 'PalmChain Verified Producer',
      },
      farm_id: farm_id || null,
      producer_id: producer_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 4. Persist to Supabase only after the chain proof is verified.
    let savedInSupabase = false;
    let supabaseError = null;

    if (supabase) {
      try {
        const { data: producerProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, wallet_address, role, is_active')
          .ilike('wallet_address', signedWallet)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!producerProfile || producerProfile.role !== 'producer' || !producerProfile.is_active) {
          throw new Error('An active producer profile must be synced before saving this batch');
        }
        if (ethers.getAddress(producerProfile.wallet_address) !== signedWallet) {
          return res.status(403).json({ error: 'Batch producer does not match the connected wallet profile' });
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
            onchain_block_number: chainAnchor.blockNumber,
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

    if (!savedInSupabase) {
      return res.status(503).json({ error: supabaseError || 'Batch could not be persisted after on-chain confirmation' });
    }

    upsertStoredBatch(batchRecord);
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
    res.status(err.status || 500).json({ error: err.message || 'Internal error creating batch' });
  }
});

/**
 * POST /api/batches/:id/anchor
 * Record on-chain transaction reference once mined on Ethereum Sepolia.
 */
router.post('/:id/anchor', async (req, res) => {
  const query = req.params.id;
  const { onchain_tx_hash, onchain_block_number, onchain_data_hash } = req.body;

  let signedWallet;
  try {
    signedWallet = await verifyWalletSignature(req);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  if (!onchain_tx_hash) {
    return res.status(400).json({ error: 'onchain_tx_hash is required to confirm anchoring' });
  }

  const existing = findStoredBatch(query);
  if (!existing) return res.status(404).json({ error: 'Batch not found' });
  try {
    const chainAnchor = await verifyBatchCreationOnChain({
      txHash: onchain_tx_hash,
      batchCode: String(existing.batch_number || query).toUpperCase(),
      producerAddress: signedWallet,
      dataHash: onchain_data_hash || existing.sha256_hash,
      neeraLiters: existing.neera_liters,
      jaggeryKg: existing.jaggery_kg,
    });
    if (onchain_block_number && Number(onchain_block_number) !== chainAnchor.blockNumber) {
      return res.status(400).json({ error: 'Submitted block number does not match the verified receipt' });
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  // Update storage only after the chain proof succeeds.
  const updatedData = {
    ...existing,
    batch_number: (existing.batch_number || query).toUpperCase(),
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
