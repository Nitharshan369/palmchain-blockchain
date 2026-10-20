-- Testnet-only escrow listing metadata and receipt-backed order settlement.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS payment_price_per_kg_wei NUMERIC(39, 0),
  ADD COLUMN IF NOT EXISTS escrow_listing_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escrow_synced_quantity_kg DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS escrow_order_id NUMERIC(78, 0),
  ADD COLUMN IF NOT EXISTS payment_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS buyer_wallet_address VARCHAR(42),
  ADD COLUMN IF NOT EXISTS seller_wallet_address VARCHAR(42),
  ADD COLUMN IF NOT EXISTS payment_amount_wei NUMERIC(78, 0),
  ADD COLUMN IF NOT EXISTS payment_price_per_kg_wei NUMERIC(39, 0),
  ADD COLUMN IF NOT EXISTS payment_asset TEXT NOT NULL DEFAULT 'Sepolia ETH';

-- Escrow settlement is testnet ETH-only; normalize rows created by the
-- legacy payment-free marketplace migration.
UPDATE public.orders
SET payment_asset = 'Sepolia ETH'
WHERE payment_asset IS NULL OR payment_asset = 'INR';

CREATE UNIQUE INDEX IF NOT EXISTS orders_escrow_order_id_unique
  ON public.orders (escrow_order_id)
  WHERE escrow_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_tx_hash_unique
  ON public.orders (payment_tx_hash)
  WHERE payment_tx_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.settle_marketplace_escrow_purchase(
  p_product_id UUID,
  p_quantity_kg NUMERIC,
  p_escrow_order_id NUMERIC,
  p_payment_tx_hash TEXT,
  p_buyer_wallet_address VARCHAR,
  p_seller_wallet_address VARCHAR,
  p_payment_amount_wei NUMERIC,
  p_payment_price_per_kg_wei NUMERIC
) RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_product public.products%ROWTYPE;
  selected_batch public.batches%ROWTYPE;
  buyer_profile_id UUID;
  new_order public.orders%ROWTYPE;
BEGIN
  IF p_quantity_kg IS NULL OR p_quantity_kg <= 0
     OR p_quantity_kg > 100000 OR round(p_quantity_kg, 2) <> p_quantity_kg THEN
    RAISE EXCEPTION 'Confirmed order quantity is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_escrow_order_id IS NULL OR p_escrow_order_id <= 0
     OR p_payment_amount_wei IS NULL OR p_payment_amount_wei <= 0
     OR p_payment_price_per_kg_wei IS NULL OR p_payment_price_per_kg_wei <= 0
     OR p_payment_tx_hash IS NULL OR p_payment_tx_hash !~ '^0x[0-9a-fA-F]{64}$' THEN
    RAISE EXCEPTION 'Confirmed chain payment details are invalid' USING ERRCODE = '22023';
  END IF;
  IF CEIL(p_payment_price_per_kg_wei * p_quantity_kg) <> p_payment_amount_wei THEN
    RAISE EXCEPTION 'Confirmed chain payment amount does not match the listed ETH price' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO new_order
  FROM public.orders
  WHERE payment_tx_hash = lower(p_payment_tx_hash);
  IF FOUND THEN
    IF new_order.escrow_order_id <> p_escrow_order_id
       OR new_order.payment_amount_wei <> p_payment_amount_wei
       OR new_order.seller_wallet_address <> lower(p_seller_wallet_address)
       OR new_order.buyer_wallet_address <> lower(p_buyer_wallet_address)
       OR NOT EXISTS (
         SELECT 1 FROM public.order_items
         WHERE order_id = new_order.id
           AND product_id = p_product_id
           AND quantity = p_quantity_kg
       ) THEN
      RAISE EXCEPTION 'Transaction hash was already settled with different order data' USING ERRCODE = '23505';
    END IF;
    RETURN new_order;
  END IF;

  SELECT * INTO selected_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product does not exist' USING ERRCODE = '22023';
  END IF;

  -- Recheck idempotency after obtaining the row lock to serialize receipt retries.
  SELECT * INTO new_order
  FROM public.orders
  WHERE payment_tx_hash = lower(p_payment_tx_hash);
  IF FOUND THEN
    IF new_order.escrow_order_id <> p_escrow_order_id
       OR new_order.payment_amount_wei <> p_payment_amount_wei
       OR new_order.seller_wallet_address <> lower(p_seller_wallet_address)
       OR new_order.buyer_wallet_address <> lower(p_buyer_wallet_address)
       OR NOT EXISTS (
         SELECT 1 FROM public.order_items
         WHERE order_id = new_order.id
           AND product_id = p_product_id
           AND quantity = p_quantity_kg
       ) THEN
      RAISE EXCEPTION 'Transaction hash was already settled with different order data' USING ERRCODE = '23505';
    END IF;
    RETURN new_order;
  END IF;

  IF selected_product.producer_id IS NULL THEN
    RAISE EXCEPTION 'Product has no seller' USING ERRCODE = '22023';
  END IF;
  IF selected_product.available_quantity_kg < p_quantity_kg THEN
    RAISE EXCEPTION 'Confirmed chain purchases exceed application inventory' USING ERRCODE = '22023';
  END IF;
  IF lower(p_seller_wallet_address) <> lower((
    SELECT wallet_address FROM public.profiles WHERE id = selected_product.producer_id
  )) THEN
    RAISE EXCEPTION 'On-chain seller does not own this product listing' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO selected_batch
  FROM public.batches
  WHERE id = selected_product.batch_id
  FOR UPDATE;
  IF NOT FOUND OR selected_batch.available_stock_kg < p_quantity_kg
     OR selected_batch.marketplace_reserved_kg < p_quantity_kg THEN
    RAISE EXCEPTION 'Confirmed chain purchase exceeds batch inventory' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO buyer_profile_id
  FROM public.profiles
  WHERE lower(wallet_address) = lower(p_buyer_wallet_address)
  LIMIT 1;

  INSERT INTO public.orders (
    customer_id, total_amount_inr, payment_status, shipping_address,
    escrow_order_id, payment_tx_hash, buyer_wallet_address, seller_wallet_address,
    payment_amount_wei, payment_price_per_kg_wei, payment_asset
  ) VALUES (
    buyer_profile_id,
    round(selected_product.price_inr * p_quantity_kg, 2),
    'escrowed',
    '{}'::jsonb,
    p_escrow_order_id,
    lower(p_payment_tx_hash),
    lower(p_buyer_wallet_address),
    lower(p_seller_wallet_address),
    p_payment_amount_wei,
    p_payment_price_per_kg_wei,
    'Sepolia ETH'
  )
  RETURNING * INTO new_order;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price_inr)
  VALUES (new_order.id, selected_product.id, p_quantity_kg, selected_product.price_inr);

  UPDATE public.products
  SET available_quantity_kg = available_quantity_kg - p_quantity_kg,
      escrow_synced_quantity_kg = available_quantity_kg - p_quantity_kg,
      listing_status = CASE
        WHEN available_quantity_kg - p_quantity_kg = 0 THEN 'sold_out'
        ELSE listing_status
      END,
      is_active = is_active AND available_quantity_kg - p_quantity_kg > 0,
      updated_at = NOW()
  WHERE id = selected_product.id;

  UPDATE public.batches
  SET available_stock_kg = available_stock_kg - p_quantity_kg,
      marketplace_reserved_kg = marketplace_reserved_kg - p_quantity_kg,
      updated_at = NOW()
  WHERE id = selected_product.batch_id;

  RETURN new_order;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_marketplace_escrow_purchase(UUID, NUMERIC, NUMERIC, TEXT, VARCHAR, VARCHAR, NUMERIC, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_marketplace_escrow_purchase(UUID, NUMERIC, NUMERIC, TEXT, VARCHAR, VARCHAR, NUMERIC, NUMERIC)
  TO service_role;

REVOKE ALL ON FUNCTION public.purchase_marketplace_product(UUID, NUMERIC, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
