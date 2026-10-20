# PalmChain: Comprehensive End-to-End Demonstration Guide

> **Project:** PalmChain — Decentralized Palmyrah Jaggery Supply Chain Traceability & Smart Contract Escrow Marketplace  
> **Blockchain Network:** Ethereum Sepolia Testnet (Chain ID: `11155111`)  
> **Demo Wallet Mode:** Single-Wallet Multi-Role (`0x74de526B0CDFB86D682cB293d4006076a2FE6088`)  
> **Frontend URL:** `http://localhost:5174` (or `http://localhost:5173`)  
> **Backend API:** `http://localhost:5000`

---

## 1. Executive Summary & Smart Contract Architecture

PalmChain addresses the two biggest challenges in the traditional palmyrah jaggery (*Karupatti*) industry:
1. **Adulteration & Counterfeiting:** Inauthentic jaggery adulterated with white sugar or chemicals. PalmChain eliminates this using **immutable on-chain batch anchoring (SHA-256 hash matching)** and **NABL-accredited verifier quality certification**.
2. **Payment Fraud & Delayed Settlements:** Middlemen exploit traditional tapping artisans. PalmChain eliminates this using a **two-sided trustless Ethereum payment escrow** where buyer funds are locked on-chain and only released once product fulfillment is attested.

### Live Deployed Smart Contracts on Ethereum Sepolia

| Contract Name | Address on Sepolia | Core Functionality | Etherscan Link |
| :--- | :--- | :--- | :--- |
| **`ProducerRegistry`** | `0xD4B4BF61a6e70bd4e9B44E3941523c57Ed27d00D` | On-chain identity, role permissions & verification for producers and verifiers | [View Contract](https://sepolia.etherscan.io/address/0xD4B4BF61a6e70bd4e9B44E3941523c57Ed27d00D) |
| **`BatchRegistry`** | `0xB77f75af51Ea8680665A3c5749de7b3e3b2C7829` | Lifecycle tracking (`Created` → `Processing` → `Verified` → `Packaged` → `Listed`), SHA-256 data hash anchoring | [View Contract](https://sepolia.etherscan.io/address/0xB77f75af51Ea8680665A3c5749de7b3e3b2C7829) |
| **`PalmChainPaymentEscrow`** | `0x4EB51644e84076AE2A7A7F426f8fAff18703AA4e` | Decentralized payment escrow holding buyer ETH until fulfillment is confirmed | [View Contract](https://sepolia.etherscan.io/address/0x4EB51644e84076AE2A7A7F426f8fAff18703AA4e) |

---

## 2. Single-Wallet Multi-Role Architecture

Your connected MetaMask wallet:
```
0x74de526B0CDFB86D682cB293d4006076a2FE6088
```
For the purpose of your staff and viva demonstration, **you do NOT need to switch MetaMask accounts**. This single address is recognized across the entire platform in all four roles:
* 🏛️ **Platform Admin / Governance:** Deployed owner of smart contracts, sets verifier authorizations and role permissions.
* 🌴 **Verified Artisan Producer:** *Murugan Palmyrah Grove / Natural Palmyrah Cooperative*, owns palm groves, logs harvest, anchors batches to Sepolia, and lists products on escrow.
* 🔬 **Authorized Quality Verifier:** *Southern Agro-Quality Testing Agency*, conducts chemical/purity assays, records lab test results, and issues on-chain digital certifications.
* 🛒 **Consumer / Marketplace Buyer:** Purchases jaggery with testnet ETH into smart contract escrow, inspects QR code proof, and releases funds upon receipt.

> [!NOTE]
> **Micro-Transaction Configuration:**
> To ensure your demonstration never exhausts testnet ETH, all marketplace product prices and escrow orders are configured with ultra-low payment amounts (`0.000001 Sepolia ETH` ≈ $0.003).

---

## 3. How to Start the System

If the servers are not already running, open two terminal windows:

### Terminal 1: Backend Express Server
```powershell
cd "d:\College\5th Semester\Blockchain and its Applications\palmchain_project\server"
node index.js
```
*Expected output: `[PalmChain Server] Listening on port 5000 (http://localhost:5000)`*

### Terminal 2: Frontend Vite Application
```powershell
cd "d:\College\5th Semester\Blockchain and its Applications\palmchain_project\client"
npm run dev
```
*Expected output: `Local: http://localhost:5174/` (or `5173`)*

---

## 4. Complete End-to-End Demonstration Script

Follow these 8 steps in order to present a complete, seamless narrative to your faculty or evaluator:

```
┌────────────────────────────────────────────────────────┐
│ STEP 1: SYSTEM GOVERNANCE & ROLES (/admin)             │
│ Show on-chain permissions, active nodes, and registry  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ STEP 2: PRODUCER GROVE & TREE REGISTRY (/producer/trees)│
│ Show geo-tagged GPS trees & sustainable sap harvesting │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ STEP 3: HARVEST LOGGING & BATCH ANCHORING (/producer)  │
│ Log Neera liters, compute SHA-256, anchor on Sepolia   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ STEP 4: VERIFIER LAB AUDIT & CERTIFICATION (/verifier) │
│ Inspect sucrose/adulteration assay, certify on-chain   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ STEP 5: PRODUCER LISTING ON ESCROW (/producer/listings)│
│ Register inventory into PalmChainPaymentEscrow contract│
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ STEP 6: PUBLIC CONSUMER TRACEABILITY (/verify/:batchId)│
│ Scan QR code, prove cryptographic zero-knowledge hash  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ STEP 7: BUYER ESCROW PURCHASE (/marketplace)           │
│ Lock 0.000001 Sepolia ETH into Escrow Smart Contract   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ STEP 8: ESCROW SETTLEMENT & FUND RELEASE (/orders)     │
│ Seller marks fulfillment → Buyer releases funds on-chain│
└────────────────────────────────────────────────────────┘
```

---

### STEP 1: Platform Administration & Role Governance

* **URL:** `http://localhost:5174/admin`
* **Role Demonstrated:** System Administrator / Governance Node
* **Key Concept:** Decentralized Role-Based Access Control (RBAC) enforced by `ProducerRegistry.sol`.

**Demonstration Actions:**
1. Connect MetaMask (ensure network is **Sepolia**).
2. Point out the live metrics:
   - **Total Registered Profiles:** Active network participants.
   - **Batches Tracked:** Batches recorded across their lifecycle.
   - **Smart Contract Escrow Orders:** Live on-chain orders.
3. Review the **Participant Registry**:
   - Show your wallet `0x74de...6088` active as both Verified Producer and Authorized Quality Verifier.
4. *(Optional live action)* Demonstrate permission management:
   - Select **Authorize verifier** or **Verify producer**.
   - Click **Submit on-chain** to show that permissions require a real Ethereum transaction.

---

### STEP 2: Palmyrah Tree Registry & Geo-Tagging

* **URL:** `http://localhost:5174/producer/trees`
* **Role Demonstrated:** Artisan Palmyrah Producer
* **Key Concept:** Origin authentication starts at individual palmyrah trees (*Borassus flabellifer*), geo-tagged with exact latitude/longitude to prevent fictitious harvest claims.

**Demonstration Actions:**
1. Open the Tree Registry.
2. Highlight the registered palm trees in **Tenkasi, Tamil Nadu**:
   - Tree ID, GPS coordinates (`8.96° N, 77.31° E`), estimated daily Neera yield (15–20 Liters/day), and age (35–45 years).
3. Explain to the examiner: *"Every drop of sweet Neera sap collected can be traced back to these exact geo-tagged trees, ensuring sustainable, wild-harvested authenticity."*

---

### STEP 3: Harvest Logging & On-Chain Batch Anchoring

* **URL:** `http://localhost:5174/producer/batches/new`
* **Role Demonstrated:** Artisan Palmyrah Producer
* **Key Concept:** Transparent processing from sap collection to boiling. Computes a cryptographic SHA-256 digital fingerprint and anchors it immutably on Sepolia via `BatchRegistry.createBatch(...)`.

**Demonstration Actions:**
1. Navigate to **Create & Anchor Batch**.
2. Select Grove: **Tenkasi Heritage Palmyrah Grove**.
3. Fill harvest parameters:
   - **Form:** `Solid Karupatti Block` (or `Granulated Powder`).
   - **Neera Sap Collected:** e.g., `850` Liters.
   - **Jaggery Yield:** e.g., `115` kg.
   - **Boiling Temperature:** `118.5°C` (traditional hearth open pan).
4. Click **Anchor to Blockchain**:
   - The platform calculates the deterministic SHA-256 hash of all batch metadata.
   - MetaMask prompts to sign `createBatch(...)` on `BatchRegistry.sol`.
5. Once confirmed, the batch is assigned an ID (e.g., `PJG-20261020-SEP496`) in state `Created` (0).

---

### STEP 4: Verifier Quality Assurance & On-Chain Certification

* **URL:** `http://localhost:5174/verifier` (and `/verifier/batches/PJG-2026-001`)
* **Role Demonstrated:** Independent Quality Verifier (Southern Agro-Quality Testing Agency)
* **Key Concept:** Independent lab audit preventing adulteration. Only accredited verifiers can transition a batch to `Verified` (2) on `BatchRegistry.sol`.

**Demonstration Actions:**
1. Open the **Verifier Dashboard** (`/verifier`).
2. Show the **Verification Queue**:
   - Notice existing certified batches (`PJG-2026-001` and `PJG-20261020-SEP496`) displaying the green badge: **✓ Certified on Sepolia**.
3. Click on any batch to view the **Detailed Lab Inspection**:
   - **Purity Analysis:** Cane Sugar Adulteration = `0.0%` (Zero adulteration guaranteed).
   - **Sucrose Content:** `81.4%` (natural palmyrah sucrose).
   - **Moisture Level:** `8.2%` (optimal shelf stability).
   - **Invert Sugars:** `3.1%`.
4. Review the digital certification stamp:
   - Verifier address: `0x74de...6088`.
   - On-chain status: `Verified (2)` with cryptographic timestamp.
5. Explain to the examiner: *"If a producer tampers with the jaggery by adding refined cane sugar or additives, the verifier rejects the batch on-chain, permanently preventing it from receiving an authenticity seal."*

---

### STEP 5: Publishing Inventory to the Escrow Marketplace

* **URL:** `http://localhost:5174/producer/listings`
* **Role Demonstrated:** Verified Producer
* **Key Concept:** Inventory cannot be listed for sale unless it originates from a verified, hash-matched batch. Listing publishes available quantity and price directly to `PalmChainPaymentEscrow.registerListing(...)`.

**Demonstration Actions:**
1. Open **Product Listings** (`/producer/listings`).
2. Point out:
   - Wallet authorization: `0x74de...6088 · ProducerRegistry status: Verified`.
   - Existing active listings in the table.
3. In **Create listing**:
   - **Eligible batch:** Select `PJG-20261020-SEP496 · Packaged · 115 kg stock` (or `PJG-2026-001`).
   - **Product title:** `Heritage Solid Palm Jaggery`.
   - **Price (INR):** `₹320`.
   - **Price in ETH/kg:** `0.000001` (micro-cost for demo).
   - **Available Quantity:** `50` kg.
4. Click **Publish to Sepolia Escrow & Marketplace**:
   - MetaMask prompts to sign the on-chain `registerListing(...)` transaction.
5. Notice the green success alert:
   > *Listing and ETH/kg price confirmed on Sepolia (`0x...`).*
6. Demonstrate listing management:
   - Click **Pause Listing** or **Reactivate** to show that inventory availability is governed directly by smart contract state.

---

### STEP 6: Public Consumer QR Verification (Farm-to-Fork Traceability)

* **URL:** `http://localhost:5174/verify/PJG-2026-001` (or `http://localhost:5174/verify/PJG-20261020-SEP496`)
* **Role Demonstrated:** Public Consumer (Scanning QR code on jaggery packaging)
* **Key Concept:** End consumers can scan the QR code printed on their package without needing a crypto wallet to verify 100% authenticity.

**Demonstration Actions:**
1. Open the verification URL.
2. Point out the **Verification Seal**:
   - **Green Badge:** `✓ Cryptographic Hash Match on Ethereum Sepolia`.
   - Shows the exact **SHA-256 batch hash** stored on the blockchain.
   - Shows the **Sepolia Block Confirmation** and transaction hash link.
3. Scroll through the **Chronological Traceability Timeline**:
   - **Stage 1 (Harvest):** Tree collection at Tenkasi Grove, sap temperature, lime-lined pot collection.
   - **Stage 2 (Processing):** Firewood hearth simmering at 118.5°C, coconut shell molding.
   - **Stage 3 (Lab Verification):** NABL chemical assay, zero cane sugar detected.
   - **Stage 4 (Packaging):** Food-grade eco-packaging with batch number.
4. Explain to the examiner: *"Any change in product metadata would change the SHA-256 hash, causing the cryptographic seal to turn RED, alerting the consumer of fraud."*

---

### STEP 7: Consumer Marketplace Purchase via Escrow Contract

* **URL:** `http://localhost:5174/marketplace`
* **Role Demonstrated:** Marketplace Consumer / Buyer
* **Key Concept:** Unlike Web2 e-commerce where money goes straight to the merchant before delivery, Web3 escrow holds funds inside a smart contract until delivery is attested.

**Demonstration Actions:**
1. Go to the **Marketplace** (`/marketplace`).
2. Click on **Heritage Solid Karupatti Block** (or your newly listed product).
3. Review the product page:
   - Notice the **Batch Traceability Link** pointing directly to `PJG-2026-001`.
   - Notice the low price: **`0.000001 Sepolia ETH`** (~$0.003).
4. Enter quantity: `1` kg (Total: `0.000001 Sepolia ETH`).
5. Click **Buy with Sepolia test ETH**.
6. Review the Escrow Confirmation modal explaining how buyer funds are locked.
7. Click **Confirm escrow payment**:
   - MetaMask prompts to confirm the transaction to `PalmChainPaymentEscrow.sol`.
8. Once mined, the modal shows **Payment Confirmed & Locked in Escrow** with Order ID and transaction hash!

---

### STEP 8: Two-Sided Escrow Settlement & Payment Release

* **URL:** `http://localhost:5174/orders`
* **Role Demonstrated:** Seller Fulfillment + Buyer Release
* **Key Concept:** Safe escrow resolution. Seller marks fulfillment, buyer inspects the delivered jaggery and triggers smart contract release of funds.

**Demonstration Actions:**
1. Open **Escrow Orders** (`/orders`).
2. Point out your live orders:
   - **Order #1 / Order #2:** Real orders queried live from `PalmChainPaymentEscrow.sol`.
   - Point out order details: Buyer address, Seller address, Escrowed ETH amount (`0.000001 ETH`), Order Status badge.
3. Show the Two-Sided Workflow:
   - **Seller Action:** Click **Mark fulfillment (seller attestation)** → MetaMask calls `escrow.markFulfilled(orderId)`. Status transitions to **`FULFILLED`**.
   - **Buyer Action:** Click **Confirm and release to seller** → MetaMask calls `escrow.confirmFulfillment(orderId)`.
4. The smart contract automatically transfers the locked ETH to the producer's wallet.
5. The order status updates to **`RELEASED`** (Green badge).
6. *(Optional)* Submit a customer rating and review.

---

## 5. Summary Table for Presentation Defense (Viva Questions)

| Question Asked by Staff | How PalmChain Solves It | Technical Implementation |
| :--- | :--- | :--- |
| **"How do you stop someone from listing fake jaggery?"** | Products cannot be listed without an eligible batch in `Verified` state on `BatchRegistry.sol`. | Checked on-chain via `getBatch(batchId)` and verified producer status in `ProducerRegistry.sol`. |
| **"What if the producer alters the jaggery lab data later?"** | Data integrity is locked with a SHA-256 hash anchored in block state. | Even a 1-character change results in a completely different hash; verification shows `MISMATCH`. |
| **"What if the buyer pays but the seller never ships?"** | Funds are held by `PalmChainPaymentEscrow.sol`, not the seller. | Buyer or Arbiter can trigger refund if seller fails to fulfill within the review window. |
| **"Why Sepolia testnet instead of mainnet?"** | Gas efficiency and cost-free academic testing. | Sepolia provides full Ethereum EVM parity, real block times, and verifiable transactions on Etherscan without financial risk. |
| **"Why is a single wallet allowed for all roles?"** | Academic presentation convenience. | Our backend and smart contracts support full decentralization, but allow single-wallet multi-role mapping for seamless 1-screen demos. |

---

## 6. Emergency Quick Troubleshooting

* **MetaMask displays "Wrong Network":**  
  Click your network selector in MetaMask and choose **Sepolia**.
* **MetaMask displays "Insufficient Funds":**  
  All purchases are set to `0.000001 Sepolia ETH`. You have ~`0.012+ Sepolia ETH`, which is enough for dozens of demonstration runs.
* **Server port 5000 busy error:**  
  Run this one-liner in PowerShell:
  ```powershell
  Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  cd "d:\College\5th Semester\Blockchain and its Applications\palmchain_project\server"
  node index.js
  ```
* **Frontend port difference:**  
  Vite operates on `http://localhost:5174` (or `http://localhost:5173`). Both ports are fully whitelisted in the Express server CORS and environment settings.
