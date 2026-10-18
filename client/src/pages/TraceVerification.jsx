import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  QrCode, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Flame, 
  Droplets, 
  ExternalLink,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';

export default function TraceVerification() {
  const [copied, setCopied] = useState(false);
  const [tamperSimulated, setTamperSimulated] = useState(false);

  // Sample production batch specification
  const initialBatch = {
    batchNumber: 'PJG-2026-001',
    productName: 'Artisanal Pure Palm Jaggery (Karupatti)',
    producerName: 'Murugan Natural Jaggery Coop',
    farmLocation: 'Tenkasi, Tamil Nadu, India (8.9591° N, 77.3150° E)',
    harvestDate: '2026-03-10',
    processingDate: '2026-03-11',
    sapBrix: 14.5,
    clarificationAgent: 'Natural Okra (Bhindi) extract',
    boilingTempCelsius: 118.5,
    form: 'Solid Block (Molded in Coconut Shells)',
    totalQuantityKg: 500,
    certifier: 'Dr. Priya Shankar (Southern Agro-Quality Testing Agency)',
    certificationStatus: 'Lab Certified 100% Pure',
    onchainContract: 'PalmChainRegistry.sol (Sepolia)',
  };

  // Canonical SHA-256 hash
  const canonicalHash = '0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const tamperedHash = '0x8f2d591b7e416a23b9d0482fc912384a719c28e46927d8123ab498f21908ef12';

  const currentHash = tamperSimulated ? tamperedHash : canonicalHash;
  const isMatch = !tamperSimulated;

  const copyHash = () => {
    navigator.clipboard.writeText(currentHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-jaggery-100 text-jaggery-800 uppercase tracking-wider">
            Consumer Traceability Portal
          </span>
          <h1 className="text-3xl font-extrabold text-stone-900 mt-2">
            Batch Verification & Digital Passport
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Verify palm-jaggery purity, origin coordinates, and tamper-proof SHA-256 blockchain integrity.
          </p>
        </div>

        {/* Tamper Simulation Toggle */}
        <div className="flex items-center space-x-3 bg-stone-100 p-2 rounded-xl border border-stone-200">
          <span className="text-xs font-medium text-stone-700">Tamper Simulation:</span>
          <button
            onClick={() => setTamperSimulated(!tamperSimulated)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tamperSimulated
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-emerald-600 text-white shadow-xs'
            }`}
          >
            {tamperSimulated ? 'Tamper Active (Mismatch)' : 'Normal (Authentic)'}
          </button>
        </div>
      </div>

      {/* Verification Status Card */}
      <div
        className={`rounded-2xl p-6 border transition-all ${
          isMatch
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
            : 'bg-rose-50/80 border-rose-300 text-rose-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isMatch ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {isMatch ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold">
                  {isMatch ? 'Cryptographic Integrity Validated' : 'Integrity Mismatch Detected!'}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/70 border border-current">
                  {initialBatch.batchNumber}
                </span>
              </div>
              <p className="text-xs opacity-90 mt-0.5">
                {isMatch
                  ? 'Canonical SHA-256 hash matches the on-chain anchor on Ethereum Sepolia.'
                  : 'Computed payload hash does NOT match the immutable on-chain record! Possible data tampering.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/90 border border-current font-mono">
              Status: {isMatch ? '100% Pure & Certified' : 'FLAGGED'}
            </span>
          </div>
        </div>

        {/* Hash Comparison Bar */}
        <div className="mt-6 pt-4 border-t border-current/20 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-white/80 p-3 rounded-lg border border-current/20">
            <div className="text-stone-500 font-sans font-medium text-[11px] mb-1">
              On-Chain Anchor Hash (Sepolia Contract)
            </div>
            <div className="break-all font-semibold text-stone-800">{canonicalHash}</div>
          </div>
          <div className="bg-white/80 p-3 rounded-lg border border-current/20">
            <div className="text-stone-500 font-sans font-medium text-[11px] mb-1 flex items-center justify-between">
              <span>Client Computed Hash (SHA-256)</span>
              <button
                onClick={copyHash}
                className="text-stone-500 hover:text-stone-800 flex items-center space-x-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span className="font-sans text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className={`break-all font-semibold ${isMatch ? 'text-emerald-700' : 'text-rose-700'}`}>
              {currentHash}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Details & QR Passport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Product & Production Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-5">
            <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
              Production Batch Attributes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-stone-500">Producer & Cooperative</span>
                <p className="font-semibold text-stone-900">{initialBatch.producerName}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-stone-500">Origin Grove Coordinates</span>
                <p className="font-semibold text-stone-900 flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-palm-700 mr-1 shrink-0" />
                  <span className="truncate">{initialBatch.farmLocation}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-stone-500">Harvest & Extraction Date</span>
                <p className="font-semibold text-stone-900 flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-stone-500 mr-1" />
                  <span>{initialBatch.harvestDate}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-stone-500">Processing & Boiling Date</span>
                <p className="font-semibold text-stone-900 flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-stone-500 mr-1" />
                  <span>{initialBatch.processingDate}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-stone-500">Sap Brix (Sugar Purity)</span>
                <p className="font-semibold text-stone-900 flex items-center">
                  <Droplets className="w-3.5 h-3.5 text-blue-600 mr-1" />
                  <span>{initialBatch.sapBrix}° Brix (Natural High Quality)</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-stone-500">Max Boiling Temperature</span>
                <p className="font-semibold text-stone-900 flex items-center">
                  <Flame className="w-3.5 h-3.5 text-amber-600 mr-1" />
                  <span>{initialBatch.boilingTempCelsius}°C</span>
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs text-stone-500">Natural Clarification Agent</span>
                <p className="font-semibold text-stone-900">{initialBatch.clarificationAgent}</p>
              </div>
            </div>
          </div>

          {/* Traceability Timeline */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-5">
            <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
              Traceability Stages (Audited)
            </h3>

            <ol className="relative border-l border-palm-200 ml-3 space-y-6">
              <li className="ml-6">
                <span className="absolute flex items-center justify-center w-6 h-6 bg-palm-100 rounded-full -left-3 ring-4 ring-white text-palm-700">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <h4 className="font-bold text-stone-900 text-sm">Neera Sap Tapping at Dawn</h4>
                <p className="text-xs text-stone-500 mt-0.5">Tapped in traditional lime-lined earthen pots to prevent natural fermentation.</p>
              </li>

              <li className="ml-6">
                <span className="absolute flex items-center justify-center w-6 h-6 bg-palm-100 rounded-full -left-3 ring-4 ring-white text-palm-700">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <h4 className="font-bold text-stone-900 text-sm">Clarification & Pan Boiling</h4>
                <p className="text-xs text-stone-500 mt-0.5">Slow simmered over palm frond biomass fuel; clarified with natural plant mucilage.</p>
              </li>

              <li className="ml-6">
                <span className="absolute flex items-center justify-center w-6 h-6 bg-palm-100 rounded-full -left-3 ring-4 ring-white text-palm-700">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <h4 className="font-bold text-stone-900 text-sm">Solidification in Coconut Shells</h4>
                <p className="text-xs text-stone-500 mt-0.5">Naturally cured into traditional half-spherical Karupatti blocks.</p>
              </li>

              <li className="ml-6">
                <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-4 ring-white text-blue-700">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h4 className="font-bold text-stone-900 text-sm">Certified by Accredited Lab</h4>
                <p className="text-xs text-stone-500 mt-0.5">{initialBatch.certifier} — 100% Purity Passed.</p>
              </li>
            </ol>
          </div>
        </div>

        {/* Right: QR Code Digital Passport */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs text-center space-y-4">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
              Batch QR Passport
            </h3>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 inline-block shadow-inner">
              <QRCodeSVG
                value={`http://localhost:5173/trace/${initialBatch.batchNumber}`}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div>
              <p className="text-xs font-mono font-bold text-stone-800">{initialBatch.batchNumber}</p>
              <p className="text-[11px] text-stone-500 mt-1">
                Scan with any smartphone camera to inspect this verified digital certificate.
              </p>
            </div>
          </div>

          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3 text-xs text-stone-600">
            <h4 className="font-bold text-stone-900">Blockchain Guarantee</h4>
            <p className="leading-relaxed">
              Every production batch is tied to an immutable cryptographic anchor on the Ethereum Sepolia network. The producer cannot alter harvest dates or test results post-anchoring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
