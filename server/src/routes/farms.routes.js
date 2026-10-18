import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/farms
 * List farms. Optionally filter by producer_id.
 */
router.get('/', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const { producerId } = req.query;
    let query = supabase.from('farms').select('*').order('created_at', { ascending: false });
    if (producerId) query = query.eq('producer_id', producerId);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ farms: data });
  } catch (err) {
    console.error('[farms] GET /:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/farms
 * Register a new farm for a producer.
 */
router.post('/', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const { producer_id, farm_name, region, state, palm_tree_count, organic_certified, latitude, longitude } = req.body;

    const required = { producer_id, farm_name, region, state };
    const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('farms')
      .insert({
        producer_id,
        farm_name,
        region,
        state,
        palm_tree_count: palm_tree_count ? Number(palm_tree_count) : 0,
        organic_certified: organic_certified || false,
        latitude: latitude || null,
        longitude: longitude || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ farm: data });
  } catch (err) {
    console.error('[farms] POST /:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
