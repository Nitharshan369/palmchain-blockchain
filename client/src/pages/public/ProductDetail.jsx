import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, MapPin, Package, QrCode, ShieldCheck, ShoppingCart } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import ProductionTimeline from '../../components/common/ProductionTimeline';
import QRPreviewModal from '../../components/common/QRPreviewModal';
import { productsApi } from '../../lib/api';
import { normalizeProduct } from '../../lib/marketplace';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [quantity, setQuantity] = useState('1.00');
  const [confirming, setConfirming] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseRequestKey, setPurchaseRequestKey] = useState(() => crypto.randomUUID());
  const [order, setOrder] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    productsApi.getById(id)
      .then((response) => {
        if (!cancelled) setProduct(normalizeProduct(response.product));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || 'Product could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const requestedKg = Number(quantity);
  const totalPrice = useMemo(
    () => Number.isFinite(requestedKg) && product ? requestedKg * product.pricePerKg : 0,
    [requestedKg, product]
  );
  const quantityIsValid = Number.isFinite(requestedKg)
    && requestedKg >= 0.01
    && requestedKg <= (product?.stockKg || 0)
    && Math.abs(Math.round(requestedKg * 100) - requestedKg * 100) < 1e-8
    && totalPrice <= 999999999999.99;

  const reserveOrder = async () => {
    if (!product || !quantityIsValid) return;
    setPurchaseBusy(true);
    setPurchaseError('');
    try {
      const response = await productsApi.purchase(product.id, requestedKg, purchaseRequestKey);
      setOrder(response.order);
      setProduct((current) => ({
        ...current,
        stockKg: Number(response.order.remaining_quantity_kg),
      }));
      setConfirming(false);
    } catch (error) {
      setPurchaseError(error.message || 'Could not reserve this order.');
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

      {order && (
        <div role="status" className="p-4 rounded-2xl bg-forest-800 text-white shadow-warm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-gold-300 shrink-0" />
            <div>
              <h2 className="font-bold text-sm">Order reserved — no payment collected</h2>
              <p className="text-xs text-cream-200 mt-1">
                Order {order.id} · {quantity} kg · ₹{Number(order.total_amount_inr).toFixed(2)}.
                Payment status: pending. This reservation did not submit a blockchain transaction.
              </p>
            </div>
          </div>
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
              <span className="text-xs text-stone-500 ml-1">per kilogram</span>
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
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setPurchaseRequestKey(crypto.randomUUID());
                  setConfirming(false);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-cream-300 text-sm focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
              />
              <p className="text-xs text-stone-500">
                {product.stockKg.toFixed(2)} kg available · Total ₹{totalPrice.toFixed(2)}
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
                  Reserve {requestedKg.toFixed(2)} kg for ₹{totalPrice.toFixed(2)}? No payment will be taken.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={purchaseBusy}
                    onClick={reserveOrder}
                    className="py-2.5 rounded-xl bg-forest-800 text-white text-xs font-bold disabled:opacity-60"
                  >
                    {purchaseBusy ? 'Reserving…' : 'Confirm reservation'}
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
                disabled={!quantityIsValid || product.stockKg <= 0 || Boolean(order)}
                onClick={() => setConfirming(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4 text-gold-300" />
                {order ? 'Order reserved' : 'Reserve order — no payment'}
              </button>
            )}

            <p className="text-[11px] text-stone-500">
              Reservation records a pending order and updates available stock. Checkout payments are not enabled.
            </p>

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
