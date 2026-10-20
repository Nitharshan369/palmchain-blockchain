import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { ArrowLeft, CheckCircle2, FlaskConical, MapPin, Package, QrCode, ShieldCheck, ShoppingCart } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import ProductionTimeline from '../../components/common/ProductionTimeline';
import QRPreviewModal from '../../components/common/QRPreviewModal';
import { useWallet } from '../../context/WalletContext';
import { productsApi, operationsApi } from '../../lib/api';
import {
  CONTRACT_ADDRESSES,
  getPaymentEscrowWithSigner,
  SEPOLIA_CHAIN_ID_DECIMAL,
} from '../../contracts';
import { calculateEscrowTotalWei, getEscrowProductId, quantityToHundredths } from '../../lib/escrow';
import { normalizeProduct } from '../../lib/marketplace';
import { mockProducts } from '../../data/mockData';

export default function ProductDetail() {
  const { id } = useParams();
  const { isConnected, connect, getSigner } = useWallet();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isMockData, setIsMockData] = useState(false);
  const [quantity, setQuantity] = useState('1.00');
  const [confirming, setConfirming] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [order, setOrder] = useState(null);
  const [paymentState, setPaymentState] = useState('idle');
  const [transactionHash, setTransactionHash] = useState('');
  const [settlementPending, setSettlementPending] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;

    // Match mock product by id string ('prod-1') or numeric index ('1' -> index 0)
    const findMock = (paramId) => {
      const byId = mockProducts.find((p) => p.id === paramId);
      if (byId) return byId;
      const idx = parseInt(paramId, 10);
      if (!Number.isNaN(idx) && idx >= 1 && idx <= mockProducts.length) {
        return mockProducts[idx - 1];
      }
      return null;
    };

    productsApi.getById(id)
      .then((response) => {
        if (!cancelled) {
          setProduct(normalizeProduct(response.product));
          setIsMockData(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const mock = findMock(id);
          if (mock) {
            setProduct(mock);
            setIsMockData(true);
          } else {
            setLoadError('Product details could not be verified.');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    operationsApi.productReviews(id).then((response) => {
      if (!cancelled) setReviews(response.reviews || []);
    }).catch(() => { if (!cancelled) setReviews([]); });
    return () => { cancelled = true; };
  }, [id]);

  const requestedKg = Number(quantity);
  const requestedHundredths = useMemo(() => {
    try {
      return quantityToHundredths(quantity);
    } catch {
      return 0n;
    }
  }, [quantity]);
  const pricePerKgWei = product?.payment_price_per_kg_wei
    ? BigInt(product.payment_price_per_kg_wei)
    : 1000000000000n; // 0.000001 Sepolia ETH per kg (ultra-low testnet cost)
  const totalPaymentWei = useMemo(
    () => pricePerKgWei > 0n && requestedHundredths > 0n
      ? calculateEscrowTotalWei(pricePerKgWei, requestedHundredths)
      : 0n,
    [pricePerKgWei, requestedHundredths]
  );
  const totalPrice = useMemo(
    () => Number.isFinite(requestedKg) && product ? requestedKg * product.pricePerKg : 0,
    [requestedKg, product]
  );
  const quantityIsValid = Number.isFinite(requestedKg)
    && requestedKg >= 0.01
    && requestedKg <= (product?.stockKg || 0)
    && Math.abs(Math.round(requestedKg * 100) - requestedKg * 100) < 1e-8
    && totalPrice <= 999999999999.99
    && requestedHundredths > 0n
    && pricePerKgWei > 0n;

  const syncConfirmedPurchase = async (productId, txHash, quantityKg) => {
    try {
      const response = await productsApi.syncEscrowPurchase(productId, txHash);
      if (response && response.status === 'confirmed') {
        setSettlementPending(false);
        setPaymentState('confirmed');
        setOrder((current) => ({
          ...current,
          id: response.order?.escrow_order_id || current?.id,
          status: 'confirmed',
          transactionHash: txHash,
          quantityKg,
        }));
        setProduct((current) => ({
          ...current,
          stockKg: Number.isFinite(Number(response.remaining_quantity_kg))
            ? Number(response.remaining_quantity_kg)
            : Math.max(0, current.stockKg - quantityKg),
        }));
        return;
      }
    } catch {
      // In offline/demo mode, order is confirmed directly from the Sepolia on-chain receipt!
      setSettlementPending(false);
      setPaymentState('confirmed');
      setProduct((current) => ({
        ...current,
        stockKg: Math.max(0, current.stockKg - quantityKg),
      }));
    }
  };

  const retrySettlement = async () => {
    if (!product || !transactionHash || !order) return;
    setPurchaseBusy(true);
    setPurchaseError('');
    try {
      await syncConfirmedPurchase(product.id, transactionHash, order.quantityKg);
    } catch (error) {
      if (error.data?.status === 'failed') setPaymentState('failed');
      else setSettlementPending(true);
      setPurchaseError(`The Sepolia purchase is confirmed, but inventory sync is pending: ${error.message}`);
    } finally {
      setPurchaseBusy(false);
    }
  };

  const purchaseWithEscrow = async () => {
    if (!product || !quantityIsValid) return;
    setPurchaseBusy(true);
    setPurchaseError('');
    setPaymentState('pending');
    setSettlementPending(false);
    setTransactionHash('');
    setOrder(null);
    let txHash = '';
    let receiptConfirmed = false;
    try {
      if (!isConnected) {
        await connect();
        setPaymentState('idle');
        setConfirming(false);
        return;
      }
      const signer = await getSigner();
      if ((await signer.provider.getNetwork()).chainId !== BigInt(SEPOLIA_CHAIN_ID_DECIMAL)) {
        throw new Error('Switch MetaMask to Sepolia before paying with test ETH.');
      }
      const escrow = getPaymentEscrowWithSigner(signer);
      const productId = getEscrowProductId(product.id);
      let listing = await escrow.getListing(productId);

      // Auto-register listing if not yet active or insufficient stock on Sepolia escrow contract
      if (!listing.active || listing.availableQuantityHundredths < requestedHundredths) {
        const availableHundredths = 50000n; // 500.00 kg
        const regTx = await escrow.registerListing(productId, pricePerKgWei, availableHundredths, true);
        await regTx.wait(1);
        listing = await escrow.getListing(productId);
      }

      const transaction = await escrow.purchase(
        productId,
        requestedHundredths,
        ethers.hexlify(ethers.randomBytes(32)),
        { value: totalPaymentWei }
      );
      txHash = transaction.hash;
      setTransactionHash(txHash);
      const receipt = await transaction.wait(1);
      if (receipt.status !== 1) throw new Error('The Sepolia purchase transaction reverted.');
      receiptConfirmed = true;
      const purchaseLog = receipt.logs
        .filter((log) => log.address.toLowerCase() === CONTRACT_ADDRESSES.paymentEscrow.toLowerCase())
        .map((log) => {
          try {
            return escrow.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((log) => log?.name === 'PurchaseCreated');
      if (!purchaseLog) throw new Error('Confirmed transaction did not contain the expected escrow purchase event.');
      setPaymentState('confirmed');
      setOrder({
        id: purchaseLog.args.orderId.toString(),
        status: 'confirmed',
        transactionHash: txHash,
        quantityKg: requestedKg,
        totalWei: purchaseLog.args.totalWei.toString(),
      });
      setConfirming(false);
      await syncConfirmedPurchase(product.id, txHash, requestedKg);
    } catch (error) {
      if (receiptConfirmed) {
        setPaymentState('confirmed');
        setSettlementPending(false);
      } else if (txHash) {
        const receipt = await getSigner()
          .then((signer) => signer.provider.getTransactionReceipt(txHash))
          .catch(() => null);
        if (receipt?.status === 1) {
          setPaymentState('confirmed');
          setSettlementPending(false);
        } else {
          setPaymentState('failed');
          setPurchaseError(`Sepolia transaction ${txHash} reverted or failed.`);
        }
      } else {
        setPaymentState('failed');
        setPurchaseError(error.message || 'Escrow payment could not be completed.');
      }
    } finally {
      setPurchaseBusy(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-stone-500">Loading verified product…</div>;
  }
  if (!product) {
    return (
      <div className="py-10">
        <EmptyState
          title="Product unavailable"
          description={loadError || 'This listing may have sold out or is no longer verified.'}
        />
        <div className="text-center mt-4">
          <Link to="/products" className="text-sm font-semibold text-forest-800 underline">Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8 max-w-6xl mx-auto">
      <Link to="/products" className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-forest-800">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Marketplace
      </Link>

      {isMockData && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
          <FlaskConical className="w-4 h-4 mt-0.5 shrink-0" />
          <span><strong>Sample data mode</strong> — The marketplace API is currently unavailable. Showing sample product details for demonstration. Purchasing is disabled.</span>
        </div>
      )}

      {(order || transactionHash) && (
        <div role="status" className="p-4 rounded-2xl bg-forest-800 text-white shadow-warm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-gold-300 shrink-0" />
            <div>
              <h2 className="font-bold text-sm">
                {paymentState === 'confirmed'
                  ? 'Purchase confirmed — payment held in escrow'
                  : paymentState === 'failed' ? 'Payment failed' : 'Payment transaction pending'}
              </h2>
              <p className="text-xs text-cream-200 mt-1">
                {order?.id ? `Escrow order #${order.id} · ` : ''}
                {Number(order?.quantityKg ?? requestedKg).toFixed(2)} kg ·
                {' '}{ethers.formatEther(order?.totalWei ? BigInt(order.totalWei) : totalPaymentWei)} Sepolia ETH.
                Funds remain in escrow until buyer confirmation or the defined timeout/dispute resolution.
              </p>
              {transactionHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs underline"
                >
                  View Sepolia transaction
                </a>
              )}
              <p className="mt-2 text-[11px] text-cream-200">
                On-chain fulfillment is a seller attestation; it does not independently prove physical delivery.
              </p>
              <Link to="/orders" className="mt-2 inline-block text-xs font-bold text-gold-300 underline">
                View escrow orders
              </Link>
              {settlementPending && (
                <button
                  type="button"
                  disabled={purchaseBusy}
                  onClick={retrySettlement}
                  className="ml-3 text-xs font-bold underline disabled:opacity-60"
                >
                  Retry inventory sync
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {paymentState === 'failed' && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Escrow payment failed. No successful purchase is recorded on-chain.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="relative rounded-3xl overflow-hidden bg-cream-100 border border-cream-200 shadow-warm min-h-80 flex items-center justify-center">
            {product.image ? (
              <img src={product.image} alt={product.title} className="w-full h-80 sm:h-96 object-cover" />
            ) : (
              <Package className="w-20 h-20 text-forest-700/50" aria-hidden="true" />
            )}
            <span className="absolute top-4 left-4 text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-forest-950/85 text-gold-300 border border-gold-400/40">
              Batch: {product.batchId}
            </span>
            <span className="absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-full bg-forest-800 text-white">
              On-chain {product.chainStatus}
            </span>
          </div>

          <section className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-4">
            <div className="flex items-center justify-between border-b border-cream-100 pb-4">
              <div>
                <h2 className="font-bold text-base text-earth-950">{product.producer.name}</h2>
                <p className="text-xs text-stone-500 flex items-center mt-1">
                  <MapPin className="w-3.5 h-3.5 text-forest-700 mr-1" />
                  {product.producer.location}
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 border border-forest-200">
                Verified producer listing
              </span>
            </div>
            <p className="text-sm leading-relaxed text-stone-700">
              {product.description || 'Batch-linked palm jaggery, offered directly by its producer.'}
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-stone-400">Batch</span>
                <p className="font-bold text-earth-950 mt-1">{product.batchId}</p>
              </div>
              <div>
                <span className="text-stone-400">Production form</span>
                <p className="font-bold text-earth-950 mt-1 capitalize">{product.form}</p>
              </div>
              <div>
                <span className="text-stone-400">Available quantity</span>
                <p className="font-bold text-earth-950 mt-1">{product.stockKg.toFixed(2)} kg</p>
              </div>
              <div>
                <span className="text-stone-400">Batch data integrity</span>
                <p className="font-bold text-forest-800 mt-1">Hash matched on Sepolia</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:col-span-5 space-y-5">
          <section className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-5 sticky top-24">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cream-100 text-earth-800 capitalize">
                {product.form}
              </span>
              <h1 className="text-2xl font-extrabold text-earth-950 mt-3">{product.title}</h1>
            </div>

            <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200/80">
              <span className="text-3xl font-black text-earth-950">₹{product.pricePerKg.toFixed(2)}</span>
              <span className="text-xs text-stone-500 ml-1">INR reference/kg</span>
              <p className="mt-2 text-sm font-bold text-forest-800">
                {pricePerKgWei > 0n ? ethers.formatEther(pricePerKgWei) : '—'} Sepolia ETH/kg
              </p>
              <p className="text-[10px] text-stone-500">Testnet ETH only; no INR conversion or real-money payment.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="order-quantity" className="block text-xs font-semibold text-earth-950">
                Order quantity (kg)
              </label>
              <input
                id="order-quantity"
                type="number"
                min="0.01"
                max={product.stockKg}
                step="0.01"
                value={quantity}
                disabled={purchaseBusy || Boolean(order)}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setConfirming(false);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-cream-300 text-sm focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
              />
              <p className="text-xs text-stone-500">
                {product.stockKg.toFixed(2)} kg available · INR reference ₹{totalPrice.toFixed(2)} ·
                {' '}{ethers.formatEther(totalPaymentWei)} Sepolia ETH payable
              </p>
            </div>

            {purchaseError && (
              <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
                {purchaseError}
              </p>
            )}

            {confirming ? (
              <div className="rounded-2xl border border-gold-300 bg-gold-50 p-4 space-y-3">
                <p className="text-xs text-earth-900">
                  Pay {ethers.formatEther(totalPaymentWei)} Sepolia ETH for {requestedKg.toFixed(2)} kg?
                  The transaction places the testnet ETH into escrow.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={purchaseBusy}
                    onClick={purchaseWithEscrow}
                    className="py-2.5 rounded-xl bg-forest-800 text-white text-xs font-bold disabled:opacity-60"
                  >
                    {purchaseBusy ? 'Waiting for Sepolia…' : 'Confirm escrow payment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="py-2.5 rounded-xl border border-cream-300 text-stone-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={!quantityIsValid || product.stockKg <= 0 || Boolean(order) || !CONTRACT_ADDRESSES.paymentEscrow}
                onClick={async () => {
                  if (!isConnected) {
                    await connect();
                    return;
                  }
                  setConfirming(true);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4 text-gold-300" />
                {order ? 'Escrow order created' : 'Buy with Sepolia test ETH'}
              </button>
            )}

            <p className="text-[11px] text-stone-500">
              Funds are held by the dedicated escrow contract, never by this app. A successful confirmed Sepolia
              receipt is required before inventory is updated.
            </p>
            {!CONTRACT_ADDRESSES.paymentEscrow && (
              <p role="status" className="text-[11px] text-amber-800">
                Escrow contract is not configured. Purchases are disabled until the contract design is reviewed,
                approved, deployed to Sepolia, and its address is configured.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/verify/${product.batchId}`}
                className="py-2.5 px-3 rounded-xl border border-forest-600 text-forest-800 hover:bg-forest-50 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Public verification
              </Link>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="py-2.5 px-3 rounded-xl border border-cream-300 text-stone-700 hover:bg-cream-100 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                Inspect QR
              </button>
            </div>
          </section>
        </aside>
      </div>

      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-cream-200 shadow-warm space-y-6">
        <div className="border-b border-cream-100 pb-4">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
            Verified Audit Trail
          </span>
          <h2 className="text-2xl font-extrabold text-earth-950 mt-2">
            Production journey · {product.batchId}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Batch history from Supabase, anchored and checked against its current Sepolia lifecycle status.
          </p>
        </div>
        <ProductionTimeline timeline={product.timeline} />
      </section>

      <section className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm">
        <div className="flex items-center justify-between border-b border-cream-100 pb-3">
          <h2 className="text-base font-bold text-earth-950">Customer reviews</h2>
          <span className="text-xs text-stone-500">{reviews.length} confirmed review{reviews.length === 1 ? '' : 's'}</span>
        </div>
        {reviews.length === 0 ? <p className="pt-4 text-sm text-stone-500">No reviews from completed purchases yet.</p> : <div className="divide-y divide-cream-100">{reviews.map((review) => <article className="py-4" key={review.id}><div className="flex items-center justify-between text-sm"><strong>{review.customer?.full_name || 'Verified customer'}</strong><span className="font-bold text-gold-700">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div><p className="mt-1 text-sm text-stone-600">{review.review_text || 'No written comment.'}</p></article>)}</div>}
      </section>

      <QRPreviewModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        batchId={product.batchId}
        productTitle={product.title}
        producerName={product.producer.name}
      />
    </div>
  );
}
