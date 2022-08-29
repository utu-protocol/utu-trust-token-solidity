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
     */
    uint256 public socialConnectionReward = 10000;


    // Reward parameters:

    /** New stake offset (see whitepaper) */
    uint256 public O_n = 1;

    /** Discounting component for the new stake (see whitepaper) */
    uint256 public D_n = 30;

    /** Discounting component for the stake of first-level previous endorsers (see whitepaper) */
    uint256 public D_lvl1 = 2;

    /** Discounting component for the stake of second-level previous endorsers (see whitepaper) */
    uint256 public D_lvl2 = 20; //

    /** Discounting component for other previous endorsers' total stake (see whitepaper) */
    uint256 public D_o = 5000;

    // Keeping track of stakes on endorsements:

    /** A map targetAddress => endorserAddress => stake mapping all endorser's stakes by their endorsement target */
    mapping (address => mapping(address => uint256)) public previousEndorserStakes;

    /** A map targetAddress => stake with the total stake by target */
    mapping (address => uint) public totalStake;

    // Oracle related:

    /**
     * Chainlinkg orcale request data structure
     */
    struct OracleRequest {
        address from;
        address target;
        uint256 amount;
        string transactionId;
    }

    /** Sent oracle requests by id  */
    mapping (bytes32 => OracleRequest) private oracleRequests;

    /** Address of the Chainlink oracle operator contract */
    address private oracle;

    /** Id for oracle jobs from this contract */
    bytes32 private jobId;

    /** LINK fee to be paid to the oracle operator contract for each request */
    uint256 private fee;

    /** Contract migration flag; when migrating any further endorsements or social connections are disabled. */
    bool public isMigrating;


    // Events for connecting social media accounts/other user ids.

    /** Social media account was connected */
    event AddConnection(address indexed _user, uint indexed _connectedTypeId, bytes32 indexed _connectedUserIdHash);

    /** Social media account was disconnected */
    event RemoveConnection(address indexed _user, uint indexed _connectedTypeId, bytes32 indexed _connectedUserIdHash);


    // Events for endorsements.

    /** A new endorsement was made */
    event Endorse(address indexed _from, address indexed _to, uint _value, string _transactionId);

    /** A first-level previous endorser was rewarded */
    event RewardPreviousEndorserLevel1(address endorser, uint256 reward);

    /** A second-level previous endorser was rewarded */
    event RewardPreviousEndorserLevel2(address endorser, uint256 reward);

    /**
     * Constructs new UTU Trust Token contract.
     * See also {ERC20-constructor}.
     * @param _mintAmount amount of UTT minted to the deploying address; only used in testing.
     * @param _oracle Chainlink oracle operator contract address
     * @param _jobId Id for oracle jobs from this contract
     * @param _fee Initial value for the LINK fee
     * @param _link LINK token address
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
     * Requires that the contract is not migrating.
     */
    modifier notMigrating() {
        require(!isMigrating, "Contract is migrating");
        _;
    }

    /**
     * Pauses all token transfers.
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
     * Unpauses all token transfers.
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
     * Returns 0 decimals (since we don't need decimals for this particular use case).
     */
    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    // Governance functions for setting the reward and penalty parameters

    /** Sets the O_n reward formula parameter */
    function setO_n(uint256 val) public onlyOwner {
        O_n = val;
    }

    /** Sets the D_n reward formula parameter */
    function setD_n(uint256 val) public onlyOwner {
        D_n = val;
    }

    /** Sets the D_lvl1 reward formula parameter */
    function setD_lvl1(uint256 val) public onlyOwner {
        D_lvl1 = val;
    }

    /** Sets the D_lvl2 reward formula parameter */
    function setD_lvl2(uint256 val) public onlyOwner {
        D_lvl2 = val;
    }

    /** Sets the D_o reward formula parameter */
    function setD_o(uint256 val) public onlyOwner {
        D_o = val;
    }

    /** Sets the D_min reward formula parameter */
    function setD_min(uint256 val) public onlyOwner {
        D_min = val;
    }

    /** Sets the D_d reward formula parameter */
    function setD_d(uint256 val) public onlyOwner {
        D_d = val;
    }


    /** Sets the LINK fee to be paid for each request */
    function setFee(uint256 _fee) public onlyOwner {
        fee = _fee;
    }

    /**
     * @dev Computes the reward to be given to previousEndorser for a new endorsement of s_n on the given target and the
     * previous endorser level-dependent discount D_lvl_p. It assumes that the new endorsement s_n has not yet been
     * added to the totalStake map.
     * See whitepaper.
     * @param target the endorsed entity (address is just used as an id here)
     * @param previousEndorser address of the previous endorser for whom the reward shall be computed
     * @param D_lvl_p Discounting factor for the level of the previous endorser (i.e. value of D_lvl1 or D_lvl2)
     * @param s_n stake for the new endorsement
     * @return The reward in UTT that shall be minted to previousEndorser
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
     * @dev Called from fulfillEndorse, which is called by the oracle operator contract when the oracle has retrieved
     * previous endorsers from the UTU Trust API. It computes the rewards for each previous endorser according to their
     * levels, and adds the new stake to the totalStake and previousEndorserStakes maps.
     * @param from new endorser's address
     * @param target the endorsed entity (address is just used as an id here)
     * @param amount the stake for the new endorsement
     * @param transactionId an id representing the "business transaction" for which the endorsement was made; this is
              _not_ necessarily an Ethereum transaction id.
     * @param endorsersLevel1 list of first-level previous endorser addresses.
     * @param endorsersLevel2 list of second-level previous endorser addresses.
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

    /**
     * @notice Creates a new staked endorsement, where the caller is the endorser. Previous endorsers, retrieved
     *         from the UTU Trust API via an oracle, will be rewarded according to the reward formula from the
     *         whitepaper.
     * @dev This creates an oracle request. The actual endorsement, staking and rewarding is done on its fulfillment.
     * @param target the endorsed entity (address is just used as an id here)
     * @param amount the stake for the new endorsement
     * @param transactionId an id representing the "business transaction" for which the endorsement was made; this is
     *        _not_ necessarily an Ethereum transaction id.
     */
    function endorse(address target, uint256 amount, string memory transactionId) notMigrating external {
        require(msg.sender == tx.origin, "should be an user");
        Chainlink.Request memory request = buildChainlinkRequest(jobId, address(this), this.fulfillEndorse.selector);
        request.add("targetAddress", addressToString(target));
        request.add("sourceAddress", addressToString(msg.sender));
        request.add("transactionId", transactionId);
        bytes32 requestId = sendOperatorRequestTo(oracle, request, fee);
        oracleRequests[requestId] = OracleRequest({ from: msg.sender, target: target, amount: amount, transactionId: transactionId });
    }

    /**
     * @dev Called back from the oracle operator contract when the oracle request was fulfilled, with the retrieved
     *      values.
     * @param _requestId oracle request id as it was stored in oracleRequests
     * @param endorsersLevel1 list of first-level previous endorser addresses
     * @param endorsersLevel2 list of second-level previous endorser addresses
     */
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
     * @dev Called by UTU's social media connector when the user connects a supported social media account, and rewards
     *      them for it with a configured amount of UTT. It's callable only by owner to prevent calls for which the
     *      connector hasn't verified that the connection was really made, and to prevent repeated dis/-reconnects
     *      (this might be solved differently in the future).
     * @param user the connecting user's address
     * @param connectedTypeId id of the social media platform; we allow a user to connect a particular platform only
     *        once.
     * @param connectedUserIdHash hash of the user account id or name; this value is hashed to preserve the user's
     *        privacy.
     */
    function addConnection(
        address user,
        uint256 connectedTypeId,
        bytes32 connectedUserIdHash
    )
        public
        notMigrating
        onlyOwner
    {
        // only add connection if not previously added
        if (socialConnections[user][connectedTypeId] == 0) {
            socialConnections[user][connectedTypeId] = connectedUserIdHash;

            // mint reward
            super._mint(user, socialConnectionReward);

            emit AddConnection(user, connectedTypeId, connectedUserIdHash);
        }
    }

    /**
     * @dev Called by UTU's social media connector when the user removes a connection to a social media account. It's
     *      callable only by owner to prevent repeated dis/-reconnects (this might be solved differently in the future).
     * @param user the connecting user's address
     * @param connectedTypeId id of the social media platform
     */
    function removeConnection(
        address user,
        uint256 connectedTypeId
    )
        public
        notMigrating
        onlyOwner
    {
        // only remove connection if currently connected
        if (socialConnections[user][connectedTypeId] != 0) {
            socialConnections[user][connectedTypeId] = 0;

            emit RemoveConnection(user, connectedTypeId, 0);
        }
    }

    /**
     * Sets the amount of UTT to be rewarded for (new) social media connections
     * @param amount of UTT to be rewarded for (new) social media connections
     */
    function setSocialConnectionReward(
        uint256 amount
    )
        public
        onlyOwner
    {
        socialConnectionReward = amount;
    }

    /**
     * @dev just calls super._beforeTokenTransfer()
     */
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
     * Always reverts on external calls on transfer, since UTT is not transferable.
     */
    function transfer(address recipient, uint256 amount) public pure override returns (bool) {
      revert('Not allowed.');
    }


    /**
     * * Always reverts on external calls on approve, since UTT is not transferable.
     */
    function approve(address spender, uint256 amount) public pure override returns (bool) {
      revert('Not allowed.');
    }

    /**
     * @dev Converts an address to a string "0x..." representation.
     * @param x an address
     * @return string representation of the address
     */
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

    /**
     * @dev Converts a byte value to its readable char value.@param
     * @param b byte value
     * @return the value as a readable char
     */
    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    /**
     * @dev Converts a string to a bytes32 representation
     * @param source a string
     * @return a bytes32
     */
    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
        assembly {
            result := mload(add(source, 32))
        }
    }

    /**
     * Toggles the migration flag. While migrating, no new endorsements or social media (dis)connections can be made.
     * @dev Endorsements can still be fulfilled; thus the actual migration process should not be started until
     *      all pending fulfillments are done.
	 */
    function toggleMigrationFlag() public onlyOwner {
        isMigrating = !isMigrating;
    }
}
