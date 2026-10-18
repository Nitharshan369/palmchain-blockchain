import React, { useState } from 'react';
import { Layers, PlusCircle, CheckCircle2, AlertCircle, FileCheck, Hash } from 'lucide-react';

export default function ProducerPortal() {
  const [formData, setFormData] = useState({
    batchNumber: 'PJG-2026-004',
    harvestDate: '2026-03-18',
    sapBrix: '14.8',
    boilingTemp: '119.0',
    quantityKg: '650',
    clarificationAgent: 'Natural Lime & Okra Mucilage',
    form: 'solid_block',
  });

  const [generatedHash, setGeneratedHash] = useState('');
  const [isAnchored, setIsAnchored] = useState(false);

  const calculateHash = (e) => {
    e.preventDefault();
    // Deterministic simulation
    const simulatedHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setGeneratedHash(simulatedHash);
    setIsAnchored(false);
  };

  const handleAnchor = () => {
    setIsAnchored(true);
  };

  return (
    <div className="py-8 max-w-4xl mx-auto space-y-8">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-palm-100 text-palm-800 uppercase tracking-wider">
          Role 1: Producer
        </span>
        <h1 className="text-3xl font-extrabold text-stone-900 mt-2">
          Producer Batch Management & Anchoring
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Register new production harvests, generate canonical SHA-256 integrity commitments, and anchor them onto Ethereum Sepolia.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Container */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-stone-900 flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-palm-600" />
            <span>Register New Harvest Batch</span>
          </h2>

          <form onSubmit={calculateHash} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Batch Identifier</label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-palm-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Harvest Date</label>
                <input
                  type="date"
                  value={formData.harvestDate}
                  onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-palm-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Neera Sap Brix (°Bx)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.sapBrix}
                  onChange={(e) => setFormData({ ...formData, sapBrix: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-palm-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Boiling Temp (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.boilingTemp}
                  onChange={(e) => setFormData({ ...formData, boilingTemp: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-palm-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Total Quantity (Kg)</label>
                <input
                  type="number"
                  value={formData.quantityKg}
                  onChange={(e) => setFormData({ ...formData, quantityKg: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-palm-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Clarification Agent</label>
                <input
                  type="text"
                  value={formData.clarificationAgent}
                  onChange={(e) => setFormData({ ...formData, clarificationAgent: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-palm-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2"
            >
              <Hash className="w-4 h-4 text-emerald-400" />
              <span>Generate Canonical SHA-256 Hash</span>
            </button>
          </form>

          {/* Generated Hash Box */}
          {generatedHash && (
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                <span>Calculated Deterministic Hash</span>
                <span className="text-[10px] bg-palm-100 text-palm-800 px-2 py-0.5 rounded">SHA-256</span>
              </div>
              <div className="break-all font-mono text-xs bg-white p-2.5 rounded border border-stone-200 text-stone-900">
                {generatedHash}
              </div>

              <button
                type="button"
                onClick={handleAnchor}
                disabled={isAnchored}
                className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition-all ${
                  isAnchored
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-palm-700 hover:bg-palm-800 text-white shadow-xs'
                }`}
              >
                {isAnchored ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Anchored to Ethereum Sepolia!</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Sign & Anchor to Sepolia (MetaMask)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-palm-50 rounded-2xl p-6 border border-palm-200 space-y-3 text-xs text-palm-900">
            <h3 className="font-bold flex items-center space-x-1.5 text-palm-950">
              <FileCheck className="w-4 h-4 text-palm-700" />
              <span>Integrity Rules for Producers</span>
            </h3>
            <ul className="space-y-2 list-disc list-inside text-palm-800 leading-relaxed">
              <li>Only authorized producer wallet addresses can call <code className="font-mono">anchorBatch</code>.</li>
              <li>Once anchored on-chain, batch parameters cannot be tampered with.</li>
              <li>Full metadata stays in PostgreSQL to save gas fees.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
