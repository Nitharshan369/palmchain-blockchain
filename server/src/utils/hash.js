import crypto from 'crypto';

/**
 * Generates a deterministic SHA-256 hash of a batch object or string.
 * Ensures consistent canonical JSON key ordering so identical data yields identical hashes.
 * 
 * @param {object|string} data 
 * @returns {string} Hex-encoded SHA-256 hash prefixed with '0x' or standard hex
 */
export function generateSHA256Hash(data) {
  const payload = typeof data === 'string' ? data : canonicalJsonStringify(data);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Returns a canonical stringified JSON with sorted keys.
 * 
 * @param {any} obj 
 * @returns {string}
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
