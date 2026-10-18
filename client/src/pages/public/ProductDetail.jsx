import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  QrCode, 
  MapPin, 
  Calendar, 
  Flame, 
  Droplets, 
  ShoppingCart, 
  Check, 
  Star, 
  ArrowLeft, 
  Award, 
  ChevronRight,
  Heart,
  Share2,
  Sparkles
} from 'lucide-react';
import { mockProducts, mockBatches } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import ProductionTimeline from '../../components/common/ProductionTimeline';
import ConfirmModal from '../../components/common/ConfirmModal';
import QRPreviewModal from '../../components/common/QRPreviewModal';

export default function ProductDetail() {
  const { id } = useParams();
  const product = mockProducts.find((p) => p.id === id) || mockProducts[0];
  const batch = mockBatches[product.batchId] || mockBatches['PJG-2026-001'];

  const [quantity, setQuantity] = useState(1);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const totalPrice = product.price * quantity;

  const handleConfirmOrder = () => {
    setCheckoutModalOpen(false);
    setOrderConfirmed(true);
    setTimeout(() => setOrderConfirmed(false), 5000);
  };

  return (
    <div className="py-6 space-y-10 max-w-6xl mx-auto">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs text-stone-500">
        <Link to="/products" className="inline-flex items-center space-x-1 hover:text-forest-800">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Marketplace</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
        <span className="text-stone-900 font-semibold truncate max-w-xs">{product.title}</span>
      </div>

      {/* Order Confirmed Toast */}
      {orderConfirmed && (
        <div className="p-4 rounded-2xl bg-forest-800 text-white flex items-center justify-between shadow-warm animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-gold-300 font-bold">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-sm">Simulated Order Placed Successfully!</h4>
              <p className="text-xs text-cream-200">
                Ordered {quantity} × {product.unitWeightGrams}g of {product.title}. Total: ₹{totalPrice}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOrderConfirmed(false)}
            className="text-cream-300 hover:text-white text-xs px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Product Images & Producer Card (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Showcase Image */}
          <div className="relative rounded-3xl overflow-hidden bg-cream-100 border border-cream-200 shadow-warm">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-80 sm:h-96 object-cover"
            />
            <div className="absolute top-4 left-4">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-forest-950/85 backdrop-blur-xs text-gold-300 border border-gold-400/40">
                Batch: {product.batchId}
              </span>
            </div>
            <div className="absolute top-4 right-4">
              <StatusBadge status={product.purityVerified ? 'certified' : 'processing'} />
            </div>
          </div>

          {/* Producer Information Box */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-4">
            <div className="flex items-center justify-between border-b border-cream-100 pb-4">
              <div className="flex items-center space-x-3">
                <img
                  src={product.producer.avatar}
                  alt={product.producer.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-forest-600/30"
                />
                <div>
                  <h3 className="font-bold text-base text-earth-950">{product.producer.name}</h3>
                  <p className="text-xs text-stone-500 flex items-center mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-forest-700 mr-1" />
                    <span>{product.producer.location}</span>
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 border border-forest-200">
                Authorized Producer
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-stone-400">Grove Scale</span>
                <p className="font-bold text-earth-950">{product.producer.groveSize}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-stone-400">Harvest Experience</span>
                <p className="font-bold text-earth-950">{product.producer.experienceYears} Years Generationally</p>
              </div>
            </div>
          </div>

          {/* Flavor Notes & Traditional Benefits */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                Flavor & Aroma Profile
              </h4>
              <div className="flex flex-wrap gap-2">
                {product.flavorNotes.map((note, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-cream-100 text-earth-900 border border-cream-200 text-xs font-medium"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-cream-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                Documented Ayurvedic & Nutritional Highlights
              </h4>
              <ul className="space-y-2 text-xs text-stone-700">
                {product.traditionalBenefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-forest-600 shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Purchase & Verification Interface (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Order / Purchase Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-6 sticky top-24">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cream-100 text-earth-800">
                  {product.form}
                </span>
                <span className="flex items-center space-x-1 text-xs text-gold-600 font-bold">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{product.rating}</span>
                  <span className="text-stone-400 font-normal">({product.reviewCount} customer reviews)</span>
                </span>
              </div>

              <h1 className="text-2xl font-extrabold text-earth-950">{product.title}</h1>
              <p className="text-xs text-stone-600 leading-relaxed">{product.tagline}</p>
            </div>

            {/* Pricing Section */}
            <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200/80 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-earth-950">₹{product.price}</span>
                <span className="text-xs text-stone-500 ml-1">/ {product.unitWeightGrams}g pack</span>
              </div>
              <span className="text-xs font-mono text-stone-500">₹{product.pricePerKg}/kg</span>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-earth-950">
                Select Quantity:
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-cream-300 rounded-xl bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-2 text-stone-600 hover:bg-cream-100 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 text-xs font-bold text-earth-950 font-mono">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3.5 py-2 text-stone-600 hover:bg-cream-100 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-stone-500">
                  Total Weight: <strong>{(quantity * product.unitWeightGrams) / 1000} kg</strong>
                </span>
              </div>
            </div>

            {/* Order Breakdown */}
            <div className="border-t border-cream-100 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal ({quantity} items)</span>
                <span className="font-mono">₹{totalPrice}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Direct Farmer Payout (88%)</span>
                <span className="font-mono text-forest-700">₹{(totalPrice * 0.88).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping & Traceability Protocol</span>
                <span className="text-forest-700 font-semibold">Free Delivery</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-earth-950 pt-2 border-t border-cream-100">
                <span>Total Amount:</span>
                <span className="text-base text-forest-900 font-black font-mono">₹{totalPrice}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setCheckoutModalOpen(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-all hover:-translate-y-0.5"
              >
                <ShoppingCart className="w-4 h-4 text-gold-300" />
                <span>Purchase Direct from Farmer</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={`/verify/${product.batchId}`}
                  className="py-2.5 px-3 rounded-xl border border-forest-600 text-forest-800 hover:bg-forest-50 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
                  <span>Verify Batch</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl border border-cream-300 text-stone-700 hover:bg-cream-100 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-earth-700" />
                  <span>Inspect QR</span>
                </button>
              </div>
            </div>

            {/* Guarantee Note */}
            <div className="p-3.5 rounded-2xl bg-cream-50 border border-cream-200 text-[11px] text-stone-600 space-y-1">
              <div className="font-bold text-earth-950 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                <span>PalmChain Guarantee</span>
              </div>
              <p className="leading-relaxed">
                If laboratory tests indicate cane sugar or chemical adulteration, full refund is guaranteed by the producer cooperative.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Production Journey for This Product */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-cream-200 shadow-warm space-y-8">
        <div className="border-b border-cream-100 pb-4">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
            Verified Audit Trail
          </span>
          <h2 className="text-2xl font-extrabold text-earth-950 mt-1">
            Production Timeline for Batch {batch.batchId}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Every step signed with dates, equipment, temperatures, and operator identities.
          </p>
        </div>

        <ProductionTimeline timeline={batch.timeline} />
      </section>

      {/* Checkout Modal */}
      <ConfirmModal
        isOpen={checkoutModalOpen}
        title="Confirm Direct Artisan Order"
        message={`You are about to place a direct farmgate purchase for ${quantity} × ${product.title} (₹${totalPrice}). In Phase 1 frontend preview mode, confirming will simulate instant payment verification and generate an order record.`}
        confirmLabel={`Place Order (₹${totalPrice})`}
        cancelLabel="Cancel"
        onConfirm={handleConfirmOrder}
        onCancel={() => setCheckoutModalOpen(false)}
      />

      {/* QR Preview Modal */}
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
