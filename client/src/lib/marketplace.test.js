import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProducts, normalizeProduct } from './marketplace.js';

const products = [
  normalizeProduct({
    id: 'one',
    title: 'Tenkasi Palm Jaggery',
    price_inr: 240,
    available_quantity_kg: 4,
    batch: { batch_number: 'PJG-1', form: 'solid_block', is_certified: true, farm: { region: 'Tenkasi' } },
    producer: { full_name: 'Murugan Cooperative' },
  }),
  normalizeProduct({
    id: 'two',
    title: 'Tuticorin Granulated Sugar',
    price_inr: 420,
    available_quantity_kg: 1,
    batch: { batch_number: 'PJG-2', form: 'granulated_powder', farm: { region: 'Tuticorin' } },
    producer: { full_name: 'Coastal Farmers' },
  }),
];

test('product normalization maps Supabase listing and batch details for the marketplace', () => {
  assert.equal(products[0].batchId, 'PJG-1');
  assert.equal(products[0].pricePerKg, 240);
  assert.equal(products[0].stockKg, 4);
  assert.equal(products[0].producer.location, 'Tenkasi');
});

test('marketplace search covers product, producer, and batch and supports filters', () => {
  assert.deepEqual(filterProducts(products, { searchQuery: 'murugan' }).map((item) => item.id), ['one']);
  assert.deepEqual(filterProducts(products, { searchQuery: 'PJG-2' }).map((item) => item.id), ['two']);
  assert.deepEqual(filterProducts(products, { selectedRegion: 'tenkasi' }).map((item) => item.id), ['one']);
  assert.deepEqual(filterProducts(products, { selectedForm: 'granulated' }).map((item) => item.id), ['two']);
  assert.deepEqual(filterProducts(products, { certifiedOnly: true }).map((item) => item.id), ['one']);
  assert.deepEqual(filterProducts(products, { priceRange: '200to300' }).map((item) => item.id), ['one']);
  assert.deepEqual(filterProducts(products, { sortBy: 'price-high' }).map((item) => item.id), ['two', 'one']);
});
