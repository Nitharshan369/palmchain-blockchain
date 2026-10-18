import express from 'express';
import { supabase } from '../config/supabase.js';
import { generateSHA256Hash } from '../utils/hash.js';

const router = express.Router();

/**
 * GET /api/verify/:batchNumber
 * Public batch verification endpoint.
 * Returns the batch details plus an integrity verification result.
 * This is called from QR code scans and the /verify page.
 */
router.get('/:batchNumber', async (req, res) => {
  try {
    const { batchNumber } = req.params;

    // Handle gracefully when Supabase is not configured (dev mode with mock data)
    if (!supabase) {
      return res.status(503).json({
        error: 'Database not configured',
        verified: false,
        message: 'Verification service temporarily unavailable',
      });
    }

    const { data: batch, error } = await supabase
      .from('batches')
      .select(`
        *,
        producer:profiles!batches_producer_id_fkey(id, full_name, organization_name, wallet_address),
        farm:farms(id, farm_name, region, state, latitude, longitude, organic_certified),
        batch_trace_logs(id, stage_name, stage_order, location_name, stage_timestamp, notes)
      `)
      .eq('batch_number', batchNumber)
      .maybeSingle();

    if (error) throw error;
    if (!batch) {
      return res.status(404).json({
        error: 'Batch not found',
        batch_number: batchNumber,
        verified: false,
      });
    }

    // Sort trace logs
    if (batch.batch_trace_logs) {
      batch.batch_trace_logs.sort((a, b) => a.stage_order - b.stage_order);
    }

    // Re-compute SHA-256 from canonical_metadata to verify integrity
    let integrity = { hash_match: false, computed_hash: null, stored_hash: batch.sha256_hash };
    if (batch.canonical_metadata) {
      const computedHash = generateSHA256Hash(batch.canonical_metadata);
      integrity.computed_hash = computedHash;
      integrity.hash_match = computedHash === batch.sha256_hash;
    }

    res.json({
      batch,
      verified: integrity.hash_match,
      integrity,
      verification_timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[verify] GET /:batchNumber:', err.message);
    res.status(500).json({ error: err.message, verified: false });
  }
});

export default router;
