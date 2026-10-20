export function normalizeProduct(row) {
  const batch = row.batch || {};
  const producer = row.producer || batch.producer || {};
  const farm = batch.farm || {};
  const location = [farm.region, farm.state].filter(Boolean).join(', ') || 'Location not provided';
  const images = Array.isArray(row.image_urls) && row.image_urls.length > 0
    ? row.image_urls
    : row.package_image_url
      ? [row.package_image_url]
      : [];
  const pricePerKg = Number(row.price_inr) || 0;

  return {
    ...row,
    title: row.title || 'Palm jaggery',
    description: row.description || '',
    pricePerKg,
    price: pricePerKg,
    stockKg: Number(row.available_quantity_kg) || 0,
    image: images[0] || '',
    images,
    batchId: batch.batch_number || 'Batch unavailable',
    form: String(batch.form || 'Palm jaggery').replaceAll('_', ' '),
    purityVerified: Boolean(batch.is_certified || ['Packaged', 'Listed'].includes(row.chain_status)),
    chainStatus: row.chain_status || batch.chain_status || 'Unknown',
    producer: {
      name: producer.organization_name || producer.full_name || 'PalmChain Producer',
      location,
      walletAddress: producer.wallet_address || '',
    },
    timeline: (batch.batch_trace_logs?.length ? batch.batch_trace_logs : batch.canonical_metadata?.stages || []).map((stage) => ({
      step: stage.stage_order ?? stage.order,
      title: stage.stage_name || stage.name,
      description: stage.notes || '',
      date: stage.stage_timestamp || stage.date || '',
      location: stage.location_name || stage.location || farm.region || '',
      parameters: stage.metadata || stage.parameters || {},
    })),
  };
}

export function filterProducts(products, {
  searchQuery = '',
  selectedForm = 'all',
  certifiedOnly = false,
  priceRange = 'all',
  selectedRegion = 'all',
  sortBy = 'featured',
} = {}) {
  const query = searchQuery.trim().toLocaleLowerCase();
  return products
    .filter((product) => {
      const producer = product.producer || {};
      const searchableText = [
        product.title,
        product.description,
        product.batchId,
        producer.name,
        producer.location,
      ].join(' ').toLocaleLowerCase();
      const form = String(product.form || '').toLocaleLowerCase();
      const location = String(producer.location || '').toLocaleLowerCase();
      const price = Number(product.pricePerKg ?? product.price_inr ?? 0);

      const matchesPrice = priceRange === 'under200'
        ? price < 200
        : priceRange === '200to300'
          ? price >= 200 && price <= 300
          : priceRange === 'above300'
            ? price > 300
            : true;

      return (!query || searchableText.includes(query))
        && (selectedForm === 'all' || form.includes(selectedForm.toLocaleLowerCase()))
        && (!certifiedOnly || product.purityVerified)
        && matchesPrice
        && (selectedRegion === 'all' || location.includes(selectedRegion.toLocaleLowerCase()));
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.pricePerKg - b.pricePerKg;
      if (sortBy === 'price-high') return b.pricePerKg - a.pricePerKg;
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return 0;
    });
}
