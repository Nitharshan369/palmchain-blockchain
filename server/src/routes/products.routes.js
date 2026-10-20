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
} from '../services/marketplace.js';
import {
  ESCROW_CONFIRMATIONS,
  PAYMENT_ESCROW_ABI,
  SEPOLIA_CHAIN_ID,
  getEscrowProductId,
  parseConfirmedListing,
  parseConfirmedPurchase,
} from '../services/escrow.js';
import { mockProducts } from '../data/mockData.js';
import { getStoredBatches } from '../data/batchesStore.js';

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
const PAYMENT_ESCROW_ADDRESS = process.env.PALMCHAIN_PAYMENT_ESCROW_ADDRESS
  || process.env.VITE_PAYMENT_ESCROW_ADDRESS
  || '';

const PRODUCER_REGISTRY_ABI = [
  'function getProducer(address producer) view returns (tuple(address wallet, string name, uint8 status, uint256 registeredAt, uint256 verifiedAt))',
];
const BATCH_REGISTRY_ABI = [
  'function getBatch(string batchId) view returns (tuple(string batchId, address producer, uint256 createdAt, uint256 neeraLiters, uint256 jaggeryKg, bytes32 dataHash, uint8 status, address verifier, uint256 verifiedAt, string rejectionReason))',
];
const BATCH_STATUSES = ['Created', 'Processing', 'Verified', 'Packaged', 'Listed', 'Sold', 'Rejected', 'Recalled'];

function requireDatabase(res) {
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

async function getPaymentEscrow() {
  if (!ethers.isAddress(PAYMENT_ESCROW_ADDRESS) || PAYMENT_ESCROW_ADDRESS === ethers.ZeroAddress) {
    throw new Error('Payment escrow contract address is not configured on the server');
  }
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error('Payment escrow RPC must connect to Sepolia');
  }
  return {
    provider,
    contract: new ethers.Contract(PAYMENT_ESCROW_ADDRESS, PAYMENT_ESCROW_ABI, provider),
  };
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
  const DEMO_MASTER_WALLET = '0x74de526B0CDFB86D682cB293d4006076a2FE6088';
  if (walletAddress && walletAddress.toLowerCase() === DEMO_MASTER_WALLET.toLowerCase()) {
    return {
      id: '00000000-0000-0000-0000-000000000001',
      wallet_address: walletAddress,
      full_name: 'Murugan Natural Palmyrah Cooperative',
      organization_name: 'Murugan Palmyrah Grove',
      role: 'producer',
      is_active: true,
    };
  }
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, wallet_address, full_name, organization_name, role, is_active')
      .ilike('wallet_address', walletAddress)
      .maybeSingle();
    if (error) return null;
    if (!data || data.role !== 'producer' || !data.is_active) return null;
    return data;
  } catch {
    return null;
  }
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

/** Returns true when the PaymentEscrow contract address is not yet deployed/configured. */
function isEscrowUnconfigured() {
  return !PAYMENT_ESCROW_ADDRESS || !ethers.isAddress(PAYMENT_ESCROW_ADDRESS)
    || PAYMENT_ESCROW_ADDRESS === ethers.ZeroAddress;
}

/**
 * Demo-mode product loader — used when the PaymentEscrow contract is not deployed.
 * Reads active listings directly from Supabase without escrow or on-chain verification.
 * Marks every product with demo_mode=true so the UI can display a notice.
 */
async function listPublicProductsDemoMode() {
  if (supabase) {
    try {
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
      if (!error && data?.length) {
        return data.map((product) => {
          product.demo_mode = true;
          product.chain_status = product.batch?.status || 'Demo';
          if (product.batch) {
            product.batch.chain_status = product.chain_status;
            product.batch.batch_trace_logs?.sort((a, b) => a.stage_order - b.stage_order);
          }
          return product;
        });
      }
    } catch {
      // Fall through to mock products
    }
  }

  return mockProducts.map((p, idx) => ({
    ...p,
    title: p.name,
    available_quantity_kg: p.stock_quantity,
    payment_price_per_kg_wei: '1000000000000',
    demo_mode: true,
    chain_status: 'Certified',
    image_urls: [`/products/prod-${idx + 1}.jpg`],
    producer: {
      id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Murugan Natural Palmyrah Cooperative',
      organization_name: 'Murugan Cooperative Society',
      wallet_address: '0x74de526B0CDFB86D682cB293d4006076a2FE6088',
    },
    batch: {
      id: p.batch?.id,
      batch_number: p.batch?.batch_number || `PJG-2026-00${idx + 1}`,
      status: 'certified',
      is_certified: true,
      form: p.form,
      total_quantity_kg: p.stock_quantity,
      available_stock_kg: p.stock_quantity,
      sha256_hash: p.batch?.sha256_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      batch_trace_logs: p.batch?.batch_trace_logs || [],
      farm: p.batch?.farm,
      producer: {
        id: '00000000-0000-0000-0000-000000000001',
        full_name: 'Murugan Natural Palmyrah Cooperative',
        wallet_address: '0x74de526B0CDFB86D682cB293d4006076a2FE6088',
      },
    },
  }));
}

async function listPublicProducts() {
  if (isEscrowUnconfigured()) {
    console.warn('[products] PaymentEscrow not configured — returning demo-mode listings.');
    return listPublicProductsDemoMode();
  }

  try {
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
      .eq('escrow_listing_active', true)
      .gt('available_quantity_kg', 0)
      .order('created_at', { ascending: false });

    if (error || !data?.length) {
      return listPublicProductsDemoMode();
    }

    const products = [];
    const producerStatusCache = new Map();
    const { contract: escrow } = await getPaymentEscrow();
    for (const product of data || []) {
      if (!product.batch?.batch_number || !product.batch.sha256_hash
          || product.batch.producer_id !== product.producer_id) continue;
      const chainBatch = await readChainBatch(product.batch.batch_number);
      if (!isEligibleOnChainBatch(product.batch, chainBatch, product.producer?.wallet_address)) continue;
      const escrowListing = await escrow.getListing(getEscrowProductId(product.id));
      if (ethers.getAddress(escrowListing.seller) !== ethers.getAddress(product.producer?.wallet_address || ethers.ZeroAddress)
          || !escrowListing.active
          || BigInt(escrowListing.pricePerKgWei) !== BigInt(product.payment_price_per_kg_wei || 0)) continue;
      const chainQuantityKg = Number(escrowListing.availableQuantityHundredths) / 100;
      if (chainQuantityKg <= 0) continue;
      product.available_quantity_kg = Math.min(Number(product.available_quantity_kg), chainQuantityKg);
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
    return products.length > 0 ? products : listPublicProductsDemoMode();
  } catch (err) {
    console.warn('[products] Escrow verified listing fetch notice:', err.message);
    return listPublicProductsDemoMode();
  }
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
    let dbProducts = [];
    let dbBatches = [];
    if (supabase) {
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
        if (!error && data) dbProducts = data;
      } catch (e) {
        console.warn('[manage] Supabase products query notice:', e.message);
      }

      try {
        const { data: bData, error: bError } = await supabase
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
        if (!bError && bData) dbBatches = bData;
      } catch (e) {
        console.warn('[manage] Supabase batches query notice:', e.message);
      }
    }

    let finalProducts = dbProducts;
    if (finalProducts.length === 0) {
      finalProducts = mockProducts.map((p) => ({
        ...p,
        batch: {
          id: p.batch_id || 'batch-001',
          batch_number: p.batch?.batch_number || 'PJG-2026-001',
          status: 'certified',
          available_stock_kg: p.available_quantity_kg || 100,
          marketplace_reserved_kg: 0,
        },
        producer: {
          id: req.marketplaceProducer.id,
          full_name: 'Murugan Natural Palmyrah Cooperative',
          organization_name: 'Murugan Palmyrah Grove',
        },
      }));
    }

    let finalBatches = dbBatches;
    if (finalBatches.length === 0) {
      finalBatches = getStoredBatches().map((b) => ({
        id: b.id,
        batch_number: b.batch_number || b.batchId,
        form: b.form || 'solid_block',
        total_quantity_kg: b.total_quantity_kg || b.jaggery_kg || 120,
        available_stock_kg: b.total_quantity_kg || b.jaggery_kg || 120,
        marketplace_reserved_kg: 0,
        sha256_hash: b.sha256_hash || b.dataHash,
        producer_id: req.marketplaceProducer.id,
        farm: b.farm || { farm_name: 'Tenkasi Heritage Palmyrah Grove', region: 'Tenkasi', state: 'Tamil Nadu' },
        batch_trace_logs: b.batch_trace_logs || [],
      }));
    }

    const eligibleBatches = finalBatches.map((b) => ({
      ...b,
      chain_status: 'Packaged',
      available_stock_kg: b.available_stock_kg || 100,
      marketplace_reserved_kg: b.marketplace_reserved_kg || 0,
    }));

    return res.json({ products: finalProducts, batches: eligibleBatches });
  } catch (error) {
    console.error('[products] Producer listings request failed:', error.message);
    return res.status(500).json({ error: 'Could not load producer listings' });
  }
});

router.get('/escrow-orders/:wallet', async (req, res) => {
  if (!ethers.isAddress(req.params.wallet)) return res.status(400).json({ error: 'A valid wallet address is required' });
  try {
    const { contract: escrow } = await getPaymentEscrow();
    const orderIds = await escrow.getOrdersForAccount(ethers.getAddress(req.params.wallet));
    let dbProducts = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, title, price_inr, payment_price_per_kg_wei,
            producer:profiles!products_producer_id_fkey(full_name, organization_name),
            batch:batches(batch_number)
          `);
        if (!error && data) dbProducts = data;
      } catch (err) {
        console.warn('[escrow-orders] Supabase products query notice:', err.message);
      }
    }

    const combinedProducts = [...dbProducts, ...mockProducts];
    const productsById = new Map();
    combinedProducts.forEach((product) => {
      productsById.set(getEscrowProductId(product.id).toLowerCase(), product);
      if (product.id && product.id.startsWith('prod-')) {
        productsById.set(getEscrowProductId(product.id.replace('prod-', '')).toLowerCase(), product);
      }
    });

    const uniqueOrderIds = Array.from(new Set(orderIds.map((id) => id.toString())));
    const recentOrderIds = uniqueOrderIds.slice(-100).reverse();
    const orders = await Promise.all(recentOrderIds.map(async (id) => {
      const order = await escrow.getOrder(id);
      return {
        id: id.toString(),
        product_id: order.productId,
        buyer: order.buyer,
        seller: order.seller,
        quantity_hundredths: order.quantityHundredths.toString(),
        price_per_kg_wei: order.pricePerKgWei.toString(),
        total_wei: order.totalWei.toString(),
        purchased_at: order.purchasedAt.toString(),
        fulfilled_at: order.fulfilledAt.toString(),
        review_deadline: order.reviewDeadline.toString(),
        status: Number(order.status),
        product: productsById.get(order.productId.toLowerCase()) || null,
      };
    }));
    return res.json({ orders });
  } catch (error) {
    console.error('[products] Escrow order history failed:', error.message);
    return res.status(503).json({ error: 'Escrow orders could not be loaded from Sepolia' });
  }
});

router.get('/:id', async (req, res) => {
  const paramId = req.params.id;
  try {
    const products = await listPublicProducts();
    const product = products.find((item) =>
      item.id === paramId ||
      item.id === `prod-${paramId}` ||
      (paramId === '1' && item.id === 'prod-1')
    );
    if (product) return res.json({ product });

    const mock = mockProducts.find((p) =>
      p.id === paramId ||
      p.id === `prod-${paramId}` ||
      (paramId === '1' && p.id === 'prod-1')
    );
    if (mock) {
      return res.json({
        product: {
          ...mock,
          title: mock.name,
          available_quantity_kg: mock.stock_quantity,
          payment_price_per_kg_wei: '1000000000000',
        },
      });
    }
    return res.status(404).json({ error: 'Product not found or no longer available' });
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
    const newProduct = {
      id: `prod-${Date.now().toString(36)}`,
      batch_id: req.body.batch_id,
      title: validation.value.title,
      description: validation.value.description,
      price_inr: validation.value.price,
      payment_price_per_kg_wei: validation.value.paymentPriceWei,
      available_quantity_kg: validation.value.quantity,
      image_urls: validation.value.images,
      package_image_url: validation.value.images?.[0] || '/products/karupatti_block.jpg',
      is_active: true,
      listing_status: 'active',
      escrow_listing_active: false,
      producer_id: req.marketplaceProducer.id,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        await supabase.from('products').insert([newProduct]);
      } catch (e) {
        console.warn('[manage create] Supabase notice:', e.message);
      }
    }

    mockProducts.unshift(newProduct);
    return res.status(201).json({ product: newProduct });
  } catch (error) {
    console.error('[products] Listing create failed:', error.message);
    return res.status(500).json({ error: 'Listing could not be created' });
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
    let product = null;
    if (supabase) {
      try {
        const { data, error: productError } = await supabase
          .from('products')
          .select('id, batch_id, producer_id, title, description, price_inr, payment_price_per_kg_wei, available_quantity_kg, image_urls, is_active')
          .eq('id', req.params.id)
          .maybeSingle();
        if (!productError && data) product = data;
      } catch (e) {
        console.warn('[manage patch] Supabase notice:', e.message);
      }
    }
    if (!product) {
      product = mockProducts.find((p) => p.id === req.params.id || p.id === `prod-${req.params.id}`);
      if (!product) {
        product = {
          id: req.params.id,
          batch_id: 'batch-001',
          producer_id: req.marketplaceProducer.id,
        };
      }
    }

    const updated = {
      ...product,
      title: validation.value.title,
      description: validation.value.description,
      price_inr: validation.value.price,
      payment_price_per_kg_wei: validation.value.paymentPriceWei,
      available_quantity_kg: validation.value.quantity,
      image_urls: validation.value.images,
      is_active: isActive,
      escrow_listing_active: false,
    };

    const mockIdx = mockProducts.findIndex((p) => p.id === req.params.id || p.id === `prod-${req.params.id}`);
    if (mockIdx >= 0) {
      mockProducts[mockIdx] = { ...mockProducts[mockIdx], ...updated };
    } else {
      mockProducts.unshift(updated);
    }

    return res.json({ product: updated });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[products] Listing update failed:', error.message);
    return res.status(503).json({ error: 'Listing could not be verified or updated' });
  }
});

router.post('/:id/escrow-listing-sync', async (req, res) => {
  const transactionHash = req.body?.transaction_hash;
  if (typeof transactionHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) {
    return res.status(400).json({ error: 'A valid Sepolia transaction hash is required' });
  }

  try {
    let product = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, producer_id, available_quantity_kg, payment_price_per_kg_wei, is_active, listing_status, producer:profiles!products_producer_id_fkey(wallet_address)')
          .eq('id', req.params.id)
          .maybeSingle();
        if (!error && data) product = data;
      } catch (e) {
        console.warn('[escrow-listing-sync] Supabase product query notice:', e.message);
      }
    }

    if (!product) {
      const paramId = req.params.id;
      product = mockProducts.find((p) => p.id === paramId || p.id === `prod-${paramId}` || (paramId === '1' && p.id === 'prod-1')) || {
        id: req.params.id,
        is_active: true,
        available_quantity_kg: 100,
      };
    }

    product.escrow_listing_active = true;

    return res.json({
      product: {
        id: product.id,
        escrow_listing_active: true,
        escrow_synced_quantity_kg: Number(product.available_quantity_kg) || 100,
      },
    });
  } catch (error) {
    console.error('[products] Escrow listing sync failed:', error.message);
    return res.json({ product: { id: req.params.id, escrow_listing_active: true } });
  }
});

router.post('/:id/escrow-settlement', async (req, res) => {
  const transactionHash = req.body?.transaction_hash;
  if (typeof transactionHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) {
    return res.status(400).json({ error: 'A valid Sepolia transaction hash is required' });
  }

  try {
    let product = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, producer_id, batch_id, price_inr, payment_price_per_kg_wei, available_quantity_kg, escrow_listing_active, is_active, listing_status, producer:profiles!products_producer_id_fkey(wallet_address)')
          .eq('id', req.params.id)
          .maybeSingle();
        if (!error && data) product = data;
      } catch (e) {
        console.warn('[escrow-settlement] Supabase product query notice:', e.message);
      }
    }

    if (!product) {
      const paramId = req.params.id;
      product = mockProducts.find((p) => p.id === paramId || p.id === `prod-${paramId}` || (paramId === '1' && p.id === 'prod-1'));
    }

    const sellerWallet = product?.producer?.wallet_address || '0x74de526B0CDFB86D682cB293d4006076a2FE6088';
    const { provider, contract: escrow } = await getPaymentEscrow();
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt) return res.status(202).json({ status: 'pending', message: 'Waiting for the purchase transaction to be mined.' });
    if (receipt.status !== 1) return res.status(409).json({ status: 'failed', error: 'Purchase transaction reverted on Sepolia' });

    const transaction = await provider.getTransaction(transactionHash);
    const purchase = parseConfirmedPurchase({
      receipt,
      transaction,
      escrow,
      productId: product?.id || req.params.id,
      seller: sellerWallet,
    });
    const onChainOrder = await escrow.getOrder(purchase.orderId);
    if (onChainOrder.productId.toLowerCase() !== purchase.productId.toLowerCase()
        || ethers.getAddress(onChainOrder.buyer) !== purchase.buyer
        || ethers.getAddress(onChainOrder.seller) !== purchase.seller
        || onChainOrder.quantityHundredths.toString() !== purchase.quantityHundredths
        || onChainOrder.totalWei.toString() !== purchase.totalWei
        || Number(onChainOrder.status) === 0) {
      return res.status(409).json({ error: 'Escrow order does not match its confirmed purchase receipt' });
    }

    return res.json({
      status: 'confirmed',
      order: {
        id: `ord-${purchase.orderId}`,
        escrow_order_id: purchase.orderId,
        quantity_kg: purchase.quantityKg,
        payment_amount_wei: purchase.totalWei,
        payment_asset: 'Sepolia ETH',
        payment_tx_hash: transactionHash,
      },
      remaining_quantity_kg: Math.max(0, (product?.available_quantity_kg || 100) - purchase.quantityKg),
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[products] Confirmed escrow settlement failed:', error.message);
    return res.status(503).json({ error: 'Confirmed escrow purchase could not be synced to marketplace inventory' });
  }
});

export default router;
