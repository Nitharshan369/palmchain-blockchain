import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Package,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { productsApi } from '../../lib/api';
import { filterProducts, normalizeProduct } from '../../lib/marketplace';

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForm, setSelectedForm] = useState('all');
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [priceRange, setPriceRange] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    let cancelled = false;
    productsApi.list({ limit: 100 })
      .then((response) => {
        if (!cancelled) setProducts((response.products || []).map(normalizeProduct));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || 'Marketplace listings could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredProducts = useMemo(() => filterProducts(products, {
    searchQuery,
    selectedForm,
    certifiedOnly,
    priceRange,
    selectedRegion,
    sortBy,
  }), [products, searchQuery, selectedForm, certifiedOnly, priceRange, selectedRegion, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedForm('all');
    setCertifiedOnly(false);
    setPriceRange('all');
    setSelectedRegion('all');
    setSortBy('featured');
  };

  const hasFilters = searchQuery || selectedForm !== 'all' || certifiedOnly
    || priceRange !== 'all' || selectedRegion !== 'all';

  return (
    <div className="py-6 space-y-8">
      <div className="border-b border-cream-200 pb-6">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cream-200 text-earth-800 uppercase tracking-wider">
          Direct Farmer Commerce
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-earth-950 mt-2">
          Authentic Palm Jaggery Marketplace
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
          Browse batch-linked products from verified producers. Every active listing is checked against its
          packaged batch and integrity hash on Sepolia.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-cream-200 shadow-warm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search products, producers, or batch IDs..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden focus:ring-2 focus:ring-gold-400 text-xs"
            />
          </div>
          <label className="flex items-center space-x-2 text-xs font-semibold text-stone-600">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs font-medium focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>

        <div className="pt-2 border-t border-cream-100 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-stone-500 font-semibold">
            Form:
            <select
              value={selectedForm}
              onChange={(event) => setSelectedForm(event.target.value)}
              className="px-2.5 py-1 rounded-lg border border-cream-200 bg-cream-50 text-xs font-medium"
            >
              <option value="all">All Forms</option>
              <option value="block">Solid Blocks</option>
              <option value="granulated">Granulated Powder</option>
              <option value="candy">Palm Candy</option>
              <option value="syrup">Liquid Syrup</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-stone-500 font-semibold">
            Region:
            <select
              value={selectedRegion}
              onChange={(event) => setSelectedRegion(event.target.value)}
              className="px-2.5 py-1 rounded-lg border border-cream-200 bg-cream-50 text-xs font-medium"
            >
              <option value="all">All Regions</option>
              <option value="tenkasi">Tenkasi</option>
              <option value="tuticorin">Tuticorin</option>
              <option value="palakkad">Palakkad</option>
              <option value="ramanathapuram">Ramanathapuram</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-stone-500 font-semibold">
            Price/kg:
            <select
              value={priceRange}
              onChange={(event) => setPriceRange(event.target.value)}
              className="px-2.5 py-1 rounded-lg border border-cream-200 bg-cream-50 text-xs font-medium"
            >
              <option value="all">Any Price</option>
              <option value="under200">Under ₹200</option>
              <option value="200to300">₹200–₹300</option>
              <option value="above300">Above ₹300</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer bg-cream-50 px-3 py-1 rounded-lg border border-cream-200">
            <input
              type="checkbox"
              checked={certifiedOnly}
              onChange={(event) => setCertifiedOnly(event.target.checked)}
              className="rounded text-forest-700 focus:ring-forest-500 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-semibold text-forest-900">Verified batches only</span>
          </label>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-earth-900 underline"
            >
              <RotateCcw className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <span>Showing <strong>{filteredProducts.length}</strong> verified listings</span>
          <span className="font-mono text-[11px]">Inventory-backed · INR per kg</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-stone-500">Loading verified marketplace listings…</div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title={loadError ? 'Marketplace is unavailable' : 'No matching palm jaggery products'}
            description={loadError
              ? 'Please try again when the marketplace API and batch verification service are available.'
              : 'No active listings match these filters. Try another search or clear your filters.'}
            actionLabel={hasFilters ? 'Reset Filters' : undefined}
            onAction={hasFilters ? resetFilters : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="bg-white rounded-3xl border border-cream-200/90 shadow-warm hover:shadow-warm-lg hover:border-gold-300 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  <div className="h-56 w-full overflow-hidden bg-cream-100 relative flex items-center justify-center">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Package className="h-14 w-14 text-forest-700/50" aria-hidden="true" />
                    )}
                    <span className="absolute top-3 left-3 text-[11px] font-mono px-2.5 py-1 rounded-full bg-forest-950/85 text-gold-300 font-bold border border-gold-400/40">
                      {product.batchId}
                    </span>
                    <span className="absolute top-3 right-3">
                      <StatusBadge status="certified" />
                    </span>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-forest-700" />
                        {product.producer.location}
                      </span>
                      <span className="inline-flex items-center gap-1 text-forest-700 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {product.chainStatus}
                      </span>
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-earth-950 group-hover:text-forest-800">
                        {product.title}
                      </h2>
                      <p className="text-xs text-stone-500 mt-0.5">{product.producer.name}</p>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                      {product.description || 'Batch-traceable palm jaggery, listed directly by its producer.'}
                    </p>
                    <div className="pt-2 flex items-center justify-between text-xs text-stone-500 border-t border-cream-100">
                      <span>Available</span>
                      <span className="font-mono font-bold text-earth-900">{product.stockKg.toFixed(2)} kg</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 pt-0 border-t border-cream-100 space-y-3">
                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <span className="text-2xl font-black text-earth-950">₹{product.pricePerKg.toFixed(2)}</span>
                      <span className="text-xs text-stone-500 ml-1">/ kg</span>
                    </div>
                    <Link
                      to={`/verify/${product.batchId}`}
                      className="text-xs font-semibold text-forest-700 hover:text-forest-900 underline flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Verify batch
                    </Link>
                  </div>
                  <Link
                    to={`/product/${product.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs shadow-xs transition-colors"
                  >
                    View journey & order
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
