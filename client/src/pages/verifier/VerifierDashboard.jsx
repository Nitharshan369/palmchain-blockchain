import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileCheck2, 
  Search, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { mockVerifierQueue, SIMULATION_NOTICE } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

export default function VerifierDashboard() {
  const [queue, setQueue] = useState(mockVerifierQueue);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.batchId.toLowerCase().includes(q) ||
        item.producerName.toLowerCase().includes(q) ||
        item.productTitle.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [queue, searchQuery, statusFilter]);

  return (
    <div className="py-6 space-y-8 max-w-6xl mx-auto">
      {/* Simulation Notice Banner */}
      <div className="p-4 rounded-2xl bg-gold-50 border border-gold-300 text-gold-950 flex items-center space-x-2.5 text-xs shadow-xs">
        <Info className="w-4 h-4 text-gold-700 shrink-0" />
        <span>
          <strong>{SIMULATION_NOTICE.badgeText}:</strong> Lab testing and smart contract attestations on this portal are running in simulation mode for local frontend evaluation.
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-5">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
            Accredited Testing Bureau
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
            Quality Inspection & Lab Queue
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Southern Agro-Quality Testing Agency • Authorized Verifier #TN-VER-04 • NABL Accredited
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-forest-100 text-forest-800 border border-forest-200 font-semibold">
            <ShieldCheck className="w-4 h-4 text-forest-700" />
            <span>Authorized Smart Contract Signer</span>
          </span>
        </div>
      </div>

      {/* Lab KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-1">
          <span className="text-xs font-semibold text-stone-500">Batches Requiring Assay</span>
          <div className="text-3xl font-black text-amber-700 font-mono">
            {queue.filter((q) => q.status === 'pending_assay' || q.status === 'in_progress').length}
          </div>
          <p className="text-[11px] text-stone-400">Samples currently in testing queue</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-1">
          <span className="text-xs font-semibold text-stone-500">Season Purity Pass Rate</span>
          <div className="text-3xl font-black text-forest-900 font-mono">98.6%</div>
          <p className="text-[11px] text-stone-400">Zero cane-sugar adulteration verified</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-1">
          <span className="text-xs font-semibold text-stone-500">Average Turnaround Time</span>
          <div className="text-3xl font-black text-earth-950 font-mono">24 Hours</div>
          <p className="text-[11px] text-stone-400">From sample receipt to on-chain attestation</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-3xl p-5 border border-cream-200 shadow-warm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search batch ID or cooperative..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-cream-300 text-xs focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end text-xs">
          <span className="text-stone-500 font-semibold">Queue State:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-cream-200 bg-cream-50 font-medium focus:outline-hidden"
          >
            <option value="all">All Batches</option>
            <option value="pending_assay">Awaiting Lab Assay</option>
            <option value="in_progress">Assay In Progress</option>
            <option value="certified">Certified Pure</option>
          </select>

          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="inline-flex items-center space-x-1 text-stone-500 hover:text-earth-900 underline text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-warm overflow-hidden">
        <div className="p-5 border-b border-cream-100 flex items-center justify-between">
          <span className="text-xs font-bold text-earth-950">
            Inspection Queue ({filteredQueue.length})
          </span>
          <span className="text-[11px] text-stone-400 font-mono">
            Smart Contract Method: certifyBatch(batchId, bool)
          </span>
        </div>

        {filteredQueue.length === 0 ? (
          <EmptyState
            title="No batches in this queue"
            description="All pending batches have been processed, or no records match your filter."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-50/80 border-b border-cream-100 text-stone-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-6">Batch ID</th>
                  <th className="py-3 px-6">Producer & Product</th>
                  <th className="py-3 px-6">Submission Date</th>
                  <th className="py-3 px-6">Reported Brix</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 text-stone-700">
                {filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-cream-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-earth-950">
                      {item.batchId}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-earth-950">{item.productTitle}</div>
                      <div className="text-[10px] text-stone-400">{item.producerName}</div>
                    </td>
                    <td className="py-4 px-6 text-stone-600">{item.submittedAt}</td>
                    <td className="py-4 px-6 font-mono font-bold text-blue-700">
                      {item.sapBrix}° Bx
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/verifier/batches/${item.batchId}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs shadow-xs transition-colors"
                      >
                        <span>Inspect & Certify</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
