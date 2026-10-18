/**
 * PalmChain Deployment Script
 * Deploys ProducerRegistry first, then BatchRegistry (which depends on it).
 *
 * Local:   npm run deploy:local
 * Sepolia: npm run deploy:sepolia
 */
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n─────────────────────────────────────────────────");
  console.log("  PalmChain Contract Deployment");
  console.log("─────────────────────────────────────────────────");
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Network  : ${hre.network.name}`);
  console.log(`  Balance  : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("─────────────────────────────────────────────────\n");

  // 1. Deploy ProducerRegistry
  console.log("▶  Deploying ProducerRegistry...");
  const ProducerRegistry = await ethers.getContractFactory("ProducerRegistry");
  const producerRegistry = await ProducerRegistry.deploy();
  await producerRegistry.waitForDeployment();
  const prAddr = await producerRegistry.getAddress();
  console.log(`✓  ProducerRegistry deployed at: ${prAddr}`);

  // 2. Deploy BatchRegistry, passing ProducerRegistry address
  console.log("\n▶  Deploying BatchRegistry...");
  const BatchRegistry = await ethers.getContractFactory("BatchRegistry");
  const batchRegistry = await BatchRegistry.deploy(prAddr);
  await batchRegistry.waitForDeployment();
  const brAddr = await batchRegistry.getAddress();
  console.log(`✓  BatchRegistry    deployed at: ${brAddr}`);

  console.log("\n─────────────────────────────────────────────────");
  console.log("  Deployment Complete");
  console.log("─────────────────────────────────────────────────");
  console.log(`  ProducerRegistry : ${prAddr}`);
  console.log(`  BatchRegistry    : ${brAddr}`);
  console.log("─────────────────────────────────────────────────");
  console.log("\nAdd these addresses to your .env files:");
  console.log(`  VITE_PALMCHAIN_PRODUCER_REGISTRY_ADDRESS=${prAddr}`);
  console.log(`  VITE_PALMCHAIN_BATCH_REGISTRY_ADDRESS=${brAddr}`);
  console.log(`  PALMCHAIN_PRODUCER_REGISTRY_ADDRESS=${prAddr}`);
  console.log(`  PALMCHAIN_BATCH_REGISTRY_ADDRESS=${brAddr}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
