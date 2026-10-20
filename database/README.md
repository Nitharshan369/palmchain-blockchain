# PalmChain Database Setup (Supabase PostgreSQL)

This directory contains the database migration scripts and seed data for the PalmChain platform.

## Architecture & Data Flow

1. **Off-Chain Storage (Supabase)**:
   - Stores user profiles, farm geo-coordinates, rich batch production details, timeline logs, and marketplace catalog data.
   - Computes deterministic SHA-256 integrity hash from canonical batch attributes.
   
2. **On-Chain Storage (Ethereum Sepolia)**:
   - Only stores the `batchId` and the 32-byte `batchHash` (SHA-256) anchored by the producer's wallet, along with verifier attestations.
   - Protects storage cost and gas efficiency while providing immutable tamper-proofing.

## How to Apply Migrations

### Option 1: Supabase Web Dashboard (Easiest)
1. Open your project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** tab.
3. Paste the contents of `migrations/001_initial_schema.sql` and click **Run**.
4. (Optional) Paste `seed/001_seed_dev_data.sql` and click **Run** to load initial sample data.
5. Run `migrations/002_rls_policies.sql`, followed by `migrations/004_marketplace.sql`.

### Option 2: Supabase CLI
```bash
# Link your project
npx supabase link --project-ref your-project-ref

# Apply database migration
npx supabase db push
```

Marketplace listing data and inventory are stored in Supabase. Producer listing and profile
writes require fresh wallet signatures; direct anonymous profile and farm writes are disabled.
The API checks batch status and hash against Sepolia; only `Packaged` or `Listed` batches may
be offered. Purchases create unpaid, inventory-reserved orders. This phase does not collect
payment or submit marketplace blockchain transactions.
