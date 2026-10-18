# PalmChain 🌴⛓️

> **Blockchain-Based Palm-Jaggery Traceability & Direct Marketplace Platform**

PalmChain connects traditional palm-jaggery (Karupatti) producers directly with consumers. Every production batch is assigned a unique digital identity, complete production lifecycle tracking, and an immutable cryptographic integrity commitment anchored on the **Ethereum Sepolia** testnet. Customers can verify batch purity and authenticity via QR codes and purchase genuine artisan jaggery through a fair-trade marketplace.

---

## 🏗️ Architecture & Directory Structure

```text
palmchain_project/
├── client/                     # Frontend Application (React + Vite + JavaScript)
│   ├── public/                 # Static web assets & icons
│   ├── src/
│   │   ├── assets/             # Branding & visual assets
│   │   ├── components/         # Reusable UI components
│   │   │   └── layout/         # Navigation bar, footer, and shell layouts
│   │   ├── pages/              # Role-specific & public views
│   │   │   ├── Home.jsx             # Platform overview & architecture dashboard
│   │   │   ├── TraceVerification.jsx# QR verification & SHA-256 tamper inspector
│   │   │   ├── Marketplace.jsx      # Direct-from-farmer product catalog
│   │   │   ├── ProducerPortal.jsx   # Batch registration & on-chain anchoring
│   │   │   ├── VerifierPortal.jsx   # Quality inspection & lab certification
│   │   │   └── AdminPortal.jsx      # Participant authorization & registry governance
│   │   ├── App.jsx             # React Router hierarchy
│   │   ├── main.jsx            # React root mount
│   │   ├── index.css           # Tailwind CSS directives & theme extensions
│   │   └── App.css             # Component-level styling
│   ├── index.html              # HTML5 entry with Inter font
│   ├── tailwind.config.js      # Custom Palm & Jaggery color theme
│   ├── postcss.config.js       # PostCSS configuration
│   ├── vite.config.js          # Vite build configuration
│   ├── package.json            # React, ethers, lucide-react, qrcode.react
│   └── .env.example            # Safe frontend environment template
│
├── server/                     # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Supabase client & environment initialization
│   │   ├── routes/             # API route handlers (e.g. /api/health)
│   │   ├── utils/              # Deterministic SHA-256 canonical hashing engine
│   │   └── app.js              # Express app setup, CORS, and security middleware
│   ├── index.js                # Server entry point (starts HTTP server on port 5000)
│   ├── package.json            # Express, @supabase/supabase-js, ethers, helmet, cors
│   └── .env.example            # Safe backend environment template
│
├── contracts/                  # Blockchain Smart Contracts (Hardhat + Solidity)
│   ├── contracts/              # Solidity source files
│   │   └── PalmChainRegistry.sol # Batch hash anchoring, certifier attestations & integrity verification
│   ├── scripts/                # Deployment scripts
│   │   └── deploy.cjs          # Sepolia deployment script
│   ├── test/                   # Smart contract automated unit tests
│   │   └── PalmChainRegistry.test.cjs # Automated tests for anchoring, access control & certification
│   ├── hardhat.config.cjs      # Hardhat Sepolia network & compiler settings
│   ├── package.json            # Hardhat, @nomicfoundation/hardhat-toolbox
│   └── .env.example            # Safe smart contract environment template
│
├── database/                   # Supabase PostgreSQL Database
│   ├── migrations/             # Schema definitions
│   │   └── 001_initial_schema.sql # Profiles, farms, batches, trace logs, products, orders & RLS
│   ├── seed/                   # Sample test data
│   │   └── 001_seed_dev_data.sql # Pre-populated cooperative, farm, sample batch & products
│   └── README.md               # Supabase execution guide
│
├── .gitignore                  # Git ignore rules (node_modules, .env, build artifacts)
├── .env.example                # Unified repository-wide environment template
├── package.json                # Root orchestration workspace scripts
└── README.md                   # Project documentation & setup instructions
```

---

## 👥 Four User Roles

1. **Producer**: Registers harvest parameters (sap brix, boiling temperature, quantity, farm location), computes canonical SHA-256 hash, and anchors hash to Ethereum Sepolia.
2. **Customer**: Scans batch QR codes to verify purity, origin coordinates, and tamper-free authenticity, and purchases products directly through the marketplace.
3. **Verifier**: Accredited laboratory inspectors who perform purity and adulteration assays and sign on-chain certification attestations.
4. **Admin**: Manages registry authorization, approves producer cooperatives and certifiers, and audits contract health.

---

## ⚙️ Prerequisites

- **Node.js**: `v18+` or `v20+` (Tested on `v24.22.0`)
- **npm**: `v9+` (Tested on `v11.19.1`)
- **Git**: Installed and configured
- **Browser Wallet**: MetaMask (for Ethereum Sepolia transactions)
- **Supabase Account**: Free project on [supabase.com](https://supabase.com) (for PostgreSQL database)

---

## 🚀 Setup & Installation Commands

### 1. Clone & Install Dependencies

From the repository root:

```bash
# Install frontend dependencies
npm run dev:client -- --help # or cd client && npm install

# Install backend server dependencies
cd server && npm install

# Install smart contract Hardhat dependencies
cd ../contracts && npm install
```

### 2. Configure Environment Variables

Copy the example files and supply your credentials:

```bash
# Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env

# Contracts
cp contracts/.env.example contracts/.env
```

### 3. Setup Supabase Database

1. Open your Supabase project SQL Editor.
2. Run `database/migrations/001_initial_schema.sql`.
3. (Optional) Run `database/seed/001_seed_dev_data.sql` to populate sample records.

### 4. Compile & Test Smart Contracts

```bash
cd contracts
npx hardhat compile
npx hardhat test
```

### 5. Run the Applications

Open two terminal windows:

**Terminal 1 (Backend API on http://localhost:5000):**
```bash
npm run dev:server
```

**Terminal 2 (Frontend Client on http://localhost:5173):**
```bash
npm run dev:client
```

---

## 🔒 Security & Development Rules Followed

- **Off-Chain / On-Chain Separation**: Heavy application data (images, farm descriptions, orders) lives in Supabase PostgreSQL. Only deterministic 32-byte SHA-256 hashes are anchored to the blockchain.
- **Zero Hardcoded Secrets**: All sensitive keys, tokens, and RPC endpoints use `.env` files with safe `.env.example` templates provided.
- **No Secret Key Leakage**: Supabase service-role keys are strictly kept on the backend; the frontend only uses public anon keys.
- **Authenticity Integrity**: No simulated data is labeled as verified without genuine cryptographic match.
