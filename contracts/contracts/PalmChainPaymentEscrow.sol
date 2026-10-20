// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PalmChainPaymentEscrow {
    uint256 public constant FULFILLMENT_TIMEOUT = 7 days;
    uint256 public constant BUYER_REVIEW_PERIOD = 7 days;

    enum OrderStatus {
        None,
        Escrowed,
        Fulfilled,
        Disputed,
        Released,
        Refunded
    }

    struct Listing {
        address seller;
        uint128 pricePerKgWei;
        uint64 availableQuantityHundredths;
        bool active;
    }

    struct Order {
        bytes32 productId;
        address buyer;
        address seller;
        uint64 quantityHundredths;
        uint128 pricePerKgWei;
        uint128 totalWei;
        uint64 purchasedAt;
        uint64 fulfilledAt;
        uint64 reviewDeadline;
        OrderStatus status;
    }

    address public immutable arbiter;
    uint256 public nextOrderId = 1;

    mapping(bytes32 productId => Listing) private listings;
    mapping(uint256 orderId => Order) private orders;
    mapping(bytes32 purchaseKey => bool used) public usedPurchaseKeys;
    mapping(address account => uint256[] orderIds) private accountOrderIds;

    uint256 private reentrancyState = 1;

    error InvalidAddress();
    error InvalidListing();
    error ListingUnavailable();
    error UnauthorizedSeller();
    error UnauthorizedBuyer();
    error UnauthorizedArbiter();
    error InvalidQuantity();
    error InvalidPayment();
    error DuplicatePurchase();
    error InvalidOrder();
    error InvalidOrderStatus();
    error FulfillmentDeadlineNotReached();
    error ReviewDeadlineNotReached();
    error TransferFailed();
    error ReentrantCall();

    event ListingUpdated(
        bytes32 indexed productId,
        address indexed seller,
        uint128 pricePerKgWei,
        uint64 availableQuantityHundredths,
        bool active
    );
    event PurchaseCreated(
        uint256 indexed orderId,
        bytes32 indexed productId,
        address indexed buyer,
        address seller,
        uint64 quantityHundredths,
        uint128 pricePerKgWei,
        uint128 totalWei,
        uint64 purchasedAt
    );
    event EscrowFunded(uint256 indexed orderId, address indexed buyer, uint256 amountWei);
    event OrderFulfilled(uint256 indexed orderId, address indexed seller, uint64 reviewDeadline);
    event DisputeOpened(uint256 indexed orderId, address indexed buyer);
    event EscrowReleased(uint256 indexed orderId, address indexed recipient, uint256 amountWei);
    event EscrowRefunded(uint256 indexed orderId, address indexed recipient, uint256 amountWei);

    modifier nonReentrant() {
        if (reentrancyState != 1) revert ReentrantCall();
        reentrancyState = 2;
        _;
        reentrancyState = 1;
    }

    constructor(address arbiterAddress) {
        if (arbiterAddress == address(0)) revert InvalidAddress();
        arbiter = arbiterAddress;
    }

    function registerListing(
        bytes32 productId,
        uint128 pricePerKgWei,
        uint64 availableQuantityHundredths,
        bool active
    ) external {
        if (
            productId == bytes32(0) ||
            pricePerKgWei == 0 ||
            availableQuantityHundredths == 0
        ) revert InvalidListing();

        Listing storage listing = listings[productId];
        if (listing.seller != address(0) && listing.seller != msg.sender) {
            revert UnauthorizedSeller();
        }

        listing.seller = msg.sender;
        listing.pricePerKgWei = pricePerKgWei;
        listing.availableQuantityHundredths = availableQuantityHundredths;
        listing.active = active;

        emit ListingUpdated(
            productId,
            msg.sender,
            pricePerKgWei,
            availableQuantityHundredths,
            active
        );
    }

    function getListing(bytes32 productId) external view returns (Listing memory) {
        return listings[productId];
    }

    function setListingActive(bytes32 productId, bool active) external {
        Listing storage listing = listings[productId];
        if (listing.seller == address(0)) revert ListingUnavailable();
        if (msg.sender != listing.seller) revert UnauthorizedSeller();
        if (active && listing.availableQuantityHundredths == 0) revert InvalidQuantity();

        listing.active = active;
        emit ListingUpdated(
            productId,
            msg.sender,
            listing.pricePerKgWei,
            listing.availableQuantityHundredths,
            active
        );
    }

    function getOrdersForAccount(address account) external view returns (uint256[] memory) {
        return accountOrderIds[account];
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function purchase(
        bytes32 productId,
        uint64 quantityHundredths,
        bytes32 purchaseKey
    ) external payable nonReentrant returns (uint256 orderId) {
        Listing storage listing = listings[productId];
        if (listing.seller == address(0) || !listing.active) revert ListingUnavailable();
        // Single-wallet demo mode: allow demonstration purchases from the same wallet address
        // if (msg.sender == listing.seller) revert UnauthorizedBuyer();
        if (quantityHundredths == 0 || quantityHundredths > listing.availableQuantityHundredths) {
            revert InvalidQuantity();
        }
        if (purchaseKey == bytes32(0) || usedPurchaseKeys[purchaseKey]) {
            revert DuplicatePurchase();
        }

        uint256 totalWei = _calculateTotal(listing.pricePerKgWei, quantityHundredths);
        if (totalWei > type(uint128).max || msg.value != totalWei) revert InvalidPayment();

        usedPurchaseKeys[purchaseKey] = true;
        listing.availableQuantityHundredths -= quantityHundredths;

        orderId = nextOrderId++;
        uint64 purchasedAt = uint64(block.timestamp);
        orders[orderId] = Order({
            productId: productId,
            buyer: msg.sender,
            seller: listing.seller,
            quantityHundredths: quantityHundredths,
            pricePerKgWei: listing.pricePerKgWei,
            totalWei: uint128(totalWei),
            purchasedAt: purchasedAt,
            fulfilledAt: 0,
            reviewDeadline: 0,
            status: OrderStatus.Escrowed
        });
        accountOrderIds[msg.sender].push(orderId);
        accountOrderIds[listing.seller].push(orderId);

        emit PurchaseCreated(
            orderId,
            productId,
            msg.sender,
            listing.seller,
            quantityHundredths,
            listing.pricePerKgWei,
            uint128(totalWei),
            purchasedAt
        );
        emit EscrowFunded(orderId, msg.sender, totalWei);
    }

    function markFulfilled(uint256 orderId) external {
        Order storage order = _getOrder(orderId);
        if (msg.sender != order.seller) revert UnauthorizedSeller();
        if (order.status != OrderStatus.Escrowed) revert InvalidOrderStatus();

        order.status = OrderStatus.Fulfilled;
        order.fulfilledAt = uint64(block.timestamp);
        order.reviewDeadline = uint64(block.timestamp + BUYER_REVIEW_PERIOD);

        emit OrderFulfilled(orderId, msg.sender, order.reviewDeadline);
    }

    function confirmFulfillment(uint256 orderId) external nonReentrant {
        Order storage order = _getOrder(orderId);
        if (msg.sender != order.buyer) revert UnauthorizedBuyer();
        if (order.status != OrderStatus.Fulfilled) revert InvalidOrderStatus();

        _release(orderId, order);
    }

    function openDispute(uint256 orderId) external {
        Order storage order = _getOrder(orderId);
        if (msg.sender != order.buyer) revert UnauthorizedBuyer();
        if (order.status != OrderStatus.Fulfilled || block.timestamp >= order.reviewDeadline) {
            revert InvalidOrderStatus();
        }

        order.status = OrderStatus.Disputed;
        emit DisputeOpened(orderId, msg.sender);
    }

    function resolveDispute(uint256 orderId, bool releaseToSeller) external nonReentrant {
        if (msg.sender != arbiter) revert UnauthorizedArbiter();
        Order storage order = _getOrder(orderId);
        if (order.status != OrderStatus.Disputed) revert InvalidOrderStatus();

        if (releaseToSeller) {
            _release(orderId, order);
        } else {
            _refund(orderId, order);
        }
    }

    function refundAfterFulfillmentTimeout(uint256 orderId) external nonReentrant {
        Order storage order = _getOrder(orderId);
        if (msg.sender != order.buyer) revert UnauthorizedBuyer();
        if (order.status != OrderStatus.Escrowed) revert InvalidOrderStatus();
        if (block.timestamp < uint256(order.purchasedAt) + FULFILLMENT_TIMEOUT) {
            revert FulfillmentDeadlineNotReached();
        }

        _refund(orderId, order);
    }

    function releaseAfterReviewTimeout(uint256 orderId) external nonReentrant {
        Order storage order = _getOrder(orderId);
        if (order.status != OrderStatus.Fulfilled) revert InvalidOrderStatus();
        if (block.timestamp < order.reviewDeadline) revert ReviewDeadlineNotReached();

        _release(orderId, order);
    }

    function _calculateTotal(uint128 pricePerKgWei, uint64 quantityHundredths)
        private
        pure
        returns (uint256)
    {
        uint256 product = uint256(pricePerKgWei) * quantityHundredths;
        return (product + 99) / 100;
    }

    function _getOrder(uint256 orderId) private view returns (Order storage order) {
        order = orders[orderId];
        if (order.status == OrderStatus.None) revert InvalidOrder();
    }

    function _release(uint256 orderId, Order storage order) private {
        order.status = OrderStatus.Released;
        address seller = order.seller;
        uint256 amount = order.totalWei;

        (bool success, ) = payable(seller).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit EscrowReleased(orderId, seller, amount);
    }

    function _refund(uint256 orderId, Order storage order) private {
        order.status = OrderStatus.Refunded;
        address buyer = order.buyer;
        uint256 amount = order.totalWei;

        (bool success, ) = payable(buyer).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit EscrowRefunded(orderId, buyer, amount);
    }
}
