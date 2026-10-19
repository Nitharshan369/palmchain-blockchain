/**
 * PalmChain Sepolia Pre-Flight Check
 *
 * Validates:
 * 1. RPC connection and Sepolia chain ID (11155111)
 * 2. Deployer account availability and address derivation
 * 3. Deployer test ETH balance
 * 4. Etherscan API key presence
 *
 * Usage:
 *   npx hardhat run scripts/check-account.cjs --network sepolia
 */
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("\n========================================================");
  console.log("       PalmChain Sepolia Pre-Flight Check");
  console.log("========================================================\n");

  const networkName = hre.network.name;
  console.log(`[1] Target Network: ${networkName}`);

  // 1. Validate Network Chain ID
  let networkInfo;
  try {
    networkInfo = await ethers.provider.getNetwork();
    const chainId = Number(networkInfo.chainId);
    console.log(`    Chain ID       : ${chainId}`);

    if (networkName === "sepolia" && chainId !== 11155111) {
      console.error(`\n[!] ERROR: Network '${networkName}' reported chainId ${chainId}, expected 11155111 (Sepolia).`);
      console.error("    Check your SEPOLIA_RPC_URL in contracts/.env.");
      process.exitCode = 1;
      return;
    }
  } catch (rpcErr) {
    console.error(`\n[!] RPC Connection Error: Unable to query network.`);
    console.error(`    Detail: ${rpcErr.message}`);
    console.error("\n    Possible causes:");
    console.error("    - SEPOLIA_RPC_URL is missing or invalid in contracts/.env");
    console.error("    - The RPC provider is rate-limiting or offline");
    process.exitCode = 1;
    return;
  }

  // 2. Validate Deployer Account
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("\n[!] ERROR: No deployment account configured.");
    console.error("    SEPOLIA_PRIVATE_KEY is missing or contains placeholder values in contracts/.env.");
    console.error("\n    Action Required:");
    console.error("    1. Create contracts/.env if it does not exist.");
    console.error("    2. Add your testnet private key: SEPOLIA_PRIVATE_KEY=<your-64-hex-char-key>");
    console.error("    3. Ensure the account holds Sepolia test ETH.");
    process.exitCode = 1;
    return;
  }

  const deployer = signers[0];
  console.log(`\n[2] Deployer Account: ${deployer.address}`);

  // 3. Check Balance
  let balance;
  try {
    balance = await ethers.provider.getBalance(deployer.address);
    const formattedBalance = ethers.formatEther(balance);
    console.log(`    Sepolia ETH Balance: ${formattedBalance} ETH`);

    const minBalance = ethers.parseEther("0.005");
    if (balance < minBalance) {
      console.warn("\n[!] WARNING: Balance is low or 0 ETH.");
      console.warn("    Deploying ProducerRegistry and BatchRegistry typically requires ~0.003 - 0.008 Sepolia ETH.");
      console.warn("\n    To acquire free Sepolia test ETH:");
      console.warn("    - Google Cloud Web3 Faucet : https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
      console.warn("    - Alchemy Sepolia Faucet   : https://www.alchemy.com/faucets/ethereum-sepolia");
      console.warn("    - Infura Sepolia Faucet    : https://www.infura.io/faucet/sepolia");
      console.warn("    - Sepolia PoW Faucet       : https://sepolia-faucet.pk910.de/");
      console.warn(`    Your address to fund       : ${deployer.address}`);
    } else {
      console.log("    [OK] Account balance is sufficient for deployment.");
    }
  } catch (balErr) {
    console.error(`\n[!] Error checking account balance: ${balErr.message}`);
    process.exitCode = 1;
    return;
  }

  // 4. Check Etherscan API Key
  const etherscanKey = process.env.ETHERSCAN_API_KEY;
  console.log(`\n[3] Contract Verification Configuration:`);
  if (!etherscanKey || etherscanKey === "your-etherscan-api-key") {
    console.log("    [Notice] ETHERSCAN_API_KEY is not configured. Source code verification will be skipped.");
    console.log("    (You can verify contracts later anytime via 'npx hardhat verify' once you have a key)");
  } else {
    console.log("    [OK] ETHERSCAN_API_KEY detected.");
  }

  console.log("\n========================================================");
  console.log("  Pre-Flight Check Complete");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
