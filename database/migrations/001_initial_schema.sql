-- ============================================================================
-- PalmChain: 001_initial_schema.sql
-- PostgreSQL / Supabase Schema for Palm-Jaggery Traceability & Marketplace
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Role Enumeration
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('producer', 'customer', 'verifier', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Batch Status Enumeration
DO $$ BEGIN
    CREATE TYPE batch_status AS ENUM ('draft', 'anchored', 'certified', 'flagged', 'recalled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Jaggery Physical Form Enumeration
DO $$ BEGIN
    CREATE TYPE jaggery_form AS ENUM ('solid_block', 'granulated_powder', 'liquid_syrup');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Profile Table (synced with Supabase Auth or standalone)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE, -- References auth.users(id) if Supabase Auth is enabled
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    wallet_address VARCHAR(42), -- Ethereum address for web3 interactions (e.g. 0x...)
    phone VARCHAR(30),
    organization_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Farms Table (Palm groves and extraction locations)
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    farm_name VARCHAR(255) NOT NULL,
    region VARCHAR(150) NOT NULL, -- e.g. Tuticorin, Tenkasi, Palakkad
    state VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    palm_tree_count INTEGER DEFAULT 0,
    organic_certified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Batches Table (Core production and blockchain-anchored records)
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(64) NOT NULL UNIQUE, -- Human-readable identifier, e.g. "PJG-2026-001"
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE RESTRICT,
    producer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    
    -- Production specifications
    harvest_date DATE NOT NULL,
    processing_date DATE NOT NULL,
    sap_brix_value DECIMAL(4, 2), -- Natural sugar content reading of fresh sap (Neera)
    clarification_agent VARCHAR(100) DEFAULT 'Natural Plant Mucilage / Lime',
    boiling_temp_celsius DECIMAL(5, 2),
    form jaggery_form NOT NULL DEFAULT 'solid_block',
    total_quantity_kg DECIMAL(10, 2) NOT NULL,
    available_stock_kg DECIMAL(10, 2) NOT NULL,
    
    -- Canonical JSON & Blockchain Integrity Fields
    canonical_metadata JSONB NOT NULL, -- Canonical key-sorted metadata used to compute hash
    sha256_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 integrity hash (lowercase hex, 64 chars)
    onchain_tx_hash VARCHAR(66), -- Ethereum Sepolia transaction hash
    onchain_block_number BIGINT,
    is_onchain_anchored BOOLEAN NOT NULL DEFAULT false,
    
    -- Quality & Verification Status
    status batch_status NOT NULL DEFAULT 'draft',
    is_certified BOOLEAN NOT NULL DEFAULT false,
    certifier_id UUID REFERENCES public.profiles(id),
    certification_timestamp TIMESTAMPTZ,
    certification_notes TEXT,
    lab_test_report_url TEXT,
    
    -- QR Code
    qr_code_payload TEXT, -- Payload embedded in QR code (verification URL)
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Batch Lifecycle Traceability Logs
CREATE TABLE IF NOT EXISTS public.batch_trace_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL, -- e.g. "Sap Tapping", "Boiling & Clarification", "Molding", "Packaging", "Quality Inspection"
    stage_order INTEGER NOT NULL DEFAULT 1,
    location_name VARCHAR(255),
    recorded_by UUID REFERENCES public.profiles(id),
    stage_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT
);

-- 5. Marketplace Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    producer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_inr DECIMAL(10, 2) NOT NULL,
    unit_weight_grams INTEGER NOT NULL DEFAULT 500,
    package_image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Orders and Marketplace Transactions
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    total_amount_inr DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    shipping_address JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_inr DECIMAL(10, 2) NOT NULL
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON public.batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_sha256_hash ON public.batches(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_batches_producer_id ON public.batches(producer_id);
CREATE INDEX IF NOT EXISTS idx_batch_trace_batch_id ON public.batch_trace_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_products_batch_id ON public.products(batch_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_trace_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Public read access policies for consumer traceability & marketplace browsing
CREATE POLICY "Allow public read access to active batches for QR verification"
    ON public.batches FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to batch trace logs"
    ON public.batch_trace_logs FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to active marketplace products"
    ON public.products FOR SELECT
    USING (is_active = true);
