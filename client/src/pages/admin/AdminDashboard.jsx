import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Layers, 
  Database, 
  Key, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw,
  SlidersHorizontal,
  X,
  Info
} from 'lucide-react';
import { 
  mockAdminStats, 
  mockParticipants, 
  mockAuditLogs, 
  SIMULATION_NOTICE 
} from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function AdminDashboard() {
  const [participants, setParticipants] = useState(mockParticipants);
  const [auditLogs, setAuditLogs] = useState(mockAuditLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [newEntityModalOpen, setNewEntityModalOpen] = useState(false);
  const [revokeConfirmModal, setRevokeConfirmModal] = useState({ isOpen: false, participant: null });

  // New Participant Form State
  const [newEntity, setNewEntity] = useState({
    name: '',
    role: 'producer',
    address: '',
    location: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  const filteredParticipants = participants.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q)
    );
  });

  const handleAuthorizeNew = (e) => {
    e.preventDefault();
    if (!newEntity.name.trim()) {
      setFormErrors({ name: 'Organization name is required' });
      return;
    }
    if (!newEntity.address.trim() || !newEntity.address.startsWith('0x')) {
      setFormErrors({ address: 'A valid Ethereum address (0x...) is required' });
      return;
    }

    const created = {
      id: `part-${Date.now()}`,
      name: newEntity.name,
      role: newEntity.role,
      address: newEntity.address,
      location: newEntity.location || 'Tamil Nadu, India',
      registeredDate: new Date().toISOString().split('T')[0],
      status: 'Authorized',
      batchesCount: 0,
      activeTrees: newEntity.role === 'producer' ? 100 : undefined,
      assaysCompleted: newEntity.role === 'verifier' ? 0 : undefined,
    };

    setParticipants([created, ...participants]);

    // Log the event
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      event: `New ${newEntity.role === 'producer' ? 'Producer' : 'Verifier'} Authorized`,
      entity: newEntity.name,
      details: `Wallet ${newEntity.address.slice(0, 8)}... added to registry`,
    };
    setAuditLogs([newLog, ...auditLogs]);

    setNewEntityModalOpen(false);
    setFormErrors({});
    setNewEntity({ name: '', role: 'producer', address: '', location: '' });
    setToastMessage(`Authorized ${created.name} successfully on smart contract registry!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRevoke = (participant) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === participant.id
          ? { ...p, status: p.status === 'Authorized' ? 'Revoked' : 'Authorized' }
          : p
      )
    );
    setRevokeConfirmModal({ isOpen: false, participant: null });
    setToastMessage(`Updated access permissions for ${participant.name}.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="py-6 space-y-8 max-w-6xl mx-auto">
      {/* Simulation Notice Banner */}
      <div className="p-4 rounded-2xl bg-gold-50 border border-gold-300 text-gold-950 flex items-center space-x-2.5 text-xs shadow-xs">
        <Info className="w-4 h-4 text-gold-700 shrink-0" />
        <span>
          <strong>{SIMULATION_NOTICE.badgeText}:</strong> Governance operations on this page simulate role assignments via the <code className="font-mono">setProducerAuthorization()</code> and <code className="font-mono">setVerifierAuthorization()</code> smart contract methods.
        </span>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-forest-800 text-white flex items-center justify-between text-xs shadow-warm animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-gold-300" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-cream-300 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-5">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wider">
            Governance & Contract Control
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
            System Administration
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Manage ecosystem access control, authorize cooperatives and labs, and monitor blockchain health.
          </p>
        </div>

        <button
          onClick={() => setNewEntityModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-center"
        >
          <UserPlus className="w-4 h-4 text-gold-300" />
          <span>Authorize New Entity</span>
        </button>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-1">
          <span className="text-xs font-semibold text-stone-500">Authorized Cooperatives</span>
          <div className="text-3xl font-black text-forest-900 font-mono">
            {mockAdminStats.totalProducers}
          </div>
          <p className="text-[11px] text-stone-400">Producers with on-chain rights</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-1">
          <span className="text-xs font-semibold text-stone-500">Active Palms Registered</span>
          <div className="text-3xl font-black text-earth-950 font-mono">
            {mockAdminStats.activePalmsRegistered.toLocaleString()}
          </div>
          <p className="text-[11px] text-stone-400">Total tree population monitored</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-1">
          <span className="text-xs font-semibold text-stone-500">Batches Anchored</span>
          <div className="text-3xl font-black text-forest-900 font-mono">
            {mockAdminStats.batchesAnchored}
          </div>
          <p className="text-[11px] text-stone-400">Immutable records committed</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-1">
          <span className="text-xs font-semibold text-stone-500">Marketplace Volume</span>
          <div className="text-3xl font-black text-gold-700 font-mono">
            {mockAdminStats.marketplaceVolumeInr}
          </div>
          <p className="text-[11px] text-stone-400">Cumulative artisan trade</p>
        </div>
      </div>

      {/* Smart Contract Parameters Card */}
      <div className="bg-forest-950 text-white rounded-3xl p-6 sm:p-7 border border-forest-900 space-y-4">
        <div className="flex items-center justify-between border-b border-forest-800 pb-3">
          <div className="flex items-center space-x-2 text-gold-300">
            <Layers className="w-5 h-5 text-gold-400" />
            <h3 className="font-bold text-sm text-white">Smart Contract Registry Health</h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
            Sepolia Testnet Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-2xl bg-forest-900/70 border border-forest-800 space-y-1">
            <span className="text-stone-400 text-[10px] font-sans block">Registry Contract</span>
            <span className="font-bold text-cream-100 break-all">{mockAdminStats.registryContract}</span>
          </div>

          <div className="p-3 rounded-2xl bg-forest-900/70 border border-forest-800 space-y-1">
            <span className="text-stone-400 text-[10px] font-sans block">Governance Owner Wallet</span>
            <span className="font-bold text-cream-100 break-all">{mockAdminStats.adminWallet}</span>
          </div>

          <div className="p-3 rounded-2xl bg-forest-900/70 border border-forest-800 space-y-1">
            <span className="text-stone-400 text-[10px] font-sans block">Solidity Compiler Target</span>
            <span className="font-bold text-emerald-300">v0.8.24 (Paris EVM)</span>
          </div>
        </div>
      </div>

      {/* Authorized Participants Management */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-warm overflow-hidden space-y-0">
        <div className="p-6 border-b border-cream-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-earth-950">Authorized Cooperatives & Verifiers</h3>
            <p className="text-xs text-stone-500">Smart contract access control list</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter participants..."
              className="w-full pl-10 pr-4 py-1.5 rounded-xl border border-cream-300 text-xs focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream-50/80 border-b border-cream-100 text-stone-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-6">Entity Name</th>
                <th className="py-3 px-6">Role</th>
                <th className="py-3 px-6">Wallet Address</th>
                <th className="py-3 px-6">Location</th>
                <th className="py-3 px-6">Permission Status</th>
                <th className="py-3 px-6 text-right">Access Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100 text-stone-700">
              {filteredParticipants.map((p) => (
                <tr key={p.id} className="hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-earth-950">
                    {p.name}
                    <span className="block text-[10px] text-stone-400 font-sans font-normal">
                      Registered: {p.registeredDate}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      p.role === 'producer' ? 'bg-forest-100 text-forest-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {p.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-[11px] text-stone-600">
                    {p.address}
                  </td>
                  <td className="py-4 px-6 text-stone-600">{p.location}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.status === 'Authorized'
                        ? 'bg-forest-100 text-forest-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => setRevokeConfirmModal({ isOpen: true, participant: p })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        p.status === 'Authorized'
                          ? 'border border-rose-300 text-rose-700 hover:bg-rose-50'
                          : 'bg-forest-800 text-white hover:bg-forest-900'
                      }`}
                    >
                      {p.status === 'Authorized' ? 'Revoke Rights' : 'Re-Authorize'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Activity Audit Log */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cream-200 shadow-warm space-y-4">
        <h3 className="font-bold text-base text-earth-950 border-b border-cream-100 pb-3">
          Immutable System Activity Log
        </h3>

        <div className="divide-y divide-cream-100 text-xs">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-bold text-earth-950">{log.event}</span>
                <span className="text-stone-500 ml-2">by <strong>{log.entity}</strong></span>
                <p className="text-[11px] text-stone-400 font-mono">{log.details}</p>
              </div>
              <span className="font-mono text-[10px] text-stone-400 shrink-0">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Authorize New Entity Modal */}
      {newEntityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-cream-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-cream-100 pb-3">
              <div className="flex items-center space-x-2 text-forest-800">
                <UserPlus className="w-5 h-5 text-forest-700" />
                <h3 className="font-bold text-base text-earth-950">Authorize New Participant</h3>
              </div>
              <button
                onClick={() => setNewEntityModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuthorizeNew} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Organization / Cooperative Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEntity.name}
                  onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                  placeholder="e.g. Madurai Palm Growers Society"
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 focus:outline-hidden"
                />
                {formErrors.name && (
                  <p className="text-[10px] text-rose-600 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Participant Role</label>
                <select
                  value={newEntity.role}
                  onChange={(e) => setNewEntity({ ...newEntity, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white font-medium focus:outline-hidden"
                >
                  <option value="producer">Producer (Can anchor production batches)</option>
                  <option value="verifier">Verifier / Lab (Can attest purity on-chain)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Ethereum Wallet Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEntity.address}
                  onChange={(e) => setNewEntity({ ...newEntity, address: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 font-mono focus:outline-hidden"
                />
                {formErrors.address && (
                  <p className="text-[10px] text-rose-600 mt-1">{formErrors.address}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Geographic Region</label>
                <input
                  type="text"
                  value={newEntity.location}
                  onChange={(e) => setNewEntity({ ...newEntity, location: e.target.value })}
                  placeholder="e.g. Madurai, Tamil Nadu"
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-cream-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setNewEntityModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-cream-300 text-stone-700 hover:bg-cream-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold shadow-xs transition-colors"
                >
                  Confirm Authorization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Permission Modal */}
      {revokeConfirmModal.isOpen && (
        <ConfirmModal
          isOpen={true}
          title="Update Entity Authorization"
          message={`Are you sure you want to change the smart contract authorization status for ${revokeConfirmModal.participant?.name}?`}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          isDestructive={revokeConfirmModal.participant?.status === 'Authorized'}
          onConfirm={() => handleRevoke(revokeConfirmModal.participant)}
          onCancel={() => setRevokeConfirmModal({ isOpen: false, participant: null })}
        />
      )}
    </div>
  );
}
