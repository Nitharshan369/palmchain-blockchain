import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import TraceVerification from './pages/TraceVerification';
import Marketplace from './pages/Marketplace';
import ProducerPortal from './pages/ProducerPortal';
import VerifierPortal from './pages/VerifierPortal';
import AdminPortal from './pages/AdminPortal';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-palm-200 selection:text-palm-900">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/trace" element={<TraceVerification />} />
            <Route path="/trace/:batchNumber" element={<TraceVerification />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/producer" element={<ProducerPortal />} />
            <Route path="/verifier" element={<VerifierPortal />} />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
