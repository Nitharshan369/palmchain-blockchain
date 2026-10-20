import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Layouts
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProducerLayout from './components/layout/ProducerLayout';

// Public Pages
import Home from './pages/public/Home';
import Marketplace from './pages/public/Marketplace';
import ProductDetail from './pages/public/ProductDetail';
import EscrowOrders from './pages/public/EscrowOrders';
import PublicVerification from './pages/public/PublicVerification';

// Producer Pages
import ProducerDashboard from './pages/producer/ProducerDashboard';
import TreesManagement from './pages/producer/TreesManagement';
import BatchesManagement from './pages/producer/BatchesManagement';
import CreateBatch from './pages/producer/CreateBatch';
import SalesManagement from './pages/producer/SalesManagement';
import ProducerListings from './pages/producer/ProducerListings';
import ProducerAnalytics from './pages/producer/ProducerAnalytics';
import ProducerRegistration from './pages/producer/ProducerRegistration';

// Verifier Pages
import VerifierDashboard from './pages/verifier/VerifierDashboard';
import BatchInspection from './pages/verifier/BatchInspection';

// Admin Page
import AdminDashboard from './pages/admin/AdminDashboard';

// Main Shell for Public, Verifier & Admin Pages
function MainShell() {
  return (
    <div className="min-h-screen flex flex-col bg-cream-50 text-earth-950 font-sans selection:bg-gold-200 selection:text-forest-950">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Producer Dashboard Layout and Nested Routes */}
        <Route path="/producer" element={<ProducerLayout />}>
          <Route index element={<Navigate to="/producer/dashboard" replace />} />
          <Route path="dashboard" element={<ProducerDashboard />} />
          <Route path="trees" element={<TreesManagement />} />
          <Route path="batches" element={<BatchesManagement />} />
          <Route path="create-batch" element={<CreateBatch />} />
          <Route path="sales" element={<SalesManagement />} />
          <Route path="listings" element={<ProducerListings />} />
          <Route path="analytics" element={<ProducerAnalytics />} />
          <Route path="register" element={<ProducerRegistration />} />
        </Route>

        {/* Public & Role Pages with Main Navigation and Footer */}
        <Route element={<MainShell />}>
          <Route path="/register" element={<Navigate to="/producer/register" replace />} />
          {/* 1. Public Home */}
          <Route path="/" element={<Home />} />

          {/* 2. Marketplace & Products */}
          <Route path="/products" element={<Marketplace />} />
          <Route path="/marketplace" element={<Navigate to="/products" replace />} />

          {/* 3. Product Details */}
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/orders" element={<EscrowOrders />} />

          {/* 4. Public Batch Verification */}
          <Route path="/verify/:batchId" element={<PublicVerification />} />
          <Route path="/verify" element={<Navigate to="/verify/PJG-2026-001" replace />} />
          <Route path="/trace" element={<Navigate to="/verify/PJG-2026-001" replace />} />
          <Route path="/trace/:batchNumber" element={<Navigate to="/verify/PJG-2026-001" replace />} />

          {/* 11 & 12. Verifier Pages */}
          <Route path="/verifier" element={<Navigate to="/verifier/dashboard" replace />} />
          <Route path="/verifier/dashboard" element={<VerifierDashboard />} />
          <Route path="/verifier/batches/:batchId" element={<BatchInspection />} />

          {/* 13. Admin Page */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Fallback 404 Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
