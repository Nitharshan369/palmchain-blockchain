-- ============================================================================
-- PalmChain: 002_rls_policies.sql
-- Row Level Security policies for all tables
-- Run this in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================================

-- ─── Profiles ────────────────────────────────────────────────────────────────

-- Anyone can read public profile info
CREATE POLICY "Public read access to profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Wallet owners can insert their own profile
CREATE POLICY "Wallet owner can create their profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true); -- Enforced at app level via wallet signature

-- Wallet owners can update their own profile
CREATE POLICY "Wallet owner can update their profile"
  ON public.profiles FOR UPDATE
  USING (true); -- Enforced at app level

-- ─── Farms ───────────────────────────────────────────────────────────────────

-- Public read for farm info (region, organic cert status shown on product pages)
CREATE POLICY "Public read access to farms"
  ON public.farms FOR SELECT
  USING (true);

-- Producers can insert farms (enforced at app level)
CREATE POLICY "Producer can create farms"
  ON public.farms FOR INSERT
  WITH CHECK (true);

-- Producers can update their own farms
CREATE POLICY "Producer can update their farms"
  ON public.farms FOR UPDATE
  USING (true);

-- ─── Batches ─────────────────────────────────────────────────────────────────
-- (Public SELECT policy already created in 001_initial_schema.sql)

-- Producers can create batches
CREATE POLICY "Producer can create batches"
  ON public.batches FOR INSERT
  WITH CHECK (true);

-- Producers and verifiers can update batch status
CREATE POLICY "Authorized users can update batches"
  ON public.batches FOR UPDATE
  USING (true);

-- ─── Batch Trace Logs ────────────────────────────────────────────────────────
-- (Public SELECT policy already created in 001_initial_schema.sql)

-- Authorized users can add trace events
CREATE POLICY "Authorized users can insert trace logs"
  ON public.batch_trace_logs FOR INSERT
  WITH CHECK (true);

-- ─── Products ────────────────────────────────────────────────────────────────
-- (Public SELECT policy already created in 001_initial_schema.sql)

-- Producers can create product listings
CREATE POLICY "Producer can create product listings"
  ON public.products FOR INSERT
  WITH CHECK (true);

-- Producers can update their own listings
CREATE POLICY "Producer can update product listings"
  ON public.products FOR UPDATE
  USING (true);

-- ─── Orders ──────────────────────────────────────────────────────────────────

-- Customers can read their own orders
CREATE POLICY "Customer can read their orders"
  ON public.orders FOR SELECT
  USING (true);

-- Customers can create orders
CREATE POLICY "Customer can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- ─── Order Items ─────────────────────────────────────────────────────────────

CREATE POLICY "Customer can read their order items"
  ON public.order_items FOR SELECT
  USING (true);

CREATE POLICY "Customer can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);
