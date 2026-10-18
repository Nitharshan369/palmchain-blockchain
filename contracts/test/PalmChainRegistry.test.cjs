const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PalmChainRegistry", function () {
  let registry;
  let admin, producer, verifier, customer;

  const sampleBatchId = "PJG-2026-TEST01";
  // Sample 32-byte hash (representing SHA-256 hash of batch metadata)
  const sampleBatchHash = ethers.id("SamplePalmJaggeryBatchHash_2026");

  beforeEach(async function () {
    [admin, producer, verifier, customer] = await ethers.getSigners();

    const PalmChainRegistry = await ethers.getContractFactory("PalmChainRegistry");
    registry = await PalmChainRegistry.deploy();
    await registry.waitForDeployment();

    // Authorize producer and verifier
    await registry.connect(admin).setProducerAuthorization(producer.address, true);
    await registry.connect(admin).setVerifierAuthorization(verifier.address, true);
  });

  it("Should set the deployer as admin", async function () {
    expect(await registry.admin()).to.equal(admin.address);
  });

  it("Should allow an authorized producer to anchor a batch hash", async function () {
    await expect(
      registry.connect(producer).anchorBatch(sampleBatchId, sampleBatchHash)
    )
      .to.emit(registry, "BatchAnchored")
      .withArgs(sampleBatchId, sampleBatchHash, producer.address, (val) => val > 0);

    const record = await registry.getBatch(sampleBatchId);
    expect(record.batchId).to.equal(sampleBatchId);
    expect(record.batchHash).to.equal(sampleBatchHash);
    expect(record.producerAddress).to.equal(producer.address);
    expect(record.isCertified).to.equal(false);
  });

  it("Should prevent unauthorized users from anchoring batches", async function () {
    await expect(
      registry.connect(customer).anchorBatch("PJG-HACK", sampleBatchHash)
    ).to.be.revertedWith("PalmChain: Caller is not an authorized producer");
  });

  it("Should verify batch integrity correctly", async function () {
    await registry.connect(producer).anchorBatch(sampleBatchId, sampleBatchHash);

    // Matching hash check
    const verification = await registry.verifyIntegrity(sampleBatchId, sampleBatchHash);
    expect(verification.isTamperFree).to.equal(true);
    expect(verification.producer).to.equal(producer.address);

    // Tampered hash check
    const tamperedHash = ethers.id("Tampered_Data_String");
    const tamperedVerification = await registry.verifyIntegrity(sampleBatchId, tamperedHash);
    expect(tamperedVerification.isTamperFree).to.equal(false);
  });

  it("Should allow an authorized verifier to certify a batch", async function () {
    await registry.connect(producer).anchorBatch(sampleBatchId, sampleBatchHash);

    await expect(registry.connect(verifier).certifyBatch(sampleBatchId, true))
      .to.emit(registry, "BatchCertified")
      .withArgs(sampleBatchId, verifier.address, true, (val) => val > 0);

    const record = await registry.getBatch(sampleBatchId);
    expect(record.isCertified).to.equal(true);
    expect(record.certifier).to.equal(verifier.address);
  });
});
