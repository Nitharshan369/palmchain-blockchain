import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from 'ethers';
import { buildCanonicalBatchPayload, canonicalJsonStringify, generateSHA256Hash } from '../utils/hash.js';
import {
  buildMarketplaceSignatureMessage,
  hasAvailableInventory,
  isProducerOwner,
  isVerifiedProducerStatus,
  isEligibleOnChainBatch,
  validateListingInput,
  validateMarketplaceSignature,
  validatePurchaseInput,
} from './marketplace.js';

test('listing validation accepts valid INR/kg and quantity values and rejects invalid values', () => {
  assert.equal(validateListingInput({
    title: 'Palm jaggery',
    description: 'Traditional batch',
    price_inr: '245.50',
    quantity_kg: '10.25',
    image_urls: ['https://example.test/image.jpg'],
  }).valid, true);

  const invalid = validateListingInput({
    title: ' ',
    price_inr: 0,
    quantity_kg: -1,
    image_urls: Array(9).fill('https://example.test/image.jpg'),
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.price_inr);
  assert.ok(invalid.errors.quantity_kg);
  assert.ok(invalid.errors.image_urls);
});

test('producer signature is bound to method, path, timestamp, nonce, and body', async () => {
  const signer = Wallet.createRandom();
  const timestamp = Date.now();
  const nonce = '00112233-4455-4677-8899-aabbccddeeff';
  const body = { title: 'Palm jaggery', quantity_kg: 2 };
  const message = buildMarketplaceSignatureMessage({
    method: 'POST', path: '/manage', timestamp, nonce, body,
  });
  const signature = await signer.signMessage(message);

  assert.equal(validateMarketplaceSignature({
    wallet: signer.address, signature, timestamp, nonce, method: 'POST', path: '/manage', body,
  }), true);
  assert.equal(validateMarketplaceSignature({
    wallet: signer.address, signature, timestamp, nonce, method: 'DELETE', path: '/manage', body,
  }), false);
  assert.equal(validateMarketplaceSignature({
    wallet: signer.address, signature, timestamp: timestamp - 6 * 60 * 1000, nonce,
    method: 'POST', path: '/manage', body,
  }), false);
});

test('listing eligibility requires packaged/listed chain status, matching producer and hash', () => {
  const batch = {
    batch_number: 'PJG-TEST-1',
    producerAddress: '0x0000000000000000000000000000000000000001',
    harvest_date: '2026-01-01',
    neera_liters: 12,
    total_quantity_kg: 5,
    sha256_hash: '',
    available_stock_kg: 5,
  };
  const canonicalMetadata = buildCanonicalBatchPayload(batch);
  const hash = generateSHA256Hash(canonicalJsonStringify(canonicalMetadata));
  batch.canonical_metadata = canonicalMetadata;
  batch.sha256_hash = hash;
  const chainBatch = {
    status: 3,
    producer: '0x0000000000000000000000000000000000000001',
    dataHash: `0x${hash}`,
  };
  assert.equal(isEligibleOnChainBatch(batch, chainBatch, chainBatch.producer), true);
  assert.equal(isEligibleOnChainBatch(batch, { ...chainBatch, status: 2 }, chainBatch.producer), false);
  assert.equal(isEligibleOnChainBatch(batch, { ...chainBatch, dataHash: `0x${'b'.repeat(64)}` }, chainBatch.producer), false);
  assert.equal(isEligibleOnChainBatch({
    ...batch,
    canonical_metadata: { ...canonicalMetadata, productionNotes: 'tampered' },
  }, chainBatch, chainBatch.producer), false);
});

test('listing permissions are scoped to the resolved producer profile', () => {
  assert.equal(isProducerOwner({ producer_id: 'producer-1' }, 'producer-1'), true);
  assert.equal(isProducerOwner({ producer_id: 'producer-1' }, 'producer-2'), false);
  assert.equal(isProducerOwner({ producer_id: 'producer-1' }, null), false);
  assert.equal(isVerifiedProducerStatus(2), true);
  assert.equal(isVerifiedProducerStatus(1), false);
});

test('inventory reservation rejects quantities beyond stock after existing reservations', () => {
  assert.equal(hasAvailableInventory(10, 4, 6), true);
  assert.equal(hasAvailableInventory(10, 4, 6.01), false);
  assert.equal(hasAvailableInventory(10, 11, 1), false);
});

test('purchase input requires a positive quantity and UUID idempotency key', () => {
  assert.equal(validatePurchaseInput({
    quantity_kg: '1.25',
    request_key: '00112233-4455-4677-8899-aabbccddeeff',
  }).valid, true);
  assert.equal(validatePurchaseInput({ quantity_kg: 0, request_key: 'invalid' }).valid, false);
});
