import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, Printer, Download, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QRPreviewModal({ isOpen, onClose, batchId, productTitle, producerName }) {
  const [copied, setCopied] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState(false);

  if (!isOpen || !batchId) return null;

  const verifyUrl = `${window.location.origin}/verify/${batchId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintSimulation = () => {
    window.print();
  };

  const handleDownloadSimulation = () => {
    setDownloadNotice(true);
    setTimeout(() => setDownloadNotice(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className="bg-white rounded-3xl border border-cream-200 shadow-2xl max-w-sm w-full p-6 space-y-5 text-center"
      >
        <div className="flex items-center justify-between pb-1 border-b border-cream-100">
          <div className="flex items-center space-x-2 text-forest-800">
            <QrCode className="w-5 h-5 text-forest-700" />
            <span id="qr-modal-title" className="font-bold text-sm text-earth-950">
              Digital Passport QR
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-stone-400 hover:text-stone-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-sm text-earth-950 truncate">{productTitle || 'Palm Jaggery Batch'}</h4>
          <p className="text-xs text-stone-500 font-mono font-semibold">{batchId}</p>
          {producerName && (
            <p className="text-[11px] text-stone-400 truncate">{producerName}</p>
          )}
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200 inline-block shadow-inner mx-auto">
          <QRCodeSVG
            value={verifyUrl}
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>

        <p className="text-[11px] text-stone-500 leading-relaxed px-2">
          Affix this QR code to physical product packaging. Customers can scan to verify tamper-proof production parameters.
        </p>

        {downloadNotice && (
          <div className="p-2 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 text-[11px]">
            High-resolution printable SVG/PNG generated successfully!
          </div>
        )}

        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border border-cream-200 hover:bg-cream-100 text-stone-700 font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-forest-700" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
              <span>{copied ? 'Copied' : 'Copy URL'}</span>
            </button>

            <button
              onClick={handlePrintSimulation}
              className="inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border border-cream-200 hover:bg-cream-100 text-stone-700 font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              <span>Print Label</span>
            </button>
          </div>

          <Link
            to={`/verify/${batchId}`}
            onClick={onClose}
            className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Open Public Verification Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
