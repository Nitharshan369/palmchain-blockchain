import { ethers } from 'ethers';
import ProducerRegistryABI from './ProducerRegistryABI.json';
import BatchRegistryABI from './BatchRegistryABI.json';

/**
 * Ethereum Sepolia Network Parameters
 */
export const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';

export const SEPOLIA_NETWORK_CONFIG = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    import.meta.env.VITE_SEPOLIA_RPC_URL && !import.meta.env.VITE_SEPOLIA_RPC_URL.includes('placeholder')
      ? import.meta.env.VITE_SEPOLIA_RPC_URL
      : 'https://rpc.sepolia.org',
    'https://ethereum-sepolia.publicnode.com',
  ],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

/**
 * Resolves contract addresses from environment configuration.
 * Supports multiple environment variable aliases for flexibility.
 */
export const CONTRACT_ADDRESSES = {
  producerRegistry:
    import.meta.env.VITE_PRODUCER_REGISTRY_ADDRESS ||
    import.meta.env.VITE_PALMCHAIN_PRODUCER_REGISTRY_ADDRESS ||
    '',
  batchRegistry:
    import.meta.env.VITE_BATCH_REGISTRY_ADDRESS ||
    import.meta.env.VITE_PALMCHAIN_BATCH_REGISTRY_ADDRESS ||
    '',
};

/**
 * Check if a contract address is configured and valid
 */
export function isAddressConfigured(address) {
  if (!address || typeof address !== 'string') return false;
  const clean = address.trim();
  if (!ethers.isAddress(clean)) return false;
  if (clean === ethers.ZeroAddress) return false;
  return true;
}

export function isProducerRegistryConfigured() {
  return isAddressConfigured(CONTRACT_ADDRESSES.producerRegistry);
}

export function isBatchRegistryConfigured() {
  return isAddressConfigured(CONTRACT_ADDRESSES.batchRegistry);
}

/**
 * ProducerStatus on-chain enum mapping
 * ProducerRegistry.sol: enum ProducerStatus { NotRegistered, Registered, Verified, Suspended }
 */
export const PRODUCER_STATUS = {
  0: 'NotRegistered',
  1: 'Registered',
  2: 'Verified',
  3: 'Suspended',
};

/**
 * BatchStatus on-chain enum mapping
 * BatchRegistry.sol: enum BatchStatus { Created, Processing, Verified, Packaged, Listed, Sold, Rejected, Recalled }
 */
export const BATCH_STATUS = {
  0: 'Created',
  1: 'Processing',
  2: 'Verified',
  3: 'Packaged',
  4: 'Listed',
  5: 'Sold',
  6: 'Rejected',
  7: 'Recalled',
};

/**
 * Default public read-only fallback provider for Ethereum Sepolia
 */
export function getFallbackProvider() {
  const rpc = SEPOLIA_NETWORK_CONFIG.rpcUrls[0];
  return new ethers.JsonRpcProvider(rpc);
}

/**
 * Get read-only ProducerRegistry contract instance.
 * Can be called without MetaMask being connected!
 */
export function getProducerRegistryReadOnly(customProvider = null) {
  if (!isProducerRegistryConfigured()) {
    throw new Error('ProducerRegistry contract address is not configured in VITE_PRODUCER_REGISTRY_ADDRESS');
  }
  const provider = customProvider || getFallbackProvider();
  return new ethers.Contract(CONTRACT_ADDRESSES.producerRegistry, ProducerRegistryABI, provider);
}

/**
 * Get wallet-signed ProducerRegistry contract instance.
 * Requires an ethers Signer from MetaMask.
 */
export function getProducerRegistryWithSigner(signer) {
  if (!signer) {
    throw new Error('Signer is required to execute transactions on ProducerRegistry');
  }
  if (!isProducerRegistryConfigured()) {
    throw new Error('ProducerRegistry contract address is not configured in VITE_PRODUCER_REGISTRY_ADDRESS');
  }
  return new ethers.Contract(CONTRACT_ADDRESSES.producerRegistry, ProducerRegistryABI, signer);
}

/**
 * Get read-only BatchRegistry contract instance.
 */
export function getBatchRegistryReadOnly(customProvider = null) {
  if (!isBatchRegistryConfigured()) {
    throw new Error('BatchRegistry contract address is not configured in VITE_BATCH_REGISTRY_ADDRESS');
  }
  const provider = customProvider || getFallbackProvider();
  return new ethers.Contract(CONTRACT_ADDRESSES.batchRegistry, BatchRegistryABI, provider);
}

/**
 * Get wallet-signed BatchRegistry contract instance.
 */
export function getBatchRegistryWithSigner(signer) {
  if (!signer) {
    throw new Error('Signer is required to execute transactions on BatchRegistry');
  }
  if (!isBatchRegistryConfigured()) {
    throw new Error('BatchRegistry contract address is not configured in VITE_BATCH_REGISTRY_ADDRESS');
  }
  return new ethers.Contract(CONTRACT_ADDRESSES.batchRegistry, BatchRegistryABI, signer);
}

export { ProducerRegistryABI, BatchRegistryABI };
