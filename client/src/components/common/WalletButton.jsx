import React, { useState } from 'react';
import { Layers, Copy, Check, LogOut, ExternalLink, ChevronDown, Sparkles } from 'lucide-react';

export default function WalletButton() {
  const [isConnected, setIsConnected] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const walletData = {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    shortAddress: '0x7099...79C8',
    network: 'Ethereum Sepolia Testnet',
    balance: '0.842 ETH',
  };

  const handleConnect = () => {
    setIsConnected(true);
    setModalOpen(false);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setMenuOpen(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletData.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      {!isConnected ? (
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-forest-800 text-white hover:bg-forest-900 border border-forest-700 shadow-sm transition-all hover:-translate-y-0.5"
        >
          <Layers className="w-4 h-4 text-gold-400" />
          <span>Connect Wallet</span>
        </button>
      ) : (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-forest-200 text-forest-950 shadow-xs hover:border-gold-400 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono">{walletData.shortAddress}</span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-cream-200 shadow-warm-lg p-3 z-50 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-cream-50 border border-cream-200/80 space-y-1">
                <div className="flex items-center justify-between text-stone-500 text-[11px]">
                  <span>Network</span>
                  <span className="text-forest-700 font-semibold">{walletData.network}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-stone-900">
                  <span>Balance</span>
                  <span>{walletData.balance}</span>
                </div>
                <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-stone-600 break-all">
                  <span>{walletData.shortAddress}</span>
                  <button
                    onClick={copyAddress}
                    className="p-1 hover:text-forest-800 flex items-center space-x-0.5 text-stone-500"
                    title="Copy Address"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-rose-700 hover:bg-rose-50 transition-colors font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connect Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-cream-200 shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center text-forest-800">
                  <Layers className="w-5 h-5 text-forest-700" />
                </div>
                <h3 className="font-bold text-earth-950 text-base">Connect Web3 Wallet</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Connect your Ethereum wallet to sign batch anchoring transactions and verify on-chain certificates on Sepolia.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-cream-200 hover:border-forest-600 hover:bg-forest-50/50 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                    🦊
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xs text-stone-900 group-hover:text-forest-800">MetaMask</div>
                    <div className="text-[10px] text-stone-500">Browser extension & Mobile</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-forest-700 bg-forest-100 px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              </button>

              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-cream-200 hover:border-forest-600 hover:bg-forest-50/50 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                    ⚡
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xs text-stone-900 group-hover:text-forest-800">WalletConnect</div>
                    <div className="text-[10px] text-stone-500">Connect via QR code</div>
                  </div>
                </div>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-gold-50 border border-gold-200/80 text-[11px] text-gold-950 flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
              <span>
                <strong>Simulated Wallet Mode:</strong> In Phase 1 frontend preview, connecting immediately simulates an authorized Sepolia producer address.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
