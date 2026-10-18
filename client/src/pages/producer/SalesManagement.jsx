import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Truck, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Filter, 
  RotateCcw,
  PackageCheck
} from 'lucide-react';
import { mockOrders } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

export default function SalesManagement() {
  const [orders, setOrders] = useState(mockOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.batchNumber.toLowerCase().includes(q) ||
        o.productTitle.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        o.shippingStatus === statusFilter ||
        o.paymentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const updateShippingStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, shippingStatus: newStatus } : o))
    );
  };

  const totalRevenue = orders.reduce((acc, o) => acc + o.totalPriceInr, 0);
  const pendingOrders = orders.filter((o) => o.shippingStatus === 'processing').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-cream-200 pb-5">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
          Direct Commerce
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
          Orders & Direct Sales
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Track customer purchases, manage packaging dispatch, and monitor farmgate earnings.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-1">
          <span className="text-xs font-semibold text-stone-500">Gross Sales Value</span>
          <div className="text-3xl font-black text-forest-900 font-mono">
            ₹{totalRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-stone-400">Direct to cooperative bank escrow</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-1">
          <span className="text-xs font-semibold text-stone-500">Total Customer Orders</span>
          <div className="text-3xl font-black text-earth-950 font-mono">
            {orders.length}
          </div>
          <p className="text-[11px] text-stone-400">All authenticated purchases</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-1">
          <span className="text-xs font-semibold text-stone-500">Awaiting Dispatch</span>
          <div className="text-3xl font-black text-amber-700 font-mono">
            {pendingOrders}
          </div>
          <p className="text-[11px] text-stone-400">Packaging & labeling ready</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-cream-200 shadow-warm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order ID or customer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-cream-300 text-xs focus:ring-2 focus:ring-gold-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end text-xs">
          <span className="text-stone-500 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-cream-200 bg-cream-50 font-medium focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="processing">Processing</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="paid">Payment Verified</option>
            <option value="pending">Payment Pending</option>
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

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-warm overflow-hidden">
        <div className="p-5 border-b border-cream-100 flex items-center justify-between">
          <span className="text-xs font-bold text-earth-950">
            Order Records ({filteredOrders.length})
          </span>
          <span className="text-[11px] text-stone-400">Direct Farmgate Payouts</span>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="No orders currently match your filter settings."
            actionLabel="Reset Search"
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
                  <th className="py-3 px-6">Order ID</th>
                  <th className="py-3 px-6">Customer & Destination</th>
                  <th className="py-3 px-6">Product Details</th>
                  <th className="py-3 px-6">Quantity</th>
                  <th className="py-3 px-6">Total (₹)</th>
                  <th className="py-3 px-6">Payment</th>
                  <th className="py-3 px-6">Shipping Status</th>
                  <th className="py-3 px-6 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 text-stone-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-cream-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-earth-950">
                      {order.id}
                      <span className="block text-[10px] text-stone-400 font-sans">{order.date}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-earth-950">{order.customerName}</div>
                      <div className="text-[10px] text-stone-400">{order.customerCity}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-xs truncate font-medium text-stone-900">
                        {order.productTitle}
                      </div>
                      <span className="text-[10px] font-mono text-stone-400">Batch: {order.batchNumber}</span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-earth-950">
                      {order.quantityKg} kg
                    </td>
                    <td className="py-4 px-6 font-mono font-black text-forest-900 text-sm">
                      ₹{order.totalPriceInr.toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={order.shippingStatus} />
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5">
                      {order.shippingStatus === 'processing' && (
                        <button
                          onClick={() => updateShippingStatus(order.id, 'dispatched')}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-[11px] font-semibold transition-colors"
                        >
                          Mark Dispatched
                        </button>
                      )}
                      {order.shippingStatus === 'dispatched' && (
                        <button
                          onClick={() => updateShippingStatus(order.id, 'delivered')}
                          className="px-2.5 py-1 rounded-lg bg-forest-50 text-forest-800 hover:bg-forest-100 border border-forest-200 text-[11px] font-semibold transition-colors"
                        >
                          Mark Delivered
                        </button>
                      )}
                      {order.shippingStatus === 'delivered' && (
                        <span className="text-[11px] text-emerald-700 font-bold">
                          ✓ Fulfilled
                        </span>
                      )}
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
