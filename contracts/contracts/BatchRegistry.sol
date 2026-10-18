// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ProducerRegistry.sol";

/**
 * @title BatchRegistry
 * @author PalmChain
 * @notice Records palm-jaggery production batches on-chain with a strict lifecycle,
 *         anchors a SHA-256 integrity hash, and enforces access control via ProducerRegistry.
 *
 * ─── Architectural Principle ────────────────────────────────────────────────
 * Heavy data (images, documents, full farm histories) lives in Supabase PostgreSQL.
 * Only identity, quantities, a deterministic SHA-256 integrity hash, and status
 * are anchored here. Consumers scan a QR code → call verifyIntegrity() → zero cost.
 *
 * ─── Batch Lifecycle ────────────────────────────────────────────────────────
 *
 *   CREATED   : Producer registered the batch on-chain. Awaiting lab / processing.
 *   PROCESSING: Producer confirms active processing has begun.
 *   VERIFIED  : An authorized verifier has approved quality. Batch is authentic.
 *   PACKAGED  : Producer confirms physical packaging is complete.
 *   LISTED    : Producer lists the batch for sale on the marketplace.
 *   SOLD      : All units sold; batch is retired.
 *   REJECTED  : Verifier rejected the batch. Producer must correct and resubmit.
 *   RECALLED  : Admin-only. Post-sale product recall.
 *
 * Valid transitions (→ means caller may trigger):
 *   CREATED    → PROCESSING   (producer only)
 *   PROCESSING → VERIFIED     (authorized verifier only)
 *   PROCESSING → REJECTED     (authorized verifier only)
 *   REJECTED   → PROCESSING   (producer only — resubmit for re-inspection)
 *   VERIFIED   → PACKAGED     (producer only)
 *   PACKAGED   → LISTED       (producer only)
 *   LISTED     → SOLD         (producer only)
 *   ANY        → RECALLED     (admin only — emergency recall)
 *
 * Unauthorized or out-of-sequence transitions revert with a custom error.
 */
contract BatchRegistry {

    // ─── Enumerations ──────────────────────────────────────────────────────────

    /**
     * @dev Ordered lifecycle states.
     * The uint8 values are intentionally non-sequential so that simple > / < comparisons
     * cannot be used as a lifecycle shortcut — callers must use the explicit transition table.
     */
    enum BatchStatus {
        Created,    // 0
        Processing, // 1
        Verified,   // 2
        Packaged,   // 3
        Listed,     // 4
        Sold,       // 5
        Rejected,   // 6
        Recalled    // 7
    }

    // ─── Data Structures ───────────────────────────────────────────────────────

    struct Batch {
        string   batchId;           // Human-readable ID, e.g. "PJG-2026-001"
        address  producer;          // Wallet address of the registered producer
        uint256  createdAt;         // Block.timestamp when batch was first created
        uint256  neeraLiters;       // Sap (Neera) quantity in liters (scaled ×100 for 2 dp)
        uint256  jaggeryKg;         // Output jaggery quantity in kg  (scaled ×100 for 2 dp)
        bytes32  dataHash;          // SHA-256 integrity hash of canonical off-chain metadata
        BatchStatus status;
        // Verification fields (populated when verifier acts)
        address  verifier;          // Wallet of the verifier who approved/rejected
        uint256  verifiedAt;        // Timestamp of verification action
        string   rejectionReason;   // Non-empty only if status == Rejected
    }

    // ─── State ─────────────────────────────────────────────────────────────────

    /// @notice Reference to ProducerRegistry for role checks.
    ProducerRegistry public immutable producerRegistry;

    /// @dev batchId → Batch
    mapping(string => Batch) private _batches;

    /// @dev Enumeration array
    string[] private _batchIds;

    // ─── Events ────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a new batch is created by a verified producer.
     * @param batchId   Human-readable batch identifier.
     * @param dataHash  SHA-256 hash of the canonical off-chain metadata.
     * @param producer  Producer wallet address.
     * @param timestamp Block timestamp.
     */
    event BatchCreated(
        string  indexed batchId,
        bytes32 indexed dataHash,
        address indexed producer,
        uint256 neeraLiters,
        uint256 jaggeryKg,
        uint256 timestamp
    );

    /**
     * @notice Emitted on every lifecycle state change.
     * @param batchId   Identifier of the affected batch.
     * @param from      Previous status.
     * @param to        New status.
     * @param actor     Address that triggered the transition.
     * @param timestamp Block timestamp.
     */
    event BatchStatusChanged(
        string  indexed batchId,
        BatchStatus from,
        BatchStatus to,
        address indexed actor,
        uint256 timestamp
    );

    /**
     * @notice Emitted when an authorized verifier approves a batch.
     */
    event BatchVerified(
        string  indexed batchId,
        address indexed verifier,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a verifier rejects a batch with a reason.
     */
    event BatchRejected(
        string  indexed batchId,
        address indexed verifier,
        string  reason,
        uint256 timestamp
    );

    /**
     * @notice Emitted when admin recalls a batch post-sale.
     */
    event BatchRecalled(
        string  indexed batchId,
        address indexed admin,
        uint256 timestamp
    );

    // ─── Custom Errors ─────────────────────────────────────────────────────────

    error NotAdmin();
    error NotVerifiedProducer();
    error NotAuthorizedVerifier();
    error NotBatchProducer();
    error BatchAlreadyExists();
    error BatchDoesNotExist();
    error EmptyBatchId();
    error EmptyDataHash();
    error InvalidTransition(BatchStatus current, BatchStatus requested);
    error EmptyRejectionReason();
    error ZeroQuantity();

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        if (msg.sender != producerRegistry.admin()) revert NotAdmin();
        _;
    }

    modifier onlyVerifiedProducer() {
        if (!producerRegistry.isVerifiedProducer(msg.sender)) revert NotVerifiedProducer();
        _;
    }

    modifier onlyAuthorizedVerifier() {
        if (!producerRegistry.isAuthorizedVerifier(msg.sender)) revert NotAuthorizedVerifier();
        _;
    }

    modifier batchExists(string calldata batchId) {
        if (_batches[batchId].createdAt == 0) revert BatchDoesNotExist();
        _;
    }

    modifier onlyBatchProducer(string calldata batchId) {
        if (_batches[batchId].producer != msg.sender) revert NotBatchProducer();
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param registryAddress Address of the already-deployed ProducerRegistry contract.
     */
    constructor(address registryAddress) {
        require(registryAddress != address(0), "BatchRegistry: zero registry address");
        producerRegistry = ProducerRegistry(registryAddress);
    }

    // ─── Batch Creation ────────────────────────────────────────────────────────

    /**
     * @notice Create a new production batch on-chain.
     * @param batchId      Human-readable unique ID (e.g. "PJG-2026-001").
     * @param neeraLiters  Neera sap quantity in liters, scaled ×100 (e.g., 5050 = 50.50 L).
     * @param jaggeryKg    Jaggery output in kg, scaled ×100 (e.g., 1250 = 12.50 kg).
     * @param dataHash     SHA-256 hash (as bytes32) of the canonical off-chain metadata JSON.
     *
     * @dev Only verified producers may call this. Batch IDs must be globally unique.
     *      Quantities use integer arithmetic scaled by 100 to avoid floating point.
     */
    function createBatch(
        string  calldata batchId,
        uint256 neeraLiters,
        uint256 jaggeryKg,
        bytes32 dataHash
    ) external onlyVerifiedProducer {
        if (bytes(batchId).length == 0)    revert EmptyBatchId();
        if (dataHash == bytes32(0))        revert EmptyDataHash();
        if (neeraLiters == 0)             revert ZeroQuantity();
        if (jaggeryKg == 0)              revert ZeroQuantity();
        if (_batches[batchId].createdAt != 0) revert BatchAlreadyExists();

        _batches[batchId] = Batch({
            batchId:         batchId,
            producer:        msg.sender,
            createdAt:       block.timestamp,
            neeraLiters:     neeraLiters,
            jaggeryKg:       jaggeryKg,
            dataHash:        dataHash,
            status:          BatchStatus.Created,
            verifier:        address(0),
            verifiedAt:      0,
            rejectionReason: ""
        });

        _batchIds.push(batchId);

        emit BatchCreated(batchId, dataHash, msg.sender, neeraLiters, jaggeryKg, block.timestamp);
        emit BatchStatusChanged(batchId, BatchStatus.Created, BatchStatus.Created, msg.sender, block.timestamp);
    }

    // ─── Producer Lifecycle Transitions ────────────────────────────────────────

    /**
     * @notice Producer advances batch from Created → Processing.
     * @dev Signals that active production/processing has begun.
     */
    function startProcessing(string calldata batchId)
        external
        batchExists(batchId)
        onlyBatchProducer(batchId)
    {
        Batch storage b = _batches[batchId];
        if (b.status != BatchStatus.Created) {
            revert InvalidTransition(b.status, BatchStatus.Processing);
        }
        _transitionStatus(batchId, b, BatchStatus.Processing);
    }

    /**
     * @notice Producer resubmits a Rejected batch for re-inspection (→ Processing).
     * @dev Clears the rejection reason and verifier fields, allowing a fresh verification.
     */
    function resubmitBatch(string calldata batchId)
        external
        batchExists(batchId)
        onlyBatchProducer(batchId)
    {
        Batch storage b = _batches[batchId];
        if (b.status != BatchStatus.Rejected) {
            revert InvalidTransition(b.status, BatchStatus.Processing);
        }
        b.verifier        = address(0);
        b.verifiedAt      = 0;
        b.rejectionReason = "";
        _transitionStatus(batchId, b, BatchStatus.Processing);
    }

    /**
     * @notice Producer marks batch as Packaged after successful verification.
     * @dev Valid from: Verified only.
     */
    function markPackaged(string calldata batchId)
        external
        batchExists(batchId)
        onlyBatchProducer(batchId)
    {
        Batch storage b = _batches[batchId];
        if (b.status != BatchStatus.Verified) {
            revert InvalidTransition(b.status, BatchStatus.Packaged);
        }
        _transitionStatus(batchId, b, BatchStatus.Packaged);
    }

    /**
     * @notice Producer lists the packaged batch on the marketplace.
     * @dev Valid from: Packaged only.
     */
    function listBatch(string calldata batchId)
        external
        batchExists(batchId)
        onlyBatchProducer(batchId)
    {
        Batch storage b = _batches[batchId];
        if (b.status != BatchStatus.Packaged) {
            revert InvalidTransition(b.status, BatchStatus.Listed);
        }
        _transitionStatus(batchId, b, BatchStatus.Listed);
    }

    /**
     * @notice Producer marks all units as sold.
     * @dev Valid from: Listed only.
     */
    function markSold(string calldata batchId)
        external
        batchExists(batchId)
        onlyBatchProducer(batchId)
    {
        Batch storage b = _batches[batchId];
        if (b.status != BatchStatus.Listed) {
            revert InvalidTransition(b.status, BatchStatus.Sold);
        }
        _transitionStatus(batchId, b, BatchStatus.Sold);
    }

    // ─── Verifier Actions ──────────────────────────────────────────────────────

    /**
     * @notice Authorized verifier approves a batch under inspection (Processing → Verified).
     * @dev Records the verifier address and timestamp on-chain.
     */
    function verifyBatch(string calldata batchId)
        external
        batchExists(batchId)
        onlyAuthorizedVerifier
    {
        Batch storage b = _batches[batchId];
        if (b.status != BatchStatus.Processing) {
            revert InvalidTransition(b.status, BatchStatus.Verified);
        }

        b.verifier   = msg.sender;
        b.verifiedAt = block.timestamp;
        _transitionStatus(batchId, b, BatchStatus.Verified);

        emit BatchVerified(batchId, msg.sender, block.timestamp);
    }

    /**
     * @notice Authorized verifier rejects a batch with a mandatory reason.
     * @param reason  Non-empty explanation for the rejection (stored on-chain).
     * @dev Status → Rejected. Producer must call resubmitBatch() to re-enter Processing.
     */
    function rejectBatch(string calldata batchId, string calldata reason)
        external
        batchExists(batchId)
        onlyAuthorizedVerifier
    {
        if (bytes(reason).length == 0) revert EmptyRejectionReason();
        Batch storage b = _batches[batchId];
        if (b.status != BatchStatus.Processing) {
            revert InvalidTransition(b.status, BatchStatus.Rejected);
        }

        b.verifier        = msg.sender;
        b.verifiedAt      = block.timestamp;
        b.rejectionReason = reason;
        _transitionStatus(batchId, b, BatchStatus.Rejected);

        emit BatchRejected(batchId, msg.sender, reason, block.timestamp);
    }

    // ─── Admin Actions ─────────────────────────────────────────────────────────

    /**
     * @notice Admin can recall a batch from any status (emergency only).
     * @dev Emits BatchRecalled in addition to BatchStatusChanged.
     */
    function recallBatch(string calldata batchId)
        external
        batchExists(batchId)
        onlyAdmin
    {
        Batch storage b = _batches[batchId];
        _transitionStatus(batchId, b, BatchStatus.Recalled);
        emit BatchRecalled(batchId, msg.sender, block.timestamp);
    }

    // ─── Read Functions ────────────────────────────────────────────────────────

    /**
     * @notice Returns the full on-chain Batch record.
     */
    function getBatch(string calldata batchId)
        external
        view
        returns (Batch memory)
    {
        if (_batches[batchId].createdAt == 0) revert BatchDoesNotExist();
        return _batches[batchId];
    }

    /**
     * @notice Returns the current lifecycle status of a batch.
     */
    function getBatchStatus(string calldata batchId)
        external
        view
        returns (BatchStatus)
    {
        if (_batches[batchId].createdAt == 0) revert BatchDoesNotExist();
        return _batches[batchId].status;
    }

    /**
     * @notice Verifies that a client-recomputed hash matches the on-chain anchor.
     *         Zero-gas view call — used by QR-scanning consumers.
     * @param batchId       Batch identifier to check.
     * @param computedHash  SHA-256 hash the client computed from off-chain data.
     * @return tamperFree   True iff computedHash equals stored dataHash.
     * @return status       Current lifecycle status.
     * @return producer     Producer wallet address.
     * @return anchoredAt   Block timestamp of creation.
     */
    function verifyIntegrity(string calldata batchId, bytes32 computedHash)
        external
        view
        returns (
            bool       tamperFree,
            BatchStatus status,
            address    producer,
            uint256    anchoredAt
        )
    {
        Batch memory b = _batches[batchId];
        if (b.createdAt == 0) {
            return (false, BatchStatus.Created, address(0), 0);
        }
        return (
            b.dataHash == computedHash,
            b.status,
            b.producer,
            b.createdAt
        );
    }

    /**
     * @notice Returns the total number of batches registered.
     */
    function totalBatches() external view returns (uint256) {
        return _batchIds.length;
    }

    /**
     * @notice Returns the batch ID at the given enumeration index.
     */
    function batchIdAt(uint256 index) external view returns (string memory) {
        require(index < _batchIds.length, "BatchRegistry: index out of bounds");
        return _batchIds[index];
    }

    // ─── Internal Helpers ──────────────────────────────────────────────────────

    function _transitionStatus(
        string calldata batchId,
        Batch storage b,
        BatchStatus to
    ) internal {
        BatchStatus from = b.status;
        b.status = to;
        emit BatchStatusChanged(batchId, from, to, msg.sender, block.timestamp);
    }
}
