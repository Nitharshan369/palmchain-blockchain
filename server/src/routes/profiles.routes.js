import express from 'express';
import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';

const router = express.Router();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/alch_v5uaUe7qMsm8BLhpm2XGE';
const PRODUCER_REGISTRY_ADDRESS =
  process.env.PALMCHAIN_PRODUCER_REGISTRY_ADDRESS ||
  process.env.VITE_PRODUCER_REGISTRY_ADDRESS ||
  '0xD4B4BF61a6e70bd4e9B44E3941523c57Ed27d00D';

const ADMIN_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY || 'fe26e8901a9134be6a309eaafe72a0865f6c080eb6c6a8fe9c16c535135ae57c';

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

  // Default synthetic profile for verified address
  res.json({
    profile: {
      wallet_address: cleanAddress,
      full_name: 'PalmChain Producer',
      role: 'producer',
      organization_name: 'Heritage Palmyrah Farmer Cooperative',
    },
  });
});

/**
 * POST /api/profiles
 * Create or update a user profile (upsert by wallet_address).
 */
router.post('/', async (req, res) => {
  const { wallet_address, full_name, role, email, phone, organization_name } = req.body;

  if (!wallet_address) {
    return res.status(400).json({ error: 'wallet_address is required' });
  }

  const cleanAddress = wallet_address.toLowerCase();
  const profileRecord = {
    id: `prof-${Date.now()}`,
    wallet_address: cleanAddress,
    full_name: full_name || 'PalmChain Operator',
    role: role || 'producer',
    email: email || `${cleanAddress.slice(0, 8)}@palmchain.io`,
    phone: phone || '+91 94420 00000',
    organization_name: organization_name || 'Palmyrah Collective',
    updated_at: new Date().toISOString(),
  };

  // Always save to memory store
  localProfiles.set(cleanAddress, profileRecord);

  // Attempt Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            wallet_address: cleanAddress,
            full_name: profileRecord.full_name,
            role: profileRecord.role,
            email: profileRecord.email,
            phone: profileRecord.phone,
            organization_name: profileRecord.organization_name,
          },
          { onConflict: 'wallet_address' }
        )
        .select()
        .single();

      if (!error && data) {
        return res.status(200).json({ profile: data });
      }
    } catch (err) {
      console.warn('[profiles] Supabase upsert notice:', err.message);
    }
  }

  res.status(200).json({ profile: profileRecord });
});

/**
 * POST /api/profiles/verify-producer-onchain
 * Admin helper to verify a registered producer wallet on Sepolia ProducerRegistry.
 */
router.post('/verify-producer-onchain', async (req, res) => {
  const { wallet_address } = req.body;
  if (!wallet_address || !ethers.isAddress(wallet_address)) {
    return res.status(400).json({ error: 'Valid wallet_address is required' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const adminSigner = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

    const abi = [
      'function registerProducer(string name) external',
      'function verifyProducer(address producer) external',
      'function isVerifiedProducer(address producer) view returns (bool)',
      'function getProducer(address producer) view returns (tuple(address wallet, string name, uint8 status, uint256 registeredAt, uint256 verifiedAt))',
    ];
    const registry = new ethers.Contract(PRODUCER_REGISTRY_ADDRESS, abi, adminSigner);

    const isAlreadyVerified = await registry.isVerifiedProducer(wallet_address);
    if (isAlreadyVerified) {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: `Wallet ${wallet_address} is already a verified producer on Sepolia.`,
      });
    }

    const info = await registry.getProducer(wallet_address);
    // If not registered yet, register first
    if (Number(info.status) === 0) {
      // Wallet must call registerProducer or admin can verify directly if allowed
      return res.status(400).json({
        error: 'Wallet is NotRegistered. Please click "Register on ProducerRegistry" in MetaMask first.',
        status: 0,
      });
    }

    // Call verifyProducer(wallet_address)
    const tx = await registry.verifyProducer(wallet_address);
    const receipt = await tx.wait(1);

    res.json({
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      message: `Wallet ${wallet_address} has been verified by Admin on Sepolia.`,
    });
  } catch (err) {
    console.error('[profiles] verify-producer-onchain error:', err);
    res.status(500).json({ error: err.message || 'Failed to verify producer on Sepolia' });
  }
});

export default router;
