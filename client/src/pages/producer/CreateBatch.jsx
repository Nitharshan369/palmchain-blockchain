import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  PlusCircle, 
  Layers, 
  Hash, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Droplets, 
  Flame, 
  Package, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Info,
  Clock,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Sprout
} from 'lucide-react';
import { ethers } from 'ethers';
import { mockTrees } from '../../data/mockData';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useWallet } from '../../context/WalletContext';
import { 
  isBatchRegistryConfigured, 
  getBatchRegistryWithSigner, 
  CONTRACT_ADDRESSES 
} from '../../contracts';
import { supabase } from '../../lib/supabase';

export default function CreateBatch() {
  const navigate = useNavigate();
  const {
    address,
    shortAddress,
    isSepolia,
    isConnected,
    isConnecting,
    connect,
    switchNetwork,
    getSigner,
    onChainProducer,
  } = useWallet();

  const [formData, setFormData] = useState({
    batchId: `PJG-2026-00${Math.floor(Math.random() * 90) + 10}`,
    productTitle: 'Heritage Solid Karupatti Block (Coconut Shell Molded)',
    harvestDate: new Date().toISOString().split('T')[0],
    processingDate: new Date().toISOString().split('T')[0],
    packagingDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    sapVolumeLiters: '850',
    sapBrix: '14.8',
    boilingTempCelsius: '118.5',
    clarificationAgent: 'Natural Okra (Bhindi) mucilage & wild castor seeds',
    form: 'Solid Block',
    outputKg: '115',
    selectedTrees: ['PLM-TK-012', 'PLM-TK-014', 'PLM-TK-018'],
    producerNotes: 'Morning harvest from Block A palms. Clarified with cold plant mucilage and cured in halved coconut shells.',
  });

  const [formErrors, setFormErrors] = useState({});
  const [computedHash, setComputedHash] = useState('');
  const [canonicalJson, setCanonicalJson] = useState('');
  const [confirmAnchorOpen, setConfirmAnchorOpen] = useState(false);

  // Live transaction states: 'idle' | 'awaiting_signature' | 'pending' | 'confirmed' | 'rejected' | 'failed'
  const [txState, setTxState] = useState('idle');
  const [txHash, setTxHash] = useState('');
  const [blockNumber, setBlockNumber] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const isConfigured = isBatchRegistryConfigured();
  const isVerifiedProducer = onChainProducer.status === 2;

  // Real cryptographic SHA-256 calculation using ethers.js
  useEffect(() => {
    const canonicalPayload = {
      batchId: formData.batchId.trim().toUpperCase(),
      boilingTempCelsius: parseFloat(formData.boilingTempCelsius) || 0,
      clarificationAgent: formData.clarificationAgent.trim(),
      form: formData.form,
      harvestDate: formData.harvestDate,
      outputKg: parseFloat(formData.outputKg) || 0,
      processingDate: formData.processingDate,
      producerAddress: address || '0x0000000000000000000000000000000000000000',
      sapBrix: parseFloat(formData.sapBrix) || 0,
      sapVolumeLiters: parseFloat(formData.sapVolumeLiters) || 0,
      sourceTreeIds: formData.selectedTrees.slice().sort(),
    };

    const jsonString = JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort(), 2);
    setCanonicalJson(jsonString);

    try {
      // Real cryptographic SHA-256 digest
      const realSha256 = ethers.sha256(ethers.toUtf8Bytes(jsonString));
      setComputedHash(realSha256);
    } catch (e) {
      console.warn('Hash computation error:', e);
    }
  }, [formData, address]);

  const validate = () => {
    const errors = {};
    if (!formData.batchId.trim()) errors.batchId = 'Batch Identifier is required';
    if (!formData.harvestDate) errors.harvestDate = 'Harvest Date is required';
    if (!formData.processingDate) errors.processingDate = 'Processing Date is required';
    
    const brix = parseFloat(formData.sapBrix);
    if (isNaN(brix) || brix < 10 || brix > 22) {
      errors.sapBrix = 'Sap Brix must be between 10.0 and 22.0° Bx';
    }

    const temp = parseFloat(formData.boilingTempCelsius);
    if (isNaN(temp) || temp < 100 || temp > 130) {
      errors.boilingTempCelsius = 'Boiling temp must be between 100°C and 130°C';
    }

    const output = parseFloat(formData.outputKg);
    if (isNaN(output) || output <= 0) {
      errors.outputKg = 'Output weight in kg must be greater than 0';
    }

    if (formData.selectedTrees.length === 0) {
      errors.selectedTrees = 'Please link at least one source palm tree';
    }

    return errors;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setErrorMessage('');
    setConfirmAnchorOpen(true);
  };

  const executeLiveAnchor = async () => {
    setConfirmAnchorOpen(false);

    if (!isConnected) {
      setErrorMessage('Please connect your MetaMask wallet.');
      return;
    }

    if (!isSepolia) {
      setErrorMessage('Please switch MetaMask to Ethereum Sepolia.');
      return;
    }

    if (!isConfigured) {
      setErrorMessage(
        'BatchRegistry contract address is not configured. Deploy the contract and set VITE_BATCH_REGISTRY_ADDRESS in .env to execute live transactions.'
      );
      return;
    }

    if (!isVerifiedProducer) {
      setErrorMessage(
        'Only verified producers can create batches on-chain. Please complete producer verification first.'
      );
      return;
    }

    setTxState('awaiting_signature');
    setErrorMessage('');

    try {
      const signer = await getSigner();
      const contract = getBatchRegistryWithSigner(signer);

      const neeraScaled = Math.round((parseFloat(formData.sapVolumeLiters) || 0) * 100);
      const jaggeryScaled = Math.round((parseFloat(formData.outputKg) || 0) * 100);
      const dataHash = computedHash.startsWith('0x') ? computedHash : `0x${computedHash}`;

      // Call createBatch(batchId, neeraLiters, jaggeryKg, dataHash)
      const tx = await contract.createBatch(
        formData.batchId.trim().toUpperCase(),
        neeraScaled,
        jaggeryScaled,
        dataHash
      );

      setTxHash(tx.hash);
      setTxState('pending');

      const receipt = await tx.wait(1);
      setBlockNumber(receipt.blockNumber);
      setTxState('confirmed');

      // Sync off-chain Supabase record
      try {
        await supabase.from('batches').insert({
          batch_code: formData.batchId.trim().toUpperCase(),
          tree_count: formData.selectedTrees.length,
          neera_quantity_liters: parseFloat(formData.sapVolumeLiters) || 0,
          jaggery_quantity_kg: parseFloat(formData.outputKg) || 0,
          metadata_hash: computedHash,
          blockchain_transaction_hash: tx.hash,
          blockchain_block_number: receipt.blockNumber,
          lifecycle_status: 'created',
          production_date: formData.harvestDate,
        });
      } catch (dbErr) {
        console.warn('Supabase batch insert warning:', dbErr.message);
      }
    } catch (err) {
      console.error('Batch anchoring error:', err);
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setTxState('rejected');
        setErrorMessage('Transaction signature was rejected in MetaMask.');
      } else if (err.message && err.message.includes('BatchAlreadyExists')) {
        setTxState('failed');
        setErrorMessage(`Batch ${formData.batchId} has already been anchored on-chain.`);
      } else if (err.message && err.message.includes('NotVerifiedProducer')) {
        setTxState('failed');
        setErrorMessage('Caller is not a verified producer on the ProducerRegistry contract.');
      } else {
        setTxState('failed');
        setErrorMessage(err.reason || err.shortMessage || err.message || 'Transaction failed on-chain.');
      }
    }
  };

  const toggleTreeSelection = (treeCode) => {
    setFormData((prev) => {
      const exists = prev.selectedTrees.includes(treeCode);
      const updated = exists
        ? prev.selectedTrees.filter((t) => t !== treeCode)
        : [...prev.selectedTrees, treeCode];
      return { ...prev, selectedTrees: updated };
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* Header */}
      <div className="border-b border-cream-200 pb-5">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
          New Production Batch
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
          Register & Anchor Harvest Batch
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Enter harvest and boiling parameters. PalmChain canonicalizes the metadata and generates a SHA-256 hash for Ethereum Sepolia anchoring.
        </p>
      </div>

      {/* Contract Configuration Notice */}
      {!isConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 text-xs">
          <div className="flex items-center space-x-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Integration Boundary: BatchRegistry Contract Not Configured</span>
          </div>
          <p className="leading-relaxed text-amber-800">
            <code>VITE_BATCH_REGISTRY_ADDRESS</code> is not configured in <code>client/.env</code>. To execute live transactions, deploy the contract to Sepolia and set the address in your environment. Live transaction simulation is disabled to preserve blockchain integrity.
          </p>
        </div>
      )}

      {/* Verification Guard Notice */}
      {isConnected && !isVerifiedProducer && (
        <div className="p-4 rounded-2xl bg-cream-100 border border-cream-300 text-stone-800 text-xs space-y-2">
          <div className="flex items-center space-x-2 font-bold text-stone-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>On-Chain Producer Verification Required</span>
          </div>
          <p className="leading-relaxed">
            Only verified producers can anchor batches to <code>BatchRegistry.sol</code>. Your current on-chain status is: <strong>{onChainProducer.statusText}</strong>.
          </p>
          {onChainProducer.status === 0 && (
            <Link
              to="/producer/register"
              className="inline-flex items-center space-x-1 font-bold text-forest-800 hover:text-forest-950 underline"
            >
              <span>Register your wallet on ProducerRegistry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Success Notification */}
      {txState === 'confirmed' && (
        <div className="p-6 rounded-3xl bg-forest-800 text-white shadow-warm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-700 text-gold-300 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Batch Anchored Successfully on Sepolia!</h3>
              <p className="text-xs text-cream-200 font-mono">
                Batch ID: {formData.batchId} • Block #{blockNumber}
              </p>
            </div>
          </div>

          <p className="text-xs text-cream-300 leading-relaxed">
            The batch integrity hash has been anchored onto Ethereum Sepolia. Consumers scanning the QR code can now verify its cryptographic integrity.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-600 text-white font-semibold text-xs transition-colors"
            >
              <span>View on Sepolia Etherscan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Link
              to={`/verify/${formData.batchId}`}
              className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-earth-950 font-bold text-xs shadow-xs transition-colors"
            >
              Inspect Public Verification Page
            </Link>
            <Link
              to="/producer/batches"
              className="px-4 py-2 rounded-xl bg-forest-900 hover:bg-forest-950 text-cream-200 text-xs font-semibold"
            >
              Return to Batches
            </Link>
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleFormSubmit} className="space-y-8">
        {/* Section 1: Batch Identity */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-5">
          <h3 className="text-base font-bold text-earth-950 border-b border-cream-100 pb-3 flex items-center space-x-2">
            <Package className="w-4 h-4 text-forest-700" />
            <span>1. Batch Identification & Output Form</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Batch Identifier <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.batchId}
                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono font-bold uppercase focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
                placeholder="e.g. PJG-2026-009"
              />
              {formErrors.batchId && (
                <p className="text-[10px] text-rose-600 mt-1">{formErrors.batchId}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Final Product Form <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.form}
                onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-semibold focus:ring-2 focus:ring-gold-400 focus:outline-hidden bg-white"
              >
                <option value="Solid Block">Solid Block (Coconut Shell Mold)</option>
                <option value="Granular / Powder">Granular Palm Sugar (Naattu Sarkarai)</option>
                <option value="Liquid Syrup">Liquid Nectar / Palmyrah Syrup</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Sap Harvest & Clarification */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-5">
          <h3 className="text-base font-bold text-earth-950 border-b border-cream-100 pb-3 flex items-center space-x-2">
            <Droplets className="w-4 h-4 text-blue-600" />
            <span>2. Neera Sap Volume & Clarification</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Neera Sap Harvested (Liters) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.sapVolumeLiters}
                onChange={(e) => setFormData({ ...formData, sapVolumeLiters: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Measured Sap Brix (° Bx) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.sapBrix}
                onChange={(e) => setFormData({ ...formData, sapBrix: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
              />
              {formErrors.sapBrix && (
                <p className="text-[10px] text-rose-600 mt-1">{formErrors.sapBrix}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Final Jaggery Output (kg) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.outputKg}
                onChange={(e) => setFormData({ ...formData, outputKg: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
              />
              {formErrors.outputKg && (
                <p className="text-[10px] text-rose-600 mt-1">{formErrors.outputKg}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Linked Palm Trees */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-4">
          <div className="flex items-center justify-between border-b border-cream-100 pb-3">
            <h3 className="text-base font-bold text-earth-950 flex items-center space-x-2">
              <Sprout className="w-4 h-4 text-forest-700" />
              <span>3. Linked Source Palmyrah Trees ({formData.selectedTrees.length})</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {mockTrees.map((tree) => {
              const isSelected = formData.selectedTrees.includes(tree.treeCode);
              return (
                <button
                  type="button"
                  key={tree.id}
                  onClick={() => toggleTreeSelection(tree.treeCode)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-forest-50 border-forest-600 text-forest-950 shadow-xs'
                      : 'bg-white border-cream-200 hover:border-cream-300 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs">{tree.treeCode}</span>
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-forest-700 text-white' : 'border border-stone-300'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1 truncate">{tree.grove}</div>
                  <div className="text-[10px] text-stone-400 font-mono mt-0.5">{tree.dailyYieldLiters} L/day • {tree.ageYears} yrs</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Real-time SHA-256 Hash Preview */}
        <div className="bg-forest-950 text-white rounded-3xl p-6 sm:p-7 border border-forest-900 space-y-4">
          <div className="flex items-center justify-between border-b border-forest-800 pb-3">
            <div className="flex items-center space-x-2 text-gold-300">
              <Hash className="w-5 h-5 text-gold-400" />
              <h3 className="font-bold text-sm text-white">Cryptographic SHA-256 Digest Preview</h3>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-forest-800 text-gold-300">
              Deterministic Canonical Hash
            </span>
          </div>

          <p className="text-xs text-cream-300/80 leading-relaxed">
            The data above is automatically serialized into sorted canonical JSON and hashed with SHA-256. This 32-byte digest is anchored immutably to <code>BatchRegistry.sol</code> on Ethereum Sepolia.
          </p>

          <div className="p-3.5 rounded-2xl bg-forest-900/80 border border-forest-800 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gold-400">
              Calculated SHA-256 Hash:
            </div>
            <div className="font-mono text-xs font-bold text-cream-100 break-all select-all">
              {computedHash}
            </div>
          </div>

          <details className="text-xs text-cream-300/70 pt-1">
            <summary className="cursor-pointer text-gold-300/90 font-semibold text-[11px]">
              View Canonical JSON representation
            </summary>
            <pre className="mt-2 p-3 rounded-xl bg-black/40 border border-forest-800 text-[11px] font-mono text-cream-200 overflow-x-auto max-h-48">
              {canonicalJson}
            </pre>
          </details>
        </div>

        {/* Error notification */}
        {(txState === 'rejected' || txState === 'failed' || errorMessage) && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-700">{errorMessage}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {!isConnected ? (
            <button
              type="button"
              onClick={() => connect()}
              className="w-full py-4 px-6 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-warm flex items-center justify-center space-x-2 transition-all"
            >
              <Layers className="w-4 h-4 text-gold-300" />
              <span>Connect MetaMask to Anchor Batch</span>
            </button>
          ) : !isSepolia ? (
            <button
              type="button"
              onClick={() => switchNetwork()}
              className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-warm flex items-center justify-center space-x-2 transition-all"
            >
              <AlertTriangle className="w-4 h-4 text-white" />
              <span>Switch MetaMask to Ethereum Sepolia</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={
                !isConfigured ||
                !isVerifiedProducer ||
                txState === 'awaiting_signature' ||
                txState === 'pending'
              }
              className="w-full py-4 px-6 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-warm flex items-center justify-center space-x-2 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {txState === 'awaiting_signature' ? (
                <span>Please sign in MetaMask...</span>
              ) : txState === 'pending' ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-gold-300 animate-spin" />
                  <span>Mining on Ethereum Sepolia...</span>
                </div>
              ) : (
                <>
                  <Layers className="w-4 h-4 text-gold-300" />
                  <span>Anchor Batch on Ethereum Sepolia</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmAnchorOpen}
        title="Commit Batch Hash to Ethereum Sepolia"
        message={`You are committing batch ${formData.batchId} (${formData.outputKg} kg of ${formData.form}) with SHA-256 hash ${computedHash.slice(0, 16)}... This will invoke createBatch() on BatchRegistry.sol on Sepolia.`}
        confirmLabel="Confirm & Sign"
        cancelLabel="Review Data"
        onConfirm={executeLiveAnchor}
        onCancel={() => setConfirmAnchorOpen(false)}
      />
    </div>
  );
}
