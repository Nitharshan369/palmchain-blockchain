import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import { validateMarketplaceSignature } from '../services/marketplace.js';

const inMemoryNonces = new Map();

function cleanInMemoryNonces() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, ts] of inMemoryNonces.entries()) {
    if (ts < cutoff) inMemoryNonces.delete(key);
  }
}

export async function verifyWalletSignature(req) {
  const wallet = req.get('x-palmchain-wallet');
  const timestamp = req.get('x-palmchain-timestamp');
  const nonce = req.get('x-palmchain-nonce');
  const signature = req.get('x-palmchain-signature');

  if (!validateMarketplaceSignature({
    wallet,
    timestamp,
    nonce,
    signature,
    method: req.method,
    path: req.path,
    body: req.body || {},
  })) {
    const error = new Error('A fresh wallet signature is required for this request');
    error.status = 401;
    throw error;
  }

  // Attempt database persistence for nonce replay prevention
  if (supabase) {
    try {
      const { error: nonceError } = await supabase
        .from('marketplace_request_nonces')
        .insert({ nonce, wallet_address: ethers.getAddress(wallet) });
      if (nonceError) {
        if (nonceError.code === '23505') {
          const error = new Error('This signed request has already been used');
          error.status = 409;
          throw error;
        }
        // If table doesn't exist (PGRST205), use in-memory deduplication fallback
        if (nonceError.code === 'PGRST205') {
          cleanInMemoryNonces();
          if (inMemoryNonces.has(nonce)) {
            const error = new Error('This signed request has already been used');
            error.status = 409;
            throw error;
          }
          inMemoryNonces.set(nonce, Date.now());
          return ethers.getAddress(wallet);
        }
      } else {
        return ethers.getAddress(wallet);
      }
    } catch (err) {
      if (err.status) throw err;
      // Continue to in-memory fallback
    }
  }

  // Fallback in-memory tracking
  cleanInMemoryNonces();
  if (inMemoryNonces.has(nonce)) {
    const error = new Error('This signed request has already been used');
    error.status = 409;
    throw error;
  }
  inMemoryNonces.set(nonce, Date.now());

  return ethers.getAddress(wallet);
}
