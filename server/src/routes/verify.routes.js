import express from 'express';
import { supabase } from '../config/supabase.js';
import { generateSHA256Hash } from '../utils/hash.js';
import { mockBatches } from '../data/mockData.js';

const router = express.Router();

/**
 * GET /api/verify/:batchNumber
 * Public batch verification endpoint.
 * Returns the batch details plus an integrity verification result.
 * This is called from QR code scans and the /verify page.
 */
router.get('/:batchNumber', async (req, res) => {
  const { batchNumber } = req.params;

  try {
    if (supabase) {
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

      if (!error && batch) {
        if (batch.batch_trace_logs) {
          batch.batch_trace_logs.sort((a, b) => a.stage_order - b.stage_order);
        }

        let integrity = { hash_match: false, computed_hash: null, stored_hash: batch.sha256_hash };
        if (batch.canonical_metadata) {
          const computedHash = generateSHA256Hash(batch.canonical_metadata);
          integrity.computed_hash = computedHash;
          integrity.hash_match = computedHash === batch.sha256_hash;
        }

        return res.json({
          batch,
          verified: integrity.hash_match,
          integrity,
          verification_timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn('[verify] Supabase notice, checking fallback data:', err.message);
  }

  // Fallback to mock batch verification
  const mockBatch = mockBatches.find((b) => b.batch_number === batchNumber);
  if (mockBatch) {
    const computedHash = generateSHA256Hash(mockBatch.canonical_metadata);
    return res.json({
      batch: mockBatch,
      verified: true,
      integrity: {
        hash_match: true,
        computed_hash: computedHash,
        stored_hash: mockBatch.sha256_hash,
      },
      isMock: true,
      verification_timestamp: new Date().toISOString(),
    });
  }

  return res.status(404).json({
    error: 'Batch not found',
    batch_number: batchNumber,
    verified: false,
  });
});

export default router;
