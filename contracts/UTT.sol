// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

contract UTT is ERC20Burnable, ERC20Pausable, Ownable, ChainlinkClient {
    using Chainlink for Chainlink.Request;

    /**
     * The `socialConnections` mapping is storing the connected socialIds
     * as so: address => socialTypeId => socialUserIdHash
     */
    mapping (address => mapping (uint256 => bytes32) ) socialConnections;

    /**
     * The `socialConnectionReward` variable is the amount of tokens to be minted
     * as a reward for connecting/verifying with a social platform user id.
     * Configurable by admin.
     */
    uint256 public socialConnectionReward = 10000;


    // See the whitepaper for the meaning of the following parameters:

    /** New stake offset */
    uint256 public constant O_n = 1;

    /** Discounting component for the new stake */
    uint256 public constant D_n = 30;

    /** Discounting component for the stake of first-level previous endorsers */
    uint256 public constant D_lvl1 = 2;

    /** Discounting component for the stake of second-level previous endorsers */
    uint256 public constant D_lvl2 = 20; //

    /** Discounting component for other previous endorsers' total stake */
    uint256 public constant D_o = 5000;


    /** A map targetAddress => endorserAddress => stake mapping all endorser's stakes by their endorsement target */
    mapping (address => mapping(address => uint256)) public previousEndorserStakes;

    /** A map targetAddress => stake with the total stake by target */
    mapping (address => uint) public totalStake;

    // Oracle related
    struct OracleRequest {
        address from;
        address target;
        uint256 amount;
        string transactionId;
    }
    mapping (bytes32 => OracleRequest) private oracleRequests;
    address private oracle;
    bytes32 private jobId;
    uint256 private fee;

    // Events for connecting social media accounts/other user ids.
    event AddConnection(address indexed _user, uint indexed _connectedTypeId, bytes32 indexed _connectedUserIdHash);
    event RemoveConnection(address indexed _user, uint indexed _connectedTypeId,bytes32 indexed _connectedUserIdHash);

    // Events for endorsements.
    event Endorse(address indexed _from, address indexed _to, uint _value, string _transactionId);
    event RewardPreviousEndorserLevel1(address endorser, uint256 reward);
    event RewardPreviousEndorserLevel2(address endorser, uint256 reward);

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE` and `PAUSER_ROLE` to the
     * account that deploys the contract. Grants `MINTER_ROLE` to the bridge.
     *
     * See {ERC20-constructor}.
     */
    constructor(
        uint256 _mintAmount,
        address _oracle,
        string memory _jobId,
        uint256 _fee,
        address _link
    )
        ERC20("UTU Trust Token", "UTT")
    {
        _mint(msg.sender, _mintAmount);
        setChainlinkToken(_link);
        oracle = _oracle;
        jobId = stringToBytes32(_jobId);
        fee = _fee;
    }

    /**
     * @dev Pauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_pause}.
     *
     */
    function pause()
        public
        virtual
        onlyOwner
    {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_unpause}.
     *
     */
    function unpause()
        public
        virtual
        onlyOwner
    {
        _unpause();
    }

    /**
     * 
     * Setting the decimals to 0 instead of 18 since we don't need decimals for this particular use case
     *
     */
    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    /**
     * Computes the reward to be given to previousEndorser for a new endorsement of s_n on the given target and the
     * previous endorser level-dependent discount D_lvl_p. It assumes that the new endorsement s_n has not yet been
     * added to the totalStake map.
     */
    function computeReward(
        address target,
        address previousEndorser,
        uint256 D_lvl_p,
        uint256 s_n
    )
    private
    view
    returns (uint256)
    {
        uint256 s_p = previousEndorserStakes[target][previousEndorser];
        uint256 s_o = totalStake[target] - s_p;

        return
            (s_p *  (s_n + O_n) * D_o)
            /
            (D_lvl_p * (s_n + D_n) * (D_o + s_o));
    }


    /**
     * @dev Sends a tip of tokens to the previous address
     * that endorsed the current one.
     *
     * Invokes `super._transfer()`.
     */
    function _endorse(
        address from,
        address target,
        uint256 amount,
        string memory transactionId,
        address[] memory endorsersLevel1,
        address[] memory endorsersLevel2
    )
        internal
    {
        //reward first-level previous endorsers
        for(uint8 i=0; i < endorsersLevel1.length; i++){
            uint256 endorserReward = computeReward(target, endorsersLevel1[i], D_lvl1, amount);

            // mint rewarded tokens to endorser
            super._mint(address(endorsersLevel1[i]), endorserReward);
            emit RewardPreviousEndorserLevel1(endorsersLevel1[i], endorserReward);
        }

        //reward first-level previous endorsers
        for(uint8 i=0; i < endorsersLevel2.length; i++){
            uint256 endorserReward = computeReward(target, endorsersLevel2[i], D_lvl2, amount);

            // mint rewarded tokens to endorser
            super._mint(endorsersLevel2[i], endorserReward);
            emit RewardPreviousEndorserLevel2(endorsersLevel2[i], endorserReward);
        }

        totalStake[target] += amount;
        previousEndorserStakes[target][from] += amount;

        emit Endorse(from, target, amount, transactionId);
    }

    function endorse(address target, uint256 amount, string memory transactionId) external {
        require(msg.sender == tx.origin, "should be an user");
        Chainlink.Request memory request = buildChainlinkRequest(jobId, address(this), this.fulfillEndorse.selector);
        request.add("targetAddress", addressToString(target));
        request.add("sourceAddress", addressToString(msg.sender));
        request.add("transactionId", transactionId);
        bytes32 requestId = sendOperatorRequestTo(oracle, request, fee);
        oracleRequests[requestId] = OracleRequest({ from: msg.sender, target: target, amount: amount, transactionId: transactionId });
    }

    function fulfillEndorse(
        bytes32 _requestId,
        address[] calldata endorsersLevel1,
        address[] calldata endorsersLevel2
    )
        external
        recordChainlinkFulfillment(_requestId)
    {
        OracleRequest memory r = oracleRequests[_requestId];
        require(r.target != address(0), "unknown endorsment");
        _burn(r.from, r.amount);
        _endorse(r.from, r.target, r.amount, r.transactionId, endorsersLevel1, endorsersLevel2);
    }

    /**
     * @dev The admin (backend) can set verified social media
     * connections.
     */
    function addConnection(
        address user,
        uint256 connectedTypeId,
        bytes32 connectedUserIdHash
    )
        public
        onlyOwner
    {
        // only add connection if not previously added
        if (socialConnections[user][connectedTypeId] == 0) {
            socialConnections[user][connectedTypeId] = connectedUserIdHash;

            // mint reward
            super._mint(user, socialConnectionReward);

            hashedUserId = hashUserId(connectedUserIdHash);

            emit AddConnection(user, connectedTypeId, hashedUserId);
        }
    }

    /**
     * @dev The admin (backend) can remove social media connections.
     */
    function removeConnection(
        address user,
        uint256 connectedTypeId
    )
        public
        onlyOwner
    {
        // only remove connection if currently connected
        if (socialConnections[user][connectedTypeId] != 0) {
            socialConnections[user][connectedTypeId] = 0;

            emit RemoveConnection(user, connectedTypeId, 0);
        }
    }

    /**
     * @dev The admin (backend) can set the social connection reward amount.
     */
    function setSocialConnectionReward(
        uint256 amount
    )
        public
        onlyOwner
    {
        socialConnectionReward = amount;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    )
        internal
        override(ERC20, ERC20Pausable)
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev - forbid external calls on transfer
     */
    function transfer(address recipient, uint256 amount) public pure override returns (bool) {
      revert('Not allowed.');
    }

    /**
     * @dev - forbid external calls on approve
     */
    function approve(address spender, uint256 amount) public pure override returns (bool) {
      revert('Not allowed.');
    }

    function addressToString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = char(hi);
            s[2*i+1] = char(lo);
        }
        return string(abi.encodePacked("0x", string(s)));
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
        assembly {
            result := mload(add(source, 32))
        }
    }

    function hashUserId(_connectedUserIdHash){
        return sha256(_connectedUserIdHash);
    }
}
