import { ethers } from 'ethers';

export const SEPOLIA_CHAIN_ID = 11155111n;
export const ESCROW_CONFIRMATIONS = 2;

export const PAYMENT_ESCROW_ABI = [
  'function registerListing(bytes32 productId, uint128 pricePerKgWei, uint64 availableQuantityHundredths, bool active)',
  'function getListing(bytes32 productId) view returns (tuple(address seller, uint128 pricePerKgWei, uint64 availableQuantityHundredths, bool active))',
  'function getOrdersForAccount(address account) view returns (uint256[])',
  'function getOrder(uint256 orderId) view returns (tuple(bytes32 productId, address buyer, address seller, uint64 quantityHundredths, uint128 pricePerKgWei, uint128 totalWei, uint64 purchasedAt, uint64 fulfilledAt, uint64 reviewDeadline, uint8 status))',
  'event PurchaseCreated(uint256 indexed orderId, bytes32 indexed productId, address indexed buyer, address seller, uint64 quantityHundredths, uint128 pricePerKgWei, uint128 totalWei, uint64 purchasedAt)',
  'event EscrowFunded(uint256 indexed orderId, address indexed buyer, uint256 amountWei)',
  'event ListingUpdated(bytes32 indexed productId, address indexed seller, uint128 pricePerKgWei, uint64 availableQuantityHundredths, bool active)',
];

export function getEscrowProductId(productId) {
  if (!productId) throw new Error('A product ID is required');
  return ethers.id(String(productId));
}

function invalidReceipt(message) {
  const error = new Error(message);
  error.status = 409;
  return error;
}

function parseEscrowLogs(receipt, escrow, eventName) {
  const parsed = [];
  for (const log of receipt.logs || []) {
    if (ethers.getAddress(log.address) !== ethers.getAddress(escrow.target)) continue;
    try {
      const event = escrow.interface.parseLog(log);
      if (event?.name === eventName) parsed.push(event.args);
    } catch {
      continue;
    }
  }
  return parsed;
}

function validateTransactionReceipt({ receipt, transaction, escrow }) {
  if (!receipt || receipt.status !== 1) throw invalidReceipt('Transaction did not succeed');
  if (!transaction || BigInt(transaction.chainId) !== SEPOLIA_CHAIN_ID) {
    throw invalidReceipt('Transaction must be on Sepolia');
  }
  if (!transaction.to || ethers.getAddress(transaction.to) !== ethers.getAddress(escrow.target)) {
    throw invalidReceipt('Transaction was not sent to the configured escrow');
  }
  if (receipt.hash && receipt.hash.toLowerCase() !== transaction.hash.toLowerCase()) {
    throw invalidReceipt('Transaction receipt does not match the supplied transaction');
  }
}

export function quantityHundredthsToKg(quantityHundredths) {
  const quantity = BigInt(quantityHundredths);
  if (quantity <= 0n || quantity > 10_000_000n) throw new Error('Invalid purchase quantity');
  return (Number(quantity) / 100).toFixed(2);
}

export function parseConfirmedPurchase({ receipt, transaction, escrow, productId, seller }) {
  validateTransactionReceipt({ receipt, transaction, escrow });

  const expectedProductId = getEscrowProductId(productId);
  const purchaseLogs = parseEscrowLogs(receipt, escrow, 'PurchaseCreated');
  if (purchaseLogs.length !== 1) {
    throw invalidReceipt('Receipt must contain exactly one escrow purchase event');
  }

  const purchase = purchaseLogs[0];
  if (purchase.productId.toLowerCase() !== expectedProductId.toLowerCase()
      || ethers.getAddress(purchase.seller) !== ethers.getAddress(seller)
      || ethers.getAddress(purchase.buyer) !== ethers.getAddress(transaction.from)) {
    throw invalidReceipt('Escrow receipt does not match the product, buyer, or seller');
  }

  const fundedLogs = parseEscrowLogs(receipt, escrow, 'EscrowFunded');
  if (fundedLogs.length !== 1
      || fundedLogs[0].orderId !== purchase.orderId
      || ethers.getAddress(fundedLogs[0].buyer) !== ethers.getAddress(purchase.buyer)
      || fundedLogs[0].amountWei !== purchase.totalWei
      || BigInt(transaction.value) !== purchase.totalWei) {
    throw invalidReceipt('Escrow funding event or transaction value does not match the purchase');
  }

  return {
    orderId: purchase.orderId.toString(),
    productId: purchase.productId,
    buyer: ethers.getAddress(purchase.buyer),
    seller: ethers.getAddress(purchase.seller),
    quantityHundredths: purchase.quantityHundredths.toString(),
    quantityKg: quantityHundredthsToKg(purchase.quantityHundredths),
    pricePerKgWei: purchase.pricePerKgWei.toString(),
    totalWei: purchase.totalWei.toString(),
  };
}

export function parseConfirmedListing({ receipt, transaction, escrow, productId, seller, pricePerKgWei, quantityHundredths, active }) {
  validateTransactionReceipt({ receipt, transaction, escrow });
  if (ethers.getAddress(transaction.from) !== ethers.getAddress(seller)) {
    throw invalidReceipt('Only the listing seller can register escrow terms');
  }

  const listingEvents = parseEscrowLogs(receipt, escrow, 'ListingUpdated');
  if (listingEvents.length !== 1) {
    throw invalidReceipt('Receipt must contain exactly one escrow listing event');
  }
  const listing = listingEvents[0];
  if (listing.productId.toLowerCase() !== getEscrowProductId(productId).toLowerCase()
      || ethers.getAddress(listing.seller) !== ethers.getAddress(seller)
      || listing.pricePerKgWei !== BigInt(pricePerKgWei)
      || listing.availableQuantityHundredths !== BigInt(quantityHundredths)
      || listing.active !== active) {
    throw invalidReceipt('Escrow listing event does not match the product listing');
  }
  return listing;
}
