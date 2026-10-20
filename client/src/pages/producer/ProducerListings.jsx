import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, LoaderCircle, PackagePlus, Pause, Play, RefreshCw } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import WalletButton from '../../components/common/WalletButton';
import { useWallet } from '../../context/WalletContext';
import { productsApi } from '../../lib/api';

const emptyForm = {
  batch_id: '',
  title: '',
  description: '',
  price_inr: '',
  quantity_kg: '',
  image_urls: '',
};

export default function ProducerListings() {
  const { address, isConnected, onChainProducer, profile, getSigner } = useWallet();
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === form.batch_id) || editingProduct?.batch || null,
    [batches, form.batch_id, editingProduct]
  );
  const maxQuantity = selectedBatch
    ? Number(selectedBatch.available_stock_kg) - Number(selectedBatch.marketplace_reserved_kg || 0)
      + (editingProduct?.is_active ? Number(editingProduct.available_quantity_kg) : 0)
    : 0;

  const loadData = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const signer = await getSigner();
      const result = await productsApi.manage(signer);
      setProducts(result.products || []);
      setBatches(result.batches || []);
      setLoaded(true);
      setNotice('Wallet signature verified. Listings and eligible batches are up to date.');
    } catch (loadError) {
      setError(loadError.message || 'Could not load producer listings.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (product) => {
    setEditingProduct(product);
    setSelectedStatus(product.is_active && product.listing_status !== 'sold_out');
    setForm({
      batch_id: product.batch_id,
      title: product.title,
      description: product.description || '',
      price_inr: String(product.price_inr),
      quantity_kg: String(product.available_quantity_kg),
      image_urls: (product.image_urls || (product.package_image_url ? [product.package_image_url] : [])).join(', '),
    });
    setError('');
    setNotice('');
  };

  const resetForm = () => {
    setEditingProduct(null);
    setSelectedStatus(true);
    setForm(emptyForm);
  };

  const parseImageUrls = (value) => value.split(',').map((url) => url.trim()).filter(Boolean);

  const saveListing = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const imageUrls = parseImageUrls(form.image_urls);
    const payload = {
      ...(editingProduct ? {} : { batch_id: form.batch_id }),
      title: form.title.trim(),
      description: form.description.trim(),
      price_inr: Number(form.price_inr),
      quantity_kg: Number(form.quantity_kg),
      image_urls: imageUrls,
      ...(editingProduct ? { is_active: selectedStatus } : {}),
    };
    if (!payload.title || !Number.isFinite(payload.price_inr) || payload.price_inr < 0.01 || payload.price_inr > 1000000
        || Math.abs(Math.round(payload.price_inr * 100) - payload.price_inr * 100) > 1e-8
        || !Number.isFinite(payload.quantity_kg) || payload.quantity_kg <= 0 || payload.quantity_kg > 100000
        || Math.abs(Math.round(payload.quantity_kg * 100) - payload.quantity_kg * 100) > 1e-8
        || (selectedBatch && payload.quantity_kg > maxQuantity)
        || imageUrls.length > 8) {
      setError('Enter a title, price from ₹0.01 to ₹1,000,000/kg, valid quantity within unlisted stock, and at most 8 image URLs.');
      return;
    }

    setSaving(true);
    try {
      const signer = await getSigner();
      if (editingProduct) {
        const response = await productsApi.update(editingProduct.id, payload, signer);
        const oldQuantity = Number(editingProduct.available_quantity_kg);
        const reservationDelta = selectedStatus
          ? editingProduct.is_active ? payload.quantity_kg - oldQuantity : payload.quantity_kg
          : editingProduct.is_active ? -oldQuantity : 0;
        setProducts((current) => current.map((item) => item.id === response.product.id
          ? { ...response.product, batch: item.batch }
          : item));
        setBatches((current) => current.map((batch) => batch.id === editingProduct.batch_id
          ? { ...batch, marketplace_reserved_kg: Number(batch.marketplace_reserved_kg || 0) + reservationDelta }
          : batch));
        setNotice('Listing updated.');
      } else {
        const response = await productsApi.create(payload, signer);
        setProducts((current) => [{ ...response.product, batch: selectedBatch }, ...current]);
        setBatches((current) => current.map((batch) => batch.id === selectedBatch.id
          ? { ...batch, marketplace_reserved_kg: Number(batch.marketplace_reserved_kg || 0) + payload.quantity_kg }
          : batch));
        setNotice('Listing published. Its batch status remains authoritative on-chain.');
      }
      resetForm();
    } catch (saveError) {
      setError(saveError.message || 'Could not save this listing.');
    } finally {
      setSaving(false);
    }
  };

  const toggleListing = async (product) => {
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const signer = await getSigner();
      const response = await productsApi.update(product.id, {
        title: product.title,
        description: product.description || '',
        price_inr: Number(product.price_inr),
        quantity_kg: Number(product.available_quantity_kg),
        image_urls: product.image_urls || (product.package_image_url ? [product.package_image_url] : []),
        is_active: !product.is_active,
      }, signer);
      const reservationDelta = product.is_active
        ? -Number(product.available_quantity_kg)
        : Number(product.available_quantity_kg);
      setProducts((current) => current.map((item) => item.id === response.product.id
        ? { ...response.product, batch: item.batch }
        : item));
      setBatches((current) => current.map((batch) => batch.id === product.batch_id
        ? { ...batch, marketplace_reserved_kg: Number(batch.marketplace_reserved_kg || 0) + reservationDelta }
        : batch));
      setNotice(response.product.is_active ? 'Listing reactivated.' : 'Listing paused and its remaining quantity released.');
    } catch (toggleError) {
      setError(toggleError.message || 'Could not change listing status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-5">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
            Producer Marketplace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">Product Listings</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Publish inventory from hash-matched, packaged batches and manage availability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WalletButton />
          <button
            type="button"
            onClick={loadData}
            disabled={!isConnected || loading || saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold disabled:opacity-50"
          >
            {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loaded ? 'Refresh' : 'Load my listings'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-4 text-xs text-stone-600">
        <span className="font-bold text-earth-950">Wallet authorization:</span>{' '}
        {address ? `${address.slice(0, 6)}…${address.slice(-4)} · ` : 'Not connected · '}
        ProducerRegistry status: <strong>{onChainProducer.statusText}</strong>
        {profile?.role && <> · Profile role: <strong>{profile.role}</strong></>}
        <p className="mt-1">
          Each management request is signed by your wallet. Publishing and reactivating require a currently
          verified producer and a batch in Packaged or Listed state on Sepolia.
        </p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-xs text-forest-900">{notice}</div>}

      {loaded && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
          <section className="xl:col-span-2 bg-white rounded-3xl p-6 border border-cream-200 shadow-warm">
            <div className="flex items-center gap-2 border-b border-cream-100 pb-4 mb-4">
              <PackagePlus className="w-4 h-4 text-forest-700" />
              <h2 className="font-bold text-sm text-earth-950">
                {editingProduct ? 'Edit listing' : 'Create listing'}
              </h2>
            </div>
            <form onSubmit={saveListing} className="space-y-3">
              {!editingProduct && (
                <label className="block text-xs font-semibold text-stone-600">
                  Eligible batch
                  <select
                    required
                    value={form.batch_id}
                    onChange={(event) => setForm((current) => ({ ...current, batch_id: event.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-cream-300 bg-white text-xs"
                  >
                    <option value="">Select a packaged batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batch_number} · {batch.chain_status} · {batch.available_stock_kg} kg stock
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {editingProduct && (
                <div className="rounded-xl bg-cream-50 border border-cream-200 p-3 text-xs">
                  Batch {editingProduct.batch?.batch_number || editingProduct.batch_id} · {editingProduct.batch?.status || 'linked'}
                </div>
              )}
              {[
                ['title', 'Product title', 'text'],
                ['price_inr', 'Price per kilogram (INR)', 'number'],
                ['quantity_kg', 'Available quantity (kg)', 'number'],
              ].map(([name, label, type]) => (
                <label key={name} className="block text-xs font-semibold text-stone-600">
                  {label}
                  <input
                    required
                    type={type}
                    min={name === 'price_inr' ? '0.01' : name === 'quantity_kg' ? '0.01' : undefined}
                    max={name === 'price_inr' ? '1000000' : name === 'quantity_kg' ? maxQuantity : undefined}
                    step={type === 'number' ? '0.01' : undefined}
                    value={form[name]}
                    onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-cream-300 text-xs"
                  />
                </label>
              ))}
              {selectedBatch && (
                <p className="text-[11px] text-stone-500">
                  Unlisted inventory available for this listing: {maxQuantity.toFixed(2)} kg
                </p>
              )}
              <label className="block text-xs font-semibold text-stone-600">
                Description
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-cream-300 text-xs"
                />
              </label>
              <label className="block text-xs font-semibold text-stone-600">
                Image URLs (comma separated, up to 8)
                <input
                  type="text"
                  value={form.image_urls}
                  onChange={(event) => setForm((current) => ({ ...current, image_urls: event.target.value }))}
                  placeholder="https://…"
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-cream-300 text-xs"
                />
              </label>
              {editingProduct && (
                <label className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                  <input type="checkbox" checked={selectedStatus} onChange={(event) => setSelectedStatus(event.target.checked)} />
                  Listing active
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="flex-1 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingProduct ? 'Save changes' : 'Publish listing'}
                </button>
                {editingProduct && (
                  <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl border border-cream-300 text-xs font-semibold">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            {batches.length === 0 && (
              <p className="mt-4 text-xs text-stone-500">
                No eligible batch is available. A producer must have a hash-matched batch in Packaged or Listed on-chain status.
                <Link to="/producer/batches" className="ml-1 text-forest-800 underline">Review batches</Link>.
              </p>
            )}
          </section>

          <section className="xl:col-span-3 bg-white rounded-3xl border border-cream-200 shadow-warm overflow-hidden">
            <div className="p-5 border-b border-cream-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-earth-950">Your listings ({products.length})</h2>
              <span className="text-[11px] text-stone-500">Stock updates are transactional</span>
            </div>
            {products.length === 0 ? (
              <EmptyState
                title="No product listings yet"
                description="Select an eligible packaged batch and publish your first product."
              />
            ) : (
              <div className="divide-y divide-cream-100">
                {products.map((product) => {
                  const status = product.listing_status || (product.is_active ? 'active' : 'paused');
                  return (
                    <article key={product.id} className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-sm text-earth-950">{product.title}</h3>
                          <p className="text-[11px] text-stone-500 mt-1">
                            Batch {product.batch?.batch_number || '—'} · ₹{Number(product.price_inr).toFixed(2)}/kg
                          </p>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          status === 'active' ? 'bg-forest-100 text-forest-800'
                            : status === 'sold_out' ? 'bg-red-100 text-red-800'
                              : 'bg-cream-200 text-stone-700'
                        }`}>
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-stone-600">
                        <span>Available: <strong>{Number(product.available_quantity_kg).toFixed(2)} kg</strong></span>
                        <Link to={`/product/${product.id}`} className="inline-flex items-center gap-1 text-forest-700 underline">
                          View product <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(product)}
                          className="px-3 py-2 rounded-lg border border-cream-300 text-xs font-semibold text-stone-700"
                        >
                          Edit details
                        </button>
                        {status !== 'sold_out' && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => toggleListing(product)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-cream-300 text-xs font-semibold text-stone-700 disabled:opacity-50"
                          >
                            {product.is_active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            {product.is_active ? 'Pause listing' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {!loaded && !loading && (
        <EmptyState
          title="Sign to load your listings"
          description="A wallet signature proves ownership of your producer account. The signature is only used to authorize this request."
          actionLabel={isConnected ? 'Load my listings' : undefined}
          onAction={isConnected ? loadData : undefined}
        />
      )}

      {loaded && products.length > 0 && (
        <div className="inline-flex items-center gap-2 text-[11px] text-stone-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-forest-700" />
          Product data is stored in Supabase; batch lifecycle status is read from the public Sepolia contract.
        </div>
      )}
    </div>
  );
}
