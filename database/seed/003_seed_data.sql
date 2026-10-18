-- ============================================================================
-- PalmChain: 003_seed_data.sql
-- Development seed data for testing all features without production data.
-- Run ONLY in development/staging environments.
-- ============================================================================

-- Insert a test producer profile
INSERT INTO public.profiles (id, email, full_name, role, wallet_address, organization_name, phone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'producer@palmchain.demo',
  'Arjun Palaniswamy',
  'producer',
  '0xabcdef1234567890abcdef1234567890abcdef12',
  'Palaniswamy Palm Farms',
  '+91 98401 12345'
) ON CONFLICT (email) DO NOTHING;

-- Insert a test verifier profile
INSERT INTO public.profiles (id, email, full_name, role, wallet_address, organization_name)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'verifier@palmchain.demo',
  'Dr. Meena Krishnan',
  'verifier',
  '0x1234567890abcdef1234567890abcdef12345678',
  'TN Agricultural Certification Board'
) ON CONFLICT (email) DO NOTHING;

-- Insert a test farm
INSERT INTO public.farms (id, producer_id, farm_name, region, state, palm_tree_count, organic_certified, latitude, longitude)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  'Palaniswamy Heritage Palm Grove',
  'Tenkasi',
  'Tamil Nadu',
  120,
  true,
  8.9602,
  77.3159
) ON CONFLICT DO NOTHING;

-- Insert a test batch (anchored, certified)
INSERT INTO public.batches (
  id,
  batch_number,
  farm_id,
  producer_id,
  harvest_date,
  processing_date,
  sap_brix_value,
  clarification_agent,
  boiling_temp_celsius,
  form,
  total_quantity_kg,
  available_stock_kg,
  canonical_metadata,
  sha256_hash,
  onchain_tx_hash,
  onchain_block_number,
  is_onchain_anchored,
  status,
  is_certified,
  certifier_id,
  certification_timestamp,
  certification_notes,
  qr_code_payload
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'PJG-2026-001',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  '2026-01-15',
  '2026-01-16',
  16.8,
  'Natural Plant Mucilage / Lime',
  115.5,
  'solid_block',
  150.00,
  82.50,
  '{
    "batch_number": "PJG-2026-001",
    "farm_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "producer_id": "11111111-1111-1111-1111-111111111111",
    "harvest_date": "2026-01-15",
    "processing_date": "2026-01-16",
    "sap_brix_value": 16.8,
    "clarification_agent": "Natural Plant Mucilage / Lime",
    "boiling_temp_celsius": 115.5,
    "form": "solid_block",
    "total_quantity_kg": 150.0
  }'::jsonb,
  'a7f3c2e1b8d49605f2a18e7c3b94d5261f8a0e3c7d92b41685e0a7f2c1b4d93',
  '0x4a2e1c8f3b7d06a5e9c2f1b8e4d37a05c6f2e9b1d8a4c7f305e2b6d9a1c4f8',
  7843201,
  true,
  'anchored',
  true,
  '22222222-2222-2222-2222-222222222222',
  '2026-01-18T10:30:00Z',
  'Lab tested. Moisture 8.2%. No adulterants detected. Organic certification verified.',
  'http://localhost:5173/verify/PJG-2026-001'
) ON CONFLICT (batch_number) DO NOTHING;

-- Insert trace logs for the test batch
INSERT INTO public.batch_trace_logs (batch_id, stage_name, stage_order, location_name, stage_timestamp, notes)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sap Tapping (Neera Collection)', 1, 'Palaniswamy Heritage Palm Grove, Tenkasi', '2026-01-15 05:30:00+05:30', 'Morning tapping from 48 selected palms. Brix reading: 16.8°. Fresh and fragrant.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sap Transportation', 2, 'Farm to Processing Unit, Tenkasi', '2026-01-15 07:15:00+05:30', 'Transported in sealed clay pots within 2 hours of tapping to prevent fermentation.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Boiling & Clarification', 3, 'Palaniswamy Processing Unit, Tenkasi', '2026-01-15 08:00:00+05:30', 'Heated to 115.5°C. Natural plant mucilage added for clarification. No synthetic additives.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Molding & Cooling', 4, 'Palaniswamy Processing Unit, Tenkasi', '2026-01-15 11:30:00+05:30', 'Poured into traditional wooden molds. Air cooled for 3 hours.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Quality Inspection', 5, 'TN Agricultural Certification Board, Tenkasi', '2026-01-17 10:00:00+05:30', 'Moisture content: 8.2%. Color: Dark amber. Texture: Firm. Certified organic by Dr. Meena Krishnan.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Packaging & Blockchain Anchoring', 6, 'Palaniswamy Processing Unit, Tenkasi', '2026-01-18 09:00:00+05:30', 'Packed in 500g natural jute pouches. SHA-256 hash anchored to Ethereum Sepolia testnet.')
ON CONFLICT DO NOTHING;

-- Insert a marketplace product for the test batch
INSERT INTO public.products (id, batch_id, producer_id, title, description, price_inr, unit_weight_grams, is_active)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'Heritage Palm Jaggery Block — Certified Organic',
  'Premium solid-block palm jaggery harvested from 80-year-old palms in Tenkasi, Tamil Nadu. Rich in minerals, naturally processed with no additives. Blockchain-verified batch PJG-2026-001.',
  245.00,
  500,
  true
) ON CONFLICT DO NOTHING;
