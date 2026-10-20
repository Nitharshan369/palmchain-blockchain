import { ethers } from 'ethers';
import { canonicalJsonStringify, generateSHA256Hash } from '../utils/hash.js';

export const MIN_PRICE_INR = 0.01;
export const MAX_PRICE_INR = 1000000;
export const MAX_QUANTITY_KG = 100000;
export const MAX_IMAGE_COUNT = 8;
export const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;
export const MAX_PAYMENT_PRICE_WEI = (1n << 128n) - 1n;

export function validateListingInput(input = {}) {
  const errors = {};
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const price = Number(input.price_inr);
  const quantity = Number(input.quantity_kg);
  const description = input.description == null ? '' : input.description;
  const images = input.image_urls ?? [];
  const paymentPriceWei = input.payment_price_per_kg_wei;

  if (!title || title.length > 255) errors.title = 'Title must contain 1 to 255 characters';
  if (!Number.isFinite(price) || price < MIN_PRICE_INR || price > MAX_PRICE_INR) {
    errors.price_inr = `Price per kg must be between ${MIN_PRICE_INR} and ${MAX_PRICE_INR} INR`;
  } else if (Math.abs(Math.round(price * 100) - price * 100) > 1e-8) {
    errors.price_inr = 'Price per kg can have no more than 2 decimal places';
  }
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_QUANTITY_KG) {
    errors.quantity_kg = `Quantity must be greater than 0 and at most ${MAX_QUANTITY_KG} kg`;
  } else if (Math.abs(Math.round(quantity * 100) - quantity * 100) > 1e-8) {
    errors.quantity_kg = 'Quantity can have no more than 2 decimal places';
  }
  if (typeof description !== 'string' || description.length > 10000) {
    errors.description = 'Description must not exceed 10000 characters';
  }
  if (typeof paymentPriceWei !== 'string' || paymentPriceWei.length > 39 || !/^[1-9]\d*$/.test(paymentPriceWei)
      || BigInt(paymentPriceWei) > MAX_PAYMENT_PRICE_WEI) {
    errors.payment_price_per_kg_wei = 'A valid positive Sepolia ETH/kg price is required';
  }
  if (!Array.isArray(images) || images.length > MAX_IMAGE_COUNT
      || images.some((image) => typeof image !== 'string' || image.length > 2048 || !isHttpImageUrl(image))) {
    errors.image_urls = `Provide no more than ${MAX_IMAGE_COUNT} image URLs, each up to 2048 characters`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { title, price, quantity, description, images, paymentPriceWei },
  };
}

export function validatePurchaseInput(input) {
  const quantity = Number(input.quantity_kg);
  const requestKey = input.request_key;
  return {
    valid: Number.isFinite(quantity) && quantity > 0 && quantity <= MAX_QUANTITY_KG
      && Math.abs(Math.round(quantity * 100) - quantity * 100) < 1e-8
      && typeof requestKey === 'string'
      && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey),
    quantity,
    requestKey,
  };
}

function isHttpImageUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isProducerOwner(record, producerId) {
  return Boolean(record && producerId && record.producer_id === producerId);
}

export function isVerifiedProducerStatus(status) {
  return Number(status) === 2;
}

export function hasAvailableInventory(availableKg, reservedKg, requestedKg) {
  const available = Number(availableKg);
  const reserved = Number(reservedKg);
  const requested = Number(requestedKg);
  return Number.isFinite(available) && Number.isFinite(reserved) && Number.isFinite(requested)
    && requested > 0 && reserved >= 0 && reserved <= available
    && requested <= available - reserved;
}

export function buildMarketplaceSignatureMessage({ method, path, timestamp, nonce, body }) {
  return JSON.stringify({
    application: 'PalmChain Marketplace',
    version: 1,
    method,
    path,
    timestamp,
    nonce,
    body,
  });
}

export function validateMarketplaceSignature({ wallet, signature, timestamp, nonce, method, path, body, now = Date.now() }) {
  if (!ethers.isAddress(wallet) || !signature || typeof nonce !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce)) return false;
  const numericTimestamp = Number(timestamp);
  if (!Number.isSafeInteger(numericTimestamp) || Math.abs(now - numericTimestamp) > SIGNATURE_MAX_AGE_MS) return false;

  try {
    const message = buildMarketplaceSignatureMessage({ method, path, timestamp: numericTimestamp, nonce, body });
    return ethers.getAddress(ethers.verifyMessage(message, signature)) === ethers.getAddress(wallet);
  } catch {
    return false;
  }
}

export function isEligibleOnChainBatch(batch, chainBatch, walletAddress) {
  if (!batch || !chainBatch || !walletAddress) return false;
  const status = Number(chainBatch.status);
  const chainHash = String(chainBatch.dataHash || '').toLowerCase();
  const storedHash = String(batch.sha256_hash || '').toLowerCase();
  const cleanStoredHash = storedHash.startsWith('0x') ? storedHash : `0x${storedHash}`;
  const canonicalMetadata = batch.canonical_metadata;
  const canonicalHash = canonicalMetadata
    ? `0x${generateSHA256Hash(canonicalJsonStringify(canonicalMetadata))}`
    : cleanStoredHash;
  return (status === 3 || status === 4)
    && ethers.getAddress(chainBatch.producer) === ethers.getAddress(walletAddress)
    && chainHash === cleanStoredHash
    && chainHash === canonicalHash
    && Number(batch.available_stock_kg) > 0;
}
