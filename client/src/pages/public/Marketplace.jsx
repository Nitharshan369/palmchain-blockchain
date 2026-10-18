import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  ShieldCheck, 
  QrCode, 
  ArrowRight, 
  Star, 
  RotateCcw,
  Tag,
  MapPin,
  Package
} from 'lucide-react';
import { mockProducts } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForm, setSelectedForm] = useState('all');
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [priceRange, setPriceRange] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return mockProducts
      .filter((p) => {
        // Search text filter
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          p.title.toLowerCase().includes(query) ||
          p.producer.name.toLowerCase().includes(query) ||
          p.batchId.toLowerCase().includes(query) ||
          p.producer.location.toLowerCase().includes(query);

        // Form filter
        const matchesForm = selectedForm === 'all' || p.form.toLowerCase().includes(selectedForm.toLowerCase());

        // Certified filter
        const matchesCertified = !certifiedOnly || p.purityVerified;

        // Price range filter
        let matchesPrice = true;
        if (priceRange === 'under200') matchesPrice = p.price < 200;
        else if (priceRange === '200to300') matchesPrice = p.price >= 200 && p.price <= 300;
        else if (priceRange === 'above300') matchesPrice = p.price > 300;

        // Region filter
        const matchesRegion =
          selectedRegion === 'all' ||
          p.producer.location.toLowerCase().includes(selectedRegion.toLowerCase());

        return matchesQuery && matchesForm && matchesCertified && matchesPrice && matchesRegion;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0; // default / featured
      });
  }, [searchQuery, selectedForm, certifiedOnly, priceRange, selectedRegion, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedForm('all');
    setCertifiedOnly(false);
    setPriceRange('all');
    setSelectedRegion('all');
    setSortBy('featured');
  };

  return (
    <div className="py-6 space-y-8">
      {/* Header */}
      <div className="border-b border-cream-200 pb-6">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cream-200 text-earth-800 uppercase tracking-wider">
          Direct Farmer Commerce
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-earth-950 mt-2">
          Authentic Palm Jaggery Marketplace
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
          Purchase 100% natural Karupatti, granulated palm sugar, and herbal candies directly from certified artisan cooperatives. Every product links directly to an immutable on-chain batch passport.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-cream-200 shadow-warm space-y-4">
        {/* Search input + Sort */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, cooperative, or batch ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden focus:ring-2 focus:ring-gold-400 text-xs"
            />
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            <span className="text-xs font-semibold text-stone-600 shrink-0">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs font-medium focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
            >
              <option value="featured">Featured / Best Match</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="pt-2 border-t border-cream-100 flex flex-wrap items-center gap-3 text-xs">
          {/* Form Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-stone-500 font-semibold text-[11px]">Form:</span>
            <select
              value={selectedForm}
              onChange={(e) => setSelectedForm(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-cream-200 bg-cream-50 text-xs font-medium focus:outline-hidden"
            >
              <option value="all">All Forms</option>
              <option value="block">Solid Blocks</option>
              <option value="granulated">Granulated Powder</option>
              <option value="candy">Herbal Candy</option>
              <option value="syrup">Liquid Syrup</option>
            </select>
          </div>

          {/* Region Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-stone-500 font-semibold text-[11px]">Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-cream-200 bg-cream-50 text-xs font-medium focus:outline-hidden"
            >
              <option value="all">All Regions</option>
              <option value="tenkasi">Tenkasi</option>
              <option value="tuticorin">Tuticorin</option>
              <option value="palakkad">Palakkad</option>
              <option value="ramanathapuram">Ramanathapuram</option>
            </select>
          </div>

          {/* Price Range Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-stone-500 font-semibold text-[11px]">Price:</span>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-cream-200 bg-cream-50 text-xs font-medium focus:outline-hidden"
            >
              <option value="all">Any Price</option>
              <option value="under200">Under ₹200</option>
              <option value="200to300">₹200 - ₹300</option>
              <option value="above300">Above ₹300</option>
            </select>
          </div>

          {/* Certified Only Checkbox */}
          <label className="flex items-center space-x-1.5 cursor-pointer bg-cream-50 px-3 py-1 rounded-lg border border-cream-200">
            <input
              type="checkbox"
              checked={certifiedOnly}
              onChange={(e) => setCertifiedOnly(e.target.checked)}
              className="rounded text-forest-700 focus:ring-forest-500 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-semibold text-forest-900">Lab Certified Only</span>
          </label>

          {/* Reset Filters button */}
          {(searchQuery || selectedForm !== 'all' || certifiedOnly || priceRange !== 'all' || selectedRegion !== 'all') && (
            <button
              onClick={resetFilters}
              className="ml-auto inline-flex items-center space-x-1 text-[11px] text-stone-500 hover:text-earth-900 underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Count & Product Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <span>Showing <strong>{filteredProducts.length}</strong> artisan products</span>
          <span className="font-mono text-[11px]">100% Direct Farmer Livelihood</span>
        </div>

        {filteredProducts.length === 0 ? (
          <EmptyState
            title="No matching palm jaggery products"
            description="We couldn't find any products matching your specific filters. Try resetting the filters or searching for another term."
            actionLabel="Reset All Filters"
            onAction={resetFilters}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-cream-200/90 shadow-warm hover:shadow-warm-lg hover:border-gold-300 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Image */}
                  <div className="h-56 w-full overflow-hidden bg-cream-100 relative">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-forest-950/85 backdrop-blur-xs text-gold-300 font-bold border border-gold-400/40">
                        {product.batchId}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={product.purityVerified ? 'certified' : 'processing'} />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="inline-flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-forest-700" />
                        <span>{product.producer.location}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-gold-600 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{product.rating}</span>
                        <span className="text-[10px] text-stone-400">({product.reviewCount})</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-earth-950 group-hover:text-forest-800 transition-colors">
                        {product.title}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">{product.producer.name}</p>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                      {product.tagline}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-xs text-stone-500 border-t border-cream-100">
                      <span>Available Stock:</span>
                      <span className="font-mono font-bold text-earth-900">{product.stockKg} kg</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 border-t border-cream-100 space-y-3">
                  <div className="flex items-baseline justify-between pt-3">
                    <div>
                      <span className="text-2xl font-black text-earth-950">₹{product.price}</span>
                      <span className="text-xs text-stone-500 ml-1">/ {product.unitWeightGrams}g</span>
                      <span className="block text-[10px] text-stone-400 font-mono">₹{product.pricePerKg}/kg</span>
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
                    <span>View Journey & Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
