import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  QrCode, 
  ShoppingBag, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  Lock, 
  Activity, 
  Sparkles,
  ArrowRight,
  Database,
  FileCheck2
} from 'lucide-react';

export default function Home() {
  const [serverHealth, setServerHealth] = useState({ status: 'checking', data: null });

  useEffect(() => {
    // Probe local backend server health
    fetch('http://localhost:5000/api/health')
      .then((res) => res.json())
      .then((data) => setServerHealth({ status: 'online', data }))
      .catch((err) => setServerHealth({ status: 'offline', data: null }));
  }, []);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-palm-900 via-palm-800 to-stone-900 text-white p-8 sm:p-14 shadow-2xl border border-palm-700/40">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-palm-700/60 border border-palm-500/40 text-palm-200 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-jaggery-400" />
            <span>Verifiable Agro-Supply Chain</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Trust Every Grain of <span className="text-jaggery-300">Palm Jaggery</span>.
          </h1>

          <p className="text-stone-300 text-base sm:text-lg leading-relaxed max-w-2xl">
            PalmChain connects traditional palm-jaggery producers directly with customers. Every harvest batch receives a digital identity, tamper-proof SHA-256 integrity hash, and Ethereum Sepolia blockchain anchor.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/trace"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-jaggery-500 hover:bg-jaggery-600 text-stone-950 font-bold text-sm shadow-lg shadow-jaggery-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Verify a Batch QR</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              to="/marketplace"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-palm-800/80 hover:bg-palm-700/80 text-white border border-palm-500/40 font-semibold text-sm transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-palm-300" />
              <span>Browse Marketplace</span>
            </Link>
          </div>
        </div>

        {/* Ambient Decorative Shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-jaggery-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-palm-500/15 blur-3xl pointer-events-none" />
      </section>

      {/* Backend & Environment Live Status Bar */}
      <section className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3.5 h-3.5 rounded-full ${
            serverHealth.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
          }`} />
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-stone-900">Backend API Engine</span>
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-stone-100 text-stone-600 border border-stone-200">
                http://localhost:5000/api/health
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {serverHealth.status === 'online'
                ? `Online • Crypto Engine: SHA-256 Verified • Node ${serverHealth.data?.version || '1.0.0'}`
                : 'Offline or standby (run "npm run dev:server" to start listener)'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-medium text-stone-600">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Lock className="w-3.5 h-3.5" />
            <span>Sepolia Smart Contract Ready</span>
          </span>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-palm-50 text-palm-800 border border-palm-200">
            <Database className="w-3.5 h-3.5" />
            <span>Supabase Schema Prepared</span>
          </span>
        </div>
      </section>

      {/* Four Core User Roles */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Four User Roles in PalmChain</h2>
          <p className="text-sm text-stone-600 mt-1">
            Built with strict access boundaries, non-custodial cryptographic verification, and direct farm-to-table traceability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Producer Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs hover:border-palm-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-palm-100 text-palm-800 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-lg font-bold text-stone-900">Producer</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Taps Neera sap, logs boiling temperature, brix readings, and molds jaggery. Anchors batch SHA-256 hash onto Ethereum Sepolia.
              </p>
            </div>
            <Link
              to="/producer"
              className="inline-flex items-center text-xs font-semibold text-palm-700 hover:text-palm-900 group"
            >
              <span>Explore Producer Portal</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Customer Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs hover:border-jaggery-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-jaggery-100 text-jaggery-800 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-lg font-bold text-stone-900">Customer</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Scans product QR codes to inspect farm origin, harvest dates, and independent laboratory test results. Buys directly from verified farmers.
              </p>
            </div>
            <Link
              to="/trace"
              className="inline-flex items-center text-xs font-semibold text-jaggery-700 hover:text-jaggery-900 group"
            >
              <span>Scan & Verify Batches</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Verifier Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-lg font-bold text-stone-900">Verifier / Lab</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Authorized agricultural quality certifiers test for zero cane sugar / chemical adulteration and sign purity attestations directly on-chain.
              </p>
            </div>
            <Link
              to="/verifier"
              className="inline-flex items-center text-xs font-semibold text-blue-700 hover:text-blue-900 group"
            >
              <span>Open Quality Inspector</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Admin Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="text-lg font-bold text-stone-900">Admin</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Governs smart contract permissions, authorizes producer cooperatives and certifiers, and audits system-wide cryptographic logs.
              </p>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center text-xs font-semibold text-purple-700 hover:text-purple-900 group"
            >
              <span>System Governance</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* The Blockchain Integrity Commitment Section */}
      <section className="bg-stone-900 text-white rounded-3xl p-8 sm:p-12 border border-stone-800">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            How PalmChain Anchors Integrity
          </h2>
          <p className="text-stone-400 text-sm mt-2">
            Adhering strictly to rule: <em className="text-stone-300">"Never put the entire application database on the blockchain."</em>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700/60 space-y-2">
            <div className="text-palm-400 font-mono text-xs font-bold">STEP 01</div>
            <h4 className="font-bold text-white text-sm">Harvest & Data Logging</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Producer inputs date, farm coordinates, sap brix, temperature, and quantity. Stored in Supabase PostgreSQL.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700/60 space-y-2">
            <div className="text-jaggery-400 font-mono text-xs font-bold">STEP 02</div>
            <h4 className="font-bold text-white text-sm">Canonical SHA-256 Hash</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Keys are canonically sorted into standardized JSON and digested into a 64-character SHA-256 hash.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700/60 space-y-2">
            <div className="text-blue-400 font-mono text-xs font-bold">STEP 03</div>
            <h4 className="font-bold text-white text-sm">Sepolia Anchor</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Producer signs transaction invoking <code className="text-stone-300">anchorBatch(batchId, hash)</code> on PalmChainRegistry.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700/60 space-y-2">
            <div className="text-emerald-400 font-mono text-xs font-bold">STEP 04</div>
            <h4 className="font-bold text-white text-sm">Zero-Gas QR Verification</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Customer scans QR code. Client reads on-chain hash and confirms 100% tamper-free authenticity without fees.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
