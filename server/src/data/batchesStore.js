import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mockBatches } from './mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, 'batches_store.json');

/**
 * Initializes persistent store if file does not exist.
 */
function ensureStoreExists() {
  if (!fs.existsSync(STORE_PATH)) {
    // Seed with mock batches formatted properly
    fs.writeFileSync(STORE_PATH, JSON.stringify(mockBatches, null, 2), 'utf8');
  }
}

/**
 * Read all batches from persistent file store.
 */
export function getStoredBatches() {
  ensureStoreExists();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[batchesStore] Read error, returning empty list:', err.message);
    return [];
  }
}

/**
 * Find batch by batch number or id.
 */
export function findStoredBatch(query) {
  if (!query) return null;
  const q = String(query).trim().toUpperCase();
  const batches = getStoredBatches();
  return batches.find(
    (b) =>
      (b.batch_number && b.batch_number.toUpperCase() === q) ||
      (b.batchId && b.batchId.toUpperCase() === q) ||
      (b.id && String(b.id) === query)
  ) || null;
}

/**
 * Save or update a batch in persistent file store.
 */
export function upsertStoredBatch(batchData) {
  ensureStoreExists();
  const batches = getStoredBatches();
  const batchCode = (
    batchData.batch_number ||
    batchData.batchId ||
    batchData.batch_code ||
    ''
  ).trim().toUpperCase();

  const index = batches.findIndex(
    (b) =>
      (b.batch_number && b.batch_number.toUpperCase() === batchCode) ||
      (b.batchId && b.batchId.toUpperCase() === batchCode) ||
      (batchData.id && b.id === batchData.id)
  );

  const updatedBatch = {
    ...batchData,
    batch_number: batchCode,
    batchId: batchCode,
    updated_at: new Date().toISOString(),
  };

  if (index >= 0) {
    batches[index] = { ...batches[index], ...updatedBatch };
  } else {
    batches.unshift({
      id: batchData.id || `batch-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...updatedBatch,
    });
  }

  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(batches, null, 2), 'utf8');
  } catch (err) {
    console.error('[batchesStore] Write error:', err.message);
  }

  return updatedBatch;
}
