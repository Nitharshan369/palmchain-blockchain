import express from 'express';
import { supabase } from '../config/supabase.js';
import { mockProducts } from '../data/mockData.js';

const router = express.Router();

/**
 * GET /api/products
 * List active marketplace products with batch + producer info.
 * Supports: producerId, limit, page query params
 */
router.get('/', async (req, res) => {
  try {
    if (supabase) {
      const { producerId, limit = 20, page = 1 } = req.query;
      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      let query = supabase
        .from('products')
        .select(
          `*,
           batch:batches(id, batch_number, status, is_certified, harvest_date, form, total_quantity_kg, sha256_hash),
           producer:profiles!products_producer_id_fkey(id, full_name, organization_name)`,
          { count: 'exact' }
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (producerId) query = query.eq('producer_id', producerId);

      const { data, error, count } = await query;
      if (!error && data) {
        return res.json({ products: data, total: count, page: Number(page), limit: Number(limit) });
      }
    }
  } catch (err) {
    console.warn('[products] Supabase query notice, serving local data:', err.message);
  }

  res.json({
    products: mockProducts,
    total: mockProducts.length,
    page: 1,
    limit: 20,
    isMock: true,
  });
});

/**
 * GET /api/products/:id
 * Fetch a single product by UUID.
 */
router.get('/:id', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select(
          `*,
           batch:batches(*, farm:farms(*), batch_trace_logs(*)),
           producer:profiles!products_producer_id_fkey(id, full_name, organization_name, wallet_address, phone)`
        )
        .eq('id', req.params.id)
        .maybeSingle();

      if (!error && data) {
        return res.json({ product: data });
      }
    }
  } catch (err) {
    console.warn('[products] Supabase notice for /:id:', err.message);
  }

  const found = mockProducts.find((p) => p.id === req.params.id);
  if (found) {
    return res.json({ product: found, isMock: true });
  }

  res.status(404).json({ error: 'Product not found' });
});

/**
 * POST /api/products
 * Create a new marketplace product listing linked to a batch.
 */
router.post('/', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const { batch_id, producer_id, title, description, price_inr, unit_weight_grams, package_image_url } = req.body;

    const required = { batch_id, producer_id, title, price_inr };
    const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        batch_id,
        producer_id,
        title,
        description,
        price_inr: Number(price_inr),
        unit_weight_grams: unit_weight_grams ? Number(unit_weight_grams) : 500,
        package_image_url,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ product: data });
  } catch (err) {
    console.error('[products] POST /:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
