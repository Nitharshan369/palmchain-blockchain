/**
 * PalmChain Contract Verification Script
 *
 * Reads deployment addresses from deployments/sepolia.json (or latest.json)
 * and invokes Hardhat Etherscan verification.
 *
 * Usage:
 *   npx hardhat run scripts/verify-contracts.cjs --network sepolia
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n========================================================");
  console.log("       PalmChain Contract Source Verification");
  console.log("========================================================\n");

  const networkName = hre.network.name;
  console.log(`▶ Network: ${networkName}`);

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey || apiKey === "your-etherscan-api-key") {
    console.error("[!] ERROR: ETHERSCAN_API_KEY is not configured in contracts/.env.");
    console.error("    Please obtain a free key at https://etherscan.io/myapikey and add it to .env.");
    process.exitCode = 1;
    return;
  }

  const manifestPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  const latestPath = path.join(__dirname, "..", "deployments", "latest.json");
  const targetPath = fs.existsSync(manifestPath) ? manifestPath : latestPath;

  if (!fs.existsSync(targetPath)) {
    console.error(`[!] ERROR: No deployment manifest found at ${targetPath}.`);
    console.error("    Please deploy contracts first using: npm run deploy:sepolia");
    process.exitCode = 1;
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(targetPath, "utf8"));
  console.log(`▶ Loaded manifest from: ${targetPath}`);
  console.log(`  Deployed At: ${manifest.deployedAt}\n`);

  // 1. Verify ProducerRegistry
  const prInfo = manifest.contracts.ProducerRegistry;
  if (prInfo && prInfo.address) {
    console.log(`▶ [1/2] Verifying ProducerRegistry at ${prInfo.address}...`);
    try {
      await hre.run("verify:verify", {
        address: prInfo.address,
        constructorArguments: prInfo.constructorArgs || [],
      });
      console.log("  ✓ ProducerRegistry verified successfully!");
    } catch (err) {
      if (err.message.includes("Already Verified")) {
        console.log("  ✓ Contract is already verified on Etherscan.");
      } else {
        console.warn(`  [!] Notice: ${err.message}`);
      }
    }
  }

  // 2. Verify BatchRegistry
  const brInfo = manifest.contracts.BatchRegistry;
  if (brInfo && brInfo.address) {
    console.log(`\n▶ [2/2] Verifying BatchRegistry at ${brInfo.address}...`);
    try {
      await hre.run("verify:verify", {
        address: brInfo.address,
        constructorArguments: brInfo.constructorArgs || [prInfo.address],
      });
      console.log("  ✓ BatchRegistry verified successfully!");
    } catch (err) {
      if (err.message.includes("Already Verified")) {
        console.log("  ✓ Contract is already verified on Etherscan.");
      } else {
        console.warn(`  [!] Notice: ${err.message}`);
      }
    }
  }

  console.log("\n========================================================");
  console.log("  Verification Process Completed");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
