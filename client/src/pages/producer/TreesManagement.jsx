import React, { useState, useMemo } from 'react';
import { 
  Sprout, 
  Search, 
  PlusCircle, 
  MapPin, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  X
} from 'lucide-react';
import { mockTrees } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

export default function TreesManagement() {
  const [trees, setTrees] = useState(mockTrees);
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // New Tree Form State
  const [newTree, setNewTree] = useState({
    treeCode: '',
    grove: 'Tenkasi Heritage Grove - Block A',
    latitude: '8.9595',
    longitude: '77.3155',
    ageYears: '',
    heightMeters: '',
    tappingStatus: 'Active Morning & Evening',
    healthStatus: 'thriving',
    dailyYieldLiters: '',
    sapBrixAverage: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [successToast, setSuccessToast] = useState(false);

  const filteredTrees = useMemo(() => {
    return trees.filter((tree) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        tree.treeCode.toLowerCase().includes(q) ||
        tree.grove.toLowerCase().includes(q) ||
        tree.notes.toLowerCase().includes(q);

      const matchesHealth = healthFilter === 'all' || tree.healthStatus === healthFilter;

      return matchesSearch && matchesHealth;
    });
  }, [trees, searchQuery, healthFilter]);

  const validateForm = () => {
    const errors = {};
    if (!newTree.treeCode.trim()) errors.treeCode = 'Tree code is required (e.g. PLM-TK-045)';
    if (!newTree.ageYears || Number(newTree.ageYears) <= 0) errors.ageYears = 'Valid age in years is required';
    if (!newTree.heightMeters || Number(newTree.heightMeters) <= 0) errors.heightMeters = 'Valid height is required';
    if (!newTree.dailyYieldLiters || Number(newTree.dailyYieldLiters) < 0) errors.dailyYieldLiters = 'Estimated daily yield is required';
    return errors;
  };

  const handleRegisterTree = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const created = {
      id: `tree-${Date.now()}`,
      treeCode: newTree.treeCode.toUpperCase(),
      grove: newTree.grove,
      latitude: parseFloat(newTree.latitude) || 8.959,
      longitude: parseFloat(newTree.longitude) || 77.315,
      ageYears: parseInt(newTree.ageYears, 10),
      heightMeters: parseFloat(newTree.heightMeters),
      tappingStatus: newTree.tappingStatus,
      healthStatus: newTree.healthStatus,
      dailyYieldLiters: parseFloat(newTree.dailyYieldLiters),
      sapBrixAverage: parseFloat(newTree.sapBrixAverage) || 14.5,
      lastInspected: new Date().toISOString().split('T')[0],
      notes: newTree.notes || 'Recently registered to GPS ledger.',
    };

    setTrees([created, ...trees]);
    setRegisterModalOpen(false);
    setFormErrors({});
    setNewTree({
      treeCode: '',
      grove: 'Tenkasi Heritage Grove - Block A',
      latitude: '8.9595',
      longitude: '77.3155',
      ageYears: '',
      heightMeters: '',
      tappingStatus: 'Active Morning & Evening',
      healthStatus: 'thriving',
      dailyYieldLiters: '',
      sapBrixAverage: '',
      notes: '',
    });
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-forest-800 text-white flex items-center justify-between shadow-warm animate-in fade-in duration-150">
          <div className="flex items-center space-x-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-gold-300 shrink-0" />
            <span>Palmyrah tree registered successfully and added to grove ledger!</span>
          </div>
          <button onClick={() => setSuccessToast(false)} className="text-cream-300 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-5">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
            GPS Grove Inventory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
            Palmyrah Tree Registry
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Individual tree vitality metrics, tapping cycles, and sap yield tracking.
          </p>
        </div>

        <button
          onClick={() => setRegisterModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-gold-300" />
          <span>Register New Tree</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-cream-200 shadow-warm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tree ID (e.g. PLM-TK-014)..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-cream-300 text-xs focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-stone-600">Vitality Status:</span>
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs font-medium focus:outline-hidden"
          >
            <option value="all">All States</option>
            <option value="thriving">Thriving</option>
            <option value="healthy">Healthy</option>
            <option value="resting">Resting Cycle</option>
          </select>

          {(searchQuery || healthFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setHealthFilter('all');
              }}
              className="inline-flex items-center space-x-1 text-xs text-stone-500 hover:text-earth-900 underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Trees Table */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-warm overflow-hidden">
        <div className="p-5 border-b border-cream-100 flex items-center justify-between">
          <span className="text-xs font-bold text-earth-950">
            Registered Trees ({filteredTrees.length})
          </span>
          <span className="text-[11px] text-stone-400 font-mono">
            Location: Tenkasi, Tamil Nadu
          </span>
        </div>

        {filteredTrees.length === 0 ? (
          <EmptyState
            title="No palm trees match your filter"
            description="Try searching with a different tree code or reset active filters."
            actionLabel="Reset Search"
            onAction={() => {
              setSearchQuery('');
              setHealthFilter('all');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-50/80 border-b border-cream-100 text-stone-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-6">Tree ID</th>
                  <th className="py-3 px-6">Plot / Grove</th>
                  <th className="py-3 px-6">Age & Height</th>
                  <th className="py-3 px-6">Tapping Cycle</th>
                  <th className="py-3 px-6">Daily Yield</th>
                  <th className="py-3 px-6">Avg Brix</th>
                  <th className="py-3 px-6">Vitality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 text-stone-700">
                {filteredTrees.map((tree) => (
                  <tr key={tree.id} className="hover:bg-cream-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-forest-950">
                      {tree.treeCode}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-earth-950">{tree.grove}</div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {tree.latitude}° N, {tree.longitude}° E
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-earth-950">{tree.ageYears} yrs</span>
                      <span className="text-stone-400 ml-1">({tree.heightMeters}m)</span>
                    </td>
                    <td className="py-4 px-6 text-stone-600">{tree.tappingStatus}</td>
                    <td className="py-4 px-6 font-mono font-bold text-forest-800">
                      {tree.dailyYieldLiters > 0 ? `${tree.dailyYieldLiters} L/day` : 'Off-Season'}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-blue-700">
                      {tree.sapBrixAverage > 0 ? `${tree.sapBrixAverage}° Bx` : '—'}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={tree.healthStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Tree Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-cream-200 shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-cream-100 pb-3">
              <div className="flex items-center space-x-2 text-forest-800">
                <Sprout className="w-5 h-5 text-forest-700" />
                <h3 className="font-bold text-base text-earth-950">Register Palmyrah Tree</h3>
              </div>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterTree} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Tree Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTree.treeCode}
                    onChange={(e) => setNewTree({ ...newTree, treeCode: e.target.value })}
                    placeholder="e.g. PLM-TK-045"
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 font-mono focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
                  />
                  {formErrors.treeCode && (
                    <p className="text-[10px] text-rose-600 mt-1">{formErrors.treeCode}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Grove / Plot</label>
                  <select
                    value={newTree.grove}
                    onChange={(e) => setNewTree({ ...newTree, grove: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white focus:outline-hidden"
                  >
                    <option value="Tenkasi Heritage Grove - Block A">Tenkasi Heritage Grove - Block A</option>
                    <option value="Tenkasi Heritage Grove - Block B">Tenkasi Heritage Grove - Block B</option>
                    <option value="Tenkasi Heritage Grove - Block C">Tenkasi Heritage Grove - Block C</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Tree Age (Years) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newTree.ageYears}
                    onChange={(e) => setNewTree({ ...newTree, ageYears: e.target.value })}
                    placeholder="e.g. 35"
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
                  />
                  {formErrors.ageYears && (
                    <p className="text-[10px] text-rose-600 mt-1">{formErrors.ageYears}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Height (Meters) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTree.heightMeters}
                    onChange={(e) => setNewTree({ ...newTree, heightMeters: e.target.value })}
                    placeholder="e.g. 18.5"
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
                  />
                  {formErrors.heightMeters && (
                    <p className="text-[10px] text-rose-600 mt-1">{formErrors.heightMeters}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Daily Yield (Liters) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newTree.dailyYieldLiters}
                    onChange={(e) => setNewTree({ ...newTree, dailyYieldLiters: e.target.value })}
                    placeholder="e.g. 10.5"
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
                  />
                  {formErrors.dailyYieldLiters && (
                    <p className="text-[10px] text-rose-600 mt-1">{formErrors.dailyYieldLiters}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Average Sap Brix (°Bx)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newTree.sapBrixAverage}
                    onChange={(e) => setNewTree({ ...newTree, sapBrixAverage: e.target.value })}
                    placeholder="e.g. 14.8"
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Vitality / Health Status</label>
                  <select
                    value={newTree.healthStatus}
                    onChange={(e) => setNewTree({ ...newTree, healthStatus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white focus:outline-hidden"
                  >
                    <option value="thriving">Thriving</option>
                    <option value="healthy">Healthy</option>
                    <option value="resting">Resting Cycle</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tapping Schedule</label>
                  <select
                    value={newTree.tappingStatus}
                    onChange={(e) => setNewTree({ ...newTree, tappingStatus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white focus:outline-hidden"
                  >
                    <option value="Active Morning & Evening">Active Morning & Evening</option>
                    <option value="Active Morning Only">Active Morning Only</option>
                    <option value="Resting / Off-Season">Resting / Off-Season</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Inspector Notes</label>
                <textarea
                  rows="2"
                  value={newTree.notes}
                  onChange={(e) => setNewTree({ ...newTree, notes: e.target.value })}
                  placeholder="Notes on frond health, climbing security, or soil conditions..."
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-cream-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-cream-300 text-stone-700 hover:bg-cream-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold shadow-xs transition-colors"
                >
                  Confirm Tree Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
