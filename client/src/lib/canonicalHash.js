import { ethers } from 'ethers';

/**
 * PalmChain Canonical Hashing Schema Specification
 * 
 * Versioning allows evolving the data schema while preserving cryptographic
 * verifiability of legacy batches.
 */
export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * The 7 standard Palm-Jaggery production lifecycle stages required for traceability.
 */
export const STANDARD_PRODUCTION_STAGES = [
  {
    order: 1,
    name: 'Neera Collection',
    defaultLocation: 'Palmyrah Orchard, Plot A',
    stageType: 'application_recorded',
    description: 'Fresh sap collected from healthy palms at dawn in lime-coated clay pots to inhibit fermentation.',
  },
  {
    order: 2,
    name: 'Filtering',
    defaultLocation: 'Processing Pan Facility',
    stageType: 'application_recorded',
    description: 'Multi-layer microfiltration through organic unbleached cotton mesh with natural clarification agents.',
  },
  {
    order: 3,
    name: 'Boiling',
    defaultLocation: 'Biomass Hearth Unit',
    stageType: 'application_recorded',
    description: 'Slow open-pan evaporation fueled exclusively by fallen palm fronds and husk biomass.',
  },
  {
    order: 4,
    name: 'Concentration',
    defaultLocation: 'Finishing Pan',
    stageType: 'application_recorded',
    description: 'High-temperature evaporation until syrup reaches strike-point consistency (118°C–120°C).',
  },
  {
    order: 5,
    name: 'Moulding',
    defaultLocation: 'Moulding & Curing Room',
    stageType: 'application_recorded',
    description: 'Pouring thick amber jaggery syrup into halved coconut shell or natural wooden moulds.',
  },
  {
    order: 6,
    name: 'Drying',
    defaultLocation: 'Aerated Drying Racks',
    stageType: 'application_recorded',
    description: 'Cooling and natural moisture equilibrium under controlled dust-free airflow.',
  },
  {
    order: 7,
    name: 'Packaging',
    defaultLocation: 'Cooperative Packing Station',
    stageType: 'application_recorded',
    description: 'Eco-friendly palm leaf / unbleached paper wrap sealed with tamper-evident batch QR code passport.',
  },
];

/**
 * Strips '0x' prefix from a hex string if present.
 */
export function strip0x(hash) {
  if (!hash || typeof hash !== 'string') return '';
  return hash.startsWith('0x') || hash.startsWith('0X') ? hash.slice(2).toLowerCase() : hash.toLowerCase();
}

/**
 * Ensures '0x' prefix on a hex string.
 */
export function to0xHash(hash) {
  if (!hash || typeof hash !== 'string') return '';
  const clean = strip0x(hash);
  return clean ? `0x${clean}` : '';
}

/**
 * Returns a canonical, sorted-key stringified JSON.
 * Deterministic: identical objects produce byte-for-byte identical strings.
 */
export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map(key => `${JSON.stringify(key)}:${canonicalJsonStringify(obj[key])}`);
  return '{' + entries.join(',') + '}';
}

/**
 * Builds the canonical payload for a production batch according to schema version.
 */
export function buildCanonicalBatchPayload(raw = {}) {
  const schemaVersion = raw.schemaVersion || raw.schema_version || CURRENT_SCHEMA_VERSION;

  // Normalize batch identifier
  const batchId = String(raw.batchId || raw.batch_number || raw.batch_code || '').trim().toUpperCase();

  // Normalize producer wallet address (lowercase)
  const producerAddress = String(
    raw.producerAddress ||
    raw.producer_address ||
    (raw.producer && raw.producer.wallet_address) ||
    ''
  ).trim().toLowerCase();

  // Production Date
  const productionDate = String(
    raw.productionDate ||
    raw.production_date ||
    raw.harvestDate ||
    raw.harvest_date ||
    new Date().toISOString().split('T')[0]
  ).trim();

  // Trees used: sorted array of string identifiers
  let treesUsed = [];
  const rawTrees = raw.treesUsed || raw.trees_used || raw.selectedTrees;
  if (Array.isArray(rawTrees)) {
    treesUsed = rawTrees.map(t => (typeof t === 'string' ? t.trim() : String(t.id || t.code || ''))).filter(Boolean).sort();
  } else if (typeof rawTrees === 'string') {
    treesUsed = rawTrees.split(',').map(s => s.trim()).filter(Boolean).sort();
  }

  // Neera collected in liters (rounded to 2 decimal places)
  const neeraLiters = Number(
    parseFloat(raw.neeraLiters ?? raw.neera_liters ?? raw.neera_volume_liters ?? raw.sapVolumeLiters ?? 0).toFixed(2)
  );

  // Jaggery produced in kg (rounded to 2 decimal places)
  const jaggeryKg = Number(
    parseFloat(raw.jaggeryKg ?? raw.jaggery_kg ?? raw.total_quantity_kg ?? raw.outputKg ?? 0).toFixed(2)
  );

  // Production notes
  const productionNotes = String(raw.productionNotes || raw.production_notes || raw.notes || '').trim();

  // Stages: array of 7 normalized stages with application-recorded vs independently verified flag
  const inputStages = raw.stages || raw.batch_trace_logs || [];
  const stages = STANDARD_PRODUCTION_STAGES.map((std, idx) => {
    const existing = Array.isArray(inputStages)
      ? inputStages.find(s => (s.order === std.order || s.stage_order === std.order || (s.name && s.name.toLowerCase() === std.name.toLowerCase()))) || inputStages[idx]
      : null;

    return {
      order: std.order,
      name: std.name,
      date: String(existing?.date || existing?.stage_timestamp || productionDate).trim(),
      location: String(existing?.location || existing?.location_name || std.defaultLocation).trim(),
      operator: String(existing?.operator || existing?.recorded_by || 'Field Supervisor').trim(),
      notes: String(existing?.notes || std.description).trim(),
      parameters: existing?.parameters || existing?.metadata || {},
      stageType: existing?.stageType || std.stageType,
      isVerified: Boolean(existing?.isVerified || false),
    };
  });

  // Supporting image/document references
  const documentRefs = Array.isArray(raw.documentRefs || raw.document_refs)
    ? (raw.documentRefs || raw.document_refs).map(d => ({
        title: String(d.title || d.name || '').trim(),
        url: String(d.url || '').trim(),
        type: String(d.type || 'reference').trim(),
      })).filter(d => d.url)
    : [];

  return {
    schemaVersion,
    batchId,
    producerAddress,
    productionDate,
    treesUsed,
    neeraLiters,
    jaggeryKg,
    productionNotes,
    stages,
    documentRefs,
  };
}

/**
 * Generates deterministic SHA-256 hash using ethers.js
 */
export function generateSHA256Hash(data) {
  const payload = typeof data === 'string' ? data : canonicalJsonStringify(data);
  return ethers.sha256(ethers.toUtf8Bytes(payload));
}

/**
 * Verifies batch data integrity
 */
export function verifyBatchIntegrity(batchRecord, onChainHash = '') {
  const canonicalPayload = buildCanonicalBatchPayload(batchRecord);
  const canonicalJson = canonicalJsonStringify(canonicalPayload);
  const computedHash = generateSHA256Hash(canonicalJson);

  const cleanComputed = strip0x(computedHash);
  const cleanStored = strip0x(batchRecord.sha256_hash || batchRecord.sha256Hash || batchRecord.metadata_hash || '');
  const cleanOnChain = strip0x(onChainHash || batchRecord.onchain_data_hash || '');

  const targetHash = cleanOnChain || cleanStored;
  const isValid = Boolean(targetHash) && cleanComputed === targetHash;

  return {
    isValid,
    computedHash: to0xHash(cleanComputed),
    storedHash: to0xHash(cleanStored),
    onChainHash: to0xHash(cleanOnChain),
    canonicalPayload,
    canonicalJson,
    schemaVersion: canonicalPayload.schemaVersion,
  };
}
