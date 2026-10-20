const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  if (hre.network.name !== "sepolia") {
    throw new Error("Payment escrow deployment is restricted to the Sepolia testnet.");
  }

  const { ethers } = hre;
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 11155111n) {
    throw new Error(`Expected Sepolia chain ID 11155111, got ${network.chainId}.`);
  }

  const arbiterAddress = process.env.PAYMENT_ESCROW_ARBITER_ADDRESS?.trim();
  if (!arbiterAddress || !ethers.isAddress(arbiterAddress) || arbiterAddress === ethers.ZeroAddress) {
    throw new Error("Set PAYMENT_ESCROW_ARBITER_ADDRESS to the designated non-zero dispute arbiter wallet.");
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("Configure a Sepolia deployer in contracts/.env.");
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance === 0n) throw new Error("The Sepolia deployer needs test ETH for gas.");

  const factory = await ethers.getContractFactory("PalmChainPaymentEscrow", deployer);
  const escrow = await factory.deploy(arbiterAddress);
  await escrow.waitForDeployment();
  const transaction = escrow.deploymentTransaction();
  const receipt = await transaction.wait(2);

  const deployedArbiter = await escrow.arbiter();
  if (ethers.getAddress(deployedArbiter) !== ethers.getAddress(arbiterAddress)) {
    throw new Error("Deployed escrow arbiter did not match the configured address.");
  }

  const manifest = {
    network: { name: "sepolia", chainId: Number(network.chainId) },
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PalmChainPaymentEscrow: {
        address: await escrow.getAddress(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        arbiter: deployedArbiter,
        abiPath: "artifacts/contracts/PalmChainPaymentEscrow.sol/PalmChainPaymentEscrow.json",
      },
    },
  };
  const manifestPath = path.join(__dirname, "..", "deployments", "payment-escrow-sepolia.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`PalmChainPaymentEscrow deployed to ${await escrow.getAddress()}`);
  console.log(`Arbiter: ${deployedArbiter}`);
  console.log(`Transaction: ${receipt.hash}`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
