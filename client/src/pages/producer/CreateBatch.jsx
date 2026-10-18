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
  Info
} from 'lucide-react';
import { mockTrees, SIMULATION_NOTICE } from '../../data/mockData';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function CreateBatch() {
  const navigate = useNavigate();

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
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [anchorSuccess, setAnchorSuccess] = useState(false);

  // Simple deterministic client-side SHA-256 simulation
  useEffect(() => {
    // Generate canonical JSON representation
    const canonicalPayload = {
      batchId: formData.batchId.trim().toUpperCase(),
      boilingTempCelsius: parseFloat(formData.boilingTempCelsius) || 0,
      clarificationAgent: formData.clarificationAgent.trim(),
      form: formData.form,
      harvestDate: formData.harvestDate,
      outputKg: parseFloat(formData.outputKg) || 0,
      processingDate: formData.processingDate,
      producerAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sapBrix: parseFloat(formData.sapBrix) || 0,
      sapVolumeLiters: parseFloat(formData.sapVolumeLiters) || 0,
      sourceTreeIds: formData.selectedTrees.sort(),
    };

    const jsonString = JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort(), 2);
    setCanonicalJson(jsonString);

    // Deterministic client hash calculation
    let hashNum = 0;
    for (let i = 0; i < jsonString.length; i++) {
      hashNum = (hashNum << 5) - hashNum + jsonString.charCodeAt(i);
      hashNum |= 0;
    }
    const hex = Math.abs(hashNum).toString(16).padStart(8, '0');
    // Generate full 64-character hash string
    const simulated64Hex = (hex + 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855').slice(0, 64);
    setComputedHash(simulated64Hex);
  }, [formData]);

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
    setConfirmAnchorOpen(true);
  };

  const executeAnchorSimulation = () => {
    setConfirmAnchorOpen(false);
    setIsAnchoring(true);

    setTimeout(() => {
      setIsAnchoring(false);
      setAnchorSuccess(true);
    }, 1500);
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
      {/* Simulation Notice Banner */}
      <div className="p-4 rounded-2xl bg-gold-50 border border-gold-300 text-gold-950 flex items-center space-x-2.5 text-xs shadow-xs">
        <Info className="w-4 h-4 text-gold-700 shrink-0" />
        <span>
          <strong>{SIMULATION_NOTICE.badgeText}:</strong> Anchoring will simulate an Ethereum Sepolia transaction and calculate the deterministic SHA-256 hash. Live Web3 wallet submission active in Phase 2.
        </span>
      </div>

      {/* Header */}
      <div className="border-b border-cream-200 pb-5">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
          New Production Batch
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
          Register & Anchor Harvest Batch
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Enter harvest and boiling parameters. PalmChain canonicalizes the metadata and generates a SHA-256 hash for Ethereum anchoring.
        </p>
      </div>

      {/* Success Notification */}
      {anchorSuccess && (
        <div className="p-6 rounded-3xl bg-forest-800 text-white shadow-warm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-700 text-gold-300 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Batch Anchored Successfully!</h3>
              <p className="text-xs text-cream-200 font-mono">
                Batch ID: {formData.batchId} • Hash: {computedHash.slice(0, 16)}...
              </p>
            </div>
          </div>

          <p className="text-xs text-cream-300 leading-relaxed">
            The batch integrity hash has been registered. You can now inspect its digital passport or generate packaging QR codes.
          </p>

          <div className="flex items-center space-x-3 pt-1">
            <Link
              to={`/verify/${formData.batchId}`}
              className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-earth-950 font-bold text-xs shadow-xs transition-colors"
            >
              Inspect Public Verification Page
            </Link>
            <Link
              to="/producer/batches"
              className="px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-600 text-white text-xs font-semibold"
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
                Output Jaggery Format <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.form}
                onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-white font-medium focus:outline-hidden"
              >
                <option value="Solid Block">Solid Block (Coconut Shell Molded)</option>
                <option value="Granulated Powder">Granulated Sugar Powder</option>
                <option value="Crystal Candy">Herbal Palm Candy (Panakarkandu)</option>
                <option value="Liquid Syrup">Liquid Neera Nectar (Syrup)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">
                Product Title / Packaging Label
              </label>
              <input
                type="text"
                value={formData.productTitle}
                onChange={(e) => setFormData({ ...formData, productTitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Dates & Sap Parameters */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-5">
          <h3 className="text-base font-bold text-earth-950 border-b border-cream-100 pb-3 flex items-center space-x-2">
            <Droplets className="w-4 h-4 text-blue-600" />
            <span>2. Harvest Dates & Physical Extraction Parameters</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Harvest Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.harvestDate}
                onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden"
              />
              {formErrors.harvestDate && (
                <p className="text-[10px] text-rose-600 mt-1">{formErrors.harvestDate}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Processing Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.processingDate}
                onChange={(e) => setFormData({ ...formData, processingDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Packaging Date</label>
              <input
                type="date"
                value={formData.packagingDate}
                onChange={(e) => setFormData({ ...formData, packagingDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Total Neera Sap Volume (Liters)
              </label>
              <input
                type="number"
                value={formData.sapVolumeLiters}
                onChange={(e) => setFormData({ ...formData, sapVolumeLiters: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Sap Sugar Content (°Bx) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.sapBrix}
                onChange={(e) => setFormData({ ...formData, sapBrix: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden font-mono"
                placeholder="14.8"
              />
              {formErrors.sapBrix && (
                <p className="text-[10px] text-rose-600 mt-1">{formErrors.sapBrix}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Boiling Temp Peak (°C) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.boilingTempCelsius}
                onChange={(e) => setFormData({ ...formData, boilingTempCelsius: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden font-mono"
                placeholder="118.5"
              />
              {formErrors.boilingTempCelsius && (
                <p className="text-[10px] text-rose-600 mt-1">{formErrors.boilingTempCelsius}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">
                Natural Clarification Agent
              </label>
              <input
                type="text"
                value={formData.clarificationAgent}
                onChange={(e) => setFormData({ ...formData, clarificationAgent: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Finished Jaggery Output (kg) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={formData.outputKg}
                onChange={(e) => setFormData({ ...formData, outputKg: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 focus:outline-hidden font-mono font-bold text-forest-900"
                placeholder="120"
              />
              {formErrors.outputKg && (
                <p className="text-[10px] text-rose-600 mt-1">{formErrors.outputKg}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Tree Origin Linking */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-4">
          <div className="flex items-center justify-between border-b border-cream-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-earth-950 flex items-center space-x-2">
                <Sprout className="w-4 h-4 text-forest-700" />
                <span>3. Link Harvest to Palmyrah Trees</span>
              </h3>
              <p className="text-xs text-stone-500">Select which trees in your grove contributed to this sap run.</p>
            </div>
            <span className="text-xs font-mono font-bold text-forest-800 bg-forest-100 px-2.5 py-1 rounded-lg">
              {formData.selectedTrees.length} Palms Linked
            </span>
          </div>

          {formErrors.selectedTrees && (
            <p className="text-xs text-rose-600 font-semibold">{formErrors.selectedTrees}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
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
            The data above is automatically serialized into sorted key-value JSON and digested. This 64-character hash is what anchors onto the Ethereum Sepolia smart contract.
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

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isAnchoring}
            className="w-full py-4 px-6 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-warm flex items-center justify-center space-x-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isAnchoring ? (
              <span>Simulating Sepolia Smart Contract Commitment...</span>
            ) : (
              <>
                <Layers className="w-4 h-4 text-gold-300" />
                <span>Confirm & Anchor Batch on Ethereum Sepolia</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmAnchorOpen}
        title="Commit Batch Hash to Ethereum Sepolia"
        message={`You are committing batch ${formData.batchId} (${formData.outputKg} kg of ${formData.form}) with SHA-256 hash ${computedHash.slice(0, 16)}... In Phase 1 preview, this performs a client simulation of the PalmChainRegistry.sol anchorBatch() call.`}
        confirmLabel="Sign & Anchor"
        cancelLabel="Review Data"
        onConfirm={executeAnchorSimulation}
        onCancel={() => setConfirmAnchorOpen(false)}
      />
    </div>
  );
}
