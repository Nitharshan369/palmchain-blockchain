/**
 * PalmChain API Client
 * Wrapper for backend Express API calls (server-side operations)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(method, path, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
};

// ─── Profiles ────────────────────────────────────────────────────────────────
export const profilesApi = {
  upsert: (profile) => api.post('/profiles', profile),
  getByWallet: (wallet) => api.get(`/profiles/wallet/${wallet}`),
};

// ─── Batches ─────────────────────────────────────────────────────────────────
export const batchesApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/batches${qs ? '?' + qs : ''}`);
  },
  getById: (id) => api.get(`/batches/${id}`),
  getByBatchNumber: (num) => api.get(`/batches/number/${num}`),
  create: (batch) => api.post('/batches', batch),
  anchorToChain: (id, txData) => api.post(`/batches/${id}/anchor`, txData),
};

// ─── Products ────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/products${qs ? '?' + qs : ''}`);
  },
  getById: (id) => api.get(`/products/${id}`),
  create: (product) => api.post('/products', product),
};

// ─── Verification ─────────────────────────────────────────────────────────────
export const verifyApi = {
  batch: (batchNumber) => api.get(`/verify/${batchNumber}`),
};
