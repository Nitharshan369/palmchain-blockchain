const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("PalmChainPaymentEscrow", function () {
  let escrow;
  let arbiter;
  let seller;
  let buyer;
  let other;
  let productId;
  let purchaseKey;

  const pricePerKgWei = ethers.parseEther("0.02");
  const quantityHundredths = 250n;
  const totalWei = (pricePerKgWei * quantityHundredths + 99n) / 100n;

  async function buy(quantity = quantityHundredths, value = totalWei) {
    return escrow.connect(buyer).purchase(productId, quantity, purchaseKey, { value });
  }

  async function createOrder() {
    await buy();
  }

  beforeEach(async function () {
    [arbiter, seller, buyer, other] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("PalmChainPaymentEscrow");
    escrow = await Escrow.deploy(arbiter.address);
    await escrow.waitForDeployment();
    productId = ethers.id("product-1");
    purchaseKey = ethers.id("purchase-1");
    await escrow.connect(seller).registerListing(productId, pricePerKgWei, 1000, true);
  });

  it("rejects zero quantity, unavailable product quantities, self-purchases and duplicate keys", async function () {
    await expect(
      escrow.connect(buyer).purchase(productId, 0, purchaseKey, { value: 0 })
    ).to.be.revertedWithCustomError(escrow, "InvalidQuantity");
    await expect(
      escrow.connect(buyer).purchase(productId, 1001, purchaseKey, { value: totalWei * 5n })
    ).to.be.revertedWithCustomError(escrow, "InvalidQuantity");
    await expect(
      escrow.connect(seller).purchase(productId, 1, purchaseKey, { value: (pricePerKgWei + 99n) / 100n })
    ).to.be.revertedWithCustomError(escrow, "UnauthorizedBuyer");
    await createOrder();
    await expect(buy()).to.be.revertedWithCustomError(escrow, "DuplicatePurchase");
  });

  it("requires the exact listed test ETH amount and escrows a successful purchase", async function () {
    await expect(buy(quantityHundredths, totalWei - 1n))
      .to.be.revertedWithCustomError(escrow, "InvalidPayment");
    await expect(buy(quantityHundredths, totalWei + 1n))
      .to.be.revertedWithCustomError(escrow, "InvalidPayment");

    await expect(buy())
      .to.emit(escrow, "PurchaseCreated")
      .withArgs(1, productId, buyer.address, seller.address, quantityHundredths, pricePerKgWei, totalWei, anyValue);
    expect((await escrow.getListing(productId)).availableQuantityHundredths).to.equal(750);
    expect((await escrow.getOrder(1)).status).to.equal(1);
    expect(await ethers.provider.getBalance(escrow.target)).to.equal(totalWei);
  });

  it("only the seller can mark fulfillment and only the buyer can confirm release", async function () {
    await createOrder();
    await expect(escrow.connect(other).markFulfilled(1))
      .to.be.revertedWithCustomError(escrow, "UnauthorizedSeller");
    await escrow.connect(seller).markFulfilled(1);
    await expect(escrow.connect(other).confirmFulfillment(1))
      .to.be.revertedWithCustomError(escrow, "UnauthorizedBuyer");
    await expect(escrow.connect(seller).confirmFulfillment(1))
      .to.be.revertedWithCustomError(escrow, "UnauthorizedBuyer");
  });

  it("releases once after buyer confirmation and prevents repeated release", async function () {
    await createOrder();
    await escrow.connect(seller).markFulfilled(1);
    await expect(escrow.connect(buyer).confirmFulfillment(1))
      .to.emit(escrow, "EscrowReleased")
      .withArgs(1, seller.address, totalWei);
    expect((await escrow.getOrder(1)).status).to.equal(4);
    await expect(escrow.connect(buyer).confirmFulfillment(1))
      .to.be.revertedWithCustomError(escrow, "InvalidOrderStatus");
    await expect(escrow.connect(other).releaseAfterReviewTimeout(1))
      .to.be.revertedWithCustomError(escrow, "InvalidOrderStatus");
  });

  it("allows refund only to the buyer after the seller fulfillment deadline", async function () {
    await createOrder();
    await expect(escrow.connect(buyer).refundAfterFulfillmentTimeout(1))
      .to.be.revertedWithCustomError(escrow, "FulfillmentDeadlineNotReached");
    await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
    await network.provider.send("evm_mine");
    await expect(escrow.connect(other).refundAfterFulfillmentTimeout(1))
      .to.be.revertedWithCustomError(escrow, "UnauthorizedBuyer");
    await expect(escrow.connect(buyer).refundAfterFulfillmentTimeout(1))
      .to.emit(escrow, "EscrowRefunded")
      .withArgs(1, buyer.address, totalWei);
    expect((await escrow.getOrder(1)).status).to.equal(5);
    await expect(escrow.connect(buyer).refundAfterFulfillmentTimeout(1))
      .to.be.revertedWithCustomError(escrow, "InvalidOrderStatus");
  });

  it("does not allow a fulfillment timeout refund once the seller marks fulfillment", async function () {
    await createOrder();
    await escrow.connect(seller).markFulfilled(1);
    await network.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await network.provider.send("evm_mine");
    await expect(escrow.connect(buyer).refundAfterFulfillmentTimeout(1))
      .to.be.revertedWithCustomError(escrow, "InvalidOrderStatus");
  });

  it("locks disputed funds until the designated arbiter releases or refunds", async function () {
    await createOrder();
    await escrow.connect(seller).markFulfilled(1);
    await escrow.connect(buyer).openDispute(1);
    await expect(escrow.connect(other).resolveDispute(1, true))
      .to.be.revertedWithCustomError(escrow, "UnauthorizedArbiter");
    await expect(escrow.connect(buyer).confirmFulfillment(1))
      .to.be.revertedWithCustomError(escrow, "InvalidOrderStatus");
    await expect(escrow.connect(arbiter).resolveDispute(1, false))
      .to.emit(escrow, "EscrowRefunded")
      .withArgs(1, buyer.address, totalWei);
    expect((await escrow.getOrder(1)).status).to.equal(5);
  });

  it("allows permissionless release after the review timeout if no dispute was opened", async function () {
    await createOrder();
    await escrow.connect(seller).markFulfilled(1);
    await expect(escrow.connect(other).releaseAfterReviewTimeout(1))
      .to.be.revertedWithCustomError(escrow, "ReviewDeadlineNotReached");
    await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
    await network.provider.send("evm_mine");
    await expect(escrow.connect(other).releaseAfterReviewTimeout(1))
      .to.emit(escrow, "EscrowReleased")
      .withArgs(1, seller.address, totalWei);
  });
});

const anyValue = (value) => typeof value === "bigint" && value > 0n;
