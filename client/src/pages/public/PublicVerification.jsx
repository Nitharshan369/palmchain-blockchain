import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  QrCode, 
  MapPin, 
  Calendar, 
  Flame, 
  Droplets, 
  ExternalLink, 
  Copy, 
  Check, 
  Layers, 
  Clock, 
  Scale, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  FileText,
  Sliders,
  RotateCcw,
  Sparkles,
  Search
} from 'lucide-react';
import { ethers } from 'ethers';
import { mockBatches } from '../../data/mockData';
import ProductionTimeline from '../../components/common/ProductionTimeline';
import QRPreviewModal from '../../components/common/QRPreviewModal';
import { 
  getBatchRegistryReadOnly, 
  isBatchRegistryConfigured, 
  CONTRACT_ADDRESSES 
} from '../../contracts';
import { 
  CURRENT_SCHEMA_VERSION, 
  buildCanonicalBatchPayload, 
  canonicalJsonStringify, 
  generateSHA256Hash, 
  strip0x, 
  to0xHash 
} from '../../lib/canonicalHash';
import { verifyApi } from '../../lib/api';

export default function PublicVerification() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const currentBatchId = (batchId || 'PJG-2026-001').trim().toUpperCase();
  const [searchInput, setSearchInput] = useState(currentBatchId);
  const [loading, setLoading] = useState(true);

  // Loaded authentic batch record
  const [authenticBatch, setAuthenticBatch] = useState(null);
  const [onchainData, setOnchainData] = useState({
    queried: false,
    anchored: false,
    onchainHash: '',
    onchainStatus: 0,
    onchainStatusName: 'Created',
    producer: '',
    anchoredAt: null,
    verifier: null,
    verifiedAt: null,
    rejectionReason: null,
  });

  // ─── Interactive Tamper Sandbox State ─────────────────────────────────────
  // Allows testing tampering with committed quantities, dates, trees, or notes
  const [tamperForm, setTamperForm] = useState({
    active: false,
    neeraLiters: '',
    jaggeryKg: '',
    productionDate: '',
    treesUsed: [],
    productionNotes: '',
  });

  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // 1. Fetch Batch Record from Backend / Supabase
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setFetchError('');

    async function loadBatchData() {
      try {
        const res = await verifyApi.batch(currentBatchId);
        if (!isCancelled && res && res.batch) {
          setAuthenticBatch(res.batch);
          setTamperForm({
            active: false,
            neeraLiters: String(res.batch.neera_liters || res.batch.sapVolumeLiters || '850'),
            jaggeryKg: String(res.batch.jaggery_kg || res.batch.outputKg || res.batch.total_quantity_kg || '115'),
            productionDate: String(res.batch.production_date || res.batch.harvest_date || '2026-03-10'),
            treesUsed: res.batch.trees_used || res.batch.sourceTreeIds || ['PLM-TK-012', 'PLM-TK-014', 'PLM-TK-018'],
            productionNotes: res.batch.production_notes || res.batch.notes || '',
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('API verification notice, falling back to local dataset:', err.message);
      }

      // Fallback to local mock batch if API server not reachable
      const fallback = mockBatches[currentBatchId] || mockBatches['PJG-2026-001'];
      if (!isCancelled && fallback) {
        setAuthenticBatch(fallback);
        setTamperForm({
          active: false,
          neeraLiters: String(fallback.neera_volume_liters || fallback.neera_liters || '850'),
          jaggeryKg: String(fallback.total_quantity_kg || fallback.jaggery_kg || '120'),
          productionDate: String(fallback.harvest_date || '2026-03-10'),
          treesUsed: fallback.sourceTreeIds || ['PLM-TK-012', 'PLM-TK-014'],
          productionNotes: fallback.production_notes || 'Heritage morning harvest from Tenkasi Grove.',
        });
        setLoading(false);
      } else if (!isCancelled) {
        setFetchError(`Batch ${currentBatchId} was not found in off-chain records or on-chain registry.`);
        setLoading(false);
      }
    }

    loadBatchData();
    return () => { isCancelled = true; };
  }, [currentBatchId]);

  // 2. Query Live Ethereum Sepolia Contract for on-chain proof
  useEffect(() => {
    let isCancelled = false;

    async function querySepoliaContract() {
      if (!isBatchRegistryConfigured()) return;

      try {
        const contract = getBatchRegistryReadOnly();
        const b = await contract.getBatch(currentBatchId).catch(() => null);

        if (!isCancelled && b && Number(b.createdAt) > 0) {
          const statusNum = Number(b.status);
          const STATUS_NAMES = ['Created', 'Processing', 'Verified', 'Packaged', 'Listed', 'Sold', 'Rejected', 'Recalled'];

          setOnchainData({
            queried: true,
            anchored: true,
            onchainHash: b.dataHash,
            onchainStatus: statusNum,
            onchainStatusName: STATUS_NAMES[statusNum] || 'Anchored',
            producer: b.producer,
            anchoredAt: new Date(Number(b.createdAt) * 1000).toISOString(),
            verifier: b.verifier !== ethers.ZeroAddress ? b.verifier : null,
            verifiedAt: Number(b.verifiedAt) > 0 ? new Date(Number(b.verifiedAt) * 1000).toISOString() : null,
            rejectionReason: b.rejectionReason || null,
          });
        }
      } catch (e) {
        console.warn('Sepolia contract check note:', e.message);
      }
    }

    querySepoliaContract();
    return () => { isCancelled = true; };
  }, [currentBatchId]);

  // 3. Compute Cryptographic SHA-256 Hash using EXACT Canonicalization Rules
  const { currentPayload, currentComputedHash, isTamperFree, alteredFields } = useMemo(() => {
    if (!authenticBatch) {
      return { currentPayload: null, currentComputedHash: '', isTamperFree: false, alteredFields: [] };
    }

    // Determine values (tampered vs authentic)
    const effectiveNeera = tamperForm.active ? parseFloat(tamperForm.neeraLiters) || 0 : parseFloat(authenticBatch.neera_liters ?? authenticBatch.sapVolumeLiters ?? authenticBatch.neera_volume_liters ?? 850);
    const effectiveJaggery = tamperForm.active ? parseFloat(tamperForm.jaggeryKg) || 0 : parseFloat(authenticBatch.jaggery_kg ?? authenticBatch.outputKg ?? authenticBatch.total_quantity_kg ?? 115);
    const effectiveDate = tamperForm.active ? tamperForm.productionDate : (authenticBatch.production_date || authenticBatch.harvest_date || '2026-03-10');
    const effectiveTrees = tamperForm.active ? tamperForm.treesUsed : (authenticBatch.trees_used || authenticBatch.sourceTreeIds || []);
    const effectiveNotes = tamperForm.active ? tamperForm.productionNotes : (authenticBatch.production_notes || authenticBatch.notes || '');

    // Detect altered fields
    const altered = [];
    if (tamperForm.active) {
      const origNeera = parseFloat(authenticBatch.neera_liters ?? authenticBatch.sapVolumeLiters ?? authenticBatch.neera_volume_liters ?? 850);
      const origJaggery = parseFloat(authenticBatch.jaggery_kg ?? authenticBatch.outputKg ?? authenticBatch.total_quantity_kg ?? 115);
      const origDate = authenticBatch.production_date || authenticBatch.harvest_date;
      const origNotes = authenticBatch.production_notes || authenticBatch.notes || '';

      if (effectiveNeera !== origNeera) altered.push(`Neera Liters (${origNeera}L → ${effectiveNeera}L)`);
      if (effectiveJaggery !== origJaggery) altered.push(`Jaggery Output (${origJaggery}kg → ${effectiveJaggery}kg)`);
      if (effectiveDate !== origDate) altered.push(`Production Date (${origDate} → ${effectiveDate})`);
      if (effectiveNotes !== origNotes) altered.push('Production Notes modified');
    }

    // Canonical payload reconstruction
    const payload = buildCanonicalBatchPayload({
      schemaVersion: authenticBatch.schema_version || CURRENT_SCHEMA_VERSION,
      batchId: currentBatchId,
      producerAddress: onchainData.producer || authenticBatch.producer_address || authenticBatch.producer?.wallet_address || '0x0000000000000000000000000000000000000000',
      productionDate: effectiveDate,
      treesUsed: effectiveTrees,
      neeraLiters: effectiveNeera,
      jaggeryKg: effectiveJaggery,
      productionNotes: effectiveNotes,
      stages: authenticBatch.stages || authenticBatch.timeline || authenticBatch.batch_trace_logs || [],
      documentRefs: authenticBatch.document_refs || authenticBatch.documentRefs || [],
    });

    const canonicalJson = canonicalJsonStringify(payload);
    const computed = generateSHA256Hash(canonicalJson);

    // Baseline Anchor: on-chain contract hash takes priority, then stored database hash
    const storedHash = strip0x(authenticBatch.sha256_hash || authenticBatch.sha256Hash || authenticBatch.metadata_hash || '');
    const anchorHash = onchainData.onchainHash ? strip0x(onchainData.onchainHash) : storedHash;

    const matches = strip0x(computed) === anchorHash && anchorHash.length > 0;

    return {
      currentPayload: payload,
      currentComputedHash: computed,
      isTamperFree: matches,
      alteredFields: altered,
    };
  }, [authenticBatch, tamperForm, onchainData, currentBatchId]);

  // Lookup form handler
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/verify/${searchInput.trim().toUpperCase()}`);
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

  // Reset Tamper Sandbox to Immutable Truth
  const handleResetTamper = () => {
    if (!authenticBatch) return;
    setTamperForm({
      active: false,
      neeraLiters: String(authenticBatch.neera_liters || authenticBatch.sapVolumeLiters || '850'),
      jaggeryKg: String(authenticBatch.jaggery_kg || authenticBatch.outputKg || '115'),
      productionDate: String(authenticBatch.production_date || authenticBatch.harvest_date || '2026-03-10'),
      treesUsed: authenticBatch.trees_used || authenticBatch.sourceTreeIds || [],
      productionNotes: authenticBatch.production_notes || authenticBatch.notes || '',
    });
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-forest-700 mx-auto" />
        <h2 className="text-base font-bold text-earth-950">
          Querying Sepolia Smart Contracts & Supabase...
        </h2>
        <p className="text-xs text-stone-500">
          Retrieving canonical metadata and evaluating cryptographic proof for {currentBatchId}.
        </p>
      </div>
    );
  }

  if (fetchError || !authenticBatch) {
    return (
      <div className="py-12 max-w-xl mx-auto space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-earth-950">Batch Not Found</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            {fetchError || `Batch ${currentBatchId} has not been anchored to Ethereum Sepolia or recorded in the database.`}
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center justify-center space-x-2 pt-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search another Batch ID..."
            className="px-4 py-2.5 rounded-xl border border-cream-300 font-mono text-xs uppercase focus:outline-hidden"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs"
          >
            Lookup
          </button>
        </form>
      </div>
    );
  }

  // Anchor commitment target
  const storedAnchorHash = authenticBatch.sha256_hash || authenticBatch.sha256Hash || authenticBatch.metadata_hash || '';
  const effectiveAnchorHash = onchainData.onchainHash ? to0xHash(onchainData.onchainHash) : to0xHash(storedAnchorHash);

  // Timeline stages
  const timelineStages = authenticBatch.stages || authenticBatch.timeline || authenticBatch.batch_trace_logs || [];

  return (
    <div className="py-6 space-y-8 max-w-5xl mx-auto">
      {/* Header & Batch Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cream-200 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
              Public Digital Passport
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cream-200 text-stone-700">
              Schema: v{authenticBatch.schema_version || CURRENT_SCHEMA_VERSION}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
            Palm-Jaggery Batch Integrity & Traceability
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Cryptographic SHA-256 integrity inspection, 7-stage production history & multi-pillar verification.
          </p>
        </div>

        {/* Batch Lookup Input */}
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Lookup Batch ID..."
            className="pl-3.5 pr-4 py-2 rounded-xl border border-cream-300 bg-white text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-gold-400 focus:outline-hidden w-44 sm:w-52 shadow-xs"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Lookup
          </button>
        </form>
      </div>

      {/* PRIMARY INTEGRITY VERIFICATION STATUS HERO */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border transition-all ${
          isTamperFree
            ? 'bg-forest-50/80 border-forest-300 text-forest-950 shadow-warm'
            : 'bg-rose-50 border-rose-300 text-rose-950 shadow-warm'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center space-x-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                isTamperFree ? 'bg-forest-700 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {isTamperFree ? (
                <ShieldCheck className="w-8 h-8 text-gold-300" />
              ) : (
                <ShieldAlert className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black">
                  {isTamperFree
                    ? 'Cryptographic Integrity Validated (Tamper-Free)'
                    : 'Cryptographic Hash Mismatch Detected!'}
                </h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/90 border border-current">
                  {currentBatchId}
                </span>
              </div>
              <p className="text-xs opacity-90 max-w-2xl leading-relaxed">
                {isTamperFree
                  ? 'The SHA-256 hash recalculated from canonical off-chain fields precisely matches the immutable on-chain commitment.'
                  : 'Computed off-chain payload hash does NOT match the immutable on-chain commitment. Quantities, dates, or notes have been modified.'}
              </p>
            </div>
          </div>

          {/* Tamper Sandbox Trigger */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTamperForm((prev) => ({ ...prev, active: !prev.active }))}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 ${
                tamperForm.active
                  ? 'bg-rose-700 text-white'
                  : 'bg-white text-stone-800 border border-cream-300 hover:bg-cream-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{tamperForm.active ? 'Active Tamper Test (Live)' : '🧪 Test Tamper Detection'}</span>
            </button>
            <span className="text-[10px] font-mono text-stone-600">
              Integrity Status: {isTamperFree ? '100% UNMODIFIED' : 'TAMPERED / COMPROMISED'}
            </span>
          </div>
        </div>

        {/* Dynamic Tamper Alert Box when modified */}
        {!isTamperFree && alteredFields.length > 0 && (
          <div className="mt-5 p-4 rounded-2xl bg-white/90 border border-rose-300 text-rose-950 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Modified Committed Fields Detected:</span>
              </div>
              <button
                type="button"
                onClick={handleResetTamper}
                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[11px] flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert to Immutable Truth</span>
              </button>
            </div>
            <ul className="list-disc list-inside text-[11px] font-mono space-y-0.5 text-rose-900">
              {alteredFields.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Cryptographic Comparison Section */}
        <div className="mt-6 pt-5 border-t border-current/20 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-white/90 p-4 rounded-2xl border border-current/20 space-y-1.5">
            <div className="text-[11px] font-sans font-semibold text-stone-500 flex items-center justify-between">
              <span>On-Chain Immutable Commitment (Ethereum Sepolia)</span>
              {onchainData.queried && (
                <span className="text-[10px] text-forest-800 font-bold bg-forest-100 px-2 py-0.5 rounded-full">
                  Verified On-Chain
                </span>
              )}
            </div>
            <div className="break-all font-bold text-stone-900 select-all">
              {effectiveAnchorHash || 'Not anchored on Sepolia'}
            </div>
          </div>

          <div className="bg-white/90 p-4 rounded-2xl border border-current/20 space-y-1.5">
            <div className="text-[11px] font-sans font-semibold text-stone-500 flex items-center justify-between">
              <span>Client Recomputed Hash (SHA-256)</span>
              <button
                type="button"
                onClick={() => copyToClipboard(currentComputedHash, 'hash')}
                className="text-stone-500 hover:text-stone-900 flex items-center space-x-1 font-sans text-[10px]"
              >
                {copiedHash ? <Check className="w-3 h-3 text-forest-700" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHash ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div
              className={`break-all font-bold select-all ${
                isTamperFree ? 'text-forest-800' : 'text-rose-700'
              }`}
            >
              {currentComputedHash}
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE TAMPER TESTING SANDBOX (When Opened) */}
      {tamperForm.active && (
        <div className="p-6 rounded-3xl bg-amber-50/90 border-2 border-amber-300 text-stone-900 shadow-warm space-y-4 animate-in fade-in duration-200 text-xs">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-amber-700" />
              <h3 className="font-bold text-sm text-amber-950">
                Interactive Tamper Simulation Sandbox
              </h3>
            </div>
            <button
              type="button"
              onClick={handleResetTamper}
              className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Original Values</span>
            </button>
          </div>

          <p className="text-[11px] text-amber-900 leading-relaxed">
            Modify any committed parameter below to observe how the cryptographic SHA-256 hash immediately deviates from the immutable Sepolia commitment, triggering an unambiguous integrity violation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-stone-700 block">Neera Liters (Try changing quantity)</label>
              <input
                type="number"
                step="1"
                value={tamperForm.neeraLiters}
                onChange={(e) => setTamperForm({ ...tamperForm, neeraLiters: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 block">Jaggery Produced (Kg)</label>
              <input
                type="number"
                step="1"
                value={tamperForm.jaggeryKg}
                onChange={(e) => setTamperForm({ ...tamperForm, jaggeryKg: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 block">Production Date</label>
              <input
                type="date"
                value={tamperForm.productionDate}
                onChange={(e) => setTamperForm({ ...tamperForm, productionDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="font-semibold text-stone-700 block">Production Notes</label>
              <input
                type="text"
                value={tamperForm.productionNotes}
                onChange={(e) => setTamperForm({ ...tamperForm, productionNotes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── THE THREE SEPARATE CHECKS: INTEGRITY, TRANSACTION, AND VERIFIER ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Check 1: Cryptographic Data Integrity */}
        <div className="bg-white rounded-3xl p-5 border border-cream-200 shadow-warm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Pillar 1</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isTamperFree ? 'bg-forest-100 text-forest-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isTamperFree ? 'PASSED' : 'FAILED'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-earth-950">Data Integrity</h3>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Ensures off-chain measurements have not been tampered with post-commitment.
          </p>
          <div className="pt-1 text-[11px] font-mono text-stone-500">
            Hash Match: {isTamperFree ? '100% Identical' : 'Mismatch'}
          </div>
        </div>

        {/* Check 2: Blockchain Transaction Validity */}
        <div className="bg-white rounded-3xl p-5 border border-cream-200 shadow-warm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Pillar 2</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                onchainData.anchored || authenticBatch.onchain_tx_hash
                  ? 'bg-forest-100 text-forest-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {onchainData.anchored || authenticBatch.onchain_tx_hash ? 'CONFIRMED' : 'PENDING'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-earth-950">Transaction Validity</h3>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Verifies the commitment was mined on Sepolia and signed by an authorized producer.
          </p>
          <div className="pt-1 text-[11px] font-mono text-stone-500 truncate">
            {authenticBatch.onchain_tx_hash ? `Tx: ${authenticBatch.onchain_tx_hash.slice(0, 10)}...` : 'Anchored on chain'}
          </div>
        </div>

        {/* Check 3: Independent Verifier Attestation */}
        <div className="bg-white rounded-3xl p-5 border border-cream-200 shadow-warm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Pillar 3</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                onchainData.onchainStatus === 2 || authenticBatch.status === 'certified'
                  ? 'bg-forest-100 text-forest-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {onchainData.onchainStatus === 2 || authenticBatch.status === 'certified' ? 'CERTIFIED' : 'PENDING LAB'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-gold-600" />
            </div>
            <h3 className="font-bold text-sm text-earth-950">Verifier Approval</h3>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Independent physical inspection and laboratory purity tests (distinguished from producer claims).
          </p>
          <div className="pt-1 text-[11px] font-mono text-stone-500">
            {onchainData.verifier ? `Verifier: ${onchainData.verifier.slice(0, 8)}...` : 'Status: ' + onchainData.onchainStatusName}
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Production Specs, 7 Stages, Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Batch Parameters Card */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-5">
            <h3 className="text-base font-bold text-earth-950 border-b border-cream-100 pb-3 flex items-center justify-between">
              <span>Production Specifications</span>
              <span className="text-xs font-mono font-normal text-stone-500">
                Batch: {currentBatchId}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-stone-400">Producer Wallet</span>
                <p className="font-mono text-[11px] font-bold text-stone-800 truncate">
                  {onchainData.producer || authenticBatch.producer_address || authenticBatch.producer?.wallet_address || '0x74de526B0CDFB86D682cB293d4006076a2FE6088'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400">Production / Harvest Date</span>
                <p className="font-bold text-earth-950 flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-stone-500 mr-1" />
                  <span>{tamperForm.active ? tamperForm.productionDate : (authenticBatch.production_date || authenticBatch.harvest_date)}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400">Neera Sap Collected</span>
                <p className="font-bold text-earth-950 flex items-center text-sm font-mono">
                  <Droplets className="w-4 h-4 text-blue-600 mr-1" />
                  <span>{tamperForm.active ? tamperForm.neeraLiters : (authenticBatch.neera_liters || authenticBatch.sapVolumeLiters)} Liters</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400">Output Jaggery Produced</span>
                <p className="font-bold text-earth-950 flex items-center text-sm font-mono">
                  <Scale className="w-4 h-4 text-amber-600 mr-1" />
                  <span>{tamperForm.active ? tamperForm.jaggeryKg : (authenticBatch.jaggery_kg || authenticBatch.outputKg || authenticBatch.total_quantity_kg)} Kg</span>
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-stone-400">Source Tree IDs Used</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(tamperForm.active ? tamperForm.treesUsed : (authenticBatch.trees_used || authenticBatch.sourceTreeIds || [])).map((tid, idx) => (
                    <span key={idx} className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-cream-100 text-earth-900 border border-cream-200">
                      {tid}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-stone-400">Production Notes & Method</span>
                <p className="text-stone-700 leading-relaxed italic bg-cream-50 p-3 rounded-xl border border-cream-200">
                  "{tamperForm.active ? tamperForm.productionNotes : (authenticBatch.production_notes || authenticBatch.notes || 'Natural harvest in earthen pots.')}"
                </p>
              </div>
            </div>
          </div>

          {/* 7-Stage Production Lifecycle Timeline */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-200 shadow-warm space-y-6">
            <div className="border-b border-cream-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-earth-950">7-Stage Production Timeline</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Chronological lifecycle stages recorded during processing.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-[10px] font-semibold">
                <span className="px-2 py-0.5 rounded bg-forest-100 text-forest-800 border border-forest-200">
                  App-Recorded
                </span>
                <span className="px-2 py-0.5 rounded bg-gold-200 text-gold-950 border border-gold-300">
                  Independently Verified
                </span>
              </div>
            </div>

            <ProductionTimeline timeline={timelineStages} />
          </div>

          {/* Supporting Document & Image References */}
          {((authenticBatch.document_refs && authenticBatch.document_refs.length > 0) || (authenticBatch.documentRefs && authenticBatch.documentRefs.length > 0)) && (
            <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-4">
              <h3 className="text-base font-bold text-earth-950 border-b border-cream-100 pb-3">
                Supporting References & Laboratory Certificates
              </h3>
              <div className="space-y-2 text-xs">
                {(authenticBatch.document_refs || authenticBatch.documentRefs || []).map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-cream-50 border border-cream-200 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-forest-700 shrink-0" />
                      <span className="font-bold text-earth-950">{doc.title}</span>
                      <span className="px-2 py-0.5 rounded bg-cream-200 text-[10px] font-medium">{doc.type}</span>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-forest-800 hover:underline flex items-center space-x-1"
                    >
                      <span>View Reference</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: QR Passport & Blockchain Commitment Proof */}
        <div className="space-y-6">
          {/* QR Passport Box */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm text-center space-y-4">
            <h3 className="font-bold text-earth-950 text-xs uppercase tracking-wider">
              Batch Digital Passport QR
            </h3>

            <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200 inline-block shadow-inner mx-auto">
              <QRCodeSVG
                value={`https://palmchain.io/verify/${currentBatchId}`}
                size={160}
                level="H"
                includeMargin={true}
              />
            </div>

            <div>
              <p className="text-xs font-mono font-bold text-earth-950">{currentBatchId}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Scan with any smartphone camera to inspect this verification record.
              </p>
            </div>

            <button
              onClick={() => setQrModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-cream-300 hover:bg-cream-100 text-xs font-semibold text-stone-700 transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5 text-forest-700" />
              <span>Packaging Print Options</span>
            </button>
          </div>

          {/* Blockchain Sepolia Commitment Box */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-4">
            <div className="flex items-center space-x-2 text-forest-800">
              <Layers className="w-5 h-5 text-forest-700" />
              <h3 className="font-bold text-earth-950 text-xs uppercase tracking-wider">
                Blockchain Commitment
              </h3>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-cream-50 border border-cream-200 space-y-1">
                <span className="text-[10px] text-stone-400 font-sans block">Network</span>
                <span className="font-bold text-forest-800">Ethereum Sepolia Testnet</span>
              </div>

              <div className="p-3 rounded-xl bg-cream-50 border border-cream-200 space-y-1">
                <span className="text-[10px] text-stone-400 font-sans block">BatchRegistry Smart Contract</span>
                <span className="break-all font-semibold text-stone-800">{CONTRACT_ADDRESSES.batchRegistry}</span>
              </div>

              {(authenticBatch.onchain_tx_hash || authenticBatch.onchainTxHash) && (
                <div className="p-3 rounded-xl bg-cream-50 border border-cream-200 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-stone-400 font-sans">
                    <span>Transaction Hash</span>
                    <button
                      onClick={() => copyToClipboard(authenticBatch.onchain_tx_hash || authenticBatch.onchainTxHash, 'tx')}
                      className="text-stone-500 hover:text-stone-800 flex items-center space-x-0.5"
                    >
                      {copiedTx ? <Check className="w-3 h-3 text-forest-700" /> : <Copy className="w-3 h-3" />}
                      <span className="text-[10px]">{copiedTx ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${authenticBatch.onchain_tx_hash || authenticBatch.onchainTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-semibold text-forest-800 hover:underline block"
                  >
                    {authenticBatch.onchain_tx_hash || authenticBatch.onchainTxHash}
                  </a>
                </div>
              )}

              {onchainData.anchoredAt && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-cream-50 border border-cream-200">
                  <span className="text-[10px] text-stone-400 font-sans">Anchored At:</span>
                  <span className="font-bold text-stone-800 font-sans text-[11px]">{new Date(onchainData.anchoredAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <QRPreviewModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        batchId={currentBatchId}
        productTitle="Artisanal Pure Palm Jaggery (Karupatti)"
        producerName="PalmChain Verified Producer"
      />
    </div>
  );
}
