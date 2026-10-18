-- ============================================================================
-- PalmChain: 001_seed_dev_data.sql
-- Development and Testing Seed Data
-- ============================================================================

-- Insert sample profiles
INSERT INTO public.profiles (id, email, full_name, role, wallet_address, organization_name)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'admin@palmchain.io', 'PalmChain SuperAdmin', 'admin', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'PalmChain Foundation'),
  ('b2222222-2222-2222-2222-222222222222', 'murugan.farmer@palmchain.io', 'Murugan Palm Grove', 'producer', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 'Murugan Natural Jaggery Coop'),
  ('c3333333-3333-3333-3333-333333333333', 'certifier.priya@palmchain.io', 'Dr. Priya Shankar', 'verifier', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 'Southern Agro-Quality Testing Agency'),
  ('d4444444-4444-4444-4444-444444444444', 'anand.customer@gmail.com', 'Anand Raman', 'customer', '0x90F79bf6EB2c4f870365E785982E1f101E93b906', 'Organic Food Enthusiasts')
ON CONFLICT (email) DO NOTHING;

-- Insert sample farm
INSERT INTO public.farms (id, producer_id, farm_name, region, state, latitude, longitude, palm_tree_count, organic_certified)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'Tenkasi Heritage Palmyrah Orchard', 'Tenkasi', 'Tamil Nadu', 8.9591, 77.3150, 420, true)
ON CONFLICT DO NOTHING;

-- Insert sample batch with deterministic SHA-256 integrity hash
INSERT INTO public.batches (
    id, batch_number, farm_id, producer_id, harvest_date, processing_date,
    sap_brix_value, clarification_agent, boiling_temp_celsius, form,
    total_quantity_kg, available_stock_kg,
    canonical_metadata, sha256_hash,
    status, is_certified, certifier_id, certification_timestamp, certification_notes,
    qr_code_payload
)
VALUES (
    'e1111111-1111-1111-1111-111111111111',
    'PJG-2026-001',
    'f1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    '2026-03-10',
    '2026-03-11',
    14.5,
    'Natural Okra (Bhindi) extract',
    118.5,
    'solid_block',
    500.0,
    450.0,
    '{"batch_number":"PJG-2026-001","boiling_temp_celsius":118.5,"clarification_agent":"Natural Okra (Bhindi) extract","farm_id":"f1111111-1111-1111-1111-111111111111","form":"solid_block","harvest_date":"2026-03-10","processing_date":"2026-03-11","producer_id":"b2222222-2222-2222-2222-222222222222","sap_brix_value":14.5,"total_quantity_kg":500}'::jsonb,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'certified',
    true,
    'c3333333-3333-3333-3333-333333333333',
    NOW(),
    'Lab verified 100% pure palmyrah sap extract. Zero cane sugar adulteration detected.',
    'http://localhost:5173/trace/PJG-2026-001'
)
ON CONFLICT (batch_number) DO NOTHING;

-- Insert traceability lifecycle logs
INSERT INTO public.batch_trace_logs (batch_id, stage_name, stage_order, location_name, recorded_by, notes)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'Fresh Sap Tapping', 1, 'Tenkasi Orchard', 'b2222222-2222-2222-2222-222222222222', 'Fresh Neera tapped at dawn in lime-coated earthen pots.'),
  ('e1111111-1111-1111-1111-111111111111', 'Natural Clarification & Boiling', 2, 'Heritage Processing Pan #2', 'b2222222-2222-2222-2222-222222222222', 'Slow boiled to 118.5°C over palm frond biomass fuel.'),
  ('e1111111-1111-1111-1111-111111111111', 'Molding into Coconut Shells', 3, 'Curing Unit #1', 'b2222222-2222-2222-2222-222222222222', 'Traditional coconut shell molds used for cooling.'),
  ('e1111111-1111-1111-1111-111111111111', 'Laboratory Quality Certification', 4, 'Agro-Lab Tenkasi', 'c3333333-3333-3333-3333-333333333333', 'Purity and moisture test approved. Batch certified.')
ON CONFLICT DO NOTHING;

-- Insert sample marketplace product
INSERT INTO public.products (batch_id, producer_id, title, description, price_inr, unit_weight_grams, is_active)
VALUES (
    'e1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    'Artisanal Pure Palm Jaggery (Karupatti) - 500g Block',
    'Unrefined, mineral-rich palm jaggery sourced from the pristine palm groves of Tenkasi. Backed by blockchain batch traceability.',
    280.00,
    500,
    true
)
ON CONFLICT DO NOTHING;
