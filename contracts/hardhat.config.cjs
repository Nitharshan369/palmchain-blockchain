require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Safely normalize private key
function getSepoliaAccounts() {
  const rawKey = (process.env.SEPOLIA_PRIVATE_KEY || "").trim();
  if (!rawKey) return [];
  const cleanKey = rawKey.startsWith("0x") ? rawKey.slice(2) : rawKey;
  // Ignore placeholder dummy key
  if (cleanKey === "0000000000000000000000000000000000000000000000000000000000000000") {
    return [];
  }
  if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    return [`0x${cleanKey}`];
  }
  return [];
}

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const SEPOLIA_ACCOUNTS = getSepoliaAccounts();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: SEPOLIA_ACCOUNTS,
      chainId: 11155111,
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
  sourcify: {
    enabled: true,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
