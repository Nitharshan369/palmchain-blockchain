import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sprout, 
  ShieldCheck, 
  ShoppingBag, 
  ArrowRight, 
  QrCode, 
  CheckCircle2, 
  Search, 
  Layers, 
  Flame, 
  Droplets, 
  Sparkles, 
  HeartHandshake,
  Award,
  ChevronRight
} from 'lucide-react';
import { mockProducts, SIMULATION_NOTICE } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';

export default function Home() {
  const [quickBatchInput, setQuickBatchInput] = useState('');
  const navigate = useNavigate();

  const handleQuickVerify = (e) => {
    e.preventDefault();
    if (quickBatchInput.trim()) {
      navigate(`/verify/${quickBatchInput.trim().toUpperCase()}`);
    } else {
      navigate('/verify/PJG-2026-001');
    }
  };

  const journeySteps = [
    {
      step: '01',
      title: 'Dawn Sap Tapping',
      icon: Droplets,
      desc: 'Skilled tappers harvest fresh Neera at 5:00 AM using lime-treated pots to stop overnight wild fermentation.',
      badge: 'Brix 14-16°',
    },
    {
      step: '02',
      title: 'Natural Clarification',
      icon: Sprout,
      desc: 'Cold filtration through triple-layer cotton and wild okra mucilage precipitates natural impurities without chemical bleaching.',
      badge: 'Zero Chemicals',
    },
    {
      step: '03',
      title: 'Biomass Hearth Boiling',
      icon: Flame,
      desc: 'Slowly simmered in shallow iron cauldrons fueled only by fallen dry palm fronds until reaching the 118.5°C strike point.',
      badge: 'Renewable Biomass',
    },
    {
      step: '04',
      title: 'Coconut Shell Molding',
      icon: Award,
      desc: 'Hand-ladled into halved coconut shell molds or sieved to golden crystalline granules as it naturally cools.',
      badge: 'Traditional Craft',
    },
    {
      step: '05',
      title: 'Lab Assay & Sepolia Anchor',
      icon: ShieldCheck,
      desc: 'Tested for zero cane-sugar adulteration. A deterministic SHA-256 hash is anchored onto the Ethereum blockchain.',
      badge: 'Immutable Anchor',
    },
  ];

  return (
    <div className="space-y-20 py-6">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-950 via-forest-900 to-earth-950 text-white p-8 sm:p-14 lg:p-18 shadow-warm-lg border border-forest-800">
        <div className="relative z-10 max-w-3xl space-y-7">
          {/* Tagline Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-forest-800/80 border border-gold-400/40 text-gold-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span>Decentralized Agro-Traceability & Marketplace</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            From Palm Tree to <span className="text-gold-300">Trusted Product</span>.
          </h1>

          <p className="text-cream-200/90 text-base sm:text-lg leading-relaxed max-w-2xl font-light">
            PalmChain connects traditional palm-jaggery artisans directly with health-conscious consumers. Every production batch is endowed with a digital identity, tamper-proof SHA-256 integrity hash, and verifiable origin history.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/products"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-earth-950 font-bold text-sm shadow-md transition-all hover:-translate-y-0.5"
            >
              <ShoppingBag className="w-4 h-4 text-earth-900" />
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              to="/producer/dashboard"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-forest-800/80 hover:bg-forest-700/80 text-white border border-forest-600 font-semibold text-sm transition-all"
            >
              <Sprout className="w-4 h-4 text-gold-300" />
              <span>Join as Producer</span>
            </Link>
          </div>

          {/* Live Quick Verification Lookup Bar */}
          <div className="pt-6 border-t border-forest-800/80">
            <form onSubmit={handleQuickVerify} className="max-w-xl">
              <label className="block text-xs font-semibold text-cream-300 mb-2">
                Have a jar or block? Scan or enter batch number:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={quickBatchInput}
                    onChange={(e) => setQuickBatchInput(e.target.value)}
                    placeholder="e.g. PJG-2026-001"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 text-white placeholder-stone-400 border border-forest-700 focus:outline-hidden focus:ring-2 focus:ring-gold-400 text-xs font-mono uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-forest-700 hover:bg-forest-600 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-colors border border-forest-500/50"
                >
                  <QrCode className="w-4 h-4 text-gold-300" />
                  <span>Verify Batch</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Ambient Decorative Shapes */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-forest-500/20 blur-3xl pointer-events-none" />
      </section>

      {/* 2. Key Pillars Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-7 border border-cream-200/90 shadow-warm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-forest-100 text-forest-800 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-forest-700" />
          </div>
          <h3 className="text-base font-bold text-earth-950">True Farm-to-Table Traceability</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Every product batch is linked to the GPS coordinates of the specific palmyrah grove, tree health records, harvest date, and sap brix levels.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-7 border border-cream-200/90 shadow-warm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gold-100 text-gold-900 flex items-center justify-center">
            <Layers className="w-6 h-6 text-gold-700" />
          </div>
          <h3 className="text-base font-bold text-earth-950">Cryptographic Integrity</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Canonical production parameters are transformed into a deterministic SHA-256 hash anchored to Ethereum Sepolia. Tampering invalidates the seal.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-7 border border-cream-200/90 shadow-warm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-earth-100 text-earth-900 flex items-center justify-center">
            <HeartHandshake className="w-6 h-6 text-earth-700" />
          </div>
          <h3 className="text-base font-bold text-earth-950">Direct Artisan Commerce</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Eliminates exploitative middlemen. Traditional palmyrah climbing families and cooperatives earn up to 4x higher farmgate prices for authentic craft.
          </p>
        </div>
      </section>

      {/* 3. Visual Production Journey */}
      <section className="bg-forest-950 text-white rounded-3xl p-8 sm:p-12 border border-forest-900 space-y-10">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-800 text-gold-300 uppercase tracking-wider">
            Lifecycle Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            The Verified Production Journey
          </h2>
          <p className="text-xs sm:text-sm text-cream-300/80 leading-relaxed">
            From the 20-meter high palm canopy to your table, each stage is digitally signed and audited.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {journeySteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="p-5 rounded-2xl bg-forest-900/60 border border-forest-800 hover:border-gold-400/60 transition-colors flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-gold-400">{step.step}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-forest-800 text-cream-200 border border-forest-700">
                      {step.badge}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-forest-800 flex items-center justify-center text-gold-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-white">{step.title}</h4>
                  <p className="text-xs text-cream-300/70 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Featured Verified Products */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cream-200 text-earth-800 uppercase tracking-wider">
              Artisan Catalog
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
              Pure Unadulterated Palm Jaggery
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Every package carries a scannable batch QR code backed by laboratory purity assay.
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-forest-800 hover:text-forest-950"
          >
            <span>View All Products</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProducts.slice(0, 3).map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-3xl border border-cream-200/90 shadow-warm hover:shadow-warm-lg hover:border-gold-300 transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Product Image */}
                <div className="h-52 w-full overflow-hidden bg-cream-100 relative">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-forest-950/80 backdrop-blur-xs text-gold-300 font-bold border border-gold-400/40">
                      {product.batchId}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={product.purityVerified ? 'certified' : 'processing'} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-earth-950 group-hover:text-forest-800 transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">{product.producer.name}</p>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                    {product.tagline}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {product.flavorNotes.slice(0, 2).map((note, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-cream-100 text-earth-800 border border-cream-200">
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-6 pt-0 border-t border-cream-100 mt-2 space-y-3">
                <div className="flex items-baseline justify-between pt-3">
                  <div>
                    <span className="text-xl font-black text-earth-950">₹{product.price}</span>
                    <span className="text-[11px] text-stone-500 ml-1">/ {product.unitWeightGrams}g</span>
                  </div>
                  <Link
                    to={`/verify/${product.batchId}`}
                    className="text-xs font-semibold text-forest-700 hover:text-forest-900 underline flex items-center space-x-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Verify QR</span>
                  </Link>
                </div>

                <Link
                  to={`/product/${product.id}`}
                  className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  <span>View Details & Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Producer Onboarding Call to Action */}
      <section className="bg-cream-100 rounded-3xl p-8 sm:p-12 border border-cream-200 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 max-w-xl">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-forest-800 text-gold-300 uppercase tracking-wider">
            For Farming Cooperatives
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-earth-950">
            Are you a Palm-Jaggery Producer?
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Join PalmChain to register your trees, protect your artisanal heritage with blockchain batch anchors, and sell directly to consumers at guaranteed fair rates.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Link
            to="/producer/register"
            className="px-6 py-3.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-xs transition-colors text-center"
          >
            Register as Producer
          </Link>
          <Link
            to="/producer/dashboard"
            className="px-6 py-3.5 rounded-xl bg-white hover:bg-cream-50 text-forest-900 font-semibold text-xs border border-cream-300 transition-colors text-center"
          >
            Open Producer Portal
          </Link>
        </div>
      </section>
    </div>
  );
}
