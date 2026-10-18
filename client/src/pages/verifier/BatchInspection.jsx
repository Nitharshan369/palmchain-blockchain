import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FileCheck2, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Droplets, 
  Flame, 
  MapPin, 
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { mockBatches, SIMULATION_NOTICE } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function BatchInspection() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const currentBatchId = (batchId || 'PJG-2026-004').toUpperCase();
  const batch = mockBatches[currentBatchId] || mockBatches['PJG-2026-004'];

  const [assayForm, setAssayForm] = useState({
    moisturePercent: '5.8',
    sucrosePurity: '84.2',
    reducingSugarsPercent: '8.4',
    caneSugarAdulteration: 'Negative (0.0%)',
    chemicalBleach: 'Negative (0.0 ppm)',
    sensoryVerdict: 'Authentic Smoky-Sweet Caramel Aroma, Uniform Color',
    certifierNotes: 'Sample inspected under refractometry and chromatography. Zero cane sugar or synthetic clarifying additives detected. Batch approved for export and certified pure.',
    reportId: `AR-2026-TK-${Math.floor(Math.random() * 8000) + 1000}`,
  });

  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [attestationSuccess, setAttestationSuccess] = useState(false);
  const [attestationVerdict, setAttestationVerdict] = useState('certified');

  const handleApprove = () => {
    setConfirmApproveOpen(false);
    setAttestationVerdict('certified');
    setAttestationSuccess(true);
  };

  const handleReject = () => {
    setConfirmRejectOpen(false);
    setAttestationVerdict('flagged');
    setAttestationSuccess(true);
  };

  return (
    <div className="py-6 space-y-8 max-w-5xl mx-auto">
      {/* Simulation Notice Banner */}
      <div className="p-4 rounded-2xl bg-gold-50 border border-gold-300 text-gold-950 flex items-center space-x-2.5 text-xs shadow-xs">
        <Info className="w-4 h-4 text-gold-700 shrink-0" />
        <span>
          <strong>{SIMULATION_NOTICE.badgeText}:</strong> In Phase 1 frontend preview, signing certification simulates an authorized verifier invoking the smart contract function <code className="font-mono">certifyBatch({batch.batchId}, true)</code>.
        </span>
      </div>

      {/* Back button & Title */}
      <div className="space-y-3">
        <Link
          to="/verifier/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-stone-500 hover:text-forest-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Inspection Queue</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                Laboratory Assay Form
              </span>
              <StatusBadge status={attestationSuccess ? attestationVerdict : batch.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
              Quality Certification: {batch.batchId}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Producer: {batch.producerName} • Origin: {batch.farmName}
            </p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {attestationSuccess && (
        <div
          className={`p-6 rounded-3xl text-white shadow-warm space-y-3 animate-in fade-in duration-200 ${
            attestationVerdict === 'certified' ? 'bg-forest-800' : 'bg-rose-800'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
              {attestationVerdict === 'certified' ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {attestationVerdict === 'certified'
                  ? 'Batch Successfully Certified & Attested On-Chain!'
                  : 'Batch Formally Flagged & Rejected!'}
              </h3>
              <p className="text-xs opacity-90 font-mono">
                Report Ref: {assayForm.reportId} • Smart Contract Function: certifyBatch()
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              to={`/verify/${batch.batchId}`}
              className="inline-flex items-center space-x-1 px-4 py-2 rounded-xl bg-white text-stone-900 font-bold text-xs shadow-xs"
            >
              <span>View Public Batch Passport</span>
            </Link>
          </div>
        </div>
      )}

      {/* Production Specifications Preview Card */}
      <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-4">
        <h3 className="text-sm font-bold text-earth-950 border-b border-cream-100 pb-2">
          Producer Declared Batch Attributes
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-0.5">
            <span className="text-stone-400">Harvest Date</span>
            <p className="font-bold text-earth-950">{batch.harvestDate}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-stone-400">Reported Sap Brix</span>
            <p className="font-mono font-bold text-blue-700">{batch.sapBrix}° Bx</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-stone-400">Peak Boiling Temp</span>
            <p className="font-mono font-bold text-amber-700">{batch.boilingTempCelsius}°C</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-stone-400">Declared Output</span>
            <p className="font-mono font-bold text-earth-950">{batch.outputKg} kg</p>
          </div>
        </div>
      </div>

      {/* Lab Chemical & Assay Inputs */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-200 shadow-warm space-y-6">
        <div className="border-b border-cream-100 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-earth-950">
              Chemical Assay & Adulteration Testing Form
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-stone-500">
            NABL Protocol TC-8891
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Moisture Content (%) <span className="text-stone-400">(Std: &lt;8%)</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={assayForm.moisturePercent}
              onChange={(e) => setAssayForm({ ...assayForm, moisturePercent: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono font-bold focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Natural Palm Sucrose (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={assayForm.sucrosePurity}
              onChange={(e) => setAssayForm({ ...assayForm, sucrosePurity: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono font-bold focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Reducing Sugars (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={assayForm.reducingSugarsPercent}
              onChange={(e) => setAssayForm({ ...assayForm, reducingSugarsPercent: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono font-bold focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Cane Sugar Adulteration (HPLC)
            </label>
            <select
              value={assayForm.caneSugarAdulteration}
              onChange={(e) => setAssayForm({ ...assayForm, caneSugarAdulteration: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-white font-semibold focus:outline-hidden"
            >
              <option value="Negative (0.0%)">Negative (0.0% Adulteration - Pure)</option>
              <option value="Positive (>5.0% Detected)">Positive (&gt;5.0% Cane Sugar Detected)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Synthetic Bleaching (Sulfur/Hydrosulfite)
            </label>
            <select
              value={assayForm.chemicalBleach}
              onChange={(e) => setAssayForm({ ...assayForm, chemicalBleach: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-white font-semibold focus:outline-hidden"
            >
              <option value="Negative (0.0 ppm)">Negative (0.0 ppm - No Chemicals)</option>
              <option value="Positive (Sulfites Detected)">Positive (Sulfites Detected)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Official Lab Report ID
            </label>
            <input
              type="text"
              value={assayForm.reportId}
              onChange={(e) => setAssayForm({ ...assayForm, reportId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-semibold text-stone-700 mb-1">
              Sensory Verdict & Visual Inspection
            </label>
            <input
              type="text"
              value={assayForm.sensoryVerdict}
              onChange={(e) => setAssayForm({ ...assayForm, sensoryVerdict: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-semibold text-stone-700 mb-1">
              Accreditation & Certification Notes
            </label>
            <textarea
              rows="3"
              value={assayForm.certifierNotes}
              onChange={(e) => setAssayForm({ ...assayForm, certifierNotes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-cream-100 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmRejectOpen(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Flag / Reject Adulterated Batch</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmApproveOpen(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-gold-300" />
            <span>Sign & Certify on Ethereum Sepolia</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={confirmApproveOpen}
        title="Approve & Certify Batch on Sepolia"
        message={`Are you sure you want to certify batch ${batch.batchId} with a verified 0.0% cane sugar adulteration rating? This will sign the attestation into the PalmChainRegistry contract.`}
        confirmLabel="Confirm Certification"
        cancelLabel="Review"
        onConfirm={handleApprove}
        onCancel={() => setConfirmApproveOpen(false)}
      />

      <ConfirmModal
        isOpen={confirmRejectOpen}
        title="Flag and Reject Batch"
        message={`Flagging batch ${batch.batchId} will publicly mark this batch as uncertified on the digital passport and prevent consumer sale. Are you sure?`}
        confirmLabel="Confirm Rejection"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleReject}
        onCancel={() => setConfirmRejectOpen(false)}
      />
    </div>
  );
}
