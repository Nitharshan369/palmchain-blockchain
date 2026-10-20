import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Search, 
  PlusCircle, 
  QrCode, 
  ExternalLink, 
  Filter, 
  RotateCcw,
  Layers,
  ChevronRight,
  Flame,
  Droplets,
  RefreshCw
} from 'lucide-react';
import { mockBatches } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import QRPreviewModal from '../../components/common/QRPreviewModal';
import { batchesApi } from '../../lib/api';

export default function BatchesManagement() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBatchForQr, setSelectedBatchForQr] = useState(null);

  // Load batches from API and merge with mock fallback
  useEffect(() => {
    let isCancelled = false;
    async function loadBatches() {
      setLoading(true);
      try {
        const res = await batchesApi.list();
        if (!isCancelled && res && Array.isArray(res.batches)) {
          setBatches(res.batches);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('API batches list notice, falling back to local records:', err.message);
      }

      if (!isCancelled) {
        setBatches(Object.values(mockBatches));
        setLoading(false);
      }
    }

    loadBatches();
    return () => { isCancelled = true; };
  }, []);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const q = searchQuery.toLowerCase();
      const code = (b.batchId || b.batch_number || '').toLowerCase();
      const title = (b.productTitle || b.product_title || 'Palm-Jaggery Batch').toLowerCase();
      const matchesSearch = code.includes(q) || title.includes(q);

      const status = b.status || b.lifecycle_status || 'created';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [batches, searchQuery, statusFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-5">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
            Production Ledger
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
            Production Batches & Anchors
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Manage your harvest records, inspect blockchain integrity hashes, and export QR passports.
          </p>
        </div>

        <Link
          to="/producer/create-batch"
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-center"
        >
          <PlusCircle className="w-4 h-4 text-gold-300" />
          <span>Create & Anchor Batch</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-cream-200 shadow-warm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by batch ID or product title..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-cream-300 text-xs focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-stone-500 font-semibold text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-cream-200 bg-cream-50 font-medium focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="certified">Certified Pure</option>
              <option value="anchored">Anchored on Sepolia</option>
              <option value="draft">Draft / Unanchored</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center space-x-1 text-stone-500 hover:text-earth-900 underline text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-warm overflow-hidden">
        <div className="p-5 border-b border-cream-100 flex items-center justify-between">
          <span className="text-xs font-bold text-earth-950">
            Recorded Batches ({filteredBatches.length})
          </span>
          <span className="text-[11px] text-stone-400 font-mono">
            Network: Ethereum Sepolia
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-stone-500 flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-forest-700" />
            <span>Loading batches from database and chain...</span>
          </div>
        ) : filteredBatches.length === 0 ? (
          <EmptyState
            title="No batches match your criteria"
            description="Adjust your search query or clear the active filters."
            actionLabel="Reset Filters"
            onAction={resetFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-50/80 border-b border-cream-100 text-stone-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-6">Batch ID</th>
                  <th className="py-3 px-6">Production Date</th>
                  <th className="py-3 px-6">Neera (L)</th>
                  <th className="py-3 px-6">Jaggery (kg)</th>
                  <th className="py-3 px-6">Integrity Hash</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 text-stone-700">
                {filteredBatches.map((batch) => {
                  const batchCode = batch.batchId || batch.batch_number;
                  const date = batch.production_date || batch.harvest_date || batch.harvestDate || '—';
                  const neera = batch.neera_liters ?? batch.sapVolumeLiters ?? batch.neera_volume_liters ?? '—';
                  const jaggery = batch.jaggery_kg ?? batch.outputKg ?? batch.total_quantity_kg ?? '—';
                  const hash = batch.sha256_hash || batch.sha256Hash || batch.metadata_hash || '';
                  const status = batch.status || batch.lifecycle_status || (batch.is_onchain_anchored ? 'anchored' : 'draft');

                  return (
                    <tr key={batchCode} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-forest-950">
                        {batchCode}
                      </td>
                      <td className="py-4 px-6">{date}</td>
                      <td className="py-4 px-6 font-mono font-bold text-blue-700">
                        {neera} L
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-earth-950">
                        {jaggery} kg
                      </td>
                      <td className="py-4 px-6 font-mono text-[11px] text-stone-500">
                        {hash ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : '—'}
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={status} />
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => setSelectedBatchForQr({ batchId: batchCode, productTitle: 'Artisanal Pure Palm Jaggery', producerName: 'PalmChain Producer' })}
                          className="px-2.5 py-1.5 rounded-lg border border-cream-300 hover:bg-cream-100 font-semibold text-stone-700 inline-flex items-center space-x-1"
                          title="Packaging QR Label"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR</span>
                        </button>
                        <Link
                          to={`/verify/${batchCode}`}
                          className="px-2.5 py-1.5 rounded-lg bg-forest-100 text-forest-800 hover:bg-forest-200 font-semibold inline-flex items-center space-x-1"
                        >
                          <span>Verify</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {selectedBatchForQr && (
        <QRPreviewModal
          isOpen={!!selectedBatchForQr}
          onClose={() => setSelectedBatchForQr(null)}
          batchId={selectedBatchForQr.batchId}
          productTitle={selectedBatchForQr.productTitle}
          producerName={selectedBatchForQr.producerName}
        />
      )}
    </div>
  );
}
