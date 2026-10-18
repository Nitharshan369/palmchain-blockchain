import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/profiles/wallet/:address
 * Fetch a profile by Ethereum wallet address (case-insensitive).
 */
router.get('/wallet/:address', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const { address } = req.params;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('wallet_address', address)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profile not found' });

    res.json({ profile: data });
  } catch (err) {
    console.error('[profiles] GET /wallet:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/profiles
 * Create or update a user profile (upsert by wallet_address).
 */
router.post('/', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    const { wallet_address, full_name, role, email, phone, organization_name } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address is required' });
    }

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('wallet_address', wallet_address)
      .maybeSingle();

    let result;
    if (existing) {
      const updates = {};
      if (full_name) updates.full_name = full_name;
      if (role) updates.role = role;
      if (email) updates.email = email;
      if (phone) updates.phone = phone;
      if (organization_name) updates.organization_name = organization_name;
      updates.updated_at = new Date().toISOString();

      result = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      if (!full_name || !email || !role) {
        return res.status(400).json({
          error: 'full_name, email, and role are required for new profiles',
        });
      }
      result = await supabase
        .from('profiles')
        .insert({
          wallet_address: wallet_address.toLowerCase(),
          full_name,
          email,
          role,
          phone,
          organization_name,
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    res.status(existing ? 200 : 201).json({ profile: result.data });
  } catch (err) {
    console.error('[profiles] POST /:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
