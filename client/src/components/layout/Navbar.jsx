import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, QrCode, ShoppingBag, UserCheck, ShieldAlert, Layers, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/' },
    { label: 'Marketplace', path: '/marketplace' },
    { label: 'Trace & Verify', path: '/trace' },
    { label: 'Producer Portal', path: '/producer' },
    { label: 'Verifier Portal', path: '/verifier' },
    { label: 'Admin', path: '/admin' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-palm-600 to-palm-800 flex items-center justify-center text-white shadow-md shadow-palm-900/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-palm-900 via-palm-700 to-jaggery-800 bg-clip-text text-transparent">
                PalmChain
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-palm-100 text-palm-800 border border-palm-200">
                Sepolia Secured
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-palm-50 text-palm-800 font-semibold border border-palm-200/60 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Web3 / Action Button */}
          <div className="hidden sm:flex items-center space-x-3">
            <Link
              to="/trace"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-jaggery-100 text-jaggery-900 hover:bg-jaggery-200 border border-jaggery-300 transition-colors shadow-xs"
            >
              <QrCode className="w-4 h-4 text-jaggery-700" />
              <span>Verify Batch</span>
            </Link>
            <button
              type="button"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-palm-700 text-white hover:bg-palm-800 shadow-sm transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white/95 backdrop-blur-md px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive(item.path)
                  ? 'bg-palm-100 text-palm-900 font-semibold'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-stone-200 flex flex-col space-y-2">
            <Link
              to="/trace"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 rounded-lg text-sm font-medium bg-jaggery-100 text-jaggery-900 border border-jaggery-300"
            >
              Verify Batch QR
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
