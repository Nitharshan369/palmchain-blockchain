import express from 'express';
import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import { verifyWalletSignature } from '../middleware/verifyWalletSignature.js';

const router = express.Router();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const PRODUCER_REGISTRY_ADDRESS =
  process.env.PALMCHAIN_PRODUCER_REGISTRY_ADDRESS ||
  process.env.VITE_PRODUCER_REGISTRY_ADDRESS ||
  '0xD4B4BF61a6e70bd4e9B44E3941523c57Ed27d00D';
const PRODUCER_REGISTRY_ABI = [
  'function getProducer(address producer) view returns (tuple(address wallet, string name, uint8 status, uint256 registeredAt, uint256 verifiedAt))',
];

// In-memory fallback profile store
const localProfiles = new Map();

/**
 * GET /api/profiles/wallet/:address
 * Fetch a profile by Ethereum wallet address (case-insensitive).
 */
router.get('/wallet/:address', async (req, res) => {
  const { address } = req.params;
  const cleanAddress = (address || '').toLowerCase();

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('wallet_address', cleanAddress)
        .maybeSingle();

      if (!error && data) {
        return res.json({ profile: data });
      }
    }
  } catch (err) {
    console.warn('[profiles] Supabase query notice:', err.message);
  }

  // Fallback to local memory profile
  if (localProfiles.has(cleanAddress)) {
    return res.json({ profile: localProfiles.get(cleanAddress) });
  }

  return res.status(404).json({ error: 'Profile not found' });
});

/**
 * POST /api/profiles
 * Create or update a user profile (upsert by wallet_address).
 */
router.post('/', async (req, res) => {
  try {
    const wallet = await verifyWalletSignature(req);
    if (!req.body.wallet_address || !ethers.isAddress(req.body.wallet_address)
      || ethers.getAddress(req.body.wallet_address) !== wallet) {
      return res.status(403).json({ error: 'The signed wallet must match wallet_address' });
    }

    const role = req.body.role || 'customer';
    if (!['customer', 'producer'].includes(role)) {
      return res.status(400).json({ error: 'Only customer or producer profiles can be created here' });
    }
    if (role === 'producer') await requireRegisteredProducer(wallet);

    const profile = await saveProfile(wallet, {
      full_name: req.body.full_name,
      role,
      email: req.body.email,
      phone: req.body.phone,
      organization_name: req.body.organization_name,
    });
    localProfiles.set(wallet.toLowerCase(), profile);
    return res.status(200).json({ profile });
  } catch (error) {
    console.error('[profiles] Profile upsert failed:', error.message);
    return res.status(error.status || 503).json({ error: error.message || 'Profile could not be saved' });
  }
});

router.post('/producer', async (req, res) => {
  try {
    const wallet = await verifyWalletSignature(req);
    const businessName = String(req.body.organization_name || req.body.full_name || '').trim();
    if (!businessName || businessName.length > 120) {
      return res.status(400).json({ error: 'Business name must contain 1 to 120 characters' });
    }
    await requireRegisteredProducer(wallet);

    const profile = await saveProfile(wallet, {
      full_name: String(req.body.full_name || businessName).trim().slice(0, 120),
      role: 'producer',
      organization_name: businessName,
    });
    const { data: existingFarm, error: farmLookupError } = await supabase
      .from('farms')
      .select('id')
      .eq('producer_id', profile.id)
      .limit(1)
      .maybeSingle();
    if (farmLookupError) throw farmLookupError;

    if (!existingFarm) {
      const locationParts = String(req.body.location || '').split(',').map((part) => part.trim()).filter(Boolean);
      const { error: farmError } = await supabase.from('farms').insert({
        producer_id: profile.id,
        farm_name: businessName,
        region: (locationParts[0] || 'Unspecified').slice(0, 120),
        state: (locationParts.slice(1).join(', ') || 'Unspecified').slice(0, 120),
      });
      if (farmError) throw farmError;
    }

    localProfiles.set(wallet.toLowerCase(), profile);
    return res.status(200).json({ profile });
  } catch (error) {
    console.error('[profiles] Producer profile sync failed:', error.message);
    return res.status(error.status || 503).json({ error: error.message || 'Producer profile could not be synced' });
  }
});

async function requireRegisteredProducer(wallet) {
  if (!supabase) {
    const error = new Error('Database is not configured');
    error.status = 503;
    throw error;
  }
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const registry = new ethers.Contract(PRODUCER_REGISTRY_ADDRESS, PRODUCER_REGISTRY_ABI, provider);
  const info = await registry.getProducer(wallet);
  if (![1, 2].includes(Number(info.status))) {
    const error = new Error('Wallet must be registered and not suspended in ProducerRegistry');
    error.status = 403;
    throw error;
  }
}

async function saveProfile(wallet, values) {
  if (!supabase) {
    const error = new Error('Database is not configured');
    error.status = 503;
    throw error;
  }
  const profileRecord = {
    wallet_address: wallet.toLowerCase(),
    full_name: String(values.full_name || 'PalmChain User').trim().slice(0, 120),
    role: values.role,
    email: values.email || `${wallet.slice(2, 10).toLowerCase()}@palmchain.io`,
    phone: values.phone || null,
    organization_name: values.organization_name || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileRecord, { onConflict: 'wallet_address' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * POST /api/profiles/verify-producer-onchain
 * Disabled: producer verification must be performed by the on-chain registry administrator.
 */
router.post('/verify-producer-onchain', async (req, res) => {
  return res.status(410).json({ error: 'Producer verification must be completed by the ProducerRegistry administrator' });
});

export default router;
