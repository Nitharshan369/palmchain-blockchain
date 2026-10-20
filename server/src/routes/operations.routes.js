import express from 'express';
import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import { requireRole, writeAudit } from '../middleware/roleAuthorization.js';
import { SEPOLIA_CHAIN_ID, ESCROW_CONFIRMATIONS } from '../services/escrow.js';

const router = express.Router();
const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);
const BATCH_ADDRESS = process.env.PALMCHAIN_BATCH_REGISTRY_ADDRESS
  || process.env.VITE_BATCH_REGISTRY_ADDRESS || '';
const PRODUCER_ADDRESS = process.env.PALMCHAIN_PRODUCER_REGISTRY_ADDRESS
  || process.env.VITE_PRODUCER_REGISTRY_ADDRESS || '';
const ESCROW_ADDRESS = process.env.PALMCHAIN_PAYMENT_ESCROW_ADDRESS
  || process.env.VITE_PAYMENT_ESCROW_ADDRESS || '';
const BATCH_ABI = [
  'function getBatch(string) view returns (tuple(string batchId,address producer,uint256 createdAt,uint256 neeraLiters,uint256 jaggeryKg,bytes32 dataHash,uint8 status,address verifier,uint256 verifiedAt,string rejectionReason))',
  'event BatchVerified(string indexed batchId,address indexed verifier,uint256 timestamp)',
  'event BatchRejected(string indexed batchId,address indexed verifier,string reason,uint256 timestamp)',
];
const PRODUCER_ABI = [
  'function admin() view returns (address)',
  'function getProducer(address) view returns (tuple(address wallet,string name,uint8 status,uint256 registeredAt,uint256 verifiedAt))',
  'function isAuthorizedVerifier(address) view returns (bool)',
  'event ProducerVerified(address indexed producer,address indexed admin,uint256 timestamp)',
  'event ProducerSuspended(address indexed producer,address indexed admin)',
  'event VerifierAuthorized(address indexed verifier,address indexed admin)',
  'event VerifierRevoked(address indexed verifier,address indexed admin)',
];
const ESCROW_ABI = [
  'function getOrder(uint256) view returns (tuple(bytes32 productId,address buyer,address seller,uint64 quantityHundredths,uint128 pricePerKgWei,uint128 totalWei,uint64 purchasedAt,uint64 fulfilledAt,uint64 reviewDeadline,uint8 status))',
];

function requireAddress(value, label) {
  if (!ethers.isAddress(value) || value === ethers.ZeroAddress) throw new Error(`${label} is not configured`);
  return value;
}

function getBatchContract() { return new ethers.Contract(requireAddress(BATCH_ADDRESS, 'BatchRegistry'), BATCH_ABI, provider); }
function getProducerContract() { return new ethers.Contract(requireAddress(PRODUCER_ADDRESS, 'ProducerRegistry'), PRODUCER_ABI, provider); }

function aggregateProduction(rows, mode) {
  return rows.reduce((acc, batch) => {
    const date = new Date(`${batch.harvest_date}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return acc;
    let period = batch.harvest_date;
    if (mode === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      period = weekStart.toISOString().slice(0, 10);
    } else if (mode === 'monthly') {
      period = batch.harvest_date.slice(0, 7);
    }
    acc[period] ||= { period, neera_liters: 0, jaggery_kg: 0, cost_inr: 0 };
    acc[period].neera_liters += Number(batch.neera_liters || 0);
    acc[period].jaggery_kg += Number(batch.total_quantity_kg || 0);
    acc[period].cost_inr += Number(batch.production_cost_inr || 0);
    return acc;
  }, {});
}

async function confirmRegistryTransaction(hash, contractAddress, iface, eventName, matcher) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) { const e = new Error('A valid transaction hash is required'); e.status = 400; throw e; }
  const tx = await provider.getTransaction(hash);
  const receipt = await provider.getTransactionReceipt(hash);
  if (!tx || !receipt) { const e = new Error('Transaction is pending or unavailable'); e.status = 202; throw e; }
  if (BigInt(tx.chainId) !== SEPOLIA_CHAIN_ID || ethers.getAddress(tx.to) !== ethers.getAddress(contractAddress)) { const e = new Error('Transaction must target the configured Sepolia contract'); e.status = 409; throw e; }
  if (receipt.status !== 1 || await provider.getBlockNumber() - receipt.blockNumber + 1 < ESCROW_CONFIRMATIONS) { const e = new Error('Transaction is not confirmed on Sepolia'); e.status = 202; throw e; }
  const events = receipt.logs.map((log) => { try { return ethers.getAddress(log.address) === ethers.getAddress(contractAddress) ? iface.parseLog(log) : null; } catch { return null; } }).filter((event) => event?.name === eventName);
  if (events.length !== 1 || !matcher(events[0], tx)) { const e = new Error('Confirmed transaction event does not match the requested operation'); e.status = 409; throw e; }
  return { tx, receipt, event: events[0] };
}

router.get('/verifier/queue', async (req, res) => {
  try {
    const profile = await requireRole(req, 'verifier');
    const { data, error } = await supabase.from('batches').select('*, producer:profiles!batches_producer_id_fkey(full_name,organization_name,wallet_address), farm:farms(farm_name,region,state,palm_tree_count), batch_trace_logs(*)').order('created_at', { ascending: false });
    if (error) throw error;
    const contract = getBatchContract();
    const queue = [];
    for (const batch of data || []) {
      try {
        const chain = await contract.getBatch(batch.batch_number);
        if (Number(chain.status) === 1) queue.push({ ...batch, chain_batch: chain, authorized_verifier: profile.wallet_address });
      } catch { /* stale off-chain records are not reviewable */ }
    }
    return res.json({ batches: queue });
  } catch (error) { return res.status(error.status || 503).json({ error: error.message }); }
});

router.post('/verifier/batches/:batchNumber/decision', async (req, res) => {
  try {
    const profile = await requireRole(req, 'verifier');
    const { transaction_hash: hash, decision, reason = '', evidence = {} } = req.body || {};
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ error: 'Decision must be approve or reject' });
    if (decision === 'reject' && !String(reason).trim()) return res.status(400).json({ error: 'A rejection reason is required' });
    const contract = getBatchContract();
    const iface = new ethers.Interface(BATCH_ABI);
    const eventName = decision === 'approve' ? 'BatchVerified' : 'BatchRejected';
    const verified = await confirmRegistryTransaction(hash, BATCH_ADDRESS, iface, eventName, (event, tx) =>
      event.args.batchId === req.params.batchNumber && ethers.getAddress(event.args.verifier) === req.authorizedWallet && ethers.getAddress(tx.from) === req.authorizedWallet);
    const chain = await contract.getBatch(req.params.batchNumber);
    const updates = {
      status: decision === 'approve' ? 'certified' : 'flagged',
      is_certified: decision === 'approve',
      certifier_id: profile.id,
      certification_timestamp: new Date(Number(chain.verifiedAt) * 1000).toISOString(),
      certification_notes: decision === 'approve' ? String(req.body.notes || '') : String(reason).trim(),
      updated_at: new Date().toISOString(),
    };
    const { data: batch, error } = await supabase.from('batches').update(updates).eq('batch_number', req.params.batchNumber).select().single();
    if (error) throw error;
    await writeAudit({ wallet: req.authorizedWallet, profileId: profile.id, action: `batch_${decision}`, entityType: 'batch', entityId: req.params.batchNumber, transactionHash: hash, details: { evidence } });
    return res.json({ status: 'confirmed', transaction_hash: verified.receipt.hash, batch });
  } catch (error) { return res.status(error.status || 503).json({ error: error.message }); }
});

router.get('/admin/overview', async (req, res) => {
  try {
    await requireRole(req, 'admin');
    const [profiles, batches, products, orders, logs] = await Promise.all([
      supabase.from('profiles').select('id,full_name,organization_name,wallet_address,role,is_active,created_at,updated_at').order('created_at', { ascending: false }),
      supabase.from('batches').select('id,batch_number,status,is_certified,certifier_id,created_at,updated_at,producer:profiles!batches_producer_id_fkey(full_name,wallet_address)').order('created_at', { ascending: false }).limit(100),
      supabase.from('products').select('id,title,listing_status,is_active,available_quantity_kg,payment_price_per_kg_wei,updated_at,producer:profiles!products_producer_id_fkey(full_name,wallet_address)').order('updated_at', { ascending: false }).limit(100),
      supabase.from('orders').select('id,payment_status,payment_asset,payment_amount_wei,escrow_order_id,payment_tx_hash,created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    for (const result of [profiles, batches, products, orders, logs]) if (result.error) throw result.error;
    return res.json({ profiles: profiles.data || [], batches: batches.data || [], listings: products.data || [], orders: orders.data || [], auditLogs: logs.data || [] });
  } catch (error) { return res.status(error.status || 503).json({ error: error.message }); }
});

router.post('/admin/permissions', async (req, res) => {
  try {
    const profile = await requireRole(req, 'admin');
    const { transaction_hash: hash, action, target_wallet: target } = req.body || {};
    if (!['verify_producer', 'suspend_producer', 'reinstate_producer', 'authorize_verifier', 'revoke_verifier'].includes(action) || !ethers.isAddress(target)) return res.status(400).json({ error: 'Invalid administrative action or target wallet' });
    const iface = new ethers.Interface(PRODUCER_ABI);
    const eventName = action === 'verify_producer' || action === 'reinstate_producer' ? 'ProducerVerified' : action === 'suspend_producer' ? 'ProducerSuspended' : action === 'authorize_verifier' ? 'VerifierAuthorized' : 'VerifierRevoked';
    const result = await confirmRegistryTransaction(hash, PRODUCER_ADDRESS, iface, eventName, (event, tx) => {
      const eventTarget = event.args.producer || event.args.verifier;
      return ethers.getAddress(eventTarget) === ethers.getAddress(target) && ethers.getAddress(event.args.admin) === req.authorizedWallet && ethers.getAddress(tx.from) === req.authorizedWallet;
    });
    if (action === 'authorize_verifier' || action === 'revoke_verifier') {
      const { error: profileError } = await supabase.from('profiles').update({
        role: action === 'authorize_verifier' ? 'verifier' : 'customer',
        updated_at: new Date().toISOString(),
      }).ilike('wallet_address', target);
      if (profileError) throw profileError;
    }
    await writeAudit({ wallet: req.authorizedWallet, profileId: profile.id, action, entityType: 'profile', entityId: target, transactionHash: hash, details: { target_wallet: target } });
    return res.json({ status: 'confirmed', transaction_hash: result.receipt.hash });
  } catch (error) { return res.status(error.status || 503).json({ error: error.message }); }
});

router.get('/analytics/producer', async (req, res) => {
  try {
    const profile = await requireRole(req, 'producer');
    const [farms, batches, products, orders, reviews] = await Promise.all([
      supabase.from('farms').select('palm_tree_count').eq('producer_id', profile.id),
      supabase.from('batches').select('batch_number,harvest_date,neera_liters,total_quantity_kg,available_stock_kg,production_cost_inr').eq('producer_id', profile.id),
      supabase.from('products').select('id,title,price_inr').eq('producer_id', profile.id),
      supabase.from('orders').select('id,payment_status,payment_asset,payment_amount_wei,escrow_order_id,payment_tx_hash,order_items(product_id,quantity)').ilike('seller_wallet_address', profile.wallet_address),
      supabase.from('reviews').select('rating,product_id').in('product_id', (await supabase.from('products').select('id').eq('producer_id', profile.id)).data?.map((p) => p.id) || []),
    ]);
    for (const result of [farms, batches, products, orders, reviews]) if (result.error) throw result.error;
    const releasedOrders = [];
    if (ethers.isAddress(ESCROW_ADDRESS)) {
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
      for (const order of orders.data || []) if (order.escrow_order_id) {
        try { const chainOrder = await escrow.getOrder(order.escrow_order_id); if (Number(chainOrder.status) === 4) releasedOrders.push({ ...order, chainOrder }); } catch { /* ignore stale records */ }
      }
    }
    const productionRows = batches.data || [];
    const salesEthWei = releasedOrders.reduce((sum, order) => sum + BigInt(order.payment_amount_wei || 0), 0n);
    const salesKg = releasedOrders.reduce((sum, order) => sum + (Number(order.chainOrder.quantityHundredths) / 100), 0);
    const ratingValues = (reviews.data || []).map((review) => Number(review.rating));
    return res.json({
      hasData: (batches.data || []).length > 0 || releasedOrders.length > 0,
      trees_registered: (farms.data || []).reduce((sum, farm) => sum + Number(farm.palm_tree_count || 0), 0),
      active_batches: (batches.data || []).filter((batch) => !['recalled', 'flagged'].includes(batch.status)).length,
      production_daily: Object.values(aggregateProduction(productionRows, 'daily')).sort((a, b) => a.period.localeCompare(b.period)),
      production_weekly: Object.values(aggregateProduction(productionRows, 'weekly')).sort((a, b) => a.period.localeCompare(b.period)),
      production_monthly: Object.values(aggregateProduction(productionRows, 'monthly')).sort((a, b) => a.period.localeCompare(b.period)),
      conversion_ratio: (batches.data || []).reduce((sum, b) => sum + Number(b.neera_liters || 0), 0) > 0 ? (batches.data || []).reduce((sum, b) => sum + Number(b.total_quantity_kg || 0), 0) / (batches.data || []).reduce((sum, b) => sum + Number(b.neera_liters || 0), 0) : null,
      completed_orders: releasedOrders.length,
      sales_kg: salesKg,
      sales_eth_wei: salesEthWei.toString(),
      gross_revenue_inr: null,
      production_costs_inr: (batches.data || []).reduce((sum, b) => sum + Number(b.production_cost_inr || 0), 0),
      estimated_profit_inr: null,
      average_rating: ratingValues.length ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length : null,
      review_count: ratingValues.length,
    });
  } catch (error) { return res.status(error.status || 503).json({ error: error.message }); }
});

router.get('/reviews/product/:productId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('reviews').select('id,rating,review_text,created_at,buyer_wallet_address,customer:profiles(full_name)').eq('product_id', req.params.productId).order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ reviews: data || [] });
  } catch (error) { return res.status(503).json({ error: error.message }); }
});

router.post('/reviews', async (req, res) => {
  try {
    const profile = await requireRole(req, 'customer');
    const { product_id: productId, escrow_order_id: escrowOrderId, rating, review_text: reviewText = '' } = req.body || {};
    if (!productId || !escrowOrderId || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) return res.status(400).json({ error: 'Product, completed escrow order, and integer rating from 1 to 5 are required' });
    if (!ethers.isAddress(ESCROW_ADDRESS)) return res.status(503).json({ error: 'Payment escrow contract is not configured' });
    const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
    const chainOrder = await escrow.getOrder(escrowOrderId);
    if (Number(chainOrder.status) !== 4 || ethers.getAddress(chainOrder.buyer) !== req.authorizedWallet) return res.status(403).json({ error: 'Only the buyer of a released escrow order can review it' });
    const { data: order, error: orderError } = await supabase.from('orders').select('id').eq('escrow_order_id', String(escrowOrderId)).single();
    if (orderError || !order) return res.status(409).json({ error: 'Confirmed marketplace order record was not found' });
    const { data: review, error } = await supabase.from('reviews').insert({ order_id: order.id, escrow_order_id: String(escrowOrderId), product_id: productId, customer_id: profile.id, buyer_wallet_address: req.authorizedWallet.toLowerCase(), rating: Number(rating), review_text: String(reviewText).trim() }).select().single();
    if (error) return res.status(error.code === '23505' ? 409 : 503).json({ error: error.code === '23505' ? 'This purchase already has a review' : error.message });
    await writeAudit({ wallet: req.authorizedWallet, profileId: profile.id, action: 'review_created', entityType: 'review', entityId: review.id, details: { product_id: productId, escrow_order_id: String(escrowOrderId) } });
    return res.status(201).json({ review });
  } catch (error) { return res.status(error.status || 503).json({ error: error.message }); }
});

export default router;
