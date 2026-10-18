import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-palm-600 flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white tracking-wide">PalmChain</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Decentralized traceability and marketplace for authentic, unadulterated palm-jaggery (Karupatti).
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Roles</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-stone-300">Producers</span>: Batch logging & on-chain hash anchoring</li>
              <li><span className="text-stone-300">Verifiers</span>: Lab testing & purity certification</li>
              <li><span className="text-stone-300">Customers</span>: QR verification & fair-trade marketplace</li>
              <li><span className="text-stone-300">Admins</span>: Participant authorization & governance</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Blockchain Integrity</h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>Network: <span className="text-emerald-400 font-mono">Ethereum Sepolia</span></li>
              <li>Hashing: <span className="text-stone-200 font-mono">SHA-256 (Canonical JSON)</span></li>
              <li>Smart Contract: <span className="text-stone-200">PalmChainRegistry.sol</span></li>
              <li>Storage Model: <span className="text-stone-200">Hybrid (Off-chain DB + On-chain Anchor)</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Architecture Rules</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Zero mock verification labels. Private keys and secret keys are isolated strictly in backend / safe environments.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500">
          <p>© {new Date().getFullYear()} PalmChain Project. All rights reserved.</p>
          <p className="flex items-center mt-2 sm:mt-0">
            Empowering artisanal palm jaggery farmers with verifiable authenticity
          </p>
        </div>
      </div>
    </footer>
  );
}
