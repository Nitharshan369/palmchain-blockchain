import express from 'express';
import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import { verifyWalletSignature } from '../middleware/verifyWalletSignature.js';

const router = express.Router();

/**
 * GET /api/farms
 * List farms. Optionally filter by producer_id.
 */
router.get('/', async (req, res) => {
  try {
    if (supabase) {
      const { producerId } = req.query;
      let query = supabase.from('farms').select('*').order('created_at', { ascending: false });
      if (producerId) query = query.eq('producer_id', producerId);

      const { data, error } = await query;
      if (!error && data) {
        return res.json({ farms: data });
      }
    }
  } catch (err) {
    console.warn('[farms] Supabase query notice:', err.message);
  }

  return res.status(503).json({ error: 'Farm data is temporarily unavailable' });
});

/**
 * POST /api/farms
 * Register a new farm for a producer.
 */
router.post('/', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const { producer_id, farm_name, region, state, palm_tree_count, organic_certified, latitude, longitude } = req.body;
    const wallet = await verifyWalletSignature(req);

    const required = { producer_id, farm_name, region, state };
    const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, is_active')
      .ilike('wallet_address', wallet)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.id !== producer_id || profile.role !== 'producer' || !profile.is_active) {
      return res.status(403).json({ error: 'A producer may only register farms for their own active profile' });
    }

    const registryAddress = process.env.PALMCHAIN_PRODUCER_REGISTRY_ADDRESS
      || process.env.VITE_PRODUCER_REGISTRY_ADDRESS
      || '0xD4B4BF61a6e70bd4e9B44E3941523c57Ed27d00D';
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org');
    const registry = new ethers.Contract(
      registryAddress,
      ['function getProducer(address producer) view returns (tuple(address wallet, string name, uint8 status, uint256 registeredAt, uint256 verifiedAt))'],
      provider
    );
    const producer = await registry.getProducer(wallet);
    if (Number(producer.status) !== 2) {
      return res.status(403).json({ error: 'Only currently verified on-chain producers can register farms' });
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
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
