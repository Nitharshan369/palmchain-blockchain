import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Droplets, 
  Flame, 
  Package, 
  ArrowRight, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Sprout, 
  FileText, 
  ShieldCheck, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Scale, 
  Filter, 
  Box, 
  FilePlus, 
  Trash2,
  QrCode
} from 'lucide-react';
import { mockTrees } from '../../data/mockData';
import ConfirmModal from '../../components/common/ConfirmModal';
import QRPreviewModal from '../../components/common/QRPreviewModal';
import { useWallet } from '../../context/WalletContext';
import { 
  isBatchRegistryConfigured, 
  getBatchRegistryWithSigner, 
  CONTRACT_ADDRESSES 
} from '../../contracts';
import { 
  CURRENT_SCHEMA_VERSION, 
  STANDARD_PRODUCTION_STAGES, 
  buildCanonicalBatchPayload, 
  canonicalJsonStringify, 
  generateSHA256Hash 
} from '../../lib/canonicalHash';
import { batchesApi } from '../../lib/api';

export default function CreateBatch() {
  const {
    address,
    isSepolia,
    isConnected,
    getSigner,
    onChainProducer,
  } = useWallet();

  // ─── Production Form State ──────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    batchId: `PJG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0')}`,
    productionDate: new Date().toISOString().split('T')[0],
    selectedTrees: ['PLM-TK-012', 'PLM-TK-014', 'PLM-TK-018'],
    customTreeInput: '',
    neeraLiters: '850',
    jaggeryKg: '115',
    productionNotes: 'Morning dawn harvest in lime-coated earthen pots. Evaporated in open shallow cauldrons using dry fallen palm biomass.',
    stages: STANDARD_PRODUCTION_STAGES.map((s) => ({
      order: s.order,
      name: s.name,
      date: new Date().toISOString().split('T')[0],
      location: s.defaultLocation,
      operator: 'Murugan Grove Supervisor',
      notes: s.description,
      parameters: s.order === 3 ? { fuelType: 'Dry Palm Biomass Fronds', panType: 'Shallow Iron Wok' } :
                  s.order === 4 ? { strikeTempCelsius: '119.5°C', brixStrike: '82° Bx' } :
                  s.order === 5 ? { mouldType: 'Halved Coconut Shells' } : {},
      stageType: s.stageType,
      isVerified: false,
    })),
    documentRefs: [
      {
        title: 'Organic Grove Geo-Attestation #TN-401',
        url: 'https://palmchain.io/docs/attestations/grove-tn-401.pdf',
        type: 'Organic Certificate',
      },
    ],
  });

  const [newDoc, setNewDoc] = useState({ title: '', url: '', type: 'Lab Report' });
  const [formErrors, setFormErrors] = useState({});
  const [showCanonicalJson, setShowCanonicalJson] = useState(false);
  const [confirmAnchorOpen, setConfirmAnchorOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  // ─── Live Workflow & Transaction States ────────────────────────────────────
  // 'idle' | 'awaiting_signature' | 'mining_tx' | 'blockchain_confirmed' | 'saving_db' | 'success' | 'db_sync_failed' | 'rejected' | 'failed'
  const [flowState, setFlowState] = useState('idle');
  const [txHash, setTxHash] = useState('');
  const [blockNumber, setBlockNumber] = useState(null);
  const [dbSyncError, setDbSyncError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isConfigured = isBatchRegistryConfigured();
  const isVerifiedProducer = onChainProducer.status === 2;

  // ─── Real-Time Canonical Serialization & SHA-256 Computation ──────────────
  const { canonicalPayload, canonicalJson, computedHash } = useMemo(() => {
    const payload = buildCanonicalBatchPayload({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      batchId: formData.batchId,
      producerAddress: address || '0x0000000000000000000000000000000000000000',
      productionDate: formData.productionDate,
      treesUsed: formData.selectedTrees,
      neeraLiters: formData.neeraLiters,
      jaggeryKg: formData.jaggeryKg,
      productionNotes: formData.productionNotes,
      stages: formData.stages,
      documentRefs: formData.documentRefs,
    });

    const json = canonicalJsonStringify(payload);
    const hash = generateSHA256Hash(json);

    return {
      canonicalPayload: payload,
      canonicalJson: json,
      computedHash: hash,
    };
  }, [formData, address]);

  // Yield calculation (e.g. 115kg jaggery from 850L neera = 13.53% yield)
  const yieldRatio = useMemo(() => {
    const n = parseFloat(formData.neeraLiters);
    const j = parseFloat(formData.jaggeryKg);
    if (!n || !j || n <= 0) return 0;
    return ((j / n) * 100).toFixed(2);
  }, [formData.neeraLiters, formData.jaggeryKg]);

  // Generate Unique Batch Code
  const handleGenerateCode = async () => {
    try {
      const res = await batchesApi.generateCode();
      if (res && res.batchCode) {
        setFormData((prev) => ({ ...prev, batchId: res.batchCode }));
      }
    } catch {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const hex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
      setFormData((prev) => ({ ...prev, batchId: `PJG-${dateStr}-${hex}` }));
    }
  };

  // Add Custom Tree Identifier
  const handleAddCustomTree = (e) => {
    e.preventDefault();
    const code = formData.customTreeInput.trim().toUpperCase();
    if (!code) return;
    if (!formData.selectedTrees.includes(code)) {
      setFormData((prev) => ({
        ...prev,
        selectedTrees: [...prev.selectedTrees, code].sort(),
        customTreeInput: '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, customTreeInput: '' }));
    }
  };

  // Toggle Source Tree Selection
  const toggleTreeSelection = (code) => {
    setFormData((prev) => {
      const exists = prev.selectedTrees.includes(code);
      const updated = exists
        ? prev.selectedTrees.filter((t) => t !== code)
        : [...prev.selectedTrees, code].sort();
      return { ...prev, selectedTrees: updated };
    });
  };

  // Update Stage Field
  const updateStageField = (idx, field, value) => {
    setFormData((prev) => {
      const updatedStages = [...prev.stages];
      updatedStages[idx] = { ...updatedStages[idx], [field]: value };
      return { ...prev, stages: updatedStages };
    });
  };

  // Toggle stage verified status (independently verified vs application recorded)
  const toggleStageVerified = (idx) => {
    setFormData((prev) => {
      const updatedStages = [...prev.stages];
      const current = updatedStages[idx].isVerified;
      updatedStages[idx] = {
        ...updatedStages[idx],
        isVerified: !current,
        stageType: !current ? 'independently_verified' : 'application_recorded',
      };
      return { ...prev, stages: updatedStages };
    });
  };

  // Add Document Reference
  const handleAddDocument = (e) => {
    e.preventDefault();
    if (!newDoc.title.trim() || !newDoc.url.trim()) return;
    setFormData((prev) => ({
      ...prev,
      documentRefs: [
        ...prev.documentRefs,
        { title: newDoc.title.trim(), url: newDoc.url.trim(), type: newDoc.type },
      ],
    }));
    setNewDoc({ title: '', url: '', type: 'Lab Report' });
  };

  // Remove Document Reference
  const handleRemoveDocument = (idx) => {
    setFormData((prev) => ({
      ...prev,
      documentRefs: prev.documentRefs.filter((_, i) => i !== idx),
    }));
  };

  // Validation
  const validate = () => {
    const errors = {};
    if (!formData.batchId.trim()) errors.batchId = 'Batch Identifier is required';
    if (!formData.productionDate) errors.productionDate = 'Production Date is required';

    const neera = parseFloat(formData.neeraLiters);
    if (isNaN(neera) || neera <= 0) errors.neeraLiters = 'Neera quantity must be greater than 0';

    const jaggery = parseFloat(formData.jaggeryKg);
    if (isNaN(jaggery) || jaggery <= 0) errors.jaggeryKg = 'Jaggery quantity must be greater than 0';

    if (formData.selectedTrees.length === 0) {
      errors.selectedTrees = 'Please select or link at least one source palm tree';
    }

    if (!formData.productionNotes.trim()) {
      errors.productionNotes = 'Production notes are required for batch traceability';
    }

    return errors;
  };

  // Submit Pre-check
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

  // ─── Execute Batch Creation Flow ──────────────────────────────────────────
  const executeBatchCreation = async () => {
    setConfirmAnchorOpen(false);

    if (!isConnected) {
      setErrorMessage('Please connect your MetaMask wallet.');
      return;
    }

    if (!isSepolia) {
      setErrorMessage('Please switch MetaMask to Ethereum Sepolia Testnet.');
      return;
    }

    if (!isConfigured) {
      setErrorMessage(
        'BatchRegistry contract address is not configured. Please check VITE_BATCH_REGISTRY_ADDRESS.'
      );
      return;
    }

    if (!isVerifiedProducer) {
      setErrorMessage(
        'Only producers verified by the ProducerRegistry administrator can anchor batches to BatchRegistry.sol.'
      );
      return;
    }

    setFlowState('awaiting_signature');
    setErrorMessage('');
    setDbSyncError('');

    try {
      // 1. Get signer from MetaMask
      const signer = await getSigner();
      const contract = getBatchRegistryWithSigner(signer);

      // Quantities scaled x100 as per contract requirement (integer scaling)
      const neeraScaled = Math.round((parseFloat(formData.neeraLiters) || 0) * 100);
      const jaggeryScaled = Math.round((parseFloat(formData.jaggeryKg) || 0) * 100);
      const dataHashBytes32 = computedHash.startsWith('0x') ? computedHash : `0x${computedHash}`;

      // 2. Submit transaction to MetaMask
      const tx = await contract.createBatch(
        formData.batchId.trim().toUpperCase(),
        neeraScaled,
        jaggeryScaled,
        dataHashBytes32
      );

      setTxHash(tx.hash);
      setFlowState('mining_tx');

      // 3. Wait for transaction confirmation on Sepolia
      const receipt = await tx.wait(1);
      setBlockNumber(receipt.blockNumber);
      setFlowState('blockchain_confirmed');

      // 4. Save detailed production record and transaction reference in database
      setFlowState('saving_db');
      try {
        const payloadToSave = {
          batchId: formData.batchId.trim().toUpperCase(),
          batch_number: formData.batchId.trim().toUpperCase(),
          producerAddress: address,
          productionDate: formData.productionDate,
          treesUsed: formData.selectedTrees,
          neeraLiters: parseFloat(formData.neeraLiters),
          jaggeryKg: parseFloat(formData.jaggeryKg),
          productionNotes: formData.productionNotes,
          stages: formData.stages,
          documentRefs: formData.documentRefs,
          onchain_tx_hash: tx.hash,
          onchain_block_number: receipt.blockNumber,
          onchain_data_hash: dataHashBytes32,
        };

        const saveResult = await batchesApi.create(payloadToSave, await getSigner());
        if (!saveResult?.storage?.supabase) {
          throw new Error(saveResult?.storage?.supabaseNotice || 'Batch data was saved locally but not persisted to Supabase.');
        }
        setFlowState('success');
      } catch (dbErr) {
        console.error('Database save error:', dbErr);
        setDbSyncError(dbErr.message || 'Failed to save record in database.');
        setFlowState('db_sync_failed');
      }
    } catch (err) {
      console.error('Batch creation transaction error:', err);
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setFlowState('rejected');
        setErrorMessage('Transaction signature was rejected in MetaMask.');
      } else if (err.message && err.message.includes('BatchAlreadyExists')) {
        setFlowState('failed');
        setErrorMessage(`Batch ${formData.batchId} has already been anchored on-chain.`);
      } else if (err.message && err.message.includes('NotVerifiedProducer')) {
        setFlowState('failed');
        setErrorMessage('Caller wallet is not a verified producer on ProducerRegistry.sol.');
      } else {
        setFlowState('failed');
        setErrorMessage(err.reason || err.shortMessage || err.message || 'Transaction failed on Ethereum Sepolia.');
      }
    }
  };

  // Retry Database Sync if transaction succeeded on-chain
  const retryDatabaseSync = async () => {
    if (!txHash) return;
    setFlowState('saving_db');
    setDbSyncError('');
    try {
      const payloadToSave = {
        batchId: formData.batchId.trim().toUpperCase(),
        batch_number: formData.batchId.trim().toUpperCase(),
        producerAddress: address,
        productionDate: formData.productionDate,
        treesUsed: formData.selectedTrees,
        neeraLiters: parseFloat(formData.neeraLiters),
        jaggeryKg: parseFloat(formData.jaggeryKg),
        productionNotes: formData.productionNotes,
        stages: formData.stages,
        documentRefs: formData.documentRefs,
        onchain_tx_hash: txHash,
        onchain_block_number: blockNumber,
        onchain_data_hash: computedHash.startsWith('0x') ? computedHash : `0x${computedHash}`,
      };

      const dbRes = await batchesApi.create(payloadToSave, await getSigner());
      if (!dbRes?.storage?.supabase) {
        throw new Error(dbRes?.storage?.supabaseNotice || 'Batch data was saved locally but not persisted to Supabase.');
      }
      setSavedBatchResult(dbRes.batch);
      setFlowState('success');
    } catch (err) {
      setDbSyncError(err.message || 'Retry failed to sync database.');
      setFlowState('db_sync_failed');
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'hash') {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else {
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-5">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
            Production & Integrity Anchor
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
            Create Palm-Jaggery Batch
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Record harvest measurements, 7-stage lifecycle processing, and anchor an immutable SHA-256 hash to Ethereum Sepolia.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleGenerateCode}
            className="px-3 py-2 rounded-xl border border-cream-300 hover:bg-cream-100 text-xs font-semibold text-stone-700 flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-forest-700" />
            <span>Generate New Code</span>
          </button>
        </div>
      </div>

      {/* Contract Warning Banner */}
      {!isConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 text-xs shadow-xs">
          <div className="flex items-center space-x-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Contract Integration Status: BatchRegistry Address Missing</span>
          </div>
          <p className="leading-relaxed text-amber-800">
            <code>VITE_BATCH_REGISTRY_ADDRESS</code> is not configured. Deploy the contract or configure the address in <code>.env</code>.
          </p>
        </div>
      )}

      {/* Producer Verification Notice & Quick-Verify Action */}
      {isConnected && !isVerifiedProducer && (
        <div className="p-5 rounded-3xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-3 shadow-warm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 font-bold text-sm text-amber-900">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>On-Chain Producer Verification Required</span>
            </div>
            <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-semibold">
              Status: {onChainProducer.statusText || 'Not Registered'}
            </span>
          </div>
          <p className="leading-relaxed text-amber-900/90">
            <code>BatchRegistry.createBatch()</code> enforces access control: only verified producers registered on <code>ProducerRegistry.sol</code> may anchor harvest batches.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/producer/register"
              className="text-forest-900 hover:text-forest-950 font-bold underline flex items-center space-x-1"
            >
              <span>Register via Form, then await administrator verification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* SUCCESS RECEIPT: Actual Batch ID, Hash, and Transaction Reference */}
      {flowState === 'success' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-forest-900 text-white shadow-warm space-y-6 animate-in fade-in duration-300 border border-forest-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-forest-800 pb-5">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-forest-800 text-gold-300 flex items-center justify-center font-bold shadow-inner">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-gold-300 font-bold">
                  Blockchain Commitment Confirmed
                </span>
                <h2 className="text-xl sm:text-2xl font-black">
                  Batch {formData.batchId} Anchored Successfully
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/verify/${formData.batchId}`}
                className="px-4 py-2 rounded-xl bg-gold-400 hover:bg-gold-500 text-forest-950 font-bold text-xs shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <span>Verify Digital Passport</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-forest-800 hover:bg-forest-700 text-white font-semibold text-xs border border-forest-700 transition-colors flex items-center space-x-1"
              >
                <QrCode className="w-3.5 h-3.5 text-gold-300" />
                <span>QR Passport</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-forest-800/80 border border-forest-700/80 space-y-1.5">
              <div className="text-[10px] uppercase font-sans text-stone-300 font-semibold flex items-center justify-between">
                <span>Cryptographic SHA-256 Hash</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(computedHash, 'hash')}
                  className="text-gold-300 hover:text-white flex items-center space-x-1 font-sans"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="break-all font-bold text-gold-200 select-all">{computedHash}</p>
            </div>

            <div className="p-4 rounded-2xl bg-forest-800/80 border border-forest-700/80 space-y-1.5">
              <div className="text-[10px] uppercase font-sans text-stone-300 font-semibold flex items-center justify-between">
                <span>Sepolia Transaction Reference</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(txHash, 'tx')}
                  className="text-gold-300 hover:text-white flex items-center space-x-1 font-sans"
                >
                  {copiedTx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedTx ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="break-all font-bold text-white select-all">{txHash}</p>
              {blockNumber && (
                <div className="flex items-center justify-between pt-1 text-[11px] text-stone-300">
                  <span>Block Height: #{blockNumber}</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gold-300 hover:underline flex items-center space-x-1"
                  >
                    <span>View on Etherscan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAILURE HANDLING: Blockchain vs Database Failure Recovery */}
      {flowState === 'db_sync_failed' && (
        <div className="p-6 rounded-3xl bg-amber-900/90 text-white shadow-warm space-y-4 border border-amber-600">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-gold-300 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                On-Chain Commitment Succeeded, but Database Sync Encountered an Issue
              </h3>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Your batch was successfully mined on Ethereum Sepolia (Tx: <span className="font-mono">{txHash}</span>), but saving off-chain record details encountered: {dbSyncError}. PalmChain never silently claims success.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={retryDatabaseSync}
              className="px-4 py-2 rounded-xl bg-gold-400 hover:bg-gold-500 text-earth-950 font-bold text-xs shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Saving Production Record</span>
            </button>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-700 text-white text-xs font-semibold flex items-center space-x-1"
            >
              <span>View Sepolia Tx</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Transaction Rejection or Failure Banner */}
      {(flowState === 'rejected' || flowState === 'failed') && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs flex items-start space-x-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-rose-900">Batch Anchoring Not Completed</p>
            <p className="leading-relaxed text-rose-800">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Live Transaction State Tracker during execution */}
      {(flowState === 'awaiting_signature' || flowState === 'mining_tx' || flowState === 'saving_db') && (
        <div className="p-5 rounded-2xl bg-cream-100 border border-cream-300 text-stone-900 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-forest-700" />
              <span>
                {flowState === 'awaiting_signature' && 'Awaiting MetaMask Signature...'}
                {flowState === 'mining_tx' && 'Mining Transaction on Sepolia Testnet...'}
                {flowState === 'saving_db' && 'Persisting Production Data in Supabase & Local Store...'}
              </span>
            </div>
            {txHash && (
              <span className="font-mono text-[11px] text-stone-600 truncate max-w-xs">
                Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </span>
            )}
          </div>
          <div className="w-full bg-cream-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-forest-700 h-full transition-all duration-500 rounded-full"
              style={{
                width:
                  flowState === 'awaiting_signature' ? '30%' :
                  flowState === 'mining_tx' ? '70%' : '90%',
              }}
            />
          </div>
        </div>
      )}

      {/* FORM CONTAINER */}
      <form onSubmit={handleFormSubmit} className="space-y-8">
        {/* Section 1: Core Harvest Measurements */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-6">
          <div className="border-b border-cream-100 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center font-bold">
                1
              </div>
              <h2 className="text-base font-bold text-earth-950">Harvest & Production Parameters</h2>
            </div>
            <span className="text-[11px] font-mono text-stone-500">
              Schema: v{CURRENT_SCHEMA_VERSION}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Batch ID */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-700 block">
                Application Batch Code <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono font-bold uppercase text-xs focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
                  placeholder="PJG-YYYYMMDD-XXXX"
                />
              </div>
              {formErrors.batchId && <p className="text-rose-600 text-[11px]">{formErrors.batchId}</p>}
            </div>

            {/* Production Date */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-700 block">
                Production Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.productionDate}
                onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-medium text-xs focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
              />
              {formErrors.productionDate && <p className="text-rose-600 text-[11px]">{formErrors.productionDate}</p>}
            </div>

            {/* Neera Collected (Liters) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-700 flex items-center justify-between">
                <span>Neera Collected (Liters) <span className="text-rose-500">*</span></span>
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={formData.neeraLiters}
                onChange={(e) => setFormData({ ...formData, neeraLiters: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono font-bold text-xs focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
                placeholder="e.g. 850"
              />
              {formErrors.neeraLiters && <p className="text-rose-600 text-[11px]">{formErrors.neeraLiters}</p>}
            </div>

            {/* Jaggery Produced (Kg) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-700 flex items-center justify-between">
                <span>Jaggery Produced (Kg) <span className="text-rose-500">*</span></span>
                <Scale className="w-3.5 h-3.5 text-amber-600" />
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.jaggeryKg}
                onChange={(e) => setFormData({ ...formData, jaggeryKg: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono font-bold text-xs focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
                placeholder="e.g. 115"
              />
              {formErrors.jaggeryKg && <p className="text-rose-600 text-[11px]">{formErrors.jaggeryKg}</p>}
            </div>

            {/* Calculated Yield Ratio */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-700 block">
                Calculated Sap-to-Jaggery Yield
              </label>
              <div className="px-3.5 py-2.5 rounded-xl bg-cream-50 border border-cream-200 font-mono font-bold text-forest-800 text-xs flex items-center justify-between">
                <span>{yieldRatio}%</span>
                <span className="text-[10px] text-stone-400 font-sans font-normal">Typical: 12%–15%</span>
              </div>
            </div>

            {/* Producer Wallet Attribution */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-700 block">
                Committed Producer Address
              </label>
              <div className="px-3.5 py-2.5 rounded-xl bg-cream-50 border border-cream-200 font-mono text-[11px] text-stone-700 truncate">
                {address || 'Wallet Not Connected'}
              </div>
            </div>
          </div>

          {/* Source Palm Trees Used */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-semibold text-stone-800 text-xs block">
                  Palm Trees Used ({formData.selectedTrees.length} Linked) <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-stone-500">
                  Select registered grove trees or type custom tree GPS tags to link.
                </p>
              </div>

              {/* Add Custom Tree Tag */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={formData.customTreeInput}
                  onChange={(e) => setFormData({ ...formData, customTreeInput: e.target.value })}
                  placeholder="Custom Tree ID (e.g. PLM-TK-099)"
                  className="px-3 py-1.5 rounded-xl border border-cream-300 text-xs font-mono uppercase focus:outline-hidden w-48"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTree}
                  className="px-3 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Tree Selection Grid */}
            <div className="flex flex-wrap gap-2 pt-1">
              {mockTrees.map((t) => {
                const isSelected = formData.selectedTrees.includes(t.treeCode);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTreeSelection(t.treeCode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                      isSelected
                        ? 'bg-forest-700 text-white border-forest-800 shadow-xs'
                        : 'bg-white text-stone-700 border-cream-200 hover:bg-cream-100'
                    }`}
                  >
                    <span>{t.treeCode}</span>
                    <span className="ml-1.5 text-[10px] font-normal opacity-80">({t.ageYears}y)</span>
                  </button>
                );
              })}

              {/* Custom trees added that are not in mockTrees */}
              {formData.selectedTrees
                .filter((code) => !mockTrees.some((t) => t.treeCode === code))
                .map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleTreeSelection(code)}
                    className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-forest-700 text-white border border-forest-800 flex items-center space-x-1"
                  >
                    <span>{code}</span>
                    <span className="text-[10px] ml-1">✕</span>
                  </button>
                ))}
            </div>
            {formErrors.selectedTrees && <p className="text-rose-600 text-[11px]">{formErrors.selectedTrees}</p>}
          </div>

          {/* Production Notes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-stone-800 text-xs block">
              Production Notes & Harvest Observations <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={formData.productionNotes}
              onChange={(e) => setFormData({ ...formData, productionNotes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs leading-relaxed focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
              placeholder="Describe grove conditions, weather, sap clarity, firewood type, and curing process..."
            />
            {formErrors.productionNotes && <p className="text-rose-600 text-[11px]">{formErrors.productionNotes}</p>}
          </div>
        </div>

        {/* Section 2: 7-Stage Production Lifecycle Timeline */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-6">
          <div className="border-b border-cream-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h2 className="text-base font-bold text-earth-950">Production Stages Timeline</h2>
                <p className="text-[11px] text-stone-500">
                  7 canonical stages recorded during harvest and boiling. Distinguishes application-recorded from independently verified stages.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-semibold">
              <span className="flex items-center space-x-1 text-stone-600">
                <span className="w-2.5 h-2.5 rounded-full bg-forest-600 inline-block" />
                <span>Application-Recorded</span>
              </span>
              <span className="flex items-center space-x-1 text-gold-700">
                <span className="w-2.5 h-2.5 rounded-full bg-gold-500 inline-block" />
                <span>Independently Verified</span>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {formData.stages.map((stage, idx) => (
              <div
                key={stage.order}
                className="p-4 sm:p-5 rounded-2xl bg-cream-50/70 border border-cream-200/90 space-y-3 transition-colors hover:border-gold-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cream-200/60 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-forest-100 text-forest-800 border border-forest-200">
                      Stage {stage.order}
                    </span>
                    <h3 className="font-bold text-sm text-earth-950">{stage.name}</h3>
                  </div>

                  {/* Stage Verification Distinction Toggle */}
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleStageVerified(idx)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all flex items-center space-x-1 ${
                        stage.isVerified
                          ? 'bg-gold-100 text-gold-900 border-gold-300'
                          : 'bg-white text-stone-600 border-cream-200 hover:bg-cream-100'
                      }`}
                    >
                      <ShieldCheck className={`w-3.5 h-3.5 ${stage.isVerified ? 'text-gold-700' : 'text-stone-400'}`} />
                      <span>{stage.isVerified ? 'Independently Verified' : 'Application Recorded'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-stone-500 font-medium text-[11px]">Execution Date</label>
                    <input
                      type="date"
                      value={stage.date}
                      onChange={(e) => updateStageField(idx, 'date', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-cream-300 bg-white text-xs font-mono focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-stone-500 font-medium text-[11px]">Facility Location</label>
                    <input
                      type="text"
                      value={stage.location}
                      onChange={(e) => updateStageField(idx, 'location', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-cream-300 bg-white text-xs focus:outline-hidden"
                      placeholder="e.g. Processing Pan #1"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-stone-500 font-medium text-[11px]">Recorded By (Operator)</label>
                    <input
                      type="text"
                      value={stage.operator}
                      onChange={(e) => updateStageField(idx, 'operator', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-cream-300 bg-white text-xs focus:outline-hidden"
                      placeholder="e.g. Supervisor Name"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-stone-500 font-medium text-[11px]">Stage Notes & Process Method</label>
                    <input
                      type="text"
                      value={stage.notes}
                      onChange={(e) => updateStageField(idx, 'notes', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-cream-300 bg-white text-xs focus:outline-hidden"
                      placeholder="Specific observations or standard parameters..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Supporting Image & Document References */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-6">
          <div className="border-b border-cream-100 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h2 className="text-base font-bold text-earth-950">Supporting Documents & Image References</h2>
                <p className="text-[11px] text-stone-500">
                  Attach certificates, lab assays, or grove photo references to commit to the integrity hash.
                </p>
              </div>
            </div>
          </div>

          {/* Current Attached Documents */}
          <div className="space-y-2">
            {formData.documentRefs.length === 0 ? (
              <p className="text-stone-400 text-xs italic py-2">No documents attached yet.</p>
            ) : (
              formData.documentRefs.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-cream-50 border border-cream-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-forest-700 shrink-0" />
                    <span className="font-bold text-earth-950 truncate">{doc.title}</span>
                    <span className="px-2 py-0.5 rounded-md bg-cream-200 text-stone-700 text-[10px] shrink-0 font-medium">
                      {doc.type}
                    </span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-forest-800 hover:underline text-[11px] font-mono truncate"
                    >
                      {doc.url}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(idx)}
                    className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add New Document Form */}
          <div className="p-4 rounded-2xl bg-cream-50/60 border border-cream-200/80 space-y-3">
            <span className="font-bold text-xs text-stone-800 block">Add Reference Document or Image URL</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  placeholder="Document Title (e.g. NABL Assay Certificate)"
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs focus:outline-hidden"
                />
              </div>
              <div>
                <select
                  value={newDoc.type}
                  onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs focus:outline-hidden"
                >
                  <option value="Lab Report">Lab Report</option>
                  <option value="Organic Certificate">Organic Certificate</option>
                  <option value="Harvest Photo">Harvest Photo</option>
                  <option value="Verification Doc">Verification Doc</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={newDoc.url}
                  onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
                  placeholder="URL reference (https://...)"
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs font-mono focus:outline-hidden"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="w-full py-2 px-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs flex items-center justify-center space-x-1 transition-colors"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Attach Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Cryptographic Preview & Serialization Inspector */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-forest-900">
              <Layers className="w-5 h-5 text-forest-700" />
              <h3 className="font-bold text-sm text-earth-950 uppercase tracking-wider">
                Cryptographic SHA-256 Digest Preview
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCanonicalJson(!showCanonicalJson)}
              className="text-xs font-semibold text-forest-800 hover:text-forest-950 flex items-center space-x-1"
            >
              {showCanonicalJson ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showCanonicalJson ? 'Hide Canonical Payload' : 'Inspect Canonical JSON'}</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 space-y-1.5 font-mono text-xs">
            <span className="text-[10px] text-stone-400 uppercase font-sans font-semibold block">
              Computed SHA-256 Hash (Bytes32 for Sepolia Anchor)
            </span>
            <p className="break-all font-bold text-forest-900 select-all">{computedHash}</p>
          </div>

          {showCanonicalJson && (
            <div className="space-y-1.5 pt-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px] text-stone-500 font-sans">
                <span>Deterministic Key-Sorted JSON (Version {CURRENT_SCHEMA_VERSION})</span>
                <span>{canonicalJson.length} bytes</span>
              </div>
              <pre className="p-4 rounded-2xl bg-stone-900 text-gold-200 text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed">
                {JSON.stringify(canonicalPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Submit Action Bar */}
        <div className="p-6 rounded-3xl bg-cream-100 border border-cream-300 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="font-bold text-earth-950 text-sm">Ready to Anchor On-Chain?</h4>
            <p className="text-xs text-stone-600">
              Submits <code>createBatch(...)</code> through MetaMask to Sepolia contract <code>{CONTRACT_ADDRESSES.batchRegistry.slice(0, 10)}...</code>.
            </p>
          </div>

          <button
            type="submit"
            disabled={flowState === 'awaiting_signature' || flowState === 'mining_tx' || flowState === 'saving_db'}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-warm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-gold-300" />
            <span>Sign & Anchor Batch on Sepolia</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Confirmation Modal Before MetaMask Transaction */}
      <ConfirmModal
        isOpen={confirmAnchorOpen}
        title="Confirm Sepolia Batch Anchoring"
        message={`You are about to register batch "${formData.batchId}" on Ethereum Sepolia with ${formData.neeraLiters}L Neera and ${formData.jaggeryKg}kg Jaggery. The SHA-256 integrity hash (${computedHash.slice(0, 12)}...) will be immutably committed on-chain.`}
        confirmLabel="Open MetaMask & Sign"
        cancelLabel="Review Parameters"
        onConfirm={executeBatchCreation}
        onCancel={() => setConfirmAnchorOpen(false)}
      />

      {/* QR Code Packaging Print Modal */}
      <QRPreviewModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        batchId={formData.batchId}
        productTitle="Artisanal Pure Palm Jaggery (Karupatti)"
        producerName="PalmChain Verified Producer"
      />
    </div>
  );
}
