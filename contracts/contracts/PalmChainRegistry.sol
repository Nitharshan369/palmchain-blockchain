// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PalmChainRegistry
 * @dev Smart contract for anchoring palm-jaggery batch integrity hashes onto Ethereum.
 *
 * Core Architectural Principle:
 * We DO NOT store heavy application data, product images, or full farm histories on-chain.
 * Off-chain records are stored in Supabase PostgreSQL.
 * A deterministic SHA-256 integrity hash is anchored here on-chain by authorized producers.
 * Verifiers can attach on-chain quality attestations.
 */
contract PalmChainRegistry {
    // Contract Owner / Administrator
    address public admin;

    // Role definitions
    mapping(address => bool) public authorizedProducers;
    mapping(address => bool) public authorizedVerifiers;

    enum BatchStatus {
        Anchored,
        Certified,
        Flagged,
        Recalled
    }

    struct BatchRecord {
        string batchId;
        bytes32 batchHash;       // SHA-256 canonical integrity hash
        address producerAddress; // Wallet address of the producer
        uint256 anchoredAt;      // Block timestamp of anchoring
        bool isCertified;        // Quality/purity certification status
        address certifier;       // Wallet of verifier who certified
        uint256 certifiedAt;     // Timestamp of certification
        BatchStatus status;
    }

    // Mapping from batchId to BatchRecord
    mapping(string => BatchRecord) private batches;
    // Array of all registered batch IDs for enumeration
    string[] private allBatchIds;

    // Events
    event ProducerAuthorized(address indexed producer);
    event ProducerRevoked(address indexed producer);
    event VerifierAuthorized(address indexed verifier);
    event VerifierRevoked(address indexed verifier);

    event BatchAnchored(
        string indexed batchId,
        bytes32 indexed batchHash,
        address indexed producer,
        uint256 timestamp
    );

    event BatchCertified(
        string indexed batchId,
        address indexed verifier,
        bool isCertified,
        uint256 timestamp
    );

    event BatchStatusChanged(
        string indexed batchId,
        BatchStatus newStatus,
        address indexed updatedBy
    );

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "PalmChain: Caller is not the admin");
        _;
    }

    modifier onlyAuthorizedProducer() {
        require(
            authorizedProducers[msg.sender] || msg.sender == admin,
            "PalmChain: Caller is not an authorized producer"
        );
        _;
    }

    modifier onlyAuthorizedVerifier() {
        require(
            authorizedVerifiers[msg.sender] || msg.sender == admin,
            "PalmChain: Caller is not an authorized verifier"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        // Deployer is authorized as initial producer and verifier for bootstrapping
        authorizedProducers[msg.sender] = true;
        authorizedVerifiers[msg.sender] = true;
    }

    // Role Management
    function setProducerAuthorization(address producer, bool isAuthorized) external onlyAdmin {
        require(producer != address(0), "PalmChain: Invalid address");
        authorizedProducers[producer] = isAuthorized;
        if (isAuthorized) {
            emit ProducerAuthorized(producer);
        } else {
            emit ProducerRevoked(producer);
        }
    }

    function setVerifierAuthorization(address verifier, bool isAuthorized) external onlyAdmin {
        require(verifier != address(0), "PalmChain: Invalid address");
        authorizedVerifiers[verifier] = isAuthorized;
        if (isAuthorized) {
            emit VerifierAuthorized(verifier);
        } else {
            emit VerifierRevoked(verifier);
        }
    }

    /**
     * @dev Anchors a new palm-jaggery production batch integrity hash onto the blockchain.
     * @param batchId Unique identifier for the batch (e.g. PJG-2026-001)
     * @param batchHash 32-byte SHA-256 hash of canonical batch attributes
     */
    function anchorBatch(string calldata batchId, bytes32 batchHash) external onlyAuthorizedProducer {
        require(bytes(batchId).length > 0, "PalmChain: Batch ID cannot be empty");
        require(batchHash != bytes32(0), "PalmChain: Batch hash cannot be empty");
        require(batches[batchId].anchoredAt == 0, "PalmChain: Batch ID already anchored");

        batches[batchId] = BatchRecord({
            batchId: batchId,
            batchHash: batchHash,
            producerAddress: msg.sender,
            anchoredAt: block.timestamp,
            isCertified: false,
            certifier: address(0),
            certifiedAt: 0,
            status: BatchStatus.Anchored
        });

        allBatchIds.push(batchId);

        emit BatchAnchored(batchId, batchHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Allows an authorized verifier to certify or flag a batch.
     */
    function certifyBatch(string calldata batchId, bool certified) external onlyAuthorizedVerifier {
        BatchRecord storage record = batches[batchId];
        require(record.anchoredAt > 0, "PalmChain: Batch does not exist");

        record.isCertified = certified;
        record.certifier = msg.sender;
        record.certifiedAt = block.timestamp;
        record.status = certified ? BatchStatus.Certified : BatchStatus.Flagged;

        emit BatchCertified(batchId, msg.sender, certified, block.timestamp);
    }

    /**
     * @dev Updates status (e.g., recall) by admin or originating producer.
     */
    function updateBatchStatus(string calldata batchId, BatchStatus newStatus) external {
        BatchRecord storage record = batches[batchId];
        require(record.anchoredAt > 0, "PalmChain: Batch does not exist");
        require(
            msg.sender == admin || msg.sender == record.producerAddress,
            "PalmChain: Unauthorized to update status"
        );

        record.status = newStatus;
        emit BatchStatusChanged(batchId, newStatus, msg.sender);
    }

    /**
     * @dev Verifies that a client-computed SHA-256 hash matches the on-chain anchor.
     * Zero-gas view call for customers scanning QR codes.
     */
    function verifyIntegrity(
        string calldata batchId,
        bytes32 computedHash
    ) external view returns (bool isTamperFree, bool isCertified, address producer, uint256 anchoredAt, BatchStatus status) {
        BatchRecord memory record = batches[batchId];
        if (record.anchoredAt == 0) {
            return (false, false, address(0), 0, BatchStatus.Anchored);
        }

        bool matchResult = (record.batchHash == computedHash);
        return (matchResult, record.isCertified, record.producerAddress, record.anchoredAt, record.status);
    }

    /**
     * @dev Returns full batch on-chain details.
     */
    function getBatch(string calldata batchId) external view returns (BatchRecord memory) {
        require(batches[batchId].anchoredAt > 0, "PalmChain: Batch does not exist");
        return batches[batchId];
    }

    /**
     * @dev Returns total number of anchored batches.
     */
    function totalBatches() external view returns (uint256) {
        return allBatchIds.length;
    }
}
