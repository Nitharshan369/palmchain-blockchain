import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, RefreshCw, Search, ShieldCheck, CheckCircle2 } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import { useWallet } from '../../context/WalletContext';
import { operationsApi } from '../../lib/api';

// ─── Sample verifier queue for demo / offline mode ───────────────────────────
const MOCK_QUEUE = [
  {
    id: 'mock-batch-1',
    batch_number: 'PJG-2026-001',
    neera_liters: 850,
    total_quantity_kg: 120,
    producer: { full_name: 'Murugan Natural Palmyrah Cooperative' },
    batch_trace_logs: [1, 2, 3],
  },
  {
    id: 'mock-batch-2',
    batch_number: 'PJG-2026-002',
    neera_liters: 620,
    total_quantity_kg: 88,
    producer: { full_name: 'Tuticorin Coastal Farmers FPO' },
    batch_trace_logs: [1, 2],
  },
  {
    id: 'mock-batch-3',
    batch_number: 'PJG-2026-003',
    neera_liters: 390,
    total_quantity_kg: 54,
    producer: { full_name: 'Palakkad Heritage Agro Trust' },
    batch_trace_logs: [1, 2, 3, 4],
  },
];

export default function VerifierDashboard() {
  const { isConnected, connect, getSigner } = useWallet();
  const [batches, setBatches] = useState([]);
  const [query, setQuery] = useState('');
  const [state, setState] = useState('idle');
  const [isMockData, setIsMockData] = useState(false);

  const load = useCallback(async () => {
    setState('pending');
    setIsMockData(false);
    try {
      if (!isConnected) { await connect(); setState('idle'); return; }
      const response = await operationsApi.verifierQueue(await getSigner());
      const fetched = response.batches || [];
      if (fetched.length > 0) {
        setBatches(fetched);
        setState('confirmed');
      } else {
        setBatches(MOCK_QUEUE);
        setIsMockData(true);
        setState('confirmed');
      }
    } catch {
      // Wallet not registered as verifier or server down — show sample data
      setBatches(MOCK_QUEUE);
      setIsMockData(true);
      setState('confirmed');
    }
  }, [connect, getSigner, isConnected]);

  useEffect(() => { load(); }, [load]);

  const visible = batches.filter((b) =>
    `${b.batch_number} ${b.producer?.full_name || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-cream-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Authorized verifier</span>
          <h1 className="mt-1 text-3xl font-extrabold text-earth-950">Batches awaiting review</h1>
          <p className="mt-1 text-sm text-stone-600">
            Review production records and submit approval or rejection to the deployed BatchRegistry on Sepolia.
          </p>
        </div>
        <button
          onClick={load}
          disabled={state === 'pending'}
          className="inline-flex items-center gap-2 rounded-xl border border-cream-300 px-3 py-2 text-xs font-bold hover:bg-cream-50"
        >
          <RefreshCw className={state === 'pending' ? 'animate-spin' : ''} size={14} />
          Refresh
        </button>
      </header>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-950">
        <ShieldCheck className="mr-2 inline" size={15} />
        Only an active server-authorized verifier profile can load this queue. Pending transactions are not approvals.
      </div>

      {isMockData && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
          <FlaskConical className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>Sample data mode</strong> — Your wallet is not yet registered as a verifier, or the server is unavailable.
            Showing sample batch queue for demonstration. Click <strong>Inspect</strong> to open the batch detail page.
          </span>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search batch or producer"
          className="w-full rounded-xl border border-cream-300 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
        />
      </div>

      {state === 'pending' ? (
        <p className="py-10 text-center text-sm text-stone-500">Loading queue…</p>
      ) : visible.length === 0 ? (
        <EmptyState title="No batches awaiting review" description="The queue is empty or no batch matches your search." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-cream-200 bg-white shadow-warm">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream-50 text-stone-500 uppercase text-[11px] tracking-wide">
              <tr>
                <th className="p-4">Batch</th>
                <th className="p-4">Producer</th>
                <th className="p-4">Neera (L)</th>
                <th className="p-4">Jaggery (kg)</th>
                <th className="p-4">Trace Records</th>
                <th className="p-4">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {visible.map((batch) => (
                <tr key={batch.id} className="hover:bg-cream-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-earth-950">{batch.batch_number}</td>
                  <td className="p-4 text-stone-700">{batch.producer?.full_name || batch.producer?.organization_name || '—'}</td>
                  <td className="p-4 font-semibold">{batch.neera_liters || 0} L</td>
                  <td className="p-4 font-semibold">{batch.total_quantity_kg || 0} kg</td>
                  <td className="p-4">{(batch.batch_trace_logs || []).length} records</td>
                  <td className="p-4">
                    {batch.status === 'certified' || batch.is_certified === true || batch.onchain_status === 2 || (batch.chain_batch && Number(batch.chain_batch.status) === 2) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 font-bold text-[11px]">
                        <CheckCircle2 size={13} className="text-forest-700" /> Certified on Sepolia
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                        Awaiting Review
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      to={`/verifier/batches/${batch.batch_number}`}
                      className={`rounded-xl px-4 py-2 font-bold text-xs transition-colors ${
                        batch.status === 'certified' || batch.is_certified === true || batch.onchain_status === 2 || (batch.chain_batch && Number(batch.chain_batch.status) === 2)
                          ? 'border border-forest-300 text-forest-800 hover:bg-forest-50'
                          : 'bg-forest-800 hover:bg-forest-900 text-white'
                      }`}
                    >
                      {batch.status === 'certified' || batch.is_certified === true || batch.onchain_status === 2 || (batch.chain_batch && Number(batch.chain_batch.status) === 2)
                        ? 'View Certificate →'
                        : 'Inspect →'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

