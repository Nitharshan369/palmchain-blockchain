-- Marketplace listings, inventory reservations, and payment-free purchase orders.

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS marketplace_reserved_kg DECIMAL(10, 2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_wallet_address_unique
  ON public.profiles (wallet_address);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS available_quantity_kg DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS listing_status TEXT NOT NULL DEFAULT 'active'
    CHECK (listing_status IN ('active', 'paused', 'sold_out'));

ALTER TABLE public.orders
  ALTER COLUMN customer_id DROP NOT NULL,
  ALTER COLUMN shipping_address SET DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS request_key UUID UNIQUE,
  ALTER COLUMN total_amount_inr TYPE DECIMAL(14, 2);

ALTER TABLE public.order_items
  ALTER COLUMN quantity TYPE DECIMAL(10, 2) USING quantity::DECIMAL(10, 2);

WITH ranked_products AS (
  SELECT
    p.id,
    p.batch_id,
    b.available_stock_kg,
    row_number() OVER (PARTITION BY p.batch_id ORDER BY p.created_at, p.id) AS position
  FROM public.products p
  JOIN public.batches b ON b.id = p.batch_id
  WHERE p.is_active = true
)
UPDATE public.products p
SET
  available_quantity_kg = CASE WHEN ranked.position = 1 THEN ranked.available_stock_kg ELSE 0 END,
  image_urls = CASE
    WHEN p.package_image_url IS NULL OR p.package_image_url = '' THEN '{}'
    ELSE ARRAY[p.package_image_url]
  END,
  listing_status = CASE
    WHEN ranked.position = 1 AND ranked.available_stock_kg > 0 THEN 'active'
    ELSE 'paused'
  END,
  is_active = ranked.position = 1 AND ranked.available_stock_kg > 0
FROM ranked_products ranked
WHERE p.id = ranked.id;

UPDATE public.batches b
SET marketplace_reserved_kg = COALESCE((
  SELECT SUM(p.available_quantity_kg)
  FROM public.products p
  WHERE p.batch_id = b.id AND p.is_active = true
), 0);

ALTER TABLE public.batches
  ADD CONSTRAINT batches_marketplace_reserved_nonnegative
  CHECK (marketplace_reserved_kg >= 0 AND marketplace_reserved_kg <= available_stock_kg);

ALTER TABLE public.products
  ADD CONSTRAINT products_available_quantity_nonnegative
  CHECK (available_quantity_kg >= 0),
  ADD CONSTRAINT products_price_positive
  CHECK (price_inr > 0);

CREATE INDEX IF NOT EXISTS idx_products_listing_status
  ON public.products (listing_status, is_active);

CREATE TABLE IF NOT EXISTS public.marketplace_request_nonces (
  nonce UUID PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketplace_request_nonces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Producer can create product listings" ON public.products;
DROP POLICY IF EXISTS "Producer can update product listings" ON public.products;
DROP POLICY IF EXISTS "Allow public read access to active marketplace products" ON public.products;

DROP POLICY IF EXISTS "Customer can read their orders" ON public.orders;
DROP POLICY IF EXISTS "Customer can create orders" ON public.orders;
DROP POLICY IF EXISTS "Customer can read their order items" ON public.order_items;
DROP POLICY IF EXISTS "Customer can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Wallet owner can create their profile" ON public.profiles;
DROP POLICY IF EXISTS "Wallet owner can update their profile" ON public.profiles;
DROP POLICY IF EXISTS "Producer can create farms" ON public.farms;
DROP POLICY IF EXISTS "Producer can update their farms" ON public.farms;

CREATE OR REPLACE FUNCTION public.create_marketplace_listing(
  p_batch_id UUID,
  p_producer_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_price_inr NUMERIC,
  p_quantity_kg NUMERIC,
  p_image_urls TEXT[]
) RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_batch public.batches%ROWTYPE;
  new_product public.products%ROWTYPE;
BEGIN
  IF p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'Title must contain 1 to 255 characters' USING ERRCODE = '22023';
  END IF;
  IF p_price_inr IS NULL OR p_price_inr < 0.01 OR p_price_inr > 1000000 THEN
    RAISE EXCEPTION 'Price per kg must be between 0.01 and 1000000 INR' USING ERRCODE = '22023';
  END IF;
  IF round(p_price_inr, 2) <> p_price_inr THEN
    RAISE EXCEPTION 'Price per kg can have no more than 2 decimal places' USING ERRCODE = '22023';
  END IF;
  IF p_quantity_kg IS NULL OR p_quantity_kg <= 0 OR p_quantity_kg > 100000 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0 and at most 100000 kg' USING ERRCODE = '22023';
  END IF;
  IF round(p_quantity_kg, 2) <> p_quantity_kg THEN
    RAISE EXCEPTION 'Quantity can have no more than 2 decimal places' USING ERRCODE = '22023';
  END IF;
  IF p_image_urls IS NULL OR cardinality(p_image_urls) > 8 THEN
    RAISE EXCEPTION 'A maximum of 8 product images is allowed' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_image_urls) image_url WHERE length(image_url) > 2048) THEN
    RAISE EXCEPTION 'Product image URLs must not exceed 2048 characters' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO selected_batch
  FROM public.batches
  WHERE id = p_batch_id AND producer_id = p_producer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch does not belong to this producer' USING ERRCODE = '42501';
  END IF;
  IF selected_batch.available_stock_kg - selected_batch.marketplace_reserved_kg < p_quantity_kg THEN
    RAISE EXCEPTION 'Insufficient unlisted batch inventory' USING ERRCODE = '22023';
  END IF;

  UPDATE public.batches
  SET marketplace_reserved_kg = marketplace_reserved_kg + p_quantity_kg,
      updated_at = NOW()
  WHERE id = p_batch_id;

  INSERT INTO public.products (
    batch_id, producer_id, title, description, price_inr,
    available_quantity_kg, image_urls, package_image_url, is_active, listing_status
  ) VALUES (
    p_batch_id, p_producer_id, trim(p_title), p_description, p_price_inr,
    p_quantity_kg, p_image_urls, p_image_urls[1], true, 'active'
  )
  RETURNING * INTO new_product;

  RETURN new_product;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_marketplace_listing(
  p_product_id UUID,
  p_producer_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_price_inr NUMERIC,
  p_quantity_kg NUMERIC,
  p_image_urls TEXT[],
  p_is_active BOOLEAN
) RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_product public.products%ROWTYPE;
  selected_batch public.batches%ROWTYPE;
  reservation_delta NUMERIC(10, 2);
  new_product public.products%ROWTYPE;
BEGIN
  IF p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'Title must contain 1 to 255 characters' USING ERRCODE = '22023';
  END IF;
  IF p_price_inr IS NULL OR p_price_inr < 0.01 OR p_price_inr > 1000000 THEN
    RAISE EXCEPTION 'Price per kg must be between 0.01 and 1000000 INR' USING ERRCODE = '22023';
  END IF;
  IF round(p_price_inr, 2) <> p_price_inr THEN
    RAISE EXCEPTION 'Price per kg can have no more than 2 decimal places' USING ERRCODE = '22023';
  END IF;
  IF p_quantity_kg IS NULL OR p_quantity_kg <= 0 OR p_quantity_kg > 100000 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0 and at most 100000 kg' USING ERRCODE = '22023';
  END IF;
  IF round(p_quantity_kg, 2) <> p_quantity_kg THEN
    RAISE EXCEPTION 'Quantity can have no more than 2 decimal places' USING ERRCODE = '22023';
  END IF;
  IF p_image_urls IS NULL OR cardinality(p_image_urls) > 8 THEN
    RAISE EXCEPTION 'A maximum of 8 product images is allowed' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_image_urls) image_url WHERE length(image_url) > 2048) THEN
    RAISE EXCEPTION 'Product image URLs must not exceed 2048 characters' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO selected_product
  FROM public.products
  WHERE id = p_product_id AND producer_id = p_producer_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing does not belong to this producer' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO selected_batch
  FROM public.batches
  WHERE id = selected_product.batch_id
  FOR UPDATE;

  reservation_delta := CASE
    WHEN p_is_active AND selected_product.is_active THEN p_quantity_kg - selected_product.available_quantity_kg
    WHEN p_is_active THEN p_quantity_kg
    WHEN selected_product.is_active THEN -selected_product.available_quantity_kg
    ELSE 0
  END;

  IF reservation_delta > selected_batch.available_stock_kg - selected_batch.marketplace_reserved_kg THEN
    RAISE EXCEPTION 'Insufficient unlisted batch inventory' USING ERRCODE = '22023';
  END IF;

  UPDATE public.batches
  SET marketplace_reserved_kg = marketplace_reserved_kg + reservation_delta,
      updated_at = NOW()
  WHERE id = selected_product.batch_id;

  UPDATE public.products
  SET title = trim(p_title),
      description = p_description,
      price_inr = p_price_inr,
      available_quantity_kg = p_quantity_kg,
      image_urls = p_image_urls,
      package_image_url = p_image_urls[1],
      is_active = p_is_active,
      listing_status = CASE WHEN NOT p_is_active THEN 'paused'
                            WHEN p_quantity_kg = 0 THEN 'sold_out'
                            ELSE 'active' END,
      updated_at = NOW()
  WHERE id = p_product_id
  RETURNING * INTO new_product;

  RETURN new_product;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_marketplace_product(
  p_product_id UUID,
  p_quantity_kg NUMERIC,
  p_request_key UUID
) RETURNS TABLE(order_id UUID, total_amount_inr NUMERIC, remaining_quantity_kg NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_product public.products%ROWTYPE;
  selected_batch public.batches%ROWTYPE;
  new_order_id UUID;
  new_total NUMERIC(14, 2);
  existing_product_id UUID;
  existing_quantity NUMERIC(10, 2);
BEGIN
  IF p_request_key IS NULL THEN
    RAISE EXCEPTION 'Request key is required' USING ERRCODE = '22023';
  END IF;
  IF p_quantity_kg IS NULL OR p_quantity_kg <= 0 OR p_quantity_kg > 100000 THEN
    RAISE EXCEPTION 'Purchase quantity must be greater than 0 and at most 100000 kg' USING ERRCODE = '22023';
  END IF;
  IF round(p_quantity_kg, 2) <> p_quantity_kg THEN
    RAISE EXCEPTION 'Purchase quantity can have no more than 2 decimal places' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO selected_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product does not exist' USING ERRCODE = '22023';
  END IF;

  SELECT o.id, o.total_amount_inr INTO new_order_id, new_total
  FROM public.orders o WHERE o.request_key = p_request_key;
  IF FOUND THEN
    SELECT oi.product_id, oi.quantity INTO existing_product_id, existing_quantity
    FROM public.order_items oi WHERE oi.order_id = new_order_id;
    IF existing_product_id <> p_product_id OR existing_quantity <> p_quantity_kg THEN
      RAISE EXCEPTION 'Request key was already used for a different order' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY
      SELECT new_order_id, new_total, selected_product.available_quantity_kg;
    RETURN;
  END IF;

  IF NOT selected_product.is_active OR selected_product.listing_status <> 'active' THEN
    RAISE EXCEPTION 'Product is not currently available' USING ERRCODE = '22023';
  END IF;
  IF selected_product.available_quantity_kg < p_quantity_kg THEN
    RAISE EXCEPTION 'Insufficient product inventory' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO selected_batch
  FROM public.batches
  WHERE id = selected_product.batch_id
  FOR UPDATE;
  IF selected_batch.available_stock_kg < p_quantity_kg
     OR selected_batch.marketplace_reserved_kg < p_quantity_kg THEN
    RAISE EXCEPTION 'Insufficient batch inventory' USING ERRCODE = '22023';
  END IF;

  new_total := round(selected_product.price_inr * p_quantity_kg, 2);
  INSERT INTO public.orders (
    customer_id, total_amount_inr, payment_status, shipping_address, request_key
  ) VALUES (
    NULL, new_total, 'pending', '{}'::jsonb, p_request_key
  )
  ON CONFLICT (request_key) DO NOTHING
  RETURNING id INTO new_order_id;

  IF new_order_id IS NULL THEN
    SELECT o.id, o.total_amount_inr INTO new_order_id, new_total
    FROM public.orders o WHERE o.request_key = p_request_key;
    SELECT oi.product_id, oi.quantity INTO existing_product_id, existing_quantity
    FROM public.order_items oi WHERE oi.order_id = new_order_id;
    IF existing_product_id <> p_product_id OR existing_quantity <> p_quantity_kg THEN
      RAISE EXCEPTION 'Request key was already used for a different order' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY
      SELECT new_order_id, new_total,
        (SELECT p.available_quantity_kg FROM public.products p WHERE p.id = p_product_id);
    RETURN;
  END IF;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price_inr)
  VALUES (new_order_id, p_product_id, p_quantity_kg, selected_product.price_inr);

  UPDATE public.products
  SET available_quantity_kg = available_quantity_kg - p_quantity_kg,
      listing_status = CASE
        WHEN available_quantity_kg - p_quantity_kg = 0 THEN 'sold_out'
        ELSE 'active'
      END,
      is_active = available_quantity_kg - p_quantity_kg > 0,
      updated_at = NOW()
  WHERE id = p_product_id;

  UPDATE public.batches
  SET available_stock_kg = available_stock_kg - p_quantity_kg,
      marketplace_reserved_kg = marketplace_reserved_kg - p_quantity_kg,
      updated_at = NOW()
  WHERE id = selected_product.batch_id;

  RETURN QUERY
    SELECT new_order_id, new_total,
      (SELECT p.available_quantity_kg FROM public.products p WHERE p.id = p_product_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_marketplace_listing(UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_marketplace_listing(UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT[], BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purchase_marketplace_product(UUID, NUMERIC, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_marketplace_listing(UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_marketplace_listing(UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT[], BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_marketplace_product(UUID, NUMERIC, UUID) TO service_role;
