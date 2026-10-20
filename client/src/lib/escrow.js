import { ethers } from 'ethers';

export const ESCROW_ORDER_STATUS = {
  0: 'unavailable',
  1: 'escrowed',
  2: 'fulfilled',
  3: 'disputed',
  4: 'released',
  5: 'refunded',
};

export function getEscrowProductId(productId) {
  if (!productId) throw new Error('A product ID is required');
  return ethers.id(String(productId));
}

export function quantityToHundredths(quantityKg) {
  const quantity = Number(quantityKg);
  if (!Number.isFinite(quantity) || quantity <= 0
      || Math.abs(Math.round(quantity * 100) - quantity * 100) > 1e-8) {
    throw new Error('Quantity must be positive and use no more than two decimal places');
  }
  return BigInt(Math.round(quantity * 100));
}

export function parseEthPerKg(value) {
  const input = String(value ?? '').trim();
  if (!/^(?:\d+)(?:\.\d{1,18})?$/.test(input)) {
    throw new Error('Enter a positive Sepolia ETH price per kg with up to 18 decimal places');
  }
  const wei = ethers.parseEther(input);
  if (wei <= 0n || wei >= 1n << 128n) {
    throw new Error('Sepolia ETH price per kg is outside the supported range');
  }
  return wei;
}

export function calculateEscrowTotalWei(pricePerKgWei, quantityHundredths) {
  const price = BigInt(pricePerKgWei);
  const quantity = BigInt(quantityHundredths);
  if (price <= 0n || quantity <= 0n) throw new Error('Price and quantity must be positive');
  return (price * quantity + 99n) / 100n;
}
