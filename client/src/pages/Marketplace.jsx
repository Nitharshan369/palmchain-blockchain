import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ShoppingCart, Tag, ArrowRight, Award } from 'lucide-react';

export default function Marketplace() {
  const sampleProducts = [
    {
      id: 'p1',
      title: 'Artisanal Pure Palm Jaggery (Karupatti) - 500g Block',
      batchNumber: 'PJG-2026-001',
      producer: 'Murugan Natural Jaggery Coop (Tenkasi)',
      price: 280,
      rating: 4.9,
      form: 'Solid Block',
      purityVerified: true,
      description: 'Handcrafted traditionally in coconut shell molds with zero artificial clarifying agents or cane sugar.',
    },
    {
      id: 'p2',
      title: 'Organic Granulated Palm Sugar - 400g Pouch',
      batchNumber: 'PJG-2026-002',
      producer: 'Tuticorin Palmyrah Farmers FPO',
      price: 320,
      rating: 5.0,
      form: 'Granulated Powder',
      purityVerified: true,
      description: 'Low-glycemic index natural sweetener, sun-dried and sieved to fine golden granules.',
    },
    {
      id: 'p3',
      title: 'Medicinal Palm Candy (Panakarkandu) with Pepper & Cardamom - 250g',
      batchNumber: 'PJG-2026-003',
      producer: 'Palakkad Heritage Groves',
      price: 360,
      rating: 4.8,
      form: 'Crystal Candy',
      purityVerified: true,
      description: 'Slow-crystallized palm candy infused with organic dry ginger, black pepper, and cardamom for immunity.',
    },
  ];

  return (
    <div className="py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-palm-100 text-palm-800 uppercase tracking-wider">
            Direct-from-Farmer
          </span>
          <h1 className="text-3xl font-extrabold text-stone-900 mt-2">
            PalmChain Marketplace
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Purchase 100% verified, unadulterated palm-jaggery products directly from producer cooperatives.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                  {product.batchNumber}
                </span>
                <span className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>On-Chain Verified</span>
                </span>
              </div>

              <div>
                <h3 className="font-bold text-lg text-stone-900 group-hover:text-palm-700 transition-colors">
                  {product.title}
                </h3>
                <p className="text-xs text-stone-500 mt-1">{product.producer}</p>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                {product.description}
              </p>

              <div className="flex items-center space-x-2 text-xs text-stone-500">
                <Tag className="w-3.5 h-3.5 text-jaggery-600" />
                <span>Format: {product.form}</span>
              </div>
            </div>

            <div className="p-6 pt-0 border-t border-stone-100 mt-4 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-stone-900">₹{product.price}</span>
                  <span className="text-xs text-stone-500 ml-1">/ unit</span>
                </div>
                <Link
                  to={`/trace`}
                  className="text-xs font-semibold text-palm-700 hover:text-palm-900 underline"
                >
                  View Trace QR
                </Link>
              </div>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-palm-700 hover:bg-palm-800 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Direct Purchase</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
