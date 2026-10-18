import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ShieldCheck, Heart, ExternalLink, AlertCircle } from 'lucide-react';
import { SIMULATION_NOTICE } from '../../data/mockData';

export default function Footer() {
  return (
    <footer className="bg-forest-950 text-cream-200 border-t border-forest-900 mt-20">
      {/* Simulation Notice Banner */}
      <div className="bg-earth-900/90 border-b border-earth-800 text-cream-300 py-2.5 px-4 text-center text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4 text-gold-400 shrink-0" />
          <span>{SIMULATION_NOTICE.disclaimer}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand & Mission */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-forest-800 border border-forest-700 flex items-center justify-center text-gold-300 shadow-sm">
                <Sprout className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">PalmChain</span>
            </div>
            <p className="text-xs text-cream-300/80 leading-relaxed">
              Empowering traditional palm-jaggery artisans with cryptographic traceability, fair farmgate pricing, and transparent consumer trust from tree to table.
            </p>
            <div className="text-[11px] text-gold-400/90 font-mono">
              Sepolia Testnet • Solidity 0.8.24
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold-300">
              Ecosystem
            </h4>
            <ul className="space-y-2 text-xs text-cream-300/90">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home & Production Journey
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-white transition-colors">
                  Artisan Marketplace
                </Link>
              </li>
              <li>
                <Link to="/verify/PJG-2026-001" className="hover:text-white transition-colors">
                  Batch QR Verification
                </Link>
              </li>
            </ul>
          </div>

          {/* Role Dashboards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold-300">
              User Portals
            </h4>
            <ul className="space-y-2 text-xs text-cream-300/90">
              <li>
                <Link to="/producer/dashboard" className="hover:text-white transition-colors">
                  Producer Grove & Batches
                </Link>
              </li>
              <li>
                <Link to="/verifier/dashboard" className="hover:text-white transition-colors">
                  Verifier Lab Inspection
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-white transition-colors">
                  System Administration
                </Link>
              </li>
            </ul>
          </div>

          {/* Integrity Commitment */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold-300">
              Integrity Rules
            </h4>
            <p className="text-xs text-cream-300/80 leading-relaxed">
              PalmChain never stores private keys or bulky records on-chain. Off-chain canonical JSON is digested via SHA-256 and anchored to the smart contract.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero Cane Sugar Adulteration</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-forest-900/80 flex flex-col sm:flex-row items-center justify-between text-xs text-cream-400/60 gap-3">
          <p>© {new Date().getFullYear()} PalmChain Agro-Tech. Preserving traditional palmyrah heritage.</p>
          <div className="flex items-center space-x-4">
            <Link to="/verify/PJG-2026-001" className="hover:text-white">Sample Verification</Link>
            <Link to="/producer/create-batch" className="hover:text-white">Batch Anchoring</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
