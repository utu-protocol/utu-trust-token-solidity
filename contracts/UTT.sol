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
     * The endorsement structure: every endorsement is composed of:
     * - Endorsement address is the key of the mapping
     * - Id is the sequence of the endorsements for that account
     * - Accepted Status - true if the user has accepted the endorsement
     */

    mapping (address => mapping (uint256 => address)) endorsements;
    mapping (address => uint256) endorsementId;

    /**
     * The `socialConnections` mapping is storing the connected socialIds
     * as so: address => socialTypeId => socialUserIdHash
     */ 
    mapping (address => mapping (uint256 => bytes32) ) socialConnections;
    mapping (address => uint256) connectionRewards;

    /**
     * The `socialConnectionReward` variable is the amount of tokens to be minted
     * as a reward for connecting/verifying with a social platform user id.
     * Configurable by admin.
     */
    uint256 public socialConnectionReward = 1;

    uint256 public constant maximumBoundRate = 2; //RMAX
    uint256 public constant discountingRateDN = 1; // DN
    uint256 public constant discountingRateDP = 1; // DP
    uint256 public totalEndorsedCoins;

    // Oracle related
    struct OracleRequest {
        address from;
        address target;
        uint256 amount;
    }
    mapping (uint256 => OracleRequest) private oracleRequests;
    address private oracle;
    bytes32 private jobId;
    uint256 private fee;

    event Endorse(address indexed _from, address indexed _to, uint indexed _id, uint _value);

    event AddConnection(address indexed _user, uint indexed _connectedTypeId, bytes32 indexed _connectedUserIdHash);
    event RemoveConnection(address indexed _user, uint indexed _connectedTypeId, bytes32 indexed _connectedUserIdHash);

    event EndorseRewardFormula(address sender, uint256 reward);
    event ParentEndorsersReward(address sender, uint256 reward);
    event SubmitRewardsEndorser(address sender, uint256 reward);
    event SubmitReward(address sender, uint256 reward);
    event Log(uint256 logger);
    
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
        ERC20("UTU Endorse (ERC20)", "ENDR")
    {
        _mint(msg.sender, _mintAmount);

        setChainlinkToken(_link);
        oracle = _oracle;
        jobId = stringToBytes32(_jobId);
        fee = _fee;
    }

    function division(
        uint a,
        uint b,
        uint precision
    )
        public
        pure
        returns (uint)
    {
        return a * (10 ** precision) / b;
    }
    
    function multiplyByPercent(
        uint a,
        uint b,
        uint precision
    )
        public
        pure
        returns (uint)
    {
        return a * (10 ** precision) * b / 100;
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

    function getReward(
        uint256 reward,
        address[] memory endorsers
    )
        private
        pure
        returns (uint256)
    {
        if (endorsers.length == 0) {
            return reward;
        }
        else {
            return multiplyByPercent(reward, 90, 5);
        }
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
        address[] memory endorsers,
        address[] memory previousEndorsers
    )
        internal
    {
        totalEndorsedCoins += amount;
        uint256 currentEndorsedToken = balanceOf(target);

        //rewards are given as in the formula in the whitepaper
        uint256 reward = (maximumBoundRate * division (
            (discountingRateDN * amount + discountingRateDP * currentEndorsedToken), totalEndorsedCoins, 5));
    
        //reward recommended endorsers
        for(uint8 i=0; i < endorsers.length; i++){
            uint256 endorserReward = getReward(reward, previousEndorsers);    

            // distribute tokens to endorser
            super._mint(address(endorsers[i]), endorserReward);
            emit SubmitRewardsEndorser(from, endorserReward);
        
            //reward parents of recommended endorsers
        }

        for(uint8 i=0; i < previousEndorsers.length; i++){
            uint256 prevEndorsersLength = previousEndorsers.length;
            uint prevRewardForEndorser = division(multiplyByPercent(reward, 10, 0), prevEndorsersLength, 0);
            address prevEndorser = previousEndorsers[i];

            //submit tokens to endorsers
            super._mint(prevEndorser, prevRewardForEndorser);
            emit ParentEndorsersReward(from, prevRewardForEndorser);
        }

        emit EndorseRewardFormula(from, reward);
    }

    function endorse(address target, uint256 amount) external {
        require(msg.sender == tx.origin, "should be an user");
        Chainlink.Request memory request = buildChainlinkRequest(jobId, address(this), this.fulfillEndorse.selector);
        request.add("targetAddress", toAsciiString(target));
        bytes32 requestId = sendOperatorRequestTo(oracle, request, fee);
        oracleRequests[asciiToInteger(requestId)] = OracleRequest({ from: msg.sender, target: target, amount: amount });
    }

    function fulfillEndorse(
        bytes32 _requestId,
        address[] calldata endorsers,
        address[] calldata previousEndorsers
    )
        external
        recordChainlinkFulfillment(_requestId)
    {
        OracleRequest memory r = oracleRequests[asciiToInteger(_requestId)];
        require(r.target != address(0), "unknown endorsment");
        _endorse(r.from, r.target, r.amount, endorsers, previousEndorsers);
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

            emit AddConnection(user, connectedTypeId, connectedUserIdHash);
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

    function asciiToInteger(bytes32 x) public pure returns (uint256) {
        uint256 y;
        for (uint256 i = 0; i < 32; i++) {
            uint256 c = (uint256(x) >> (i * 8)) & 0xff;
            if (48 <= c && c <= 57)
                y += (c - 48) * 10 ** i;
            else
                break;
        }
        return y;
    }

    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = char(hi);
            s[2*i+1] = char(lo);
        }
        return string(s);
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
}
