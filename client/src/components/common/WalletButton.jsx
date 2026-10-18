import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, 
  Copy, 
  Check, 
  LogOut, 
  ExternalLink, 
  ChevronDown, 
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Clock,
  Ban,
  Wallet
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export default function WalletButton() {
  const {
    address,
    shortAddress,
    balance,
    isSepolia,
    isConnected,
    isConnecting,
    isMetaMaskInstalled,
    error,
    setError,
    onChainProducer,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
  } = useWallet();

  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnectClick = async () => {
    setError(null);
    if (!isMetaMaskInstalled) {
      setModalOpen(true);
      return;
    }
    await connect();
  };

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    await switchNetwork();
    setIsSwitching(false);
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper for on-chain status display
  const renderStatusBadge = () => {
    if (!onChainProducer.isConfigured) {
      return (
        <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
          Contract Unset
        </span>
      );
    }
    switch (onChainProducer.status) {
      case 2:
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Verified Producer</span>
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending Verification</span>
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
            <Ban className="w-3 h-3 text-rose-600" />
            <span>Suspended</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium text-stone-600 bg-cream-200 px-2 py-0.5 rounded-full">
            Not Registered
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ─── State 1: Disconnected ─── */}
      {!isConnected ? (
        <div>
          <button
            onClick={handleConnectClick}
            disabled={isConnecting}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-forest-800 text-white hover:bg-forest-900 border border-forest-700 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-gold-300 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Layers className="w-4 h-4 text-gold-400" />
                <span>Connect Wallet</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* ─── State 2: Connected ─── */
        <div className="flex items-center space-x-2">
          {/* Wrong Network Warning Pill */}
          {!isSepolia && (
            <button
              onClick={handleSwitchNetwork}
              disabled={isSwitching}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-200 transition-colors animate-pulse"
              title="Click to switch MetaMask to Ethereum Sepolia"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>{isSwitching ? 'Switching...' : 'Switch to Sepolia'}</span>
            </button>
          )}

          {/* Account Pill & Dropdown Toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-forest-200 text-forest-950 shadow-xs hover:border-gold-400 transition-colors"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isSepolia ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-mono">{shortAddress}</span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {/* Connected Details Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-cream-200 shadow-warm-lg p-3 z-50 space-y-2.5 text-xs animate-in fade-in duration-100">
              {/* Account Info Box */}
              <div className="p-3 rounded-xl bg-cream-50 border border-cream-200/80 space-y-2">
                <div className="flex items-center justify-between text-stone-500 text-[11px]">
                  <span>Network</span>
                  <span
                    className={`font-semibold ${
                      isSepolia ? 'text-forest-700' : 'text-amber-700'
                    }`}
                  >
                    {isSepolia ? 'Ethereum Sepolia' : 'Wrong Network'}
                  </span>
                </div>

                {!isSepolia && (
                  <button
                    onClick={handleSwitchNetwork}
                    disabled={isSwitching}
                    className="w-full py-1.5 px-2 rounded-lg bg-amber-500 text-white font-bold text-[11px] hover:bg-amber-600 transition-colors"
                  >
                    {isSwitching ? 'Switching Network...' : 'Switch to Sepolia Testnet'}
                  </button>
                )}

                <div className="flex items-center justify-between text-stone-900 font-bold">
                  <span className="text-stone-500 font-normal">Balance</span>
                  <span className="font-mono">{balance} ETH</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-500">On-Chain Role</span>
                  {renderStatusBadge()}
                </div>

                <div className="pt-1.5 border-t border-cream-200/80 flex items-center justify-between text-[11px] font-mono text-stone-600">
                  <span className="truncate pr-2">{shortAddress}</span>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={copyAddress}
                      className="p-1 hover:text-forest-800 text-stone-500 rounded"
                      title="Copy Address"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`https://sepolia.etherscan.io/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:text-forest-800 text-stone-500 rounded"
                      title="View on Sepolia Etherscan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 border-t border-cream-200 flex items-center justify-between">
                <button
                  onClick={() => refreshBalance()}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-stone-600 hover:text-forest-800 hover:bg-cream-100 transition-colors text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => {
                    disconnect();
                    setMenuOpen(false);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-rose-700 hover:bg-rose-50 transition-colors font-semibold text-[11px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Error Notification Popup ─── */}
      {error && !menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 p-3 rounded-2xl bg-rose-50 border border-rose-200 shadow-warm-lg z-50 text-xs text-rose-900 space-y-1.5 animate-in fade-in duration-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Wallet Notice</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-stone-400 hover:text-stone-700 p-0.5"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-700">{error}</p>
        </div>
      )}

      {/* ─── Modal: Missing MetaMask or Install Prompt ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-cream-200 shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center text-forest-800">
                  <Wallet className="w-5 h-5 text-forest-700" />
                </div>
                <h3 className="font-bold text-earth-950 text-base">Install MetaMask</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              MetaMask is required to interact with PalmChain's smart contracts on Ethereum Sepolia.
            </p>

            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-cream-200 hover:border-forest-600 hover:bg-forest-50/50 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🦊</span>
                <div className="text-left">
                  <div className="font-bold text-xs text-stone-900 group-hover:text-forest-800">
                    Get MetaMask Extension
                  </div>
                  <div className="text-[10px] text-stone-500">Official download for your browser</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-forest-700" />
            </a>

            <div className="p-3 rounded-xl bg-cream-100 border border-cream-200 text-[11px] text-stone-700">
              After installing the browser extension, refresh this page and click <strong>Connect Wallet</strong> again.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
