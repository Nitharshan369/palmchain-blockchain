import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Sprout, 
  Package, 
  PlusCircle, 
  ShoppingBag, 
  BarChart3, 
  Menu, 
  X, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Bell
} from 'lucide-react';
import WalletButton from '../common/WalletButton';

export default function ProducerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/producer/dashboard', icon: LayoutDashboard },
    { label: 'Palmyrah Trees', path: '/producer/trees', icon: Sprout },
    { label: 'Production Batches', path: '/producer/batches', icon: Package },
    { label: 'Create & Anchor Batch', path: '/producer/create-batch', icon: PlusCircle },
    { label: 'Orders & Sales', path: '/producer/sales', icon: ShoppingBag },
    { label: 'Yield Analytics', path: '/producer/analytics', icon: BarChart3 },
  ];

  const isActive = (path) => location.pathname === path;

  // Breadcrumb segment
  const currentItem = navItems.find((item) => item.path === location.pathname);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-cream-200">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl text-stone-700 hover:bg-cream-100"
          aria-label="Open Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm text-forest-950">Producer Portal</span>
        <WalletButton />
      </div>

      {/* Sidebar for Desktop & Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-forest-950 text-cream-200 border-r border-forest-900 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-forest-800 border border-forest-700 flex items-center justify-center text-gold-300">
                <Sprout className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-tight">PalmChain</span>
                <span className="block text-[10px] text-gold-400 font-semibold uppercase tracking-wider">
                  Producer Hub
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-cream-400 hover:text-white p-1"
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Producer Profile Snippet */}
          <div className="p-3.5 rounded-2xl bg-forest-900/80 border border-forest-800 space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-gold-400/20 text-gold-300 font-bold text-xs flex items-center justify-center border border-gold-400/40">
                M
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">Murugan Cooperative</div>
                <div className="text-[10px] text-cream-400/80">Tenkasi Grove #4</div>
              </div>
            </div>
            <div className="pt-1 flex items-center justify-between text-[10px] text-cream-400/90 font-mono">
              <span>Status:</span>
              <span className="text-emerald-400 font-semibold">Authorized Producer</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? 'bg-forest-800 text-white font-bold border-l-4 border-gold-400 shadow-xs'
                      : 'text-cream-300/80 hover:text-white hover:bg-forest-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-gold-300' : 'text-cream-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-5 border-t border-forest-900 space-y-3">
          <Link
            to="/products"
            className="flex items-center justify-between text-xs text-cream-400 hover:text-white transition-colors"
          >
            <span>Public Marketplace</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <div className="text-[10px] text-stone-500 font-mono">
            Connected: Sepolia Testnet
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-stone-950/50 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Dashboard Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-cream-200">
          <div className="flex items-center space-x-2 text-xs text-stone-500">
            <Link to="/" className="hover:text-forest-800">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/producer/dashboard" className="hover:text-forest-800">Producer Hub</Link>
            {currentItem && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="font-semibold text-stone-900">{currentItem.label}</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/producer/create-batch"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-gold-300" />
              <span>Create Batch</span>
            </Link>
            <WalletButton />
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
