import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  Flame, 
  Droplets, 
  ExternalLink,
  Copy,
  Check,
  Search,
  Layers,
  FileText,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { mockBatches, SIMULATION_NOTICE } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import ProductionTimeline from '../../components/common/ProductionTimeline';
import QRPreviewModal from '../../components/common/QRPreviewModal';

export default function PublicVerification() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const currentBatchId = (batchId || 'PJG-2026-001').toUpperCase();
  const batch = mockBatches[currentBatchId] || mockBatches['PJG-2026-001'];

  const [searchInput, setSearchInput] = useState(currentBatchId);
  const [tamperSimulated, setTamperSimulated] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Canonical and Tampered SHA-256 hash simulation
  const canonicalHash = batch.sha256Hash;
  const tamperedHash = '99f82d591b7e416a23b9d0482fc912384a719c28e46927d8123ab498f21908ef';

  const currentComputedHash = tamperSimulated ? tamperedHash : canonicalHash;
  const isTamperFree = !tamperSimulated && batch.status === 'certified';

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

  return (
    <div className="py-6 space-y-8 max-w-5xl mx-auto">
      {/* Simulation Notice Banner (Rule: Never label mock data as authentic or blockchain-confirmed) */}
      <div className="p-4 rounded-2xl bg-gold-50 border border-gold-300 text-gold-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center space-x-2.5">
          <Info className="w-4 h-4 text-gold-700 shrink-0" />
          <span>
            <strong>{SIMULATION_NOTICE.badgeText}:</strong> {SIMULATION_NOTICE.disclaimer}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold bg-gold-200/80 px-2 py-0.5 rounded border border-gold-300">
          Contract: PalmChainRegistry.sol
        </span>
      </div>

      {/* Header & Batch Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cream-200 pb-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cream-200 text-earth-800 uppercase tracking-wider">
            Public Digital Passport
          </span>
          <h1 className="text-3xl font-extrabold text-earth-950 mt-1">
            Palm-Jaggery Batch Verification
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Cryptographic SHA-256 integrity inspection & laboratory purity records.
          </p>
        </div>

        {/* Batch Lookup Input */}
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Batch ID..."
              className="pl-3 pr-8 py-2 rounded-xl border border-cream-300 bg-white text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-gold-400 focus:outline-hidden w-44 sm:w-52"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs transition-colors"
          >
            Lookup
          </button>
        </form>
      </div>

      {/* Verification Status Card */}
      <div
        className={`rounded-3xl p-6 sm:p-7 border transition-all ${
          isTamperFree
            ? 'bg-forest-50/70 border-forest-300 text-forest-950 shadow-warm'
            : 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-warm'
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
                    ? 'Cryptographic Integrity Validated'
                    : 'Integrity Mismatch Detected!'}
                </h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/80 border border-current">
                  {batch.batchId}
                </span>
              </div>
              <p className="text-xs opacity-90 max-w-2xl leading-relaxed">
                {isTamperFree
                  ? 'Canonical metadata SHA-256 digest precisely matches the immutable on-chain record on Ethereum Sepolia.'
                  : 'Computed payload hash does NOT match the immutable on-chain record. Batch data has been modified post-anchoring.'}
              </p>
            </div>
          </div>

          {/* Tamper Test Toggle */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
            <button
              onClick={() => setTamperSimulated(!tamperSimulated)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                tamperSimulated
                  ? 'bg-rose-700 text-white'
                  : 'bg-white text-stone-800 border border-current hover:bg-cream-100'
              }`}
            >
              {tamperSimulated ? '⚠️ Revert Tamper Test' : '🧪 Test Tamper Detection'}
            </button>
            <span className="text-[10px] text-stone-500 font-mono">
              Status: {isTamperFree ? 'Tamper-Free Authenticity' : 'REJECTED / UNTRUSTED'}
            </span>
          </div>
        </div>

        {/* Cryptographic Comparison Section */}
        <div className="mt-6 pt-5 border-t border-current/20 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-white/90 p-3.5 rounded-2xl border border-current/20 space-y-1">
            <div className="text-[11px] font-sans font-semibold text-stone-500">
              On-Chain Anchor Hash (Ethereum Sepolia)
            </div>
            <div className="break-all font-bold text-stone-900 select-all">
              {canonicalHash}
            </div>
          </div>

          <div className="bg-white/90 p-3.5 rounded-2xl border border-current/20 space-y-1">
            <div className="text-[11px] font-sans font-semibold text-stone-500 flex items-center justify-between">
              <span>Client Computed Payload Hash (SHA-256)</span>
              <button
                onClick={() => copyToClipboard(currentComputedHash, 'hash')}
                className="text-stone-500 hover:text-stone-900 flex items-center space-x-1"
              >
                {copiedHash ? <Check className="w-3 h-3 text-forest-700" /> : <Copy className="w-3 h-3" />}
                <span className="font-sans text-[10px]">{copiedHash ? 'Copied' : 'Copy'}</span>
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

      {/* Main Grid: Details, Blockchain Transaction, & Lab Assay */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Production Attributes & Lab Assay */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Batch Parameters Card */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-5">
            <h3 className="text-base font-bold text-earth-950 border-b border-cream-100 pb-3 flex items-center justify-between">
              <span>Production Batch Specifications</span>
              <span className="text-xs font-mono font-normal text-stone-500">
                Format: {batch.form}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-stone-400">Cooperative Producer</span>
                <p className="font-bold text-earth-950 text-sm">{batch.producerName}</p>
                <p className="font-mono text-[10px] text-stone-500 truncate">{batch.producerAddress}</p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400">Grove Coordinates</span>
                <p className="font-bold text-earth-950 flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-forest-700 mr-1 shrink-0" />
                  <span>{batch.farmName}</span>
                </p>
                <p className="font-mono text-[10px] text-stone-500">{batch.coordinates}</p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400">Harvest & Extraction Date</span>
                <p className="font-bold text-earth-950 flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-stone-500 mr-1" />
                  <span>{batch.harvestDate}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400">Processing & Boiling Date</span>
                <p className="font-bold text-earth-950 flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-stone-500 mr-1" />
                  <span>{batch.processingDate}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400">Neera Sap Sugar Content</span>
                <p className="font-bold text-earth-950 flex items-center text-sm">
                  <Droplets className="w-4 h-4 text-blue-600 mr-1" />
                  <span>{batch.sapBrix}° Brix</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400">Biomass Pan Boiling Peak</span>
                <p className="font-bold text-earth-950 flex items-center text-sm">
                  <Flame className="w-4 h-4 text-amber-600 mr-1" />
                  <span>{batch.boilingTempCelsius}°C</span>
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-stone-400">Natural Clarification Agents Used</span>
                <p className="font-medium text-stone-800">{batch.clarificationAgent}</p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-stone-400">Source Tree Registry IDs</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {batch.sourceTreeIds && batch.sourceTreeIds.map((tid, idx) => (
                    <span key={idx} className="font-mono text-[11px] px-2 py-0.5 rounded bg-cream-100 text-earth-900 border border-cream-200">
                      {tid}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Laboratory Quality Assay Report Card */}
          {batch.labAssay ? (
            <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cream-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center text-forest-800">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-earth-950 text-sm">NABL Accredited Quality Assay</h3>
                    <p className="text-[11px] text-stone-500">{batch.certifierOrganization}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 border border-forest-200">
                  Purity Verified (Passed)
                </span>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed italic bg-cream-50 p-3 rounded-xl border border-cream-200">
                "{batch.certificationNotes}"
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-cream-50/70 border border-cream-200">
                  <span className="text-stone-500 text-[10px] block">Moisture Content</span>
                  <span className="text-base font-bold text-forest-900 font-mono">{batch.labAssay.moisturePercent}%</span>
                  <span className="text-[10px] text-stone-400 block font-sans">Std: &lt; 8.0%</span>
                </div>

                <div className="p-3 rounded-xl bg-cream-50/70 border border-cream-200">
                  <span className="text-stone-500 text-[10px] block">Sucrose Purity</span>
                  <span className="text-base font-bold text-forest-900 font-mono">{batch.labAssay.sucrosePurity}%</span>
                  <span className="text-[10px] text-stone-400 block font-sans">Natural Palm Sucrose</span>
                </div>

                <div className="p-3 rounded-xl bg-cream-50/70 border border-cream-200">
                  <span className="text-stone-500 text-[10px] block">Cane Sugar Adulteration</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">{batch.labAssay.caneSugarAdulteration}</span>
                  <span className="text-[10px] text-stone-400 block font-sans">Chromatography</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm text-center space-y-2">
              <Clock className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="font-bold text-sm text-earth-950">Laboratory Testing in Queue</h4>
              <p className="text-xs text-stone-500">
                This batch has been registered by the producer and is scheduled for independent lab assay.
              </p>
            </div>
          )}

          {/* Full Production Lifecycle Timeline */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-200 shadow-warm space-y-6">
            <div className="border-b border-cream-100 pb-3">
              <h3 className="font-bold text-base text-earth-950">Traceable Lifecycle Stages</h3>
              <p className="text-xs text-stone-500 mt-0.5">Chronological record signed by grove operators.</p>
            </div>

            <ProductionTimeline timeline={batch.timeline} />
          </div>
        </div>

        {/* Right Col: QR Passport & Blockchain Transaction Info */}
        <div className="space-y-6">
          {/* QR Passport Box */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm text-center space-y-4">
            <h3 className="font-bold text-earth-950 text-xs uppercase tracking-wider">
              Batch Digital Passport QR
            </h3>

            <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200 inline-block shadow-inner mx-auto">
              <QRCodeSVG
                value={`https://palmchain.io/verify/${batch.batchId}`}
                size={160}
                level="H"
                includeMargin={true}
              />
            </div>

            <div>
              <p className="text-xs font-mono font-bold text-earth-950">{batch.batchId}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Scan with any smartphone camera to inspect this verification record.
              </p>
            </div>

            <button
              onClick={() => setQrModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl border border-cream-300 hover:bg-cream-100 text-xs font-semibold text-stone-700 transition-colors flex items-center justify-center space-x-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Packaging Print Options</span>
            </button>
          </div>

          {/* Blockchain Sepolia Transaction Data */}
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
                <span className="font-bold text-forest-800">{batch.networkName}</span>
              </div>

              <div className="p-3 rounded-xl bg-cream-50 border border-cream-200 space-y-1">
                <span className="text-[10px] text-stone-400 font-sans block">Smart Contract Address</span>
                <span className="break-all font-semibold text-stone-800">{batch.contractAddress}</span>
              </div>

              <div className="p-3 rounded-xl bg-cream-50 border border-cream-200 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-stone-400 font-sans">
                  <span>Transaction Hash</span>
                  <button
                    onClick={() => copyToClipboard(batch.onchainTxHash, 'tx')}
                    className="text-stone-500 hover:text-stone-800 flex items-center space-x-0.5"
                  >
                    {copiedTx ? <Check className="w-3 h-3 text-forest-700" /> : <Copy className="w-3 h-3" />}
                    <span className="text-[10px]">{copiedTx ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <span className="break-all font-semibold text-stone-800">{batch.onchainTxHash}</span>
              </div>

              {batch.onchainBlockNumber && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-cream-50 border border-cream-200">
                  <span className="text-[10px] text-stone-400 font-sans">Block Number:</span>
                  <span className="font-bold text-forest-800">#{batch.onchainBlockNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <QRPreviewModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        batchId={batch.batchId}
        productTitle={batch.productTitle}
        producerName={batch.producerName}
      />
    </div>
  );
}
