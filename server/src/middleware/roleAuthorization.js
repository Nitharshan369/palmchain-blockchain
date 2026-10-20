import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import { verifyWalletSignature } from './verifyWalletSignature.js';

const DEMO_MASTER_WALLET = '0x74de526B0CDFB86D682cB293d4006076a2FE6088';

export async function requireRole(req, role) {
  const wallet = await verifyWalletSignature(req);
  const isMaster = wallet.toLowerCase() === DEMO_MASTER_WALLET.toLowerCase();
  let profile = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, wallet_address, full_name, role, is_active, organization_name')
        .ilike('wallet_address', wallet)
        .maybeSingle();
      if (!error && data) {
        profile = data;
      }
    } catch {
      // Database query failed, proceed with fallback
    }
  }

  // Master deployer/demo wallet can act in all roles for staff demonstration
  if (isMaster) {
    profile = profile || {
      id: '00000000-0000-0000-0000-000000000001',
      wallet_address: wallet,
      full_name: 'Murugan Natural Palmyrah Cooperative',
      organization_name: 'Murugan Palmyrah Grove',
      role,
      is_active: true,
    };
    profile.role = role;
    profile.is_active = true;
  }

  if (!profile || !profile.is_active || (profile.role !== role && !isMaster)) {
    const error = new Error(`An active ${role} profile is required for this operation`);
    error.status = 403;
    throw error;
  }
  req.authorizedWallet = wallet;
  req.authorizedProfile = profile;
  return profile;
}

export async function writeAudit({ wallet, profileId, action, entityType, entityId, transactionHash, details = {} }) {
  if (!supabase) return;
  try {
    await supabase.from('audit_logs').insert({
      actor_wallet: wallet.toLowerCase(),
      actor_profile_id: profileId || null,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      transaction_hash: transactionHash || null,
      details,
    });
  } catch (e) {
    // Audit log should not break primary operation if table is absent
    console.warn('[audit] could not write audit log:', e.message);
  }
}

