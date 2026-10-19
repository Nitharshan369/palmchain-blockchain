/**
 * PalmChain Hardhat Deployment Script
 *
 * Deploys PalmChain's smart contracts to Ethereum Sepolia (or local network):
 * 1. Validates network and pre-flight account conditions (chainId, balance).
 * 2. Deploys ProducerRegistry.
 * 3. Deploys BatchRegistry (linked to ProducerRegistry).
 * 4. Verifies role setup (Admin, Verifier) and links.
 * 5. Saves deployment manifest with addresses, chain ID, block numbers, and ABI references.
 * 6. Performs post-deployment read-only contract calls to confirm live state.
 * 7. Outputs verification commands for Etherscan.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.cjs --network sepolia
 */
const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n========================================================");
  console.log("       PalmChain Smart Contract Deployment");
  console.log("========================================================\n");

  const networkName = hre.network.name;
  console.log(`▶ Target Network : ${networkName}`);

  // ─── 1. Network & Account Pre-flight Validation ─────────────────────────────
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);
  console.log(`▶ Chain ID       : ${chainId}`);

  if (networkName === "sepolia" && chainId !== 11155111) {
    throw new Error(
      `Network mismatch: Target is 'sepolia' but RPC returned chain ID ${chainId} (expected 11155111).`
    );
  }

  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      "No deployer signer available. Please configure SEPOLIA_PRIVATE_KEY in contracts/.env."
    );
  }

  const deployer = signers[0];
  const balance = await ethers.provider.getBalance(deployer.address);
  const formattedBalance = ethers.formatEther(balance);

  console.log(`▶ Deployer       : ${deployer.address}`);
  console.log(`▶ Balance        : ${formattedBalance} ETH`);
  console.log("────────────────────────────────────────────────────────\n");

  if (networkName === "sepolia" && balance === 0n) {
    throw new Error(
      `Deployer account ${deployer.address} has 0 ETH on Sepolia.\n` +
      "Please acquire testnet ETH from a Sepolia faucet before deploying:\n" +
      " - Google Cloud Web3 Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia\n" +
      " - Alchemy Sepolia Faucet  : https://www.alchemy.com/faucets/ethereum-sepolia\n" +
      " - Infura Sepolia Faucet   : https://www.infura.io/faucet/sepolia"
    );
  }

  // ─── 2. Deploy ProducerRegistry ─────────────────────────────────────────────
  console.log("▶ [Step 1/4] Deploying ProducerRegistry...");
  const ProducerRegistryFactory = await ethers.getContractFactory("ProducerRegistry");
  const producerRegistry = await ProducerRegistryFactory.deploy();
  await producerRegistry.waitForDeployment();

  const producerRegistryAddress = await producerRegistry.getAddress();
  const prDeployTx = producerRegistry.deploymentTransaction();
  const prReceipt = prDeployTx ? await prDeployTx.wait(networkName === "sepolia" ? 2 : 1) : null;

  console.log(`  ✓ ProducerRegistry deployed at: ${producerRegistryAddress}`);
  if (prReceipt) {
    console.log(`    Tx Hash     : ${prReceipt.hash}`);
    console.log(`    Block Number: ${prReceipt.blockNumber}`);
    console.log(`    Gas Used    : ${prReceipt.gasUsed.toString()}`);
  }

  // ─── 3. Deploy BatchRegistry ────────────────────────────────────────────────
  console.log("\n▶ [Step 2/4] Deploying BatchRegistry (linked to ProducerRegistry)...");
  const BatchRegistryFactory = await ethers.getContractFactory("BatchRegistry");
  const batchRegistry = await BatchRegistryFactory.deploy(producerRegistryAddress);
  await batchRegistry.waitForDeployment();

  const batchRegistryAddress = await batchRegistry.getAddress();
  const brDeployTx = batchRegistry.deploymentTransaction();
  const brReceipt = brDeployTx ? await brDeployTx.wait(networkName === "sepolia" ? 2 : 1) : null;

  console.log(`  ✓ BatchRegistry deployed at   : ${batchRegistryAddress}`);
  if (brReceipt) {
    console.log(`    Tx Hash     : ${brReceipt.hash}`);
    console.log(`    Block Number: ${brReceipt.blockNumber}`);
    console.log(`    Gas Used    : ${brReceipt.gasUsed.toString()}`);
  }

  // ─── 4. Configure & Validate Roles Safely ───────────────────────────────────
  console.log("\n▶ [Step 3/4] Configuring & Validating Roles...");

  const adminAddress = await producerRegistry.admin();
  const isDeployerVerifier = await producerRegistry.isAuthorizedVerifier(deployer.address);
  console.log(`  ✓ ProducerRegistry Admin    : ${adminAddress} (${adminAddress.toLowerCase() === deployer.address.toLowerCase() ? "Confirmed Deployer" : "Other"})`);
  console.log(`  ✓ Deployer Verifier Status  : ${isDeployerVerifier ? "Authorized" : "Not Authorized"}`);

  // Optional: Authorize secondary verifier if configured
  const secondaryVerifier = process.env.INITIAL_VERIFIER_ADDRESS?.trim();
  if (secondaryVerifier && ethers.isAddress(secondaryVerifier) && secondaryVerifier.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log(`  ▶ Authorizing secondary verifier: ${secondaryVerifier}...`);
    const setVerifierTx = await producerRegistry.setVerifier(secondaryVerifier, true);
    await setVerifierTx.wait(1);
    console.log(`  ✓ Secondary verifier authorized.`);
  }

  const linkedRegistry = await batchRegistry.producerRegistry();
  console.log(`  ✓ BatchRegistry linked to   : ${linkedRegistry} (${linkedRegistry.toLowerCase() === producerRegistryAddress.toLowerCase() ? "Verified Link" : "MISMATCH!"})`);

  // ─── 5. Read-Only Smoke Tests ───────────────────────────────────────────────
  console.log("\n▶ [Step 4/4] Executing Read-Only Contract Smoke Calls...");
  const totalProducers = await producerRegistry.totalProducers();
  const totalBatches = await batchRegistry.totalBatches();
  console.log(`  ✓ Live totalProducers count : ${totalProducers.toString()}`);
  console.log(`  ✓ Live totalBatches count   : ${totalBatches.toString()}`);

  // ─── 6. Save Deployment Manifest ────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const manifest = {
    network: {
      name: networkName,
      chainId: chainId,
    },
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ProducerRegistry: {
        address: producerRegistryAddress,
        transactionHash: prReceipt?.hash || prDeployTx?.hash || "",
        blockNumber: prReceipt?.blockNumber || null,
        constructorArgs: [],
        abiPath: "artifacts/contracts/ProducerRegistry.sol/ProducerRegistry.json",
      },
      BatchRegistry: {
        address: batchRegistryAddress,
        transactionHash: brReceipt?.hash || brDeployTx?.hash || "",
        blockNumber: brReceipt?.blockNumber || null,
        constructorArgs: [producerRegistryAddress],
        abiPath: "artifacts/contracts/BatchRegistry.sol/BatchRegistry.json",
      },
    },
  };

  const manifestFile = path.join(deploymentsDir, `${networkName}.json`);
  const latestManifestFile = path.join(deploymentsDir, "latest.json");
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(latestManifestFile, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\n✓ Deployment manifest saved to:\n  - ${manifestFile}\n  - ${latestManifestFile}`);

  // ─── 7. Output Environment Variables & Verification Commands ────────────────
  console.log("\n========================================================");
  console.log("            Deployment Summary");
  console.log("========================================================");
  console.log(`ProducerRegistry Address : ${producerRegistryAddress}`);
  console.log(`BatchRegistry Address    : ${batchRegistryAddress}`);
  console.log("========================================================");

  console.log("\n[!] Copy and update your environment files:\n");
  console.log("1. For client/.env:");
  console.log(`   VITE_PRODUCER_REGISTRY_ADDRESS=${producerRegistryAddress}`);
  console.log(`   VITE_BATCH_REGISTRY_ADDRESS=${batchRegistryAddress}`);
  console.log(`   VITE_PALMCHAIN_CONTRACT_ADDRESS=${batchRegistryAddress}\n`);

  console.log("2. For server/.env:");
  console.log(`   PALMCHAIN_PRODUCER_REGISTRY_ADDRESS=${producerRegistryAddress}`);
  console.log(`   PALMCHAIN_BATCH_REGISTRY_ADDRESS=${batchRegistryAddress}`);
  console.log(`   PALMCHAIN_CONTRACT_ADDRESS=${batchRegistryAddress}\n`);

  console.log("========================================================");
  console.log("       Contract Verification Instructions");
  console.log("========================================================");
  console.log("To verify the contract source code on Etherscan Sepolia:\n");
  console.log(`1. ProducerRegistry:`);
  console.log(`   npx hardhat verify --network sepolia ${producerRegistryAddress}\n`);
  console.log(`2. BatchRegistry:`);
  console.log(`   npx hardhat verify --network sepolia ${batchRegistryAddress} "${producerRegistryAddress}"\n`);
  console.log("Or run the automated verification script:");
  console.log("   npm run verify:sepolia\n");
}

main().catch((err) => {
  console.error("\n[!] Deployment Failed with error:");
  console.error(err.message || err);
  process.exitCode = 1;
});
