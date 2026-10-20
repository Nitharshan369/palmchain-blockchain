import express from 'express';
import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import { verifyWalletSignature } from '../middleware/verifyWalletSignature.js';
import {
  isEligibleOnChainBatch,
  isProducerOwner,
  isVerifiedProducerStatus,
  hasAvailableInventory,
  validateListingInput,
  validatePurchaseInput,
} from '../services/marketplace.js';

const router = express.Router();
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const PRODUCER_REGISTRY_ADDRESS =
  process.env.PALMCHAIN_PRODUCER_REGISTRY_ADDRESS
  || process.env.VITE_PRODUCER_REGISTRY_ADDRESS
  || '0xD4B4BF61a6e70bd4e9B44E3941523c57Ed27d00D';
const BATCH_REGISTRY_ADDRESS =
  process.env.PALMCHAIN_BATCH_REGISTRY_ADDRESS
  || process.env.VITE_BATCH_REGISTRY_ADDRESS
  || '0xB77f75af51Ea8680665A3c5749de7b3e3b2C7829';

const PRODUCER_REGISTRY_ABI = [
  'function getProducer(address producer) view returns (tuple(address wallet, string name, uint8 status, uint256 registeredAt, uint256 verifiedAt))',
];
const BATCH_REGISTRY_ABI = [
  'function getBatch(string batchId) view returns (tuple(string batchId, address producer, uint256 createdAt, uint256 neeraLiters, uint256 jaggeryKg, bytes32 dataHash, uint8 status, address verifier, uint256 verifiedAt, string rejectionReason))',
];
const BATCH_STATUSES = ['Created', 'Processing', 'Verified', 'Packaged', 'Listed', 'Sold', 'Rejected', 'Recalled'];

function requireDatabase(res) {
  if (!supabase) {
    res.status(503).json({ error: 'Marketplace database is not configured' });
    return false;
  }
  return true;
}

function getBatchContract() {
  if (!ethers.isAddress(BATCH_REGISTRY_ADDRESS)) {
    throw new Error('BatchRegistry address is not configured on the server');
  }
  return new ethers.Contract(
    BATCH_REGISTRY_ADDRESS,
    BATCH_REGISTRY_ABI,
    new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
  );
}

function getProducerContract() {
  if (!ethers.isAddress(PRODUCER_REGISTRY_ADDRESS)) {
    throw new Error('ProducerRegistry address is not configured on the server');
  }
  return new ethers.Contract(
    PRODUCER_REGISTRY_ADDRESS,
    PRODUCER_REGISTRY_ABI,
    new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
  );
}

async function readChainBatch(batchNumber) {
  let batch;
  try {
    batch = await getBatchContract().getBatch(batchNumber);
  } catch (error) {
    if (error.code === 'CALL_EXCEPTION') return null;
    throw error;
  }
  if (!batch) return null;
  return {
    batchId: batch.batchId,
    producer: batch.producer,
    dataHash: batch.dataHash,
    status: Number(batch.status),
    statusName: BATCH_STATUSES[Number(batch.status)] || 'Unknown',
    jaggeryKg: Number(batch.jaggeryKg) / 100,
  };
}

async function getProducerProfile(walletAddress) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, wallet_address, full_name, organization_name, role, is_active')
    .ilike('wallet_address', walletAddress)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.role !== 'producer' || !data.is_active) return null;
  return data;
}

async function requireProducerSignature(req, res, next) {
  if (!requireDatabase(res)) return;

  try {
    const wallet = await verifyWalletSignature(req);
    const profile = await getProducerProfile(wallet);
    if (!profile) return res.status(403).json({ error: 'This wallet is not an active PalmChain producer profile' });
    req.marketplaceProducer = profile;
    req.marketplaceWallet = wallet;
    return next();
  } catch (error) {
    console.error('[products] Producer authorization failed:', error.message);
    return res.status(error.status || 503).json({ error: error.message || 'Producer authorization could not be verified' });
  }
}

async function requireVerifiedProducer(walletAddress) {
  const { status } = await getProducerContract().getProducer(walletAddress);
  if (!isVerifiedProducerStatus(status)) {
    const error = new Error('Only currently verified on-chain producers can publish or reactivate listings');
    error.status = 403;
    throw error;
  }
}

async function loadProducerBatch(batchId, producer) {
  const { data, error } = await supabase
    .from('batches')
    .select(`
      *,
      producer:profiles!batches_producer_id_fkey(id, wallet_address, full_name, organization_name),
      farm:farms(id, farm_name, region, state),
      batch_trace_logs(id, stage_name, stage_order, location_name, stage_timestamp, notes, metadata)
    `)
    .eq('id', batchId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const missing = new Error('Batch not found');
    missing.status = 404;
    throw missing;
  }
  if (!isProducerOwner(data, producer.id)) {
    const denied = new Error('This batch does not belong to the signed-in producer');
    denied.status = 403;
    throw denied;
  }
  const chainBatch = await readChainBatch(data.batch_number);
  if (!isEligibleOnChainBatch(data, chainBatch, producer.wallet_address)
      || Number(data.available_stock_kg) > chainBatch.jaggeryKg) {
    const invalid = new Error('Batch must be hash-matched and in Packaged or Listed on-chain status with stock available');
    invalid.status = 409;
    throw invalid;
  }
  return { ...data, chain_status: chainBatch.statusName };
}

function rpcError(res, error, fallback = 'Marketplace operation failed') {
  const message = error?.message || fallback;
  const permissionError = error?.code === '42501' || message.includes('does not belong');
  const validationError = error?.code === '22023';
  return res.status(permissionError ? 403 : validationError ? 409 : 500).json({
    error: message,
  });
}

async function listPublicProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      batch:batches(
        id, producer_id, batch_number, status, is_certified, harvest_date, processing_date, form,
        total_quantity_kg, available_stock_kg, sha256_hash, qr_code_payload, canonical_metadata,
        batch_trace_logs(id, stage_name, stage_order, location_name, stage_timestamp, notes, metadata),
        farm:farms(id, farm_name, region, state),
        producer:profiles!batches_producer_id_fkey(id, full_name, organization_name, wallet_address)
      ),
      producer:profiles!products_producer_id_fkey(id, full_name, organization_name, wallet_address)
    `)
    .eq('is_active', true)
    .eq('listing_status', 'active')
    .gt('available_quantity_kg', 0)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const products = [];
  const producerStatusCache = new Map();
  for (const product of data || []) {
    if (!product.batch?.batch_number || !product.batch.sha256_hash
        || product.batch.producer_id !== product.producer_id) continue;
    const chainBatch = await readChainBatch(product.batch.batch_number);
    if (!isEligibleOnChainBatch(product.batch, chainBatch, product.producer?.wallet_address)) continue;
    let producerVerified = producerStatusCache.get(product.producer?.wallet_address);
    if (producerVerified === undefined) {
      const { status } = await getProducerContract().getProducer(product.producer.wallet_address);
      producerVerified = isVerifiedProducerStatus(status);
      producerStatusCache.set(product.producer.wallet_address, producerVerified);
    }
    if (!producerVerified) continue;
    product.chain_status = chainBatch.statusName;
    product.batch.chain_status = chainBatch.statusName;
    product.batch.batch_trace_logs?.sort((a, b) => a.stage_order - b.stage_order);
    products.push(product);
  }
  return products;
}

router.get('/', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const products = await listPublicProducts();
    const { producerId, limit = 20, page = 1 } = req.query;
    const selected = producerId
      ? products.filter((product) => product.producer_id === producerId)
      : products;
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const from = (pageNumber - 1) * pageSize;
    return res.json({
      products: selected.slice(from, from + pageSize),
      total: selected.length,
      page: pageNumber,
      limit: pageSize,
    });
  } catch (error) {
    console.error('[products] Catalog request failed:', error.message);
    return res.status(503).json({ error: 'Marketplace catalog could not be verified against Supabase and Sepolia' });
  }
});

router.get('/manage', requireProducerSignature, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        batch:batches(id, batch_number, status, form, available_stock_kg, marketplace_reserved_kg, sha256_hash),
        producer:profiles!products_producer_id_fkey(id, full_name, organization_name)
      `)
      .eq('producer_id', req.marketplaceProducer.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select(`
        id, batch_number, form, total_quantity_kg, available_stock_kg, canonical_metadata,
        marketplace_reserved_kg, sha256_hash, producer_id,
        farm:farms(farm_name, region, state),
        batch_trace_logs(id, stage_name, stage_order, location_name, stage_timestamp, notes, metadata)
      `)
      .eq('producer_id', req.marketplaceProducer.id)
      .gt('available_stock_kg', 0)
      .order('created_at', { ascending: false });
    if (batchError) throw batchError;

    const eligibleBatches = [];
    const { status: producerStatus } = await getProducerContract().getProducer(req.marketplaceWallet);
    if (isVerifiedProducerStatus(producerStatus)) {
      for (const batch of batches || []) {
        const chainBatch = await readChainBatch(batch.batch_number);
        if (chainBatch && isEligibleOnChainBatch(batch, chainBatch, req.marketplaceWallet)
            && Number(batch.available_stock_kg) <= chainBatch.jaggeryKg) {
          batch.chain_status = chainBatch.statusName;
          eligibleBatches.push(batch);
        }
      }
    }
    return res.json({ products: data || [], batches: eligibleBatches });
  } catch (error) {
    console.error('[products] Producer listings request failed:', error.message);
    return res.status(500).json({ error: 'Could not load producer listings' });
  }
});

router.get('/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const products = await listPublicProducts();
    const product = products.find((item) => item.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found or no longer available' });
    return res.json({ product });
  } catch (error) {
    console.error('[products] Product detail request failed:', error.message);
    return res.status(503).json({ error: 'Product details could not be verified' });
  }
});

router.post('/manage', requireProducerSignature, async (req, res) => {
  const validation = validateListingInput(req.body || {});
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed', validationErrors: validation.errors });
  }

  try {
    await requireVerifiedProducer(req.marketplaceWallet);
    const batch = await loadProducerBatch(req.body.batch_id, req.marketplaceProducer);
    if (!hasAvailableInventory(batch.available_stock_kg, batch.marketplace_reserved_kg, validation.value.quantity)) {
      return res.status(409).json({ error: 'Listing quantity exceeds unlisted batch inventory' });
    }
    const { data, error } = await supabase.rpc('create_marketplace_listing', {
      p_batch_id: batch.id,
      p_producer_id: req.marketplaceProducer.id,
      p_title: validation.value.title,
      p_description: validation.value.description,
      p_price_inr: validation.value.price,
      p_quantity_kg: validation.value.quantity,
      p_image_urls: validation.value.images,
    });
    if (error) return rpcError(res, error);
    return res.status(201).json({ product: data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[products] Listing create failed:', error.message);
    return res.status(503).json({ error: 'Listing could not be verified or saved' });
  }
});

router.patch('/manage/:id', requireProducerSignature, async (req, res) => {
  const validation = validateListingInput(req.body || {});
  const isActive = req.body.is_active;
  if (!validation.valid || typeof isActive !== 'boolean') {
    return res.status(400).json({
      error: 'Validation failed',
      validationErrors: { ...validation.errors, is_active: typeof isActive === 'boolean' ? undefined : 'Listing status is required' },
    });
  }

  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, batch_id, producer_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (productError) throw productError;
    if (!isProducerOwner(product, req.marketplaceProducer.id)) {
      return res.status(404).json({ error: 'Listing not found for this producer' });
    }

    if (isActive) {
      await requireVerifiedProducer(req.marketplaceWallet);
      await loadProducerBatch(product.batch_id, req.marketplaceProducer);
    }
    const { data, error } = await supabase.rpc('update_marketplace_listing', {
      p_product_id: product.id,
      p_producer_id: req.marketplaceProducer.id,
      p_title: validation.value.title,
      p_description: validation.value.description,
      p_price_inr: validation.value.price,
      p_quantity_kg: validation.value.quantity,
      p_image_urls: validation.value.images,
      p_is_active: isActive,
    });
    if (error) return rpcError(res, error);
    return res.json({ product: data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[products] Listing update failed:', error.message);
    return res.status(503).json({ error: 'Listing could not be verified or updated' });
  }
});

router.post('/:id/purchase', async (req, res) => {
  if (!requireDatabase(res)) return;
  const validation = validatePurchaseInput(req.body || {});
  if (!validation.valid) {
    return res.status(400).json({ error: 'A positive kg quantity and valid request key are required' });
  }

  try {
    const { data: existingOrder, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount_inr')
      .eq('request_key', validation.requestKey)
      .maybeSingle();
    if (orderError) throw orderError;
    if (existingOrder) {
      const { data: items, error: itemError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', existingOrder.id);
      if (itemError) throw itemError;
      if (items?.length !== 1 || items[0].product_id !== req.params.id
          || Number(items[0].quantity) !== validation.quantity) {
        return res.status(409).json({ error: 'Request key was already used for a different order' });
      }
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('available_quantity_kg')
        .eq('id', req.params.id)
        .maybeSingle();
      if (productError) throw productError;
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.status(200).json({
        order: {
          id: existingOrder.id,
          total_amount_inr: existingOrder.total_amount_inr,
          remaining_quantity_kg: product.available_quantity_kg,
          payment_status: 'pending',
          message: 'Order reserved. No payment has been collected.',
        },
      });
    }

    const products = await listPublicProducts();
    const product = products.find((item) => item.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found or no longer available' });
    if (validation.quantity > Number(product.available_quantity_kg)) {
      return res.status(409).json({ error: 'Requested quantity exceeds available stock' });
    }

    const { data, error } = await supabase.rpc('purchase_marketplace_product', {
      p_product_id: product.id,
      p_quantity_kg: validation.quantity,
      p_request_key: validation.requestKey,
    });
    if (error) return rpcError(res, error, 'Order reservation failed');
    const order = Array.isArray(data) ? data[0] : data;
    if (!order) throw new Error('Database did not return the reserved order');
    return res.status(201).json({
      order: {
        id: order.order_id,
        total_amount_inr: order.total_amount_inr,
        remaining_quantity_kg: order.remaining_quantity_kg,
        payment_status: 'pending',
        message: 'Order reserved. No payment has been collected.',
      },
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[products] Purchase reservation failed:', error.message);
    return res.status(503).json({ error: 'Purchase reservation could not be completed' });
  }
});

export default router;
