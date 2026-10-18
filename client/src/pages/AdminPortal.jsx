import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Users, Database, Layers, Key } from 'lucide-react';

export default function AdminPortal() {
  const [producers, setProducers] = useState([
    { name: 'Murugan Natural Jaggery Coop', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', status: 'Authorized' },
    { name: 'Tuticorin Palmyrah Farmers FPO', address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', status: 'Authorized' },
  ]);

  const [verifiers, setVerifiers] = useState([
    { name: 'Southern Agro-Quality Testing Agency', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', status: 'Authorized' },
  ]);

  return (
    <div className="py-8 max-w-4xl mx-auto space-y-8">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wider">
          Role 4: System Governance
        </span>
        <h1 className="text-3xl font-extrabold text-stone-900 mt-2">
          Admin & Smart Contract Registry Control
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Manage ecosystem permissions, authorize trusted producer cooperatives, and grant lab verification rights on the PalmChain registry contract.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="text-xs text-stone-500 font-medium">Smart Contract Network</div>
          <div className="text-lg font-bold text-stone-900 flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Ethereum Sepolia</span>
          </div>
          <p className="text-[11px] text-stone-400 font-mono">Chain ID: 11155111</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="text-xs text-stone-500 font-medium">Authorized Producers</div>
          <div className="text-2xl font-black text-palm-700">{producers.length}</div>
          <p className="text-[11px] text-stone-400">Cooperatives verified</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="text-xs text-stone-500 font-medium">Authorized Verifiers</div>
          <div className="text-2xl font-black text-blue-700">{verifiers.length}</div>
          <p className="text-[11px] text-stone-400">Testing laboratories</p>
        </div>
      </div>

      {/* Authorized Participants List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-900">Authorized Cooperatives & Verifiers</h2>
          <span className="text-xs text-stone-500">Access Control List</span>
        </div>

        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Producers</h3>
          <div className="space-y-2">
            {producers.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <div>
                  <div className="font-semibold text-stone-900">{p.name}</div>
                  <div className="font-mono text-stone-500">{p.address}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  {p.status}
                </span>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 pt-3">Verifiers</h3>
          <div className="space-y-2">
            {verifiers.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <div>
                  <div className="font-semibold text-stone-900">{v.name}</div>
                  <div className="font-mono text-stone-500">{v.address}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
