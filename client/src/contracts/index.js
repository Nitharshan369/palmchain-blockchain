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
  paymentEscrow: import.meta.env.VITE_PAYMENT_ESCROW_ADDRESS || '',
};

export const PaymentEscrowABI = [
  'function arbiter() view returns (address)',
  'function FULFILLMENT_TIMEOUT() view returns (uint256)',
  'function BUYER_REVIEW_PERIOD() view returns (uint256)',
  'function registerListing(bytes32 productId, uint128 pricePerKgWei, uint64 availableQuantityHundredths, bool active)',
  'function setListingActive(bytes32 productId, bool active)',
  'function getListing(bytes32 productId) view returns (tuple(address seller, uint128 pricePerKgWei, uint64 availableQuantityHundredths, bool active))',
  'function getOrdersForAccount(address account) view returns (uint256[])',
  'function getOrder(uint256 orderId) view returns (tuple(bytes32 productId, address buyer, address seller, uint64 quantityHundredths, uint128 pricePerKgWei, uint128 totalWei, uint64 purchasedAt, uint64 fulfilledAt, uint64 reviewDeadline, uint8 status))',
  'function purchase(bytes32 productId, uint64 quantityHundredths, bytes32 purchaseKey) payable returns (uint256 orderId)',
  'function markFulfilled(uint256 orderId)',
  'function confirmFulfillment(uint256 orderId)',
  'function openDispute(uint256 orderId)',
  'function resolveDispute(uint256 orderId, bool releaseToSeller)',
  'function refundAfterFulfillmentTimeout(uint256 orderId)',
  'function releaseAfterReviewTimeout(uint256 orderId)',
  'event PurchaseCreated(uint256 indexed orderId, bytes32 indexed productId, address indexed buyer, address seller, uint64 quantityHundredths, uint128 pricePerKgWei, uint128 totalWei, uint64 purchasedAt)',
  'event EscrowFunded(uint256 indexed orderId, address indexed buyer, uint256 amountWei)',
  'event OrderFulfilled(uint256 indexed orderId, address indexed seller, uint64 reviewDeadline)',
  'event DisputeOpened(uint256 indexed orderId, address indexed buyer)',
  'event EscrowReleased(uint256 indexed orderId, address indexed recipient, uint256 amountWei)',
  'event EscrowRefunded(uint256 indexed orderId, address indexed recipient, uint256 amountWei)',
];

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

export function isPaymentEscrowConfigured() {
  return isAddressConfigured(CONTRACT_ADDRESSES.paymentEscrow);
}

export function getPaymentEscrowReadOnly(customProvider = null) {
  if (!isPaymentEscrowConfigured()) {
    throw new Error('Payment escrow contract address is not configured in VITE_PAYMENT_ESCROW_ADDRESS');
  }
  return new ethers.Contract(
    CONTRACT_ADDRESSES.paymentEscrow,
    PaymentEscrowABI,
    customProvider || getFallbackProvider()
  );
}

export function getPaymentEscrowWithSigner(signer) {
  if (!signer) throw new Error('A MetaMask signer is required for escrow transactions');
  if (!isPaymentEscrowConfigured()) {
    throw new Error('Payment escrow contract address is not configured in VITE_PAYMENT_ESCROW_ADDRESS');
  }
  return new ethers.Contract(CONTRACT_ADDRESSES.paymentEscrow, PaymentEscrowABI, signer);
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

export const BATCH_REGISTRY_VERIFICATION_ABI = [
  'function verifyBatch(string batchId)',
  'function rejectBatch(string batchId,string reason)',
  'event BatchVerified(string indexed batchId,address indexed verifier,uint256 timestamp)',
  'event BatchRejected(string indexed batchId,address indexed verifier,string reason,uint256 timestamp)',
];

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

/**
 * Execute a read-only contract query with automatic fallback across multiple Sepolia RPCs.
 * Ensures zero-failure read access even when public or free-tier RPCs throttle.
 */
export async function executeWithRpcFallback(fn) {
  let lastError = null;
  for (const rpcUrl of SEPOLIA_NETWORK_CONFIG.rpcUrls) {
    if (!rpcUrl) continue;
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      return await fn(provider);
    } catch (err) {
      lastError = err;
      console.warn(`[contracts] RPC ${rpcUrl} notice: ${err.message}. Trying next fallback...`);
    }
  }
  throw lastError || new Error('All configured Sepolia RPC providers failed.');
}

export { ProducerRegistryABI, BatchRegistryABI };
