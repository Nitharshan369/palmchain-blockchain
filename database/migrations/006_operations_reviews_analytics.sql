-- Operational dashboards, audit history, and purchase reviews.
-- Apply after migrations 001-005.

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS production_cost_inr NUMERIC(14, 2);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_wallet VARCHAR(42) NOT NULL,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  transaction_hash VARCHAR(66),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  escrow_order_id NUMERIC(78, 0) NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_wallet_address VARCHAR(42) NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL DEFAULT '' CHECK (length(review_text) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (escrow_order_id),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON public.reviews(customer_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read producer reviews" ON public.reviews;
CREATE POLICY "Public can read producer reviews" ON public.reviews
  FOR SELECT USING (true);

-- All writes to audit_logs and reviews go through the server service role after
-- wallet signature and on-chain eligibility checks.
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.reviews FROM PUBLIC, anon, authenticated;

-- The browser never writes privileged operational tables directly. The API
-- uses service_role only after wallet signature, role, and chain checks.
REVOKE INSERT, UPDATE, DELETE ON public.profiles, public.farms, public.batches,
  public.batch_trace_logs, public.products, public.orders, public.order_items
  FROM anon, authenticated;

-- Orders contain customer identity and delivery information. They must never be
-- publicly readable through the browser's Supabase roles; the signed server API
-- returns only the records a wallet is allowed to see.
DROP POLICY IF EXISTS "Customer can read their orders" ON public.orders;
DROP POLICY IF EXISTS "Customer can read their order items" ON public.order_items;
REVOKE SELECT ON public.orders, public.order_items FROM anon, authenticated;

COMMENT ON COLUMN public.batches.production_cost_inr IS
  'Optional producer-entered cost basis in INR; never derived from Sepolia ETH.';
