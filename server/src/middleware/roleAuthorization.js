import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import { verifyWalletSignature } from './verifyWalletSignature.js';

export async function requireRole(req, role) {
  const wallet = await verifyWalletSignature(req);
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, wallet_address, full_name, role, is_active, organization_name')
    .ilike('wallet_address', wallet)
    .maybeSingle();
  if (error) throw error;
  if (!profile || !profile.is_active || profile.role !== role
      || ethers.getAddress(profile.wallet_address) !== wallet) {
    const error = new Error(`An active ${role} profile is required for this operation`);
    error.status = 403;
    throw error;
  }
  req.authorizedWallet = wallet;
  req.authorizedProfile = profile;
  return profile;
}

export async function writeAudit({ wallet, profileId, action, entityType, entityId, transactionHash, details = {} }) {
  const { error } = await supabase.from('audit_logs').insert({
    actor_wallet: wallet.toLowerCase(),
    actor_profile_id: profileId || null,
    action,
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : null,
    transaction_hash: transactionHash || null,
    details,
  });
  if (error) throw error;
}
