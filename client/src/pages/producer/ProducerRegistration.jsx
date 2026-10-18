import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sprout, 
  Layers, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { 
  isProducerRegistryConfigured, 
  getProducerRegistryWithSigner, 
  CONTRACT_ADDRESSES 
} from '../../contracts';
import { supabase } from '../../lib/supabase';

export default function ProducerRegistration() {
  const navigate = useNavigate();
  const {
    address,
    shortAddress,
    isSepolia,
    isConnected,
    isConnecting,
    isMetaMaskInstalled,
    connect,
    switchNetwork,
    getSigner,
    onChainProducer,
    refreshProducerStatus,
    syncProfile,
  } = useWallet();

  const [formData, setFormData] = useState({
    businessName: '',
    location: '',
    groveDescription: '',
  });

  // Transaction states: 'idle' | 'awaiting_signature' | 'pending' | 'confirmed' | 'rejected' | 'failed'
  const [txState, setTxState] = useState('idle');
  const [txHash, setTxHash] = useState('');
  const [blockNumber, setBlockNumber] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const isConfigured = isProducerRegistryConfigured();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.businessName.trim()) {
      setErrorMessage('Please provide your farm or cooperative business name.');
      return;
    }

    if (!isConnected) {
      setErrorMessage('Please connect your MetaMask wallet first.');
      return;
    }

    if (!isSepolia) {
      setErrorMessage('Please switch MetaMask to Ethereum Sepolia Testnet.');
      return;
    }

    if (!isConfigured) {
      setErrorMessage(
        'ProducerRegistry contract address is not configured. Please deploy the contract to Sepolia and set VITE_PRODUCER_REGISTRY_ADDRESS in your .env file.'
      );
      return;
    }

    setErrorMessage('');
    setTxState('awaiting_signature');

    try {
      // 1. Obtain signer from connected MetaMask instance
      const signer = await getSigner();
      const contract = getProducerRegistryWithSigner(signer);

      // 2. Call registerProducer(name) on ProducerRegistry.sol
      const tx = await contract.registerProducer(formData.businessName.trim());
      setTxHash(tx.hash);
      setTxState('pending');

      // 3. Wait for block confirmation on Sepolia (1 confirmation)
      const receipt = await tx.wait(1);
      setBlockNumber(receipt.blockNumber);
      setTxState('confirmed');

      // 4. Refresh on-chain producer status in wallet context
      await refreshProducerStatus(address);

      // 5. Sync profile in Supabase database
      try {
        await supabase.from('profiles').upsert({
          wallet_address: address.toLowerCase(),
          display_name: formData.businessName.trim(),
          role: 'producer',
          verification_status: 'pending',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'wallet_address' });

        await syncProfile(address);
      } catch (dbErr) {
        console.warn('[Registration] Off-chain profile sync warning:', dbErr.message);
      }
    } catch (err) {
      console.error('[Registration] Transaction error:', err);
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setTxState('rejected');
        setErrorMessage('Transaction signature was rejected in MetaMask.');
      } else if (err.message && err.message.includes('AlreadyRegistered')) {
        setTxState('failed');
        setErrorMessage('This wallet address is already registered on the ProducerRegistry contract.');
      } else {
        setTxState('failed');
        setErrorMessage(err.reason || err.shortMessage || err.message || 'Transaction failed on-chain.');
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4 sm:py-6">
      {/* Header */}
      <div className="border-b border-cream-200 pb-5 space-y-1.5">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
            Smart Contract Registration
          </span>
          <span className="text-xs font-mono text-stone-500">
            ProducerRegistry.sol
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950">
          Register as a Palm-Jaggery Producer
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          Registering anchors your business identity to the Ethereum Sepolia blockchain. Once verified by platform administrators, you will be authorized to create digital passports and anchor batch hashes.
        </p>
      </div>

      {/* Contract Configuration Boundary Notice */}
      {!isConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2 text-xs">
          <div className="flex items-center space-x-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Integration Boundary: Contract Address Not Configured</span>
          </div>
          <p className="leading-relaxed text-amber-800">
            <code>VITE_PRODUCER_REGISTRY_ADDRESS</code> is currently not set or pointing to a placeholder in <code>client/.env</code>. To execute live on-chain registrations on Ethereum Sepolia, deploy the contract using <code>npm run deploy:sepolia</code> inside <code>contracts/</code> and set the resulting address in your environment variables.
          </p>
        </div>
      )}

      {/* Wallet Connection Status Card */}
      <div className="p-5 rounded-3xl bg-white border border-cream-200 shadow-warm space-y-4">
        <h3 className="font-bold text-sm text-earth-950">1. Web3 Wallet Status</h3>

        {!isConnected ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-cream-100 border border-cream-200">
            <div className="space-y-1">
              <div className="font-bold text-xs text-earth-950">MetaMask Disconnected</div>
              <p className="text-xs text-stone-600">
                Connect the Ethereum wallet you want associated with your producer identity.
              </p>
            </div>
            <button
              onClick={() => connect()}
              disabled={isConnecting}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs transition-colors shrink-0 disabled:opacity-60"
            >
              <Layers className="w-4 h-4 text-gold-300" />
              <span>{isConnecting ? 'Connecting...' : 'Connect MetaMask'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-cream-50 border border-cream-200/80">
                <span className="text-stone-500 block text-[11px]">Connected Account</span>
                <span className="font-mono font-bold text-stone-900 truncate block mt-0.5" title={address}>
                  {shortAddress}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-cream-50 border border-cream-200/80">
                <span className="text-stone-500 block text-[11px]">Network</span>
                <span className={`font-semibold block mt-0.5 ${isSepolia ? 'text-forest-700' : 'text-amber-700'}`}>
                  {isSepolia ? 'Ethereum Sepolia' : 'Wrong Network'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-cream-50 border border-cream-200/80">
                <span className="text-stone-500 block text-[11px]">On-Chain Status</span>
                <span className="font-bold block mt-0.5 text-stone-800">
                  {onChainProducer.statusText}
                </span>
              </div>
            </div>

            {/* Network switch prompt */}
            {!isSepolia && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <div className="flex items-center space-x-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>MetaMask must be on Ethereum Sepolia Testnet to send transactions.</span>
                </div>
                <button
                  onClick={() => switchNetwork()}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0"
                >
                  Switch Network
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Existing Status Notices */}
      {isConnected && onChainProducer.status === 1 && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-3">
          <div className="flex items-center space-x-2 font-bold text-sm text-amber-900">
            <Clock className="w-5 h-5 text-amber-700" />
            <span>Registration Pending Admin Verification</span>
          </div>
          <p className="leading-relaxed">
            Your wallet (<code>{shortAddress}</code>) is registered on <code>ProducerRegistry.sol</code> as <strong>"{onChainProducer.name}"</strong>.
            Platform administrators must verify your credentials before you can anchor production batches.
          </p>
          <div className="pt-2">
            <Link
              to="/producer/dashboard"
              className="inline-flex items-center space-x-1.5 font-bold text-forest-800 hover:text-forest-950"
            >
              <span>Go to Producer Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {isConnected && onChainProducer.status === 2 && (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-3">
          <div className="flex items-center space-x-2 font-bold text-sm text-emerald-900">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <span>You are an Authorized Verified Producer!</span>
          </div>
          <p className="leading-relaxed">
            Your wallet is verified on-chain. You have full privileges to create and anchor production batches on <code>BatchRegistry.sol</code>.
          </p>
          <div className="pt-2">
            <Link
              to="/producer/create-batch"
              className="inline-flex items-center space-x-1.5 font-bold text-forest-800 hover:text-forest-950"
            >
              <span>Create & Anchor Batch</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Registration Form (shown only if not already verified or registered) */}
      {(!isConnected || onChainProducer.status === 0) && (
        <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-white border border-cream-200 shadow-warm space-y-6">
          <h3 className="font-bold text-sm text-earth-950">2. Business & Grove Information</h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1.5">
                Farm / Cooperative Business Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="e.g., Palaniswamy Natural Palm Grove"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600 bg-cream-50/50 text-stone-900"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                This name is stored immutably on the Ethereum blockchain associated with your wallet.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1.5">
                Grove Location / District (Optional)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Tenkasi Heritage Belt, Tamil Nadu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600 bg-cream-50/50 text-stone-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1.5">
                Artisanal Production Summary (Optional)
              </label>
              <textarea
                rows={3}
                value={formData.groveDescription}
                onChange={(e) => setFormData({ ...formData, groveDescription: e.target.value })}
                placeholder="Describe your palms, tapping methods, and organic clarification agents..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600 bg-cream-50/50 text-stone-900"
              />
            </div>
          </div>

          {/* Transaction State Banners */}
          {txState === 'awaiting_signature' && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
              <div>
                <div className="font-bold">Awaiting Signature in MetaMask</div>
                <p className="text-stone-600 text-[11px]">
                  Please confirm the transaction in the MetaMask extension popup.
                </p>
              </div>
            </div>
          )}

          {txState === 'pending' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-amber-900">
                <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                <span>Transaction Mining on Ethereum Sepolia</span>
              </div>
              <p className="text-[11px] text-stone-600 font-mono break-all">
                Tx: {txHash}
              </p>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-forest-800 font-bold hover:underline text-[11px]"
              >
                <span>View on Sepolia Etherscan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {txState === 'confirmed' && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-emerald-900 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Producer Registered Successfully!</span>
              </div>
              <p className="text-stone-600 text-xs">
                Your registration was confirmed in block <strong>#{blockNumber}</strong>. Status is now <strong>Registered (Pending Verification)</strong>.
              </p>
              <div className="pt-2 flex items-center space-x-3">
                <Link
                  to="/producer/dashboard"
                  className="px-4 py-2 rounded-xl bg-forest-800 text-white font-bold text-xs hover:bg-forest-900"
                >
                  Go to Producer Portal
                </Link>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-forest-800 font-semibold hover:underline text-xs"
                >
                  <span>View Receipt</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {(txState === 'rejected' || txState === 'failed' || errorMessage) && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Registration Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-700">{errorMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-stone-500">
              Sepolia gas fees apply for on-chain state anchoring.
            </span>
            <button
              type="submit"
              disabled={
                !isConnected ||
                !isSepolia ||
                !isConfigured ||
                txState === 'awaiting_signature' ||
                txState === 'pending'
              }
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-xs transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Sprout className="w-4 h-4 text-gold-300" />
              <span>
                {txState === 'pending'
                  ? 'Mining Transaction...'
                  : txState === 'awaiting_signature'
                  ? 'Sign in MetaMask...'
                  : 'Submit Registration On-Chain'}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
