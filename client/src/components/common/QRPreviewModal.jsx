import React, { useState, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Printer, 
  Download, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  FileDown, 
  Tag, 
  Sparkles,
  MapPin,
  Calendar,
  Scale
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QRPreviewModal({ 
  isOpen, 
  onClose, 
  batchId, 
  productTitle, 
  producerName,
  groveLocation,
  productionDate,
  netWeight,
  sha256Hash 
}) {
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'label'
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState('');
  const canvasRef = useRef(null);

  if (!isOpen || !batchId) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://palmchain.io';
  const verifyUrl = `${currentHost}/verify/${batchId}`;
  const shortHash = sha256Hash ? `${sha256Hash.slice(0, 10)}...${sha256Hash.slice(-8)}` : 'On-Chain Anchored';

  // Copy Verification URL
  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Vector SVG
  const handleDownloadSvg = () => {
    try {
      const svg = document.getElementById(`qr-svg-${batchId}`);
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `PalmChain-${batchId}-QR.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
      setDownloadSuccess('Vector SVG downloaded successfully');
      setTimeout(() => setDownloadSuccess(''), 3000);
    } catch (err) {
      console.error('SVG download failed:', err);
    }
  };

  // Download High-Resolution PNG
  const handleDownloadPng = () => {
    try {
      const canvas = document.getElementById(`qr-canvas-${batchId}`);
      if (!canvas) return;

      // Draw onto a branded composite canvas with border and batch label
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');
      exportCanvas.width = 1200;
      exportCanvas.height = 1400;

      // Fill background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1200, 1400);

      // Decorative Forest border
      ctx.strokeStyle = '#1b382b';
      ctx.lineWidth = 16;
      ctx.strokeRect(30, 30, 1140, 1340);

      // Header Text
      ctx.fillStyle = '#1b382b';
      ctx.font = 'bold 54px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PALMCHAIN DIGITAL PASSPORT', 600, 120);

      ctx.fillStyle = '#6b7280';
      ctx.font = '32px sans-serif';
      ctx.fillText('Scan to inspect immutable on-chain purity record', 600, 175);

      // Draw the QR code in center
      ctx.drawImage(canvas, 150, 240, 900, 900);

      // Footer Information
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 44px monospace';
      ctx.fillText(batchId, 600, 1210);

      ctx.fillStyle = '#475569';
      ctx.font = '28px sans-serif';
      ctx.fillText(productTitle || 'Artisanal Pure Palmyrah Jaggery', 600, 1260);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('✓ Ethereum Sepolia Anchored • NABL Quality Certified', 600, 1310);

      const pngUrl = exportCanvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `PalmChain-${batchId}-Passport-HD.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setDownloadSuccess('High-Resolution 1200x1400 PNG downloaded');
      setTimeout(() => setDownloadSuccess(''), 3000);
    } catch (err) {
      console.error('PNG download failed:', err);
    }
  };

  // Print-Friendly Packaging Label Trigger
  const handlePrintLabel = () => {
    window.print();
  };

  return (
    <>
      {/* ─── Screen Modal Dialog ─────────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150 print:hidden">
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          className="bg-white rounded-3xl border border-cream-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 text-center overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-cream-100">
            <div className="flex items-center space-x-2 text-forest-800">
              <QrCode className="w-5 h-5 text-forest-700" />
              <span id="qr-modal-title" className="font-bold text-sm text-earth-950">
                Packaging QR & Print Passport
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-cream-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex rounded-2xl bg-cream-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'qr'
                  ? 'bg-white text-forest-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Passport</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('label')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'label'
                  ? 'bg-white text-forest-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Physical Label Preview</span>
            </button>
          </div>

          {/* Tab 1: QR Code & Direct Downloads */}
          {activeTab === 'qr' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h4 className="font-bold text-base text-earth-950 truncate">
                  {productTitle || 'Heritage Palm Jaggery'}
                </h4>
                <p className="text-xs text-forest-800 font-mono font-bold">{batchId}</p>
                <p className="text-[11px] text-stone-400 truncate">
                  {producerName || 'PalmChain Verified Cooperative'}
                </p>
              </div>

              {/* QR Container */}
              <div className="p-4 bg-cream-50 rounded-3xl border border-cream-200 inline-block shadow-inner mx-auto relative group">
                <QRCodeSVG
                  id={`qr-svg-${batchId}`}
                  value={verifyUrl}
                  size={190}
                  level="H"
                  includeMargin={true}
                />
                {/* Hidden canvas for high-res PNG export */}
                <div className="hidden">
                  <QRCodeCanvas
                    id={`qr-canvas-${batchId}`}
                    ref={canvasRef}
                    value={verifyUrl}
                    size={900}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>

              <div className="px-3 py-1.5 bg-cream-50 rounded-xl border border-cream-200 text-[11px] font-mono text-stone-600 break-all select-all">
                {verifyUrl}
              </div>

              {downloadSuccess && (
                <div className="p-2.5 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-xs font-semibold flex items-center justify-center space-x-1.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 text-forest-600" />
                  <span>{downloadSuccess}</span>
                </div>
              )}

              {/* Download & Copy Buttons */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 rounded-xl border border-cream-300 hover:bg-cream-100 text-stone-700 font-semibold transition-colors flex items-center justify-center space-x-1 shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-forest-700" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                  <span>{copied ? 'Copied' : 'Copy URL'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="py-2.5 px-3 rounded-xl border border-cream-300 hover:bg-cream-100 text-stone-700 font-semibold transition-colors flex items-center justify-center space-x-1 shadow-xs"
                  title="Download Vector SVG"
                >
                  <FileDown className="w-3.5 h-3.5 text-forest-700" />
                  <span>SVG Vector</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="py-2.5 px-3 rounded-xl border border-cream-300 hover:bg-cream-100 text-stone-700 font-semibold transition-colors flex items-center justify-center space-x-1 shadow-xs"
                  title="Download 1200x1400 PNG"
                >
                  <Download className="w-3.5 h-3.5 text-forest-700" />
                  <span>High-Res PNG</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Print-Friendly Packaging Sticker Label Preview */}
          {activeTab === 'label' && (
            <div className="space-y-4 animate-in fade-in duration-200 text-left">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Packaging Sticker Preview (100mm × 75mm)
                </span>
                <span className="text-[10px] font-mono text-forest-800 bg-forest-50 px-2 py-0.5 rounded-full border border-forest-200">
                  Ready to Print
                </span>
              </div>

              {/* Physical Label Box Preview */}
              <div className="p-4 rounded-2xl bg-white border-2 border-forest-900 shadow-sm space-y-3 font-sans">
                {/* Label Header */}
                <div className="border-b-2 border-forest-900 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-xs text-forest-950 uppercase tracking-tight">
                      PalmChain Certified Pure Palmyrah Jaggery
                    </h3>
                    <p className="text-[10px] text-stone-600 font-medium">
                      Traditional Karupatti • 100% Cane-Sugar Free
                    </p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-forest-100 text-forest-900 uppercase">
                    Tamper-Evident
                  </span>
                </div>

                {/* Label Body with QR & Attributes */}
                <div className="flex items-center gap-4">
                  {/* QR Image */}
                  <div className="p-2 bg-cream-50 rounded-xl border border-stone-300 shrink-0">
                    <QRCodeSVG
                      value={verifyUrl}
                      size={100}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <div className="space-y-1 text-[11px] text-stone-800 min-w-0">
                    <div>
                      <span className="text-stone-400 text-[10px] block">Batch Identifier:</span>
                      <span className="font-mono font-bold text-xs text-forest-950">{batchId}</span>
                    </div>

                    <div className="truncate">
                      <span className="text-stone-400 text-[10px] block">Producer & Grove:</span>
                      <span className="font-semibold truncate">{producerName || 'Murugan Palmyrah Grove'}</span>
                    </div>

                    <div className="flex items-center space-x-3 text-[10px] text-stone-600 pt-0.5">
                      <span>Harvest: {productionDate || new Date().toISOString().split('T')[0]}</span>
                      {netWeight && <span>Net: {netWeight}kg</span>}
                    </div>

                    <div className="text-[9px] font-mono text-stone-500 truncate pt-0.5">
                      Anchor: {shortHash}
                    </div>
                  </div>
                </div>

                {/* Label Footer */}
                <div className="border-t border-stone-300 pt-1.5 flex items-center justify-between text-[9px] text-stone-500 font-medium">
                  <span>Scan QR to verify cryptographic proof</span>
                  <span className="font-bold text-forest-900">Ethereum Sepolia Mined</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={handlePrintLabel}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-xs"
                >
                  <Printer className="w-4 h-4 text-gold-300" />
                  <span>Print Packaging Label</span>
                </button>
              </div>
            </div>
          )}

          {/* Direct Verification Page Link */}
          <div className="pt-2 border-t border-cream-100">
            <Link
              to={`/verify/${batchId}`}
              onClick={onClose}
              className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-cream-100 hover:bg-cream-200 text-forest-900 font-bold text-xs transition-colors"
            >
              <span>Open Public Digital Passport Page</span>
              <ExternalLink className="w-3.5 h-3.5 text-forest-700" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── PRINT-ONLY PACKAGING LABEL CONTAINER ────────────────────────── */}
      {/* This container only appears during window.print() execution */}
      <div 
        id="printable-packaging-label"
        className="hidden print:block fixed inset-0 bg-white p-8 font-sans text-black z-[9999]"
      >
        <div className="border-4 border-black p-6 rounded-2xl max-w-md mx-auto space-y-4">
          <div className="border-b-2 border-black pb-3 text-center">
            <h1 className="text-xl font-black uppercase tracking-wider">PALMCHAIN CERTIFIED</h1>
            <h2 className="text-sm font-bold text-stone-800 uppercase">
              100% Pure Artisanal Palmyrah Jaggery
            </h2>
            <p className="text-xs text-stone-600">Zero Chemical Additives • Cane-Sugar Free</p>
          </div>

          <div className="flex items-center justify-between gap-6 py-2">
            <div className="p-2 border-2 border-black rounded-xl inline-block">
              <QRCodeSVG
                value={verifyUrl}
                size={140}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-[10px] text-stone-500 uppercase block font-bold">Batch ID</span>
                <span className="font-mono font-black text-sm">{batchId}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase block font-bold">Grove / Producer</span>
                <span className="font-bold">{producerName || 'Murugan Palmyrah Grove'}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase block font-bold">Production Date</span>
                <span>{productionDate || new Date().toISOString().split('T')[0]}</span>
              </div>
              <div className="font-mono text-[10px] text-stone-700 truncate max-w-xs">
                Hash: {shortHash}
              </div>
            </div>
          </div>

          <div className="border-t-2 border-black pt-3 text-center text-xs font-semibold space-y-1">
            <p>Scan QR code with smartphone to verify cryptographic authenticity on-chain</p>
            <p className="text-[10px] font-mono text-stone-600">Verified on Ethereum Sepolia Smart Contract</p>
          </div>
        </div>
      </div>
    </>
  );
}
