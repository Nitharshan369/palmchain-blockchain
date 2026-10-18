/**
 * PalmChain Smart Contract Test Suite
 * =====================================
 * Covers ProducerRegistry.sol and BatchRegistry.sol
 *
 * Run with:  npm test   (inside contracts/)
 *        or: npx hardhat test
 */

const { expect }      = require("chai");
const { ethers }      = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a deterministic 32-byte hash from a string — simulates SHA-256 anchoring */
const toBytes32 = (str) => ethers.id(str);

/** Quantity scaling factor (×100 for 2 decimal places) */
const Q = (n) => Math.round(n * 100);

// ─── Shared Fixtures ─────────────────────────────────────────────────────────

/**
 * deployRegistriesFixture
 * Deploys both contracts and returns all test signers + contract instances.
 * Uses Hardhat's loadFixture for snapshot-based test isolation (fast).
 */
async function deployRegistriesFixture() {
  const [admin, producer1, producer2, verifier, customer, stranger] =
    await ethers.getSigners();

  // Deploy ProducerRegistry
  const ProducerRegistry = await ethers.getContractFactory("ProducerRegistry");
  const producerRegistry = await ProducerRegistry.connect(admin).deploy();
  await producerRegistry.waitForDeployment();

  // Deploy BatchRegistry, passing ProducerRegistry address
  const BatchRegistry = await ethers.getContractFactory("BatchRegistry");
  const batchRegistry = await BatchRegistry.connect(admin).deploy(
    await producerRegistry.getAddress()
  );
  await batchRegistry.waitForDeployment();

  return {
    producerRegistry,
    batchRegistry,
    admin,
    producer1,
    producer2,
    verifier,
    customer,
    stranger,
  };
}

/**
 * withVerifiedProducerFixture
 * Extends deployRegistriesFixture with:
 *   - producer1 registered & verified
 *   - verifier authorized
 */
async function withVerifiedProducerFixture() {
  const ctx = await deployRegistriesFixture();
  const { producerRegistry, admin, producer1, verifier } = ctx;

  await producerRegistry
    .connect(producer1)
    .registerProducer("Palaniswamy Palm Farms");

  await producerRegistry.connect(admin).verifyProducer(producer1.address);
  await producerRegistry.connect(admin).setVerifier(verifier.address, true);

  return ctx;
}

/**
 * withCreatedBatchFixture
 * Extends withVerifiedProducerFixture with a batch in Created state.
 */
const SAMPLE_BATCH_ID   = "PJG-2026-001";
const SAMPLE_DATA_HASH  = toBytes32("canonical-metadata-PJG-2026-001");
const NEERA_LITERS_Q    = Q(50.75);   // 5075
const JAGGERY_KG_Q      = Q(12.50);   // 1250

async function withCreatedBatchFixture() {
  const ctx = await withVerifiedProducerFixture();
  const { batchRegistry, producer1 } = ctx;

  await batchRegistry
    .connect(producer1)
    .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH);

  return ctx;
}

// =============================================================================
// ──  1. PRODUCER REGISTRY TESTS  ─────────────────────────────────────────────
// =============================================================================

describe("ProducerRegistry", function () {

  // ─── Deployment ─────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("sets deployer as admin", async function () {
      const { producerRegistry, admin } = await loadFixture(deployRegistriesFixture);
      expect(await producerRegistry.admin()).to.equal(admin.address);
    });

    it("admin is automatically an authorized verifier", async function () {
      const { producerRegistry, admin } = await loadFixture(deployRegistriesFixture);
      expect(await producerRegistry.isAuthorizedVerifier(admin.address)).to.be.true;
    });
  });

  // ─── Registration ───────────────────────────────────────────────────────────

  describe("Producer registration", function () {
    it("allows a new address to register as a producer", async function () {
      const { producerRegistry, producer1 } = await loadFixture(deployRegistriesFixture);

      await expect(
        producerRegistry.connect(producer1).registerProducer("Arjun Farms")
      )
        .to.emit(producerRegistry, "ProducerRegistered")
        .withArgs(producer1.address, "Arjun Farms", (ts) => ts > 0n);

      const info = await producerRegistry.getProducer(producer1.address);
      expect(info.wallet).to.equal(producer1.address);
      expect(info.name).to.equal("Arjun Farms");
      expect(info.status).to.equal(1); // Registered = 1
    });

    it("increments totalProducers after registration", async function () {
      const { producerRegistry, producer1, producer2 } =
        await loadFixture(deployRegistriesFixture);

      await producerRegistry.connect(producer1).registerProducer("Farm A");
      await producerRegistry.connect(producer2).registerProducer("Farm B");

      expect(await producerRegistry.totalProducers()).to.equal(2n);
    });

    it("reverts on duplicate registration (same wallet)", async function () {
      const { producerRegistry, producer1 } = await loadFixture(deployRegistriesFixture);
      await producerRegistry.connect(producer1).registerProducer("Farm A");

      await expect(
        producerRegistry.connect(producer1).registerProducer("Farm A Again")
      ).to.be.revertedWithCustomError(producerRegistry, "AlreadyRegistered");
    });

    it("reverts if name is empty", async function () {
      const { producerRegistry, producer1 } = await loadFixture(deployRegistriesFixture);

      await expect(
        producerRegistry.connect(producer1).registerProducer("")
      ).to.be.revertedWithCustomError(producerRegistry, "InvalidStatus");
    });

    it("registered producer is NOT yet a verified producer", async function () {
      const { producerRegistry, producer1 } = await loadFixture(deployRegistriesFixture);
      await producerRegistry.connect(producer1).registerProducer("Farm A");

      expect(await producerRegistry.isVerifiedProducer(producer1.address)).to.be.false;
    });
  });

  // ─── Admin: Producer Verification ───────────────────────────────────────────

  describe("Admin producer verification", function () {
    it("admin can verify a registered producer", async function () {
      const { producerRegistry, admin, producer1 } = await loadFixture(deployRegistriesFixture);
      await producerRegistry.connect(producer1).registerProducer("Farm A");

      await expect(
        producerRegistry.connect(admin).verifyProducer(producer1.address)
      )
        .to.emit(producerRegistry, "ProducerVerified")
        .withArgs(producer1.address, admin.address, (ts) => ts > 0n);

      expect(await producerRegistry.isVerifiedProducer(producer1.address)).to.be.true;

      const info = await producerRegistry.getProducer(producer1.address);
      expect(info.status).to.equal(2); // Verified = 2
      expect(info.verifiedAt).to.be.gt(0n);
    });

    it("reverts if non-admin tries to verify a producer", async function () {
      const { producerRegistry, producer1, stranger } =
        await loadFixture(deployRegistriesFixture);
      await producerRegistry.connect(producer1).registerProducer("Farm A");

      await expect(
        producerRegistry.connect(stranger).verifyProducer(producer1.address)
      ).to.be.revertedWithCustomError(producerRegistry, "NotAdmin");
    });

    it("reverts if trying to verify an unregistered address", async function () {
      const { producerRegistry, admin, stranger } = await loadFixture(deployRegistriesFixture);

      await expect(
        producerRegistry.connect(admin).verifyProducer(stranger.address)
      ).to.be.revertedWithCustomError(producerRegistry, "NotRegistered");
    });

    it("reverts if trying to verify an already-verified producer", async function () {
      const { producerRegistry, admin, producer1 } = await loadFixture(deployRegistriesFixture);
      await producerRegistry.connect(producer1).registerProducer("Farm A");
      await producerRegistry.connect(admin).verifyProducer(producer1.address);

      await expect(
        producerRegistry.connect(admin).verifyProducer(producer1.address)
      ).to.be.revertedWithCustomError(producerRegistry, "AlreadyVerified");
    });
  });

  // ─── Admin: Suspend / Reinstate ──────────────────────────────────────────────

  describe("Admin suspension and reinstatement", function () {
    it("admin can suspend a verified producer", async function () {
      const { producerRegistry, admin, producer1 } = await loadFixture(deployRegistriesFixture);
      await producerRegistry.connect(producer1).registerProducer("Farm A");
      await producerRegistry.connect(admin).verifyProducer(producer1.address);

      await expect(producerRegistry.connect(admin).suspendProducer(producer1.address))
        .to.emit(producerRegistry, "ProducerSuspended")
        .withArgs(producer1.address, admin.address);

      expect(await producerRegistry.isVerifiedProducer(producer1.address)).to.be.false;
      const info = await producerRegistry.getProducer(producer1.address);
      expect(info.status).to.equal(3); // Suspended = 3
    });

    it("admin can reinstate a suspended producer", async function () {
      const { producerRegistry, admin, producer1 } = await loadFixture(deployRegistriesFixture);
      await producerRegistry.connect(producer1).registerProducer("Farm A");
      await producerRegistry.connect(admin).verifyProducer(producer1.address);
      await producerRegistry.connect(admin).suspendProducer(producer1.address);

      await producerRegistry.connect(admin).reinstateProducer(producer1.address);
      expect(await producerRegistry.isVerifiedProducer(producer1.address)).to.be.true;
    });
  });

  // ─── Verifier Authorization ──────────────────────────────────────────────────

  describe("Verifier authorization", function () {
    it("admin can authorize a verifier", async function () {
      const { producerRegistry, admin, verifier } = await loadFixture(deployRegistriesFixture);

      await expect(producerRegistry.connect(admin).setVerifier(verifier.address, true))
        .to.emit(producerRegistry, "VerifierAuthorized")
        .withArgs(verifier.address, admin.address);

      expect(await producerRegistry.isAuthorizedVerifier(verifier.address)).to.be.true;
    });

    it("admin can revoke a verifier", async function () {
      const { producerRegistry, admin, verifier } = await loadFixture(deployRegistriesFixture);
      await producerRegistry.connect(admin).setVerifier(verifier.address, true);

      await expect(producerRegistry.connect(admin).setVerifier(verifier.address, false))
        .to.emit(producerRegistry, "VerifierRevoked")
        .withArgs(verifier.address, admin.address);

      expect(await producerRegistry.isAuthorizedVerifier(verifier.address)).to.be.false;
    });

    it("non-admin cannot authorize verifiers", async function () {
      const { producerRegistry, stranger, verifier } = await loadFixture(deployRegistriesFixture);

      await expect(
        producerRegistry.connect(stranger).setVerifier(verifier.address, true)
      ).to.be.revertedWithCustomError(producerRegistry, "NotAdmin");
    });

    it("reverts setVerifier with zero address", async function () {
      const { producerRegistry, admin } = await loadFixture(deployRegistriesFixture);

      await expect(
        producerRegistry.connect(admin).setVerifier(ethers.ZeroAddress, true)
      ).to.be.revertedWithCustomError(producerRegistry, "ZeroAddress");
    });
  });
});

// =============================================================================
// ──  2. BATCH REGISTRY TESTS  ────────────────────────────────────────────────
// =============================================================================

describe("BatchRegistry", function () {

  // ─── Deployment ─────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("stores the ProducerRegistry address", async function () {
      const { producerRegistry, batchRegistry } =
        await loadFixture(deployRegistriesFixture);
      expect(await batchRegistry.producerRegistry()).to.equal(
        await producerRegistry.getAddress()
      );
    });

    it("reverts deployment with zero ProducerRegistry address", async function () {
      const [admin] = await ethers.getSigners();
      const BatchRegistry = await ethers.getContractFactory("BatchRegistry");

      await expect(
        BatchRegistry.connect(admin).deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("BatchRegistry: zero registry address");
    });
  });

  // ─── Batch Creation ──────────────────────────────────────────────────────────

  describe("Batch creation", function () {
    it("verified producer can create a batch", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);

      await expect(
        batchRegistry
          .connect(producer1)
          .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH)
      )
        .to.emit(batchRegistry, "BatchCreated")
        .withArgs(
          SAMPLE_BATCH_ID,
          SAMPLE_DATA_HASH,
          producer1.address,
          NEERA_LITERS_Q,
          JAGGERY_KG_Q,
          (ts) => ts > 0n
        );

      const batch = await batchRegistry.getBatch(SAMPLE_BATCH_ID);
      expect(batch.batchId).to.equal(SAMPLE_BATCH_ID);
      expect(batch.producer).to.equal(producer1.address);
      expect(batch.dataHash).to.equal(SAMPLE_DATA_HASH);
      expect(batch.neeraLiters).to.equal(BigInt(NEERA_LITERS_Q));
      expect(batch.jaggeryKg).to.equal(BigInt(JAGGERY_KG_Q));
      expect(batch.status).to.equal(0); // Created = 0
    });

    it("increments totalBatches after creation", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);
      await batchRegistry
        .connect(producer1)
        .createBatch("PJG-001", NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH);
      await batchRegistry
        .connect(producer1)
        .createBatch("PJG-002", NEERA_LITERS_Q, JAGGERY_KG_Q, toBytes32("hash2"));

      expect(await batchRegistry.totalBatches()).to.equal(2n);
    });

    it("stores the correct data hash on-chain", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);
      await batchRegistry
        .connect(producer1)
        .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH);

      const batch = await batchRegistry.getBatch(SAMPLE_BATCH_ID);
      expect(batch.dataHash).to.equal(SAMPLE_DATA_HASH);
    });

    it("reverts on duplicate batch ID", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);
      await batchRegistry
        .connect(producer1)
        .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH);

      await expect(
        batchRegistry
          .connect(producer1)
          .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH)
      ).to.be.revertedWithCustomError(batchRegistry, "BatchAlreadyExists");
    });

    it("reverts when an unregistered user tries to create a batch", async function () {
      const { batchRegistry, customer } = await loadFixture(withVerifiedProducerFixture);

      await expect(
        batchRegistry
          .connect(customer)
          .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH)
      ).to.be.revertedWithCustomError(batchRegistry, "NotVerifiedProducer");
    });

    it("reverts when a Registered (not yet verified) producer tries to create a batch", async function () {
      const { producerRegistry, batchRegistry, producer2 } =
        await loadFixture(withVerifiedProducerFixture);

      // producer2 self-registers but admin has NOT verified them yet
      await producerRegistry.connect(producer2).registerProducer("Farm B");

      await expect(
        batchRegistry
          .connect(producer2)
          .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH)
      ).to.be.revertedWithCustomError(batchRegistry, "NotVerifiedProducer");
    });

    it("reverts with empty batch ID", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);

      await expect(
        batchRegistry
          .connect(producer1)
          .createBatch("", NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH)
      ).to.be.revertedWithCustomError(batchRegistry, "EmptyBatchId");
    });

    it("reverts with zero data hash", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);

      await expect(
        batchRegistry
          .connect(producer1)
          .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, JAGGERY_KG_Q, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(batchRegistry, "EmptyDataHash");
    });

    it("reverts with zero neera quantity", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);

      await expect(
        batchRegistry
          .connect(producer1)
          .createBatch(SAMPLE_BATCH_ID, 0, JAGGERY_KG_Q, SAMPLE_DATA_HASH)
      ).to.be.revertedWithCustomError(batchRegistry, "ZeroQuantity");
    });

    it("reverts with zero jaggery quantity", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);

      await expect(
        batchRegistry
          .connect(producer1)
          .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, 0, SAMPLE_DATA_HASH)
      ).to.be.revertedWithCustomError(batchRegistry, "ZeroQuantity");
    });
  });

  // ─── Lifecycle Transitions ────────────────────────────────────────────────────

  describe("Lifecycle: Created → Processing", function () {
    it("producer can start processing their own batch", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withCreatedBatchFixture);

      await expect(batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID))
        .to.emit(batchRegistry, "BatchStatusChanged")
        .withArgs(
          SAMPLE_BATCH_ID,
          0, // Created
          1, // Processing
          producer1.address,
          (ts) => ts > 0n
        );

      expect(await batchRegistry.getBatchStatus(SAMPLE_BATCH_ID)).to.equal(1); // Processing
    });

    it("another producer cannot start processing someone else's batch", async function () {
      const { producerRegistry, batchRegistry, admin, producer2 } =
        await loadFixture(withCreatedBatchFixture);

      // Verify producer2 so the role check passes; ownership check should still fail
      await producerRegistry.connect(producer2).registerProducer("Farm B");
      await producerRegistry.connect(admin).verifyProducer(producer2.address);

      await expect(
        batchRegistry.connect(producer2).startProcessing(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "NotBatchProducer");
    });

    it("reverts invalid transition: Created → Packaged (skipping steps)", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withCreatedBatchFixture);

      await expect(
        batchRegistry.connect(producer1).markPackaged(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "InvalidTransition");
    });

    it("verifier cannot start processing (only producer can)", async function () {
      const { batchRegistry, verifier } = await loadFixture(withCreatedBatchFixture);

      await expect(
        batchRegistry.connect(verifier).startProcessing(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "NotBatchProducer");
    });

    it("customer cannot start processing", async function () {
      const { batchRegistry, customer } = await loadFixture(withCreatedBatchFixture);

      await expect(
        batchRegistry.connect(customer).startProcessing(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "NotBatchProducer");
    });
  });

  describe("Lifecycle: Processing → Verified (verifier approval)", function () {
    it("authorized verifier can approve a Processing batch", async function () {
      const { batchRegistry, producer1, verifier } = await loadFixture(withCreatedBatchFixture);
      await batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID);

      await expect(batchRegistry.connect(verifier).verifyBatch(SAMPLE_BATCH_ID))
        .to.emit(batchRegistry, "BatchVerified")
        .withArgs(SAMPLE_BATCH_ID, verifier.address, (ts) => ts > 0n);

      const batch = await batchRegistry.getBatch(SAMPLE_BATCH_ID);
      expect(batch.status).to.equal(2);           // Verified
      expect(batch.verifier).to.equal(verifier.address);
      expect(batch.verifiedAt).to.be.gt(0n);
    });

    it("unauthorized user cannot verify a batch", async function () {
      const { batchRegistry, producer1, customer } = await loadFixture(withCreatedBatchFixture);
      await batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID);

      await expect(
        batchRegistry.connect(customer).verifyBatch(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "NotAuthorizedVerifier");
    });

    it("producer cannot self-verify their own batch", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withCreatedBatchFixture);
      await batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID);

      await expect(
        batchRegistry.connect(producer1).verifyBatch(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "NotAuthorizedVerifier");
    });

    it("reverts verify on a batch that is still in Created status", async function () {
      const { batchRegistry, verifier } = await loadFixture(withCreatedBatchFixture);
      // Batch is Created, not Processing

      await expect(
        batchRegistry.connect(verifier).verifyBatch(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "InvalidTransition");
    });
  });

  describe("Lifecycle: Processing → Rejected + Resubmit", function () {
    it("verifier can reject a Processing batch with a reason", async function () {
      const { batchRegistry, producer1, verifier } = await loadFixture(withCreatedBatchFixture);
      await batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID);

      const reason = "Moisture content above 12%. Recondition and resubmit.";
      await expect(batchRegistry.connect(verifier).rejectBatch(SAMPLE_BATCH_ID, reason))
        .to.emit(batchRegistry, "BatchRejected")
        .withArgs(SAMPLE_BATCH_ID, verifier.address, reason, (ts) => ts > 0n);

      const batch = await batchRegistry.getBatch(SAMPLE_BATCH_ID);
      expect(batch.status).to.equal(6);            // Rejected
      expect(batch.rejectionReason).to.equal(reason);
      expect(batch.verifier).to.equal(verifier.address);
    });

    it("reverts rejection with empty reason", async function () {
      const { batchRegistry, producer1, verifier } = await loadFixture(withCreatedBatchFixture);
      await batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID);

      await expect(
        batchRegistry.connect(verifier).rejectBatch(SAMPLE_BATCH_ID, "")
      ).to.be.revertedWithCustomError(batchRegistry, "EmptyRejectionReason");
    });

    it("producer can resubmit a Rejected batch → Processing", async function () {
      const { batchRegistry, producer1, verifier } = await loadFixture(withCreatedBatchFixture);
      await batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID);
      await batchRegistry.connect(verifier).rejectBatch(SAMPLE_BATCH_ID, "Too moist");

      await expect(batchRegistry.connect(producer1).resubmitBatch(SAMPLE_BATCH_ID))
        .to.emit(batchRegistry, "BatchStatusChanged")
        .withArgs(SAMPLE_BATCH_ID, 6 /* Rejected */, 1 /* Processing */, producer1.address, (ts) => ts > 0n);

      const batch = await batchRegistry.getBatch(SAMPLE_BATCH_ID);
      expect(batch.status).to.equal(1);    // Processing
      expect(batch.rejectionReason).to.equal(""); // cleared
    });

    it("reverts resubmit if batch is not in Rejected status", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withCreatedBatchFixture);
      // Still in Created status

      await expect(
        batchRegistry.connect(producer1).resubmitBatch(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "InvalidTransition");
    });

    it("another producer cannot resubmit someone else's rejected batch", async function () {
      const { producerRegistry, batchRegistry, admin, producer1, producer2, verifier } =
        await loadFixture(withCreatedBatchFixture);

      await producerRegistry.connect(producer2).registerProducer("Farm B");
      await producerRegistry.connect(admin).verifyProducer(producer2.address);

      await batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID);
      await batchRegistry.connect(verifier).rejectBatch(SAMPLE_BATCH_ID, "Bad batch");

      await expect(
        batchRegistry.connect(producer2).resubmitBatch(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "NotBatchProducer");
    });
  });

  describe("Lifecycle: Verified → Packaged → Listed → Sold", function () {
    /** helper: advance to Verified state */
    async function advanceToVerified(ctx) {
      const { batchRegistry, producer1, verifier } = ctx;
      await batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID);
      await batchRegistry.connect(verifier).verifyBatch(SAMPLE_BATCH_ID);
    }

    it("producer marks Verified batch as Packaged", async function () {
      const ctx = await loadFixture(withCreatedBatchFixture);
      await advanceToVerified(ctx);

      await expect(ctx.batchRegistry.connect(ctx.producer1).markPackaged(SAMPLE_BATCH_ID))
        .to.emit(ctx.batchRegistry, "BatchStatusChanged")
        .withArgs(SAMPLE_BATCH_ID, 2, 3, ctx.producer1.address, (ts) => ts > 0n);

      expect(await ctx.batchRegistry.getBatchStatus(SAMPLE_BATCH_ID)).to.equal(3); // Packaged
    });

    it("producer lists a Packaged batch", async function () {
      const ctx = await loadFixture(withCreatedBatchFixture);
      await advanceToVerified(ctx);
      await ctx.batchRegistry.connect(ctx.producer1).markPackaged(SAMPLE_BATCH_ID);

      await expect(ctx.batchRegistry.connect(ctx.producer1).listBatch(SAMPLE_BATCH_ID))
        .to.emit(ctx.batchRegistry, "BatchStatusChanged")
        .withArgs(SAMPLE_BATCH_ID, 3, 4, ctx.producer1.address, (ts) => ts > 0n);

      expect(await ctx.batchRegistry.getBatchStatus(SAMPLE_BATCH_ID)).to.equal(4); // Listed
    });

    it("producer marks Listed batch as Sold", async function () {
      const ctx = await loadFixture(withCreatedBatchFixture);
      await advanceToVerified(ctx);
      await ctx.batchRegistry.connect(ctx.producer1).markPackaged(SAMPLE_BATCH_ID);
      await ctx.batchRegistry.connect(ctx.producer1).listBatch(SAMPLE_BATCH_ID);

      await expect(ctx.batchRegistry.connect(ctx.producer1).markSold(SAMPLE_BATCH_ID))
        .to.emit(ctx.batchRegistry, "BatchStatusChanged")
        .withArgs(SAMPLE_BATCH_ID, 4, 5, ctx.producer1.address, (ts) => ts > 0n);

      expect(await ctx.batchRegistry.getBatchStatus(SAMPLE_BATCH_ID)).to.equal(5); // Sold
    });

    it("reverts skipping Packaged → Sold (must list first)", async function () {
      const ctx = await loadFixture(withCreatedBatchFixture);
      await advanceToVerified(ctx);
      await ctx.batchRegistry.connect(ctx.producer1).markPackaged(SAMPLE_BATCH_ID);

      await expect(
        ctx.batchRegistry.connect(ctx.producer1).markSold(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(ctx.batchRegistry, "InvalidTransition");
    });

    it("reverts skipping Verified → Listed (must package first)", async function () {
      const ctx = await loadFixture(withCreatedBatchFixture);
      await advanceToVerified(ctx);

      await expect(
        ctx.batchRegistry.connect(ctx.producer1).listBatch(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(ctx.batchRegistry, "InvalidTransition");
    });
  });

  // ─── Admin Recall ────────────────────────────────────────────────────────────

  describe("Admin recall", function () {
    it("admin can recall a batch from any status", async function () {
      const { batchRegistry, producer1, verifier, admin } =
        await loadFixture(withCreatedBatchFixture);

      // Advance to Listed
      await batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID);
      await batchRegistry.connect(verifier).verifyBatch(SAMPLE_BATCH_ID);
      await batchRegistry.connect(producer1).markPackaged(SAMPLE_BATCH_ID);
      await batchRegistry.connect(producer1).listBatch(SAMPLE_BATCH_ID);

      await expect(batchRegistry.connect(admin).recallBatch(SAMPLE_BATCH_ID))
        .to.emit(batchRegistry, "BatchRecalled")
        .withArgs(SAMPLE_BATCH_ID, admin.address, (ts) => ts > 0n);

      expect(await batchRegistry.getBatchStatus(SAMPLE_BATCH_ID)).to.equal(7); // Recalled
    });

    it("non-admin cannot recall a batch", async function () {
      const { batchRegistry, producer1, customer } = await loadFixture(withCreatedBatchFixture);

      await expect(
        batchRegistry.connect(customer).recallBatch(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "NotAdmin");

      await expect(
        batchRegistry.connect(producer1).recallBatch(SAMPLE_BATCH_ID)
      ).to.be.revertedWithCustomError(batchRegistry, "NotAdmin");
    });
  });

  // ─── Integrity Verification ───────────────────────────────────────────────────

  describe("verifyIntegrity (QR scan simulation)", function () {
    it("returns tamperFree=true when hash matches stored dataHash", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);
      await batchRegistry
        .connect(producer1)
        .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH);

      const [tamperFree, status, producer, anchoredAt] =
        await batchRegistry.verifyIntegrity(SAMPLE_BATCH_ID, SAMPLE_DATA_HASH);

      expect(tamperFree).to.be.true;
      expect(status).to.equal(0); // Created
      expect(producer).to.equal(producer1.address);
      expect(anchoredAt).to.be.gt(0n);
    });

    it("returns tamperFree=false when hash does NOT match", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);
      await batchRegistry
        .connect(producer1)
        .createBatch(SAMPLE_BATCH_ID, NEERA_LITERS_Q, JAGGERY_KG_Q, SAMPLE_DATA_HASH);

      const tamperedHash = toBytes32("tampered-data-string");
      const [tamperFree] = await batchRegistry.verifyIntegrity(SAMPLE_BATCH_ID, tamperedHash);

      expect(tamperFree).to.be.false;
    });

    it("returns all-zero result for a non-existent batch", async function () {
      const { batchRegistry } = await loadFixture(withVerifiedProducerFixture);

      const [tamperFree, , producer, anchoredAt] =
        await batchRegistry.verifyIntegrity("NON-EXISTENT", SAMPLE_DATA_HASH);

      expect(tamperFree).to.be.false;
      expect(producer).to.equal(ethers.ZeroAddress);
      expect(anchoredAt).to.equal(0n);
    });
  });

  // ─── Read Functions ───────────────────────────────────────────────────────────

  describe("Read functions", function () {
    it("getBatch reverts for non-existent batch", async function () {
      const { batchRegistry } = await loadFixture(withVerifiedProducerFixture);

      await expect(
        batchRegistry.getBatch("NO-SUCH-BATCH")
      ).to.be.revertedWithCustomError(batchRegistry, "BatchDoesNotExist");
    });

    it("getBatchStatus reverts for non-existent batch", async function () {
      const { batchRegistry } = await loadFixture(withVerifiedProducerFixture);

      await expect(
        batchRegistry.getBatchStatus("NO-SUCH-BATCH")
      ).to.be.revertedWithCustomError(batchRegistry, "BatchDoesNotExist");
    });

    it("batchIdAt returns correct ID by index", async function () {
      const { batchRegistry, producer1 } = await loadFixture(withVerifiedProducerFixture);

      await batchRegistry
        .connect(producer1)
        .createBatch("PJG-A", NEERA_LITERS_Q, JAGGERY_KG_Q, toBytes32("hash-a"));
      await batchRegistry
        .connect(producer1)
        .createBatch("PJG-B", NEERA_LITERS_Q, JAGGERY_KG_Q, toBytes32("hash-b"));

      expect(await batchRegistry.batchIdAt(0)).to.equal("PJG-A");
      expect(await batchRegistry.batchIdAt(1)).to.equal("PJG-B");
    });
  });

  // ─── Event Emission ────────────────────────────────────────────────────────────

  describe("Event emission completeness", function () {
    it("emits BatchStatusChanged on every transition through full lifecycle", async function () {
      const { batchRegistry, producer1, verifier } = await loadFixture(withCreatedBatchFixture);

      // Created (already emitted in fixture)
      await expect(batchRegistry.connect(producer1).startProcessing(SAMPLE_BATCH_ID))
        .to.emit(batchRegistry, "BatchStatusChanged");

      await expect(batchRegistry.connect(verifier).verifyBatch(SAMPLE_BATCH_ID))
        .to.emit(batchRegistry, "BatchStatusChanged")
        .and.to.emit(batchRegistry, "BatchVerified");

      await expect(batchRegistry.connect(producer1).markPackaged(SAMPLE_BATCH_ID))
        .to.emit(batchRegistry, "BatchStatusChanged");

      await expect(batchRegistry.connect(producer1).listBatch(SAMPLE_BATCH_ID))
        .to.emit(batchRegistry, "BatchStatusChanged");

      await expect(batchRegistry.connect(producer1).markSold(SAMPLE_BATCH_ID))
        .to.emit(batchRegistry, "BatchStatusChanged");
    });
  });
});
