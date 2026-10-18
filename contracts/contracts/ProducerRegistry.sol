// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ProducerRegistry
 * @author PalmChain
 * @notice Manages producer registration and verifier authorization for the PalmChain platform.
 *
 * Role Hierarchy:
 *   Admin  ──> authorizes Verifiers
 *   Admin  ──> verifies Producers (sets verified status)
 *   Producer ──> self-registers
 *   Verifier ──> is authorized by Admin; approves BatchRegistry batches
 *
 * Registration Flow:
 *   1. Producer calls registerProducer() – status becomes Registered.
 *   2. Admin calls verifyProducer()    – status becomes Verified.
 *   3. Admin may suspend a producer    – status becomes Suspended.
 *
 * Access control uses custom errors (gas-efficient, no string revert reasons
 * to keep on-chain storage minimal).
 */
contract ProducerRegistry {

    // ─── Enumerations ──────────────────────────────────────────────────────────

    /**
     * @dev Lifecycle states for a producer account.
     * NotRegistered  : default / never registered.
     * Registered     : self-registered, pending admin verification.
     * Verified       : admin-verified; can create and anchor batches.
     * Suspended      : admin-suspended; loses all active privileges.
     */
    enum ProducerStatus { NotRegistered, Registered, Verified, Suspended }

    // ─── State ─────────────────────────────────────────────────────────────────

    /// @notice Contract administrator (set at deploy; can be transferred).
    address public admin;

    struct ProducerInfo {
        address wallet;
        string  name;           // Display / business name (off-chain; stored here for on-chain attribution)
        ProducerStatus status;
        uint256 registeredAt;   // Block timestamp of initial registration
        uint256 verifiedAt;     // Block timestamp when admin verified (0 if not yet)
    }

    /// @dev wallet address => producer info
    mapping(address => ProducerInfo) private _producers;

    /// @dev wallet address => is authorized verifier
    mapping(address => bool) private _verifiers;

    // Enumeration support
    address[] private _producerList;

    // ─── Events ────────────────────────────────────────────────────────────────

    /// @notice Emitted when a new producer self-registers.
    event ProducerRegistered(address indexed producer, string name, uint256 timestamp);

    /// @notice Emitted when the admin verifies a registered producer.
    event ProducerVerified(address indexed producer, address indexed admin, uint256 timestamp);

    /// @notice Emitted when the admin suspends a producer.
    event ProducerSuspended(address indexed producer, address indexed admin);

    /// @notice Emitted when an address is granted verifier privileges.
    event VerifierAuthorized(address indexed verifier, address indexed admin);

    /// @notice Emitted when verifier privileges are revoked.
    event VerifierRevoked(address indexed verifier, address indexed admin);

    /// @notice Emitted when admin ownership is transferred.
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    // ─── Custom Errors ─────────────────────────────────────────────────────────

    error NotAdmin();
    error ZeroAddress();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyVerified();
    error NotVerifiedProducer();
    error ProducerSuspendedError();
    error InvalidStatus();

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor() {
        admin = msg.sender;
        // Admin is implicitly an authorized verifier for bootstrapping
        _verifiers[msg.sender] = true;
        emit VerifierAuthorized(msg.sender, msg.sender);
    }

    // ─── Admin Management ──────────────────────────────────────────────────────

    /**
     * @notice Transfer admin role to a new address.
     * @dev Old admin loses admin privileges immediately.
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        address old = admin;
        admin = newAdmin;
        emit AdminTransferred(old, newAdmin);
    }

    /**
     * @notice Grant or revoke verifier authorization.
     * @dev Only admin. Verifiers can approve batches in BatchRegistry.
     */
    function setVerifier(address verifier, bool authorized) external onlyAdmin {
        if (verifier == address(0)) revert ZeroAddress();
        _verifiers[verifier] = authorized;
        if (authorized) {
            emit VerifierAuthorized(verifier, msg.sender);
        } else {
            emit VerifierRevoked(verifier, msg.sender);
        }
    }

    // ─── Producer Registration ─────────────────────────────────────────────────

    /**
     * @notice Register the caller as a PalmChain producer.
     * @param name Business / display name stored on-chain for attribution.
     * @dev Status becomes Registered. Must be verified by admin before creating batches.
     */
    function registerProducer(string calldata name) external {
        ProducerInfo storage info = _producers[msg.sender];
        if (info.status != ProducerStatus.NotRegistered) revert AlreadyRegistered();
        if (bytes(name).length == 0) revert InvalidStatus();  // empty name guard

        info.wallet       = msg.sender;
        info.name         = name;
        info.status       = ProducerStatus.Registered;
        info.registeredAt = block.timestamp;

        _producerList.push(msg.sender);
        emit ProducerRegistered(msg.sender, name, block.timestamp);
    }

    /**
     * @notice Admin verifies a registered producer, granting batch-creation rights.
     */
    function verifyProducer(address producer) external onlyAdmin {
        if (producer == address(0)) revert ZeroAddress();
        ProducerInfo storage info = _producers[producer];
        if (info.status == ProducerStatus.NotRegistered) revert NotRegistered();
        if (info.status == ProducerStatus.Verified)      revert AlreadyVerified();

        info.status     = ProducerStatus.Verified;
        info.verifiedAt = block.timestamp;
        emit ProducerVerified(producer, msg.sender, block.timestamp);
    }

    /**
     * @notice Admin suspends a producer, revoking batch-creation rights immediately.
     */
    function suspendProducer(address producer) external onlyAdmin {
        if (producer == address(0)) revert ZeroAddress();
        ProducerInfo storage info = _producers[producer];
        if (info.status == ProducerStatus.NotRegistered) revert NotRegistered();
        if (info.status == ProducerStatus.Suspended)     revert InvalidStatus();

        info.status = ProducerStatus.Suspended;
        emit ProducerSuspended(producer, msg.sender);
    }

    /**
     * @notice Admin reinstates a suspended producer (returns to Verified).
     */
    function reinstateProducer(address producer) external onlyAdmin {
        if (producer == address(0)) revert ZeroAddress();
        ProducerInfo storage info = _producers[producer];
        if (info.status != ProducerStatus.Suspended) revert InvalidStatus();

        info.status = ProducerStatus.Verified;
        emit ProducerVerified(producer, msg.sender, block.timestamp);
    }

    // ─── Read Functions ────────────────────────────────────────────────────────

    /**
     * @notice Returns complete info for a producer address.
     */
    function getProducer(address producer)
        external
        view
        returns (ProducerInfo memory)
    {
        return _producers[producer];
    }

    /**
     * @notice Quick check: is the given address a verified (and not suspended) producer?
     */
    function isVerifiedProducer(address producer) external view returns (bool) {
        return _producers[producer].status == ProducerStatus.Verified;
    }

    /**
     * @notice Quick check: is the given address an authorized verifier?
     */
    function isAuthorizedVerifier(address verifier) external view returns (bool) {
        return _verifiers[verifier];
    }

    /**
     * @notice Returns the total number of registered producers.
     */
    function totalProducers() external view returns (uint256) {
        return _producerList.length;
    }

    /**
     * @notice Returns the wallet address of the producer at index i.
     * @dev Useful for off-chain enumeration. Not for on-chain iteration.
     */
    function producerAt(uint256 index) external view returns (address) {
        require(index < _producerList.length, "ProducerRegistry: index out of bounds");
        return _producerList[index];
    }
}
