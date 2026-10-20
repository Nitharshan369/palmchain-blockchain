# PalmChain deployment guide

This project is configured for Ethereum Sepolia testnet only. Sepolia ETH has no INR value and must not be presented as real-money revenue. Physical delivery is an off-chain business process; the contracts only record the agreed digital state transitions.

## 1. Supabase

1. Create a Supabase project and keep the project URL and service-role key only in the backend hosting provider's secret configuration.
2. Apply the SQL migrations in `database/migrations` in filename order, including `006_operations_reviews_analytics.sql`.
3. Confirm RLS is enabled on every public table. Do not expose the service-role key to Vercel or the browser.
4. Run a smoke test with an anonymous Supabase client: public batch/product reads should follow the intended public policies, while direct order, review, audit-log, and operational writes should be denied.

## 2. Backend hosting (Render, Railway, or equivalent)

Run from the `server` workspace with `npm ci` and `npm start`.

Required secrets/configuration:

```text
PORT=5000
CLIENT_URL=https://<vercel-domain>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret>
SEPOLIA_RPC_URL=<Sepolia RPC URL>
PALMCHAIN_PRODUCER_REGISTRY_ADDRESS=<deployed Sepolia address>
PALMCHAIN_BATCH_REGISTRY_ADDRESS=<deployed Sepolia address>
PAYMENT_ESCROW_ADDRESS=<deployed Sepolia escrow address>
```

Set `NODE_ENV=production`. Use a persistent process and HTTPS. Configure the frontend origin in CORS and verify that health, batch verification, signed wallet requests, and webhook/proxy timeouts work from the deployed domain.

## 3. Vercel frontend

Build the `client` workspace with `npm ci` and `npm run build`. Configure:

```text
VITE_API_URL=https://<backend-domain>/api
VITE_CHAIN_ID=11155111
VITE_SEPOLIA_RPC_URL=<public or client-safe Sepolia RPC URL>
VITE_PRODUCER_REGISTRY_ADDRESS=<deployed Sepolia address>
VITE_BATCH_REGISTRY_ADDRESS=<deployed Sepolia address>
VITE_PAYMENT_ESCROW_ADDRESS=<deployed Sepolia escrow address>
VITE_PUBLIC_APP_URL=https://<vercel-domain>
```

The Vercel rewrite/history fallback must serve the SPA entry point for `/verify/:batchNumber`, `/marketplace`, and authenticated dashboard routes. Do not put a service-role key, private key, seed phrase, or privileged RPC credential in any `VITE_` variable.

## 4. Sepolia contracts

Deploy only after reviewing the contract source and Hardhat tests. Record the deployed addresses and chain ID in the environment above. Verify that the escrow address is a Sepolia deployment of the reviewed `PalmChainPaymentEscrow` bytecode; the repository's existing BatchRegistry and ProducerRegistry manifests do not prove that an escrow deployment exists.

After configuration, manually test with MetaMask set to Sepolia:

- producer registration/verification and batch creation;
- a listing with an exact escrow payment;
- buyer confirmation, timeout refund, and dispute behavior;
- verifier approval/rejection;
- failed and rejected transactions.

Do not treat a transaction submitted or pending in MetaMask as a completed business action. The backend must reconcile a successful receipt and expected event before updating database state.

## 5. Post-deployment smoke checks

1. Open the public `/verify/<batch-number>` URL in a private browser with no wallet connected.
2. Scan a QR code generated after deployment and confirm that it points to the deployed public URL, not localhost.
3. Confirm a valid batch shows the database record, on-chain transaction, and matching canonical hash.
4. Confirm a tampered database payload reports a hash mismatch.
5. Confirm customer, producer, verifier, and admin requests fail when the signed wallet lacks the required role.
6. Confirm pending, failed, confirmed, released, and refunded payment states render distinctly.
7. Review hosting logs for leaked credentials and verify that `.env` files are absent from the repository.

## Current deployment blocker

The repository has deployed ProducerRegistry and BatchRegistry manifests for Sepolia, but no escrow deployment manifest was found during the final review. Set `PAYMENT_ESCROW_ADDRESS` only after the reviewed escrow contract is explicitly deployed and its address is recorded. This guide does not authorize or perform deployment.
