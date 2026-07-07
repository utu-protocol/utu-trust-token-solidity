// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./ChainlinkClient.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./EndorsementInterface.sol";
import "./UTURewardsInterface.sol";

contract UTTProxy is Initializable, OwnableUpgradeable, ChainlinkClient, EndorsementInterface, UTURewardsInterface {
    using Chainlink for Chainlink.Request;
    using Strings for uint256;
    using SafeERC20 for ERC20;

    /**
     * Action types forwarded to the main UTT contract via proxyAction().
     * MUST match the ordinals of Endorsement.ActionType on the main contract.
     */
    enum ActionType { ENDORSE, DISAPPROVE, WITHDRAW_STAKE }

    /** UTU Coin contract address */
    address public UTUCoin;

    /**
     * Chainlinkg orcale request data structure
     */
    struct OracleRequest {
        address from;
        address target;
        uint256 amount;
        string transactionId;
    }

    /**
     * Chainlinkg oracle claim request data structure
     */
    struct OracleClaimRequest {
        address target;
    }

    /** Sent oracle requests by id  */
    mapping(bytes32 => OracleRequest) private oracleRequests;

    /** Sent oracle claim requests by id  */
    mapping(bytes32 => OracleClaimRequest) private oracleClaimRequests;
    /** Address of the Chainlink oracle operator contract */
    address public oracle;

    /**
     * Legacy job id from the per-method era. Unused by this implementation; retained as a storage slot so the
     * upgrade preserves layout for any deployment that previously had it set.
     */
    bytes32 public jobId;

    /** LINK fee to be paid to the oracle operator contract for each request */
    uint256 public fee;

    /** Contract migration flag; when migrating any further endorsements or social connections are disabled. */
    bool public isMigrating;

    /** Id for oracle claim rewards jobs from this contract */
    bytes32 public claimRewardJobId;

    /**
     * Id for the unified proxy action oracle job. Handles endorse, disapprove, and withdrawStake by reading
     * an "actionType" field from the request payload and dispatching to proxyAction() on the main UTT.
     *
     * Storage layout note: this slot was previously named `disapproveJobId` (introduced on this branch but
     * never deployed). Renaming preserves the slot.
     */
    bytes32 public actionJobId;

    event ProxiedEndorseFulfilled(bytes32 indexed _requestId);
    event ProxiedActionFulfilled(bytes32 indexed _requestId);

        /** Rewarded UTU Coin were claimed */
    event FulfillingClaimUTURewards(address indexed _by, uint _value);

    function initialize(
        address _oracle,
        string memory _jobId,
        uint256 _fee,
        address _link,
        string memory _claimRewardJobId
    ) public initializer {
        __Ownable_init();
        __ChainlinkClient_init();
        setChainlinkToken(_link);
        oracle = _oracle;
        jobId = stringToBytes32(_jobId);
        fee = _fee;
        claimRewardJobId = stringToBytes32(_claimRewardJobId);
    }

    /**
     * Requires that the contract is not migrating.
     */
    modifier notMigrating() {
        require(!isMigrating, "Contract is migrating");
        _;
    }

    /** Sets the LINK fee to be paid for each request */
    function setFee(uint256 _fee) public onlyOwner {
        fee = _fee;
    }

    /**
     * Sets the address of the UTU Coin contract.
     * @param _UTUCoin address of the UTU Coin contract.
     */
    function setUTUCoin(address _UTUCoin) external onlyOwner {
        UTUCoin = _UTUCoin;
    }

    function setClaimRewardJobId(string memory  _claimRewardJobId) external onlyOwner {
        claimRewardJobId = stringToBytes32(_claimRewardJobId);
    }

    function setActionJobId(string memory _actionJobId) external onlyOwner {
        actionJobId = stringToBytes32(_actionJobId);
    }

    function endorse(
        address target,
        uint256 amount,
        string memory transactionId
    ) external override notMigrating {
        _emitAction(msg.sender, target, amount, transactionId, ActionType.ENDORSE);
    }

    function disapprove(
        address target,
        uint256 amount,
        string memory transactionId
    ) external override notMigrating {
        _emitAction(msg.sender, target, amount, transactionId, ActionType.DISAPPROVE);
    }

    function withdrawStake(
        address target,
        uint256 amount,
        string memory transactionId
    ) external override notMigrating {
        _emitAction(msg.sender, target, amount, transactionId, ActionType.WITHDRAW_STAKE);
    }

    function _emitAction(
        address source,
        address target,
        uint256 amount,
        string memory transactionId,
        ActionType actionType
    ) private {
        require(actionJobId != bytes32(0), "Action job ID not configured");
        Chainlink.Request memory request = buildChainlinkRequest(
            actionJobId,
            address(this),
            this.fulfillAction.selector
        );
        request._add("targetAddress", addressToString(target));
        request._add("sourceAddress", addressToString(source));
        request._add("transactionId", transactionId);
        request._add("amount", amount.toString());
        request._addUint("actionType", uint256(actionType));

        bytes32 requestId = sendOperatorRequestTo(oracle, request, fee);
        oracleRequests[requestId] = OracleRequest({
            from: source,
            target: target,
            amount: amount,
            transactionId: transactionId
        });
    }

    /**
     * Legacy fulfillment callback selector. Retained so any in-flight Chainlink request submitted with
     * `this.fulfill.selector` before an upgrade can still be fulfilled without reverting.
     */
    function fulfill(
        bytes32 _requestId
    ) external recordChainlinkFulfillment(_requestId) {
        emit ProxiedEndorseFulfilled(_requestId);
    }

    function fulfillAction(
        bytes32 _requestId
    ) external recordChainlinkFulfillment(_requestId) {
        emit ProxiedActionFulfilled(_requestId);
    }

    /**
     * @dev Converts a string to a bytes32 representation
     * @param source a string
     * @return result a bytes32
     */
    function stringToBytes32(
        string memory source
    ) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
        assembly {
            result := mload(add(source, 32))
        }
    }

    /**
     * @dev Converts an address to a string "0x..." representation.
     * @param x an address
     * @return string representation of the address
     */
    function addressToString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2 ** (8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(abi.encodePacked("0x", string(s)));
    }

    /**
     * @dev Converts a byte value to its readable char value.@param
     * @param b byte value
     * @return c the value as a readable char
     */
    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    /**
     * Toggles the migration flag. While migrating, no new endorsements or social media (dis)connections can be made.
     * @dev Endorsements can still be fulfilled; thus the actual migration process should not be started until
     *      all pending fulfillments are done.
     */
    function startMigrationToNewContract() public onlyOwner {
        isMigrating = !isMigrating;
    }

    function claimRewards() external override notMigrating {
        require(UTUCoin != address(0), "UTU Coin address not configured.");

        Chainlink.Request memory request = buildChainlinkRequest(
            claimRewardJobId,
            address(this),
            this.fulfillClaimRewards.selector
        );
        request._add("targetAddress", addressToString(msg.sender));

        bytes32 requestId = sendOperatorRequestTo(oracle, request, fee);
        oracleClaimRequests[requestId] = OracleClaimRequest({
            target: msg.sender
        });
    }

    function fulfillClaimRewards(
        bytes32 _requestId,
        uint256 _reward
    ) external {

        emit FulfillingClaimUTURewards(msg.sender, _reward);

        // Transfers amount UTU Coin from this contract to the user
        uint256 total = ERC20(UTUCoin).balanceOf(address(this));
        require(
            total >= _reward,
            "Not enough UTU Coin available to claim rewards."
        );

        validateChainlinkCallback(_requestId);

        OracleClaimRequest memory claimRequest = oracleClaimRequests[
            _requestId
        ];

        ERC20(UTUCoin).safeTransfer(claimRequest.target, _reward);

        emit ClaimUTURewards(claimRequest.target, _reward);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[47] __gap;
}
