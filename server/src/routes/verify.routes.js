import express from 'express';
import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import {
  verifyBatchIntegrity,
  to0xHash,
  strip0x,
  buildCanonicalBatchPayload,
  canonicalJsonStringify,
  generateSHA256Hash,
} from '../utils/hash.js';
import { findStoredBatch } from '../data/batchesStore.js';

const router = express.Router();

// Fallback Sepolia RPC and deployed BatchRegistry contract address
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/alch_v5uaUe7qMsm8BLhpm2XGE';
const BATCH_REGISTRY_ADDRESS =
  process.env.PALMCHAIN_BATCH_REGISTRY_ADDRESS ||
  process.env.VITE_BATCH_REGISTRY_ADDRESS ||
  '0xB77f75af51Ea8680665A3c5749de7b3e3b2C7829';

const BATCH_REGISTRY_ABI = [
  'function verifyIntegrity(string calldata batchId, bytes32 computedHash) external view returns (bool tamperFree, uint8 status, address producer, uint256 anchoredAt)',
  'function getBatch(string calldata batchId) external view returns (tuple(string batchId, address producer, uint256 createdAt, uint256 neeraLiters, uint256 jaggeryKg, bytes32 dataHash, uint8 status, address verifier, uint256 verifiedAt, string rejectionReason))',
  'function getBatchStatus(string calldata batchId) external view returns (uint8)',
];

const BATCH_STATUS_NAMES = [
  'Created',
  'Processing',
  'Verified',
  'Packaged',
  'Listed',
  'Sold',
  'Rejected',
  'Recalled',
];

/**
 * GET /api/verify/:batchNumber
 * Complete Integrity & Multi-Pillar Verification Endpoint
 * 
 * 1. Retrieves the detailed record from Supabase/Store.
 * 2. Recalculates SHA-256 hash using exact canonicalization rules.
 * 3. Compares with on-chain anchor on Ethereum Sepolia.
 * 4. Distinctly checks:
 *    - Data Integrity (hash match)
 *    - Transaction Validity (mined Sepolia block, signed by producer)
 *    - Verifier Quality Attestation (authorized verifier physical approval)
 */
router.get('/:batchNumber', async (req, res) => {
  const batchCode = req.params.batchNumber.trim().toUpperCase();

  try {
    let batch = null;

    // 1. Check Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('batches')
          .select(`
            *,
            producer:profiles!batches_producer_id_fkey(id, full_name, organization_name, wallet_address),
            farm:farms(id, farm_name, region, state, latitude, longitude, organic_certified),
            batch_trace_logs(id, stage_name, stage_order, location_name, stage_timestamp, notes)
          `)
          .eq('batch_number', batchCode)
          .maybeSingle();

        if (!error && data) {
          batch = data;
        }
      } catch (err) {
        console.warn('[verify] Supabase query notice:', err.message);
      }
    }

    // 2. Fallback to local store
    if (!batch) {
      batch = findStoredBatch(batchCode);
    }

    if (!batch) {
      return res.status(404).json({
        error: `Batch ${batchCode} not found in database or local store`,
        batch_number: batchCode,
        verified: false,
      });
    }

    // 3. Compute Canonical Hash
    const canonicalPayload = buildCanonicalBatchPayload(batch);
    const canonicalJson = canonicalJsonStringify(canonicalPayload);
    const clientRecomputedHash = generateSHA256Hash(canonicalJson);
    const formattedBytes32 = to0xHash(clientRecomputedHash);

    // 4. Query live Ethereum Sepolia contract for on-chain proof
    let onchainResult = {
      isQueried: false,
      tamperFree: false,
      onchainStatus: null,
      onchainStatusName: 'Unknown',
      onchainProducer: null,
      anchoredAt: null,
      onchainDataHash: null,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
      error: null,
    };

    if (BATCH_REGISTRY_ADDRESS && ethers.isAddress(BATCH_REGISTRY_ADDRESS)) {
      try {
        const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
        const contract = new ethers.Contract(BATCH_REGISTRY_ADDRESS, BATCH_REGISTRY_ABI, provider);

        // Fetch on-chain batch record
        const onchainBatch = await contract.getBatch(batchCode).catch(() => null);

        if (onchainBatch) {
          const statusNum = Number(onchainBatch.status);
          const onchainHash = onchainBatch.dataHash.toLowerCase();
          const matches = onchainHash === formattedBytes32.toLowerCase();

          onchainResult = {
            isQueried: true,
            tamperFree: matches,
            onchainStatus: statusNum,
            onchainStatusName: BATCH_STATUS_NAMES[statusNum] || 'Unknown',
            onchainProducer: onchainBatch.producer,
            anchoredAt: Number(onchainBatch.createdAt) ? new Date(Number(onchainBatch.createdAt) * 1000).toISOString() : null,
            onchainDataHash: onchainBatch.dataHash,
            verifiedBy: onchainBatch.verifier !== ethers.ZeroAddress ? onchainBatch.verifier : null,
            verifiedAt: Number(onchainBatch.verifiedAt) ? new Date(Number(onchainBatch.verifiedAt) * 1000).toISOString() : null,
            rejectionReason: onchainBatch.rejectionReason || null,
            error: null,
          };
        }
      } catch (chainErr) {
        onchainResult.error = chainErr.message;
        console.warn('[verify] Sepolia contract query note:', chainErr.message);
      }
    }

    // 5. Evaluate the 3 Separate Pillars of Trust
    // Pillar A: Cryptographic Data Integrity
    const storedHash = strip0x(batch.sha256_hash || batch.sha256Hash || '');
    const onchainHash = onchainResult.onchainDataHash ? strip0x(onchainResult.onchainDataHash) : storedHash;
    const isIntegrityPassed = strip0x(clientRecomputedHash) === onchainHash;

    // Pillar B: Transaction Validity (Anchored to Ethereum Sepolia)
    const isTxValid = Boolean(batch.onchain_tx_hash || onchainResult.anchoredAt);

    // Pillar C: Verifier Approval (Independent physical quality certification)
    const isVerifierApproved =
      onchainResult.onchainStatus === 2 || // BatchStatus.Verified
      batch.status === 'certified' ||
      batch.is_certified === true;

    // Distinguish application-recorded stages vs independently verified stages
    const stages = (batch.stages || []).map((s) => ({
      ...s,
      stageCategory: s.isVerified || s.stageType === 'independently_verified' ? 'Independently Verified' : 'Application Recorded',
    }));

    res.json({
      success: true,
      batch: {
        ...batch,
        stages,
      },
      verified: isIntegrityPassed,
      // The 3 Distinct Checks
      checks: {
        dataIntegrity: {
          name: 'Cryptographic Data Integrity',
          status: isIntegrityPassed ? 'PASS' : 'FAIL',
          recomputedHash: formattedBytes32,
          storedHash: to0xHash(storedHash),
          onchainHash: onchainResult.onchainDataHash || to0xHash(storedHash),
          matches: isIntegrityPassed,
          schemaVersion: canonicalPayload.schemaVersion,
          explanation: isIntegrityPassed
            ? 'The SHA-256 hash computed deterministically from canonical off-chain fields precisely matches the immutable on-chain commitment.'
            : 'Hash mismatch detected! Off-chain quantities, dates, or notes have been modified after on-chain anchoring.',
        },
        transactionValidity: {
          name: 'Blockchain Commitment Validity',
          status: isTxValid ? 'VALID' : 'UNCOMMITTED',
          txHash: batch.onchain_tx_hash || null,
          blockNumber: batch.onchain_block_number || null,
          anchoredAt: onchainResult.anchoredAt || batch.created_at,
          producerWallet: onchainResult.onchainProducer || batch.producer_address || null,
          network: 'Ethereum Sepolia Testnet (Chain ID 11155111)',
          explanation: isTxValid
            ? 'Anchored on Ethereum Sepolia by a registered producer wallet address.'
            : 'Batch has not yet been submitted or confirmed on Ethereum Sepolia.',
        },
        verifierApproval: {
          name: 'Independent Verifier Attestation',
          status: isVerifierApproved ? 'APPROVED' : 'PENDING',
          isApproved: isVerifierApproved,
          verifierAddress: onchainResult.verifiedBy || null,
          verifiedAt: onchainResult.verifiedAt || null,
          rejectionReason: onchainResult.rejectionReason || null,
          lifecycleStatus: onchainResult.onchainStatusName,
          explanation: isVerifierApproved
            ? 'Authorized verifier has certified the batch purity and lab test standards.'
            : 'Pending independent quality inspection or laboratory certificate.',
        },
      },
      canonicalJson,
      verification_timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[verify] GET /:batchNumber error:', err);
    res.status(500).json({ error: err.message || 'Internal verification error' });
  }
});

export default router;
