import test from 'node:test';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import {
  calculateEscrowTotalWei,
  getEscrowProductId,
  parseEthPerKg,
  quantityToHundredths,
} from './escrow.js';

test('escrow product IDs are deterministic and domain-separated from display IDs', () => {
  assert.equal(getEscrowProductId('product-1'), ethers.id('product-1'));
  assert.notEqual(getEscrowProductId('product-1'), 'product-1');
});

test('kg quantities are converted to hundredths without accepting excess precision', () => {
  assert.equal(quantityToHundredths('0.01'), 1n);
  assert.equal(quantityToHundredths('2.50'), 250n);
  assert.throws(() => quantityToHundredths('0'));
  assert.throws(() => quantityToHundredths('1.001'));
});

test('ETH/kg is parsed exactly and purchase totals round fractional wei up', () => {
  const price = parseEthPerKg('0.02');
  assert.equal(price, ethers.parseEther('0.02'));
  assert.equal(calculateEscrowTotalWei(price, 250n), ethers.parseEther('0.05'));
  assert.throws(() => parseEthPerKg('0.0000000000000000001'));
  assert.throws(() => parseEthPerKg('0'));
});
