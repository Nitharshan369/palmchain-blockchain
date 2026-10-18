import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Search, FileText } from 'lucide-react';

export default function VerifierPortal() {
  const [batches, setBatches] = useState([
    {
      id: 'b1',
      batchNumber: 'PJG-2026-001',
      producer: 'Murugan Natural Jaggery Coop',
      harvestDate: '2026-03-10',
      status: 'certified',
      purityScore: '99.4%',
    },
    {
      id: 'b2',
      batchNumber: 'PJG-2026-002',
      producer: 'Tuticorin Palmyrah Farmers FPO',
      harvestDate: '2026-03-14',
      status: 'pending',
      purityScore: 'Awaiting Lab Assay',
    },
  ]);

  const certifyBatch = (batchNumber) => {
    setBatches(
      batches.map((b) =>
        b.batchNumber === batchNumber
          ? { ...b, status: 'certified', purityScore: '99.2% (Passed)' }
          : b
      )
    );
  };

  return (
    <div className="py-8 max-w-4xl mx-auto space-y-8">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
          Role 3: Quality Verifier
        </span>
        <h1 className="text-3xl font-extrabold text-stone-900 mt-2">
          Quality Inspection & Lab Certification
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Accredited laboratory certifiers evaluate purity parameters and submit cryptographically signed attestations to the smart contract.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-900">Batches Requiring Lab Attestation</h2>
          <span className="text-xs text-stone-500">Authorized Verifier Mode</span>
        </div>

        <div className="divide-y divide-stone-100">
          {batches.map((batch) => (
            <div key={batch.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-stone-900">{batch.batchNumber}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      batch.status === 'certified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {batch.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-stone-600">Producer: {batch.producer}</p>
                <p className="text-xs text-stone-500">Purity Analysis: {batch.purityScore}</p>
              </div>

              <div>
                {batch.status === 'certified' ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Attested On-Chain</span>
                  </span>
                ) : (
                  <button
                    onClick={() => certifyBatch(batch.batchNumber)}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Approve & Certify on Sepolia</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
