import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  QrCode, 
  ShoppingBag, 
  Menu, 
  X, 
  ChevronDown, 
  Sprout, 
  FileCheck2, 
  SlidersHorizontal,
  Home as HomeIcon,
  Sparkles
} from 'lucide-react';
import WalletButton from '../common/WalletButton';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-forest-800 via-forest-700 to-forest-900 flex items-center justify-center text-white shadow-forest-sm group-hover:scale-105 transition-transform border border-forest-600/50">
              <Sprout className="w-6 h-6 text-gold-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-forest-950 via-forest-800 to-earth-800 bg-clip-text text-transparent">
                  PalmChain
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cream-200 text-forest-800 border border-cream-300 hidden sm:inline-block">
                  Sepolia Testnet
                </span>
              </div>
              <p className="text-[10px] text-stone-500 hidden sm:block tracking-wide">
                Artisanal Palmyrah Traceability
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive('/') && location.pathname === '/'
                  ? 'bg-cream-200 text-forest-900 shadow-xs'
                  : 'text-stone-700 hover:text-forest-900 hover:bg-cream-100'
              }`}
            >
              Home
            </Link>

            <Link
              to="/products"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                isActive('/products') || isActive('/product')
                  ? 'bg-cream-200 text-forest-900 shadow-xs'
                  : 'text-stone-700 hover:text-forest-900 hover:bg-cream-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-earth-600" />
              <span>Marketplace</span>
            </Link>

            <Link
              to="/verify/PJG-2026-001"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                isActive('/verify')
                  ? 'bg-cream-200 text-forest-900 shadow-xs'
                  : 'text-stone-700 hover:text-forest-900 hover:bg-cream-100'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-forest-700" />
              <span>Verify Batch</span>
            </Link>

            {/* Role Dashboards Dropdown */}
            <div className="relative">
              <button
                onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  isActive('/producer') || isActive('/verifier') || isActive('/admin')
                    ? 'bg-forest-100 text-forest-900'
                    : 'text-stone-700 hover:text-forest-900 hover:bg-cream-100'
                }`}
              >
                <span>Role Portals</span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {portalDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-cream-200 shadow-warm-lg p-2 z-50 space-y-1 animate-in fade-in duration-100"
                  onMouseLeave={() => setPortalDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    Ecosystem Roles
                  </div>
                  <Link
                    to="/producer/dashboard"
                    onClick={() => setPortalDropdownOpen(false)}
                    className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-cream-50 text-xs font-medium text-stone-800 hover:text-forest-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center">
                      <Sprout className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold">Producer Portal</div>
                      <div className="text-[10px] text-stone-400">Batches, Trees, Sales</div>
                    </div>
                  </Link>

                  <Link
                    to="/verifier/dashboard"
                    onClick={() => setPortalDropdownOpen(false)}
                    className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-cream-50 text-xs font-medium text-stone-800 hover:text-forest-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold">Verifier Portal</div>
                      <div className="text-[10px] text-stone-400">Lab Assays & Attestation</div>
                    </div>
                  </Link>

                  <Link
                    to="/admin"
                    onClick={() => setPortalDropdownOpen(false)}
                    className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-cream-50 text-xs font-medium text-stone-800 hover:text-forest-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold">Admin Portal</div>
                      <div className="text-[10px] text-stone-400">Registry Governance</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Right Action: Wallet Connection */}
          <div className="hidden sm:flex items-center space-x-3">
            <WalletButton />
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <WalletButton />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-stone-700 hover:bg-cream-100"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-cream-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-6 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-stone-800 hover:bg-cream-100"
          >
            Home
          </Link>
          <Link
            to="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-stone-800 hover:bg-cream-100"
          >
            Marketplace
          </Link>
          <Link
            to="/verify/PJG-2026-001"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-stone-800 hover:bg-cream-100"
          >
            Verify Batch QR
          </Link>

          <div className="pt-2 border-t border-cream-200">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-3 pb-1">
              Role Portals
            </div>
            <Link
              to="/producer/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-forest-800 hover:bg-forest-50"
            >
              🌾 Producer Dashboard
            </Link>
            <Link
              to="/verifier/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-blue-800 hover:bg-blue-50"
            >
              🧪 Verifier Lab Dashboard
            </Link>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-purple-800 hover:bg-purple-50"
            >
              ⚙️ Admin Governance
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
