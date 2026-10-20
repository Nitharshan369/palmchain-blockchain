import test from 'node:test';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import {
  PAYMENT_ESCROW_ABI,
  getEscrowProductId,
  parseConfirmedPurchase,
  quantityHundredthsToKg,
} from './escrow.js';

test('escrow product hash is deterministic and kg conversion preserves two decimals', () => {
  assert.equal(getEscrowProductId('product-1'), ethers.id('product-1'));
  assert.equal(quantityHundredthsToKg(125n), '1.25');
  assert.throws(() => quantityHundredthsToKg(0n));
});

test('receipt validation extracts only a successful Sepolia purchase for the expected parties', () => {
  const escrowAddress = '0x00000000000000000000000000000000000000e5';
  const buyer = '0x0000000000000000000000000000000000000001';
  const seller = '0x0000000000000000000000000000000000000002';
  const productId = 'product-1';
  const contract = new ethers.Contract(escrowAddress, PAYMENT_ESCROW_ABI);
  const contractInterface = new ethers.Interface(PAYMENT_ESCROW_ABI);
  const event = contractInterface.encodeEventLog(
    contractInterface.getEvent('PurchaseCreated'),
    [7n, getEscrowProductId(productId), buyer, seller, 125n, 2n, 3n, 1234n]
  );
  const fundedEvent = contractInterface.encodeEventLog(
    contractInterface.getEvent('EscrowFunded'),
    [7n, buyer, 3n]
  );
  const receipt = {
    status: 1,
    logs: [
      { address: escrowAddress, ...event },
      { address: escrowAddress, ...fundedEvent },
    ],
  };
  const transaction = {
    chainId: 11155111n,
    to: escrowAddress,
    from: buyer,
    value: 3n,
  };

  const result = parseConfirmedPurchase({ receipt, transaction, escrow: contract, productId, seller });
  assert.equal(result.orderId, '7');
  assert.equal(result.quantityKg, '1.25');
  assert.equal(result.totalWei, '3');

  assert.throws(
    () => parseConfirmedPurchase({ receipt, transaction: { ...transaction, chainId: 1n }, escrow: contract, productId, seller }),
    /must be on Sepolia/
  );
  assert.throws(
    () => parseConfirmedPurchase({ receipt, transaction, escrow: contract, productId: 'other-product', seller }),
    /does not match/
  );
});
