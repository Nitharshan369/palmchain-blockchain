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
    .eq('escrow_listing_active', true)
    .gt('available_quantity_kg', 0)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const products = [];
  const producerStatusCache = new Map();
  if (!data?.length) return products;
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

router.get('/escrow-orders/:wallet', async (req, res) => {
  if (!requireDatabase(res)) return;
  if (!ethers.isAddress(req.params.wallet)) return res.status(400).json({ error: 'A valid wallet address is required' });
  try {
    const { contract: escrow } = await getPaymentEscrow();
    const orderIds = await escrow.getOrdersForAccount(ethers.getAddress(req.params.wallet));
    const { data: products, error: productError } = await supabase
      .from('products')
      .select(`
        id, title, price_inr, payment_price_per_kg_wei,
        producer:profiles!products_producer_id_fkey(full_name, organization_name),
        batch:batches(batch_number)
      `);
    if (productError) throw productError;
    const productsById = new Map((products || []).map((product) => [
      getEscrowProductId(product.id).toLowerCase(),
      product,
    ]));

    const recentOrderIds = [...orderIds].slice(-100).reverse();
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
    const product = Array.isArray(data) ? data[0] : data;
    const { data: storedProduct, error: escrowPriceError } = await supabase
      .from('products')
      .update({
        payment_price_per_kg_wei: validation.value.paymentPriceWei,
        escrow_listing_active: false,
        escrow_synced_quantity_kg: 0,
      })
      .eq('id', product.id)
      .select()
      .single();
    if (escrowPriceError) throw escrowPriceError;
    return res.status(201).json({ product: storedProduct });
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

    const { provider, contract: escrow } = await getPaymentEscrow();
    const productIdHash = getEscrowProductId(product.id);
    const chainListing = await escrow.getListing(productIdHash);
    if (chainListing.seller !== ethers.ZeroAddress) {
      const orderIds = await escrow.getOrdersForAccount(req.marketplaceWallet);
      for (const orderId of orderIds) {
        const order = await escrow.getOrder(orderId);
        if (order.productId.toLowerCase() === productIdHash.toLowerCase()
            && [1, 2, 3].includes(Number(order.status))) {
          return res.status(409).json({ error: 'Resolve all escrowed, fulfilled, or disputed orders before changing this listing' });
        }
      }
    }

    if (chainListing.active) {
      const deactivationHash = req.body.escrow_deactivation_transaction_hash;
      if (typeof deactivationHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(deactivationHash)) {
        return res.status(409).json({ error: 'Pause the Sepolia escrow listing before changing its details' });
      }
      const [transaction, receipt] = await Promise.all([
        provider.getTransaction(deactivationHash),
        provider.getTransactionReceipt(deactivationHash),
      ]);
      if (!transaction || !receipt || receipt.status !== 1
          || await provider.getBlockNumber() - receipt.blockNumber + 1 < ESCROW_CONFIRMATIONS) {
        return res.status(409).json({ error: 'The listing pause transaction must be confirmed on Sepolia first' });
      }
      parseConfirmedListing({
        receipt,
        transaction,
        escrow,
        productId: product.id,
        seller: req.marketplaceWallet,
        pricePerKgWei: chainListing.pricePerKgWei,
        quantityHundredths: chainListing.availableQuantityHundredths,
        active: false,
      });
    }

    const { error: disableEscrowError } = await supabase
      .from('products')
      .update({ escrow_listing_active: false })
      .eq('id', product.id);
    if (disableEscrowError) throw disableEscrowError;

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
    const { data: storedProduct, error: escrowPriceError } = await supabase
      .from('products')
      .update({
        payment_price_per_kg_wei: validation.value.paymentPriceWei,
        escrow_listing_active: false,
      })
      .eq('id', product.id)
      .select()
      .single();
    if (escrowPriceError) throw escrowPriceError;
    return res.json({ product: storedProduct });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[products] Listing update failed:', error.message);
    return res.status(503).json({ error: 'Listing could not be verified or updated' });
  }
});

router.post('/:id/escrow-listing-sync', async (req, res) => {
  if (!requireDatabase(res)) return;
  const transactionHash = req.body?.transaction_hash;
  if (typeof transactionHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) {
    return res.status(400).json({ error: 'A valid Sepolia transaction hash is required' });
  }
  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, producer_id, available_quantity_kg, payment_price_per_kg_wei, is_active, listing_status, producer:profiles!products_producer_id_fkey(wallet_address)')
      .eq('id', req.params.id)
      .maybeSingle();
    if (productError) throw productError;
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!product.producer?.wallet_address) return res.status(409).json({ error: 'Product seller is unavailable' });

    if (!product.payment_price_per_kg_wei) {
      return res.status(409).json({ error: 'The product has no configured Sepolia ETH/kg price' });
    }

    const { provider, contract: escrow } = await getPaymentEscrow();
    const [transaction, receipt] = await Promise.all([
      provider.getTransaction(transactionHash),
      provider.getTransactionReceipt(transactionHash),
    ]);
    if (!transaction || !receipt) {
      return res.status(409).json({ error: 'Escrow listing transaction is not yet available on Sepolia' });
    }
    if (receipt.status !== 1) {
      return res.status(409).json({ error: 'Escrow listing transaction reverted on Sepolia' });
    }
    if (await provider.getBlockNumber() - receipt.blockNumber + 1 < ESCROW_CONFIRMATIONS) {
      return res.status(409).json({ error: 'Escrow listing needs two Sepolia confirmations' });
    }

    const quantityHundredths = BigInt(Math.round(Number(product.available_quantity_kg) * 100));
    const active = Boolean(product.is_active && product.listing_status === 'active');
    parseConfirmedListing({
      receipt,
      transaction,
      escrow,
      productId: product.id,
      seller: product.producer.wallet_address,
      pricePerKgWei: product.payment_price_per_kg_wei,
      quantityHundredths,
      active,
    });

    const { data: syncedProduct, error: syncError } = await supabase
      .from('products')
      .update({
        escrow_listing_active: active,
        escrow_synced_quantity_kg: Number(quantityHundredths) / 100,
      })
      .eq('id', product.id)
      .select('id, escrow_listing_active, escrow_synced_quantity_kg')
      .single();
    if (syncError) throw syncError;
    return res.json({ product: syncedProduct });
  } catch (error) {
    console.error('[products] Escrow listing sync failed:', error.message);
    return res.status(error.status || 503).json({ error: error.message || 'Escrow listing could not be verified' });
  }
});

router.post('/:id/escrow-settlement', async (req, res) => {
  if (!requireDatabase(res)) return;
  const transactionHash = req.body?.transaction_hash;
  if (typeof transactionHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) {
    return res.status(400).json({ error: 'A valid Sepolia transaction hash is required' });
  }

  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, producer_id, batch_id, price_inr, payment_price_per_kg_wei, available_quantity_kg, escrow_listing_active, is_active, listing_status, producer:profiles!products_producer_id_fkey(wallet_address)')
      .eq('id', req.params.id)
      .maybeSingle();
    if (productError) throw productError;
    if (!product?.producer?.wallet_address) return res.status(404).json({ error: 'Product seller was not found' });
    const { provider, contract: escrow } = await getPaymentEscrow();
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt) return res.status(202).json({ status: 'pending', message: 'Waiting for the purchase transaction to be mined.' });
    if (receipt.status !== 1) return res.status(409).json({ status: 'failed', error: 'Purchase transaction reverted on Sepolia' });
    if (await provider.getBlockNumber() - receipt.blockNumber + 1 < ESCROW_CONFIRMATIONS) {
      return res.status(202).json({ status: 'pending', message: 'Waiting for additional Sepolia confirmations.' });
    }

    const transaction = await provider.getTransaction(transactionHash);
    const purchase = parseConfirmedPurchase({
      receipt,
      transaction,
      escrow,
      productId: product.id,
      seller: product.producer.wallet_address,
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

    const { data: order, error: settlementError } = await supabase.rpc('settle_marketplace_escrow_purchase', {
      p_product_id: product.id,
      p_quantity_kg: purchase.quantityKg,
      p_escrow_order_id: purchase.orderId,
      p_payment_tx_hash: transactionHash.toLowerCase(),
      p_buyer_wallet_address: purchase.buyer,
      p_seller_wallet_address: purchase.seller,
      p_payment_amount_wei: purchase.totalWei,
      p_payment_price_per_kg_wei: purchase.pricePerKgWei,
    });
    if (settlementError) return rpcError(res, settlementError, 'Confirmed purchase inventory sync failed');
    const { data: inventory, error: inventoryError } = await supabase
      .from('products')
      .select('available_quantity_kg')
      .eq('id', product.id)
      .single();
    if (inventoryError) throw inventoryError;
    return res.json({
      status: 'confirmed',
      order: {
        id: order.id,
        escrow_order_id: purchase.orderId,
        quantity_kg: purchase.quantityKg,
        payment_amount_wei: purchase.totalWei,
        payment_asset: 'Sepolia ETH',
        payment_tx_hash: transactionHash,
      },
      remaining_quantity_kg: Number(inventory.available_quantity_kg),
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[products] Confirmed escrow settlement failed:', error.message);
    return res.status(503).json({ error: 'Confirmed escrow purchase could not be synced to marketplace inventory' });
  }
});

export default router;
