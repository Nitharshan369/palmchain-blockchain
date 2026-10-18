import express from 'express';
import { supabase } from '../config/supabase.js';
import { generateSHA256Hash } from '../utils/hash.js';

const router = express.Router();

/**
 * GET /api/batches
 * List batches with optional filters: status, producerId, limit, page
 */
router.get('/', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const { status, producerId, limit = 20, page = 1 } = req.query;
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
    if (error) throw error;

    res.json({
      batches: data,
      total: count,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error('[batches] GET /:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/batches/number/:batchNumber
 * Fetch a single batch by its human-readable batch number (e.g. PJG-2026-001)
 */
router.get('/number/:batchNumber', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        producer:profiles!batches_producer_id_fkey(id, full_name, organization_name, wallet_address, phone),
        farm:farms(id, farm_name, region, state, latitude, longitude, organic_certified, palm_tree_count),
        batch_trace_logs(id, stage_name, stage_order, location_name, stage_timestamp, notes, metadata)
      `)
      .eq('batch_number', req.params.batchNumber)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Batch not found' });

    // Sort trace logs by stage order
    if (data.batch_trace_logs) {
      data.batch_trace_logs.sort((a, b) => a.stage_order - b.stage_order);
    }

    res.json({ batch: data });
  } catch (err) {
    console.error('[batches] GET /number/:batchNumber:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/batches/:id
 * Fetch a single batch by UUID
 */
router.get('/:id', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        producer:profiles!batches_producer_id_fkey(id, full_name, organization_name, wallet_address, phone),
        farm:farms(id, farm_name, region, state, latitude, longitude, organic_certified, palm_tree_count),
        batch_trace_logs(id, stage_name, stage_order, location_name, stage_timestamp, notes, metadata)
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Batch not found' });

    if (data.batch_trace_logs) {
      data.batch_trace_logs.sort((a, b) => a.stage_order - b.stage_order);
    }

    res.json({ batch: data });
  } catch (err) {
    console.error('[batches] GET /:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/batches
 * Create a new batch. Computes the SHA-256 integrity hash from canonical metadata.
 */
router.post('/', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const {
      batch_number,
      farm_id,
      producer_id,
      harvest_date,
      processing_date,
      sap_brix_value,
      clarification_agent,
      boiling_temp_celsius,
      form,
      total_quantity_kg,
      available_stock_kg,
      qr_code_payload,
    } = req.body;

    // Validate required fields
    const required = { batch_number, farm_id, producer_id, harvest_date, processing_date, total_quantity_kg };
    const missing = Object.entries(required)
      .filter(([, v]) => v === undefined || v === null || v === '')
      .map(([k]) => k);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    // Build canonical metadata for hashing
    const canonical_metadata = {
      batch_number,
      farm_id,
      producer_id,
      harvest_date,
      processing_date,
      sap_brix_value: sap_brix_value || null,
      clarification_agent: clarification_agent || 'Natural Plant Mucilage / Lime',
      boiling_temp_celsius: boiling_temp_celsius || null,
      form: form || 'solid_block',
      total_quantity_kg: Number(total_quantity_kg),
    };

    const sha256_hash = generateSHA256Hash(canonical_metadata);

    const { data, error } = await supabase
      .from('batches')
      .insert({
        batch_number,
        farm_id,
        producer_id,
        harvest_date,
        processing_date,
        sap_brix_value,
        clarification_agent,
        boiling_temp_celsius,
        form: form || 'solid_block',
        total_quantity_kg: Number(total_quantity_kg),
        available_stock_kg: Number(available_stock_kg || total_quantity_kg),
        canonical_metadata,
        sha256_hash,
        status: 'draft',
        qr_code_payload: qr_code_payload || `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${batch_number}`,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ batch: data, sha256_hash });
  } catch (err) {
    console.error('[batches] POST /:', err.message);
    const isUnique = err.code === '23505';
    res.status(isUnique ? 409 : 500).json({ error: isUnique ? 'Batch number already exists' : err.message });
  }
});

/**
 * POST /api/batches/:id/anchor
 * Record an on-chain anchoring event for a batch.
 * Called after the frontend submits the transaction to Sepolia.
 */
router.post('/:id/anchor', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const { onchain_tx_hash, onchain_block_number } = req.body;
    if (!onchain_tx_hash) {
      return res.status(400).json({ error: 'onchain_tx_hash is required' });
    }

    const { data, error } = await supabase
      .from('batches')
      .update({
        onchain_tx_hash,
        onchain_block_number: onchain_block_number || null,
        is_onchain_anchored: true,
        status: 'anchored',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Batch not found' });

    res.json({ batch: data });
  } catch (err) {
    console.error('[batches] POST /:id/anchor:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
