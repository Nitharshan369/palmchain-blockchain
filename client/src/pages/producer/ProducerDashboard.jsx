import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sprout, 
  Package, 
  TrendingUp, 
  DollarSign, 
  PlusCircle, 
  QrCode, 
  ExternalLink,
  ChevronRight,
  Sun,
  Droplets,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  RefreshCw
} from 'lucide-react';
import { mockBatches, mockTrees, mockOrders } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import QRPreviewModal from '../../components/common/QRPreviewModal';
import { batchesApi } from '../../lib/api';

export default function ProducerDashboard() {
  const [selectedBatchForQr, setSelectedBatchForQr] = useState(null);
  const [batchesList, setBatchesList] = useState(Object.values(mockBatches));
  const [loadingBatches, setLoadingBatches] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchBatches() {
      setLoadingBatches(true);
      try {
        const res = await batchesApi.list();
        if (!cancelled && res && Array.isArray(res.batches) && res.batches.length > 0) {
          setBatchesList(res.batches);
        }
      } catch (err) {
        console.warn('Could not fetch remote batches, using local store:', err);
      } finally {
        if (!cancelled) setLoadingBatches(false);
      }
    }
    fetchBatches();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-5">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
            Murugan Natural Palmyrah Cooperative
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1.5">
            Producer Grove Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Tenkasi Heritage Grove • Plot #4 • Authorized Cooperative #TN-TK-08
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/producer/create-batch"
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow-xs transition-all hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4 text-gold-300" />
            <span>Create & Anchor Batch</span>
          </Link>
        </div>
      </div>

      {/* Weather & Dawn Tapping Advisory */}
      <div className="p-4 sm:p-5 rounded-3xl bg-cream-100/90 border border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gold-200/80 flex items-center justify-center text-gold-800 shrink-0">
            <Sun className="w-6 h-6 text-gold-700" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-earth-950">
              Tenkasi Microclimate Advisory • Optimal Tapping Conditions
            </h4>
            <p className="text-xs text-stone-600">
              Dawn Temp: 23.4°C • Relative Humidity: 68% • Sap Brix Projected: 14.8°–15.4° Bx. Ensure lime coats are refreshed in pots before dusk.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold text-forest-800 bg-forest-100 px-3 py-1 rounded-xl self-start sm:self-center shrink-0 border border-forest-200">
          Peak Season Active
        </span>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Active Palms Registered</span>
            <div className="w-8 h-8 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800">
              <Sprout className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-earth-950 font-mono">420</div>
          <p className="text-[11px] text-stone-400">
            <span className="text-forest-700 font-bold">100% Geo-tagged</span> with GPS coordinates
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Neera Harvested (This Month)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-800">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-earth-950 font-mono">3,850 L</div>
          <p className="text-[11px] text-stone-400">
            <span className="text-emerald-700 font-bold">+14% vs. last month</span>
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Batches in Processing</span>
            <div className="w-8 h-8 rounded-xl bg-gold-100 flex items-center justify-center text-gold-800">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-earth-950 font-mono">{batchesList.length}</div>
          <p className="text-[11px] text-stone-400">
            <span className="text-gold-700 font-bold">1 in Lab Queue</span> • 3 Anchored
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Cumulative Sales Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-forest-900 font-mono">₹4,82,400</div>
          <p className="text-[11px] text-stone-400">
            <span className="text-forest-700 font-bold">100% Direct Payout</span> (Zero Middlemen)
          </p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/producer/create-batch"
          className="p-5 rounded-2xl bg-white border border-cream-200 hover:border-forest-600 shadow-warm hover:shadow-warm-lg transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-earth-950 group-hover:text-forest-800">
              Register New Batch
            </h4>
            <p className="text-xs text-stone-500">Log sap volume, brix, boiling temp & anchor</p>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:translate-x-1 group-hover:text-forest-800 transition-all" />
        </Link>

        <Link
          to="/producer/trees"
          className="p-5 rounded-2xl bg-white border border-cream-200 hover:border-forest-600 shadow-warm hover:shadow-warm-lg transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-earth-950 group-hover:text-forest-800">
              Palmyrah Tree Registry
            </h4>
            <p className="text-xs text-stone-500">Inspect health, GPS tags & tapping logs</p>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:translate-x-1 group-hover:text-forest-800 transition-all" />
        </Link>

        <Link
          to="/producer/sales"
          className="p-5 rounded-2xl bg-white border border-cream-200 hover:border-forest-600 shadow-warm hover:shadow-warm-lg transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-earth-950 group-hover:text-forest-800">
              Manage Sales & Orders
            </h4>
            <p className="text-xs text-stone-500">{mockOrders.length} customer orders awaiting dispatch</p>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:translate-x-1 group-hover:text-forest-800 transition-all" />
        </Link>
      </div>

      {/* Recent Batches Table */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-warm overflow-hidden space-y-0">
        <div className="p-6 border-b border-cream-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-earth-950">Active Production Batches</h3>
            <p className="text-xs text-stone-500">Harvested and anchored batches for Tenkasi Grove</p>
          </div>
          <Link
            to="/producer/batches"
            className="text-xs font-semibold text-forest-800 hover:text-forest-950 flex items-center space-x-1"
          >
            <span>View All Batches</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream-50/80 border-b border-cream-100 text-stone-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-6">Batch ID</th>
                <th className="py-3 px-6">Harvest Date</th>
                <th className="py-3 px-6">Form</th>
                <th className="py-3 px-6">Quantity</th>
                <th className="py-3 px-6">Sap Brix</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100 text-stone-700">
              {batchesList.map((batch) => {
                const batchId = batch.batchId || batch.batch_number;
                const harvestDate = batch.harvestDate || batch.production_date || batch.created_at?.slice(0, 10) || '2026-10-20';
                const form = batch.form || 'Solid Blocks';
                const outputKg = batch.outputKg || batch.jaggery_kg || batch.total_quantity_kg || 120;
                const sapBrix = batch.sapBrix || (batch.neera_liters ? '15.2' : '15.0');
                const status = batch.status || batch.lifecycle_status || 'created';
                const dataHash = batch.dataHash || batch.data_hash || batch.hash;

                return (
                  <tr key={batchId} className="hover:bg-cream-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-earth-950">
                      {batchId}
                    </td>
                    <td className="py-4 px-6">{harvestDate}</td>
                    <td className="py-4 px-6">{form}</td>
                    <td className="py-4 px-6 font-mono font-semibold">{outputKg} kg</td>
                    <td className="py-4 px-6 font-mono font-semibold text-blue-700">{sapBrix}° Bx</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={status} />
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => setSelectedBatchForQr({
                          batchId,
                          productTitle: batch.productTitle || batch.product_title || 'Artisanal Pure Palm Jaggery',
                          producerName: batch.producerName || batch.producer_name || 'Murugan Natural Palmyrah Cooperative',
                          groveLocation: batch.groveLocation || batch.grove_location || 'Tenkasi Heritage Grove, TN',
                          productionDate: harvestDate,
                          netWeight: `${outputKg} kg`,
                          sha256Hash: dataHash
                        })}
                        className="px-2.5 py-1.5 rounded-lg border border-cream-300 hover:bg-cream-100 font-semibold text-stone-700 inline-flex items-center space-x-1"
                        title="Packaging QR Label & Print"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR</span>
                      </button>
                      <Link
                        to={`/verify/${batchId}`}
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
      </div>

      {/* QR Modal */}
      {selectedBatchForQr && (
        <QRPreviewModal
          isOpen={!!selectedBatchForQr}
          onClose={() => setSelectedBatchForQr(null)}
          batchId={selectedBatchForQr.batchId}
          productTitle={selectedBatchForQr.productTitle}
          producerName={selectedBatchForQr.producerName}
          groveLocation={selectedBatchForQr.groveLocation}
          productionDate={selectedBatchForQr.productionDate}
          netWeight={selectedBatchForQr.netWeight}
          sha256Hash={selectedBatchForQr.sha256Hash}
        />
      )}
    </div>
  );
}
