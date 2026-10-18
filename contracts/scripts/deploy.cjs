const hre = require("hardhat");

async function main() {
  console.log("[PalmChain] Deploying PalmChainRegistry contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`[PalmChain] Deployer address: ${deployer.address}`);

  const PalmChainRegistry = await hre.ethers.getContractFactory("PalmChainRegistry");
  const registry = await PalmChainRegistry.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log(`[PalmChain] PalmChainRegistry deployed to: ${contractAddress}`);
  console.log(`[PalmChain] Network: ${hre.network.name}`);
  console.log(`\nNext step: update PALMCHAIN_CONTRACT_ADDRESS in server/.env and client/.env with this address.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[PalmChain Deployment Error]:", error);
    process.exit(1);
  });
