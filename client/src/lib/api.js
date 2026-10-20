/**
 * PalmChain API Client
 * Wrapper for backend Express API calls (server-side operations)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(method, path, body, extraHeaders = {}) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorObj = new Error(data.error || `HTTP ${res.status}`);
    errorObj.data = data;
    errorObj.status = res.status;
    throw errorObj;
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};

// ─── Profiles ────────────────────────────────────────────────────────────────
export const profilesApi = {
  upsert: (profile, signer) => producerRequest('POST', '/', profile, signer, '/profiles'),
  syncProducer: (profile, signer) => producerRequest('POST', '/producer', profile, signer, '/profiles'),
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
  generateCode: () => api.get('/batches/generate-code'),
  create: (batch) => api.post('/batches', batch),
  anchorToChain: (id, txData) => api.post(`/batches/${id}/anchor`, txData),
};

// ─── Products ────────────────────────────────────────────────────────────────
async function producerRequest(method, path, body, signer, resource = '/products') {
  if (!signer) throw new Error('Connect the producer wallet to sign this request.');
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const signedBody = body || {};
  const signature = await signer.signMessage(JSON.stringify({
    application: 'PalmChain Marketplace',
    version: 1,
    method,
    path,
    timestamp,
    nonce,
    body: signedBody,
  }));
  return request(method, `${resource}${path}`, body, {
    'X-PalmChain-Wallet': await signer.getAddress(),
    'X-PalmChain-Timestamp': String(timestamp),
    'X-PalmChain-Nonce': nonce,
    'X-PalmChain-Signature': signature,
  });
}

export const productsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/products${qs ? '?' + qs : ''}`);
  },
  getById: (id) => api.get(`/products/${id}`),
  escrowOrders: (wallet) => api.get(`/products/escrow-orders/${wallet}`),
  manage: (signer) => producerRequest('GET', '/manage', undefined, signer),
  create: (product, signer) => producerRequest('POST', '/manage', product, signer),
  update: (id, product, signer) => producerRequest('PATCH', `/manage/${id}`, product, signer),
  syncEscrowListing: (id, transaction_hash) => api.post(`/products/${id}/escrow-listing-sync`, {
    transaction_hash,
  }),
  syncEscrowPurchase: (id, transaction_hash) => api.post(`/products/${id}/escrow-settlement`, {
    transaction_hash,
  }),
};

// ─── Verification ─────────────────────────────────────────────────────────────
export const verifyApi = {
  batch: (batchNumber) => api.get(`/verify/${batchNumber}`),
};
