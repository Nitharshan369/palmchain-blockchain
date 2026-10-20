import React, { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWallet } from '../../context/WalletContext';
import { productsApi } from '../../lib/api';
import {
  getPaymentEscrowReadOnly,
  getPaymentEscrowWithSigner,
  SEPOLIA_CHAIN_ID_DECIMAL,
} from '../../contracts';
import { ESCROW_ORDER_STATUS } from '../../lib/escrow';

function formatQuantity(hundredths) {
  return (Number(hundredths) / 100).toFixed(2);
}

function formatTimestamp(timestamp) {
  return timestamp ? new Date(Number(timestamp) * 1000).toLocaleString() : '—';
}

export default function EscrowOrders() {
  const { address, isConnected, connect, getSigner } = useWallet();
  const [orders, setOrders] = useState([]);
  const [arbiter, setArbiter] = useState('');
  const [loading, setLoading] = useState(false);
  const [workingOrder, setWorkingOrder] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOrders = useCallback(async () => {
    if (!address) {
      setOrders([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await productsApi.escrowOrders(address);
      setOrders(response.orders || []);
      setArbiter(await getPaymentEscrowReadOnly().arbiter());
    } catch (loadError) {
      setError(loadError.message || 'Escrow order history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const submitAction = async (order, action, argument) => {
    setWorkingOrder(order.id);
    setError('');
    setNotice('');
    try {
      if (!isConnected) {
        await connect();
        setNotice('Wallet connected. Select the escrow action again to submit it.');
        return;
      }
      const signer = await getSigner();
      if ((await signer.provider.getNetwork()).chainId !== BigInt(SEPOLIA_CHAIN_ID_DECIMAL)) {
        throw new Error('Switch MetaMask to Sepolia before updating an escrow order.');
      }
      const escrow = getPaymentEscrowWithSigner(signer);
      const transaction = argument === undefined
        ? await escrow[action](order.id)
        : await escrow[action](order.id, argument);
      setNotice(`Transaction pending: ${transaction.hash}`);
      const receipt = await transaction.wait(1);
      if (receipt.status !== 1) throw new Error('The escrow action reverted on Sepolia.');
      setNotice(`Confirmed on Sepolia: ${transaction.hash}`);
      await loadOrders();
    } catch (actionError) {
      setError(actionError.message || 'Escrow action failed.');
    } finally {
      setWorkingOrder('');
    }
  };

  const resolveDispute = async (order, releaseToSeller) => {
    setWorkingOrder(order.id);
    setError('');
    setNotice('');
    try {
      if (!isConnected) {
        await connect();
        setNotice('Wallet connected. Select the dispute resolution action again to submit it.');
        return;
      }
      const signer = await getSigner();
      if ((await signer.provider.getNetwork()).chainId !== BigInt(SEPOLIA_CHAIN_ID_DECIMAL)) {
        throw new Error('Switch MetaMask to Sepolia before resolving a dispute.');
      }
      const escrow = getPaymentEscrowWithSigner(signer);
      const transaction = await escrow.resolveDispute(order.id, releaseToSeller);
      setNotice(`Dispute resolution pending: ${transaction.hash}`);
      const receipt = await transaction.wait(1);
      if (receipt.status !== 1) throw new Error('Dispute resolution reverted on Sepolia.');
      setNotice(`Dispute resolved on Sepolia: ${releaseToSeller ? 'released to seller' : 'refunded to buyer'}.`);
      await loadOrders();
    } catch (actionError) {
      setError(actionError.message || 'Dispute resolution failed.');
    } finally {
      setWorkingOrder('');
    }
  };

  const wallet = address?.toLowerCase();
  const nowSeconds = Math.floor(Date.now() / 1000);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <header className="border-b border-cream-200 pb-5">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cream-200 text-earth-800 uppercase tracking-wider">
          Sepolia testnet
        </span>
        <h1 className="mt-2 text-3xl font-extrabold text-earth-950">Escrow orders</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Funds are held by the escrow contract. Sellers attest fulfillment; that on-chain action does not
          independently prove physical delivery. Disputed funds remain locked until the configured arbiter decides.
        </p>
      </header>

      {!isConnected && (
        <div className="rounded-2xl border border-gold-300 bg-gold-50 p-4 text-sm">
          <p className="mb-3 text-earth-900">Connect the buyer, seller, or designated arbiter wallet to view its on-chain orders.</p>
          <button
            type="button"
            onClick={connect}
            className="rounded-xl bg-forest-800 px-4 py-2 text-xs font-bold text-white"
          >
            Connect MetaMask
          </button>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="break-all rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-xs text-forest-900">{notice}</div>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading || !address}
          className="inline-flex items-center gap-2 rounded-lg border border-cream-300 px-3 py-2 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh orders
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-stone-500">Reading Sepolia escrow orders…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-cream-200 bg-white p-8 text-center shadow-warm">
          <h2 className="font-bold text-earth-950">No escrow orders found</h2>
          <p className="mt-2 text-sm text-stone-500">Orders for this connected wallet will appear here after a purchase transaction.</p>
          <Link to="/products" className="mt-4 inline-block text-sm font-semibold text-forest-800 underline">Browse marketplace</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = ESCROW_ORDER_STATUS[order.status] || 'unknown';
            const isBuyer = order.buyer.toLowerCase() === wallet;
            const isSeller = order.seller.toLowerCase() === wallet;
            const isArbiter = arbiter && arbiter.toLowerCase() === wallet;
            const canRefund = isBuyer && order.status === 1
              && nowSeconds >= Number(order.purchased_at) + 7 * 24 * 60 * 60;
            const canReleaseByTimeout = order.status === 2 && nowSeconds >= Number(order.review_deadline);
            const busy = workingOrder === order.id;
            const quantity = formatQuantity(order.quantity_hundredths);
            const title = order.product?.title || 'Marketplace listing';

            return (
              <article key={order.id} className="rounded-3xl border border-cream-200 bg-white p-5 shadow-warm space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-earth-950">{title}</h2>
                    <p className="mt-1 text-xs text-stone-500">
                      Order #{order.id} · {quantity} kg · {ethers.formatEther(order.total_wei)} Sepolia ETH
                    </p>
                    {order.product?.batch?.batch_number && (
                      <p className="mt-1 text-xs text-stone-500">Batch {order.product.batch.batch_number}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                    status === 'refunded' ? 'bg-blue-100 text-blue-800'
                      : status === 'released' ? 'bg-forest-100 text-forest-800'
                        : status === 'disputed' ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-900'
                  }`}>
                    {status}
                  </span>
                </div>
                <div className="grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
                  <p>Role: <strong>{isBuyer && isSeller ? 'Buyer and seller' : isBuyer ? 'Buyer' : isSeller ? 'Seller' : 'Arbiter / observer'}</strong></p>
                  <p>Seller fulfillment timestamp: <strong>{formatTimestamp(order.fulfilled_at)}</strong></p>
                  <p>Buyer review deadline: <strong>{formatTimestamp(order.review_deadline)}</strong></p>
                  <p>Purchased: <strong>{formatTimestamp(order.purchased_at)}</strong></p>
                </div>

                {order.status === 3 && isBuyer && (
                  <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-900">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    Dispute opened. Funds are locked pending arbiter resolution. Provide supporting evidence to the marketplace operator through the agreed support channel; evidence is not verified by this contract.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {isSeller && order.status === 1 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submitAction(order, 'markFulfilled')}
                      className="rounded-xl bg-forest-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {busy ? 'Waiting…' : 'Mark fulfillment (seller attestation)'}
                    </button>
                  )}
                  {isBuyer && order.status === 2 && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => submitAction(order, 'confirmFulfillment')}
                        className="rounded-xl bg-forest-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Confirm and release to seller
                      </button>
                      {nowSeconds < Number(order.review_deadline) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => submitAction(order, 'openDispute')}
                          className="rounded-xl border border-red-300 px-3 py-2 text-xs font-bold text-red-800 disabled:opacity-50"
                        >
                          Open dispute
                        </button>
                      )}
                    </>
                  )}
                  {canRefund && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submitAction(order, 'refundAfterFulfillmentTimeout')}
                      className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-bold text-blue-800 disabled:opacity-50"
                    >
                      Refund after 7-day fulfillment timeout
                    </button>
                  )}
                  {canReleaseByTimeout && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submitAction(order, 'releaseAfterReviewTimeout')}
                      className="rounded-xl border border-forest-300 px-3 py-2 text-xs font-bold text-forest-800 disabled:opacity-50"
                    >
                      Release after review timeout
                    </button>
                  )}
                  {order.status === 3 && isArbiter && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => resolveDispute(order, true)}
                        className="rounded-xl border border-forest-300 px-3 py-2 text-xs font-bold text-forest-800 disabled:opacity-50"
                      >
                        Arbiter: release to seller
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => resolveDispute(order, false)}
                        className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-bold text-blue-800 disabled:opacity-50"
                      >
                        Arbiter: refund buyer
                      </button>
                    </>
                  )}
                  {order.product && (
                    <Link
                      to={`/product/${order.product.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-cream-300 px-3 py-2 text-xs font-semibold text-stone-700"
                    >
                      Product <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
