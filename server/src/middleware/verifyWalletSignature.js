import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import { validateMarketplaceSignature } from '../services/marketplace.js';

export async function verifyWalletSignature(req) {
  if (!supabase) {
    const error = new Error('Marketplace database is not configured');
    error.status = 503;
    throw error;
  }

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

  const { error: nonceError } = await supabase
    .from('marketplace_request_nonces')
    .insert({ nonce, wallet_address: ethers.getAddress(wallet) });
  if (nonceError) {
    const error = new Error(nonceError.code === '23505'
      ? 'This signed request has already been used'
      : 'Signed request authorization could not be recorded');
    error.status = nonceError.code === '23505' ? 409 : 503;
    throw error;
  }

  return ethers.getAddress(wallet);
}
