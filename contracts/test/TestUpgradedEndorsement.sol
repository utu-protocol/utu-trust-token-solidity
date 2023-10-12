// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "./TestUpgradedChainlinkClient.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./TestUpgradedEndorsementInterface.sol";
import "./TestUpgradedRoles.sol";

/**
 * @title TestUpgradedEndorsement
 * This contract implements the endorsement functionality of UTU Protocol.
 */
abstract contract TestUpgradedEndorsement is
    Initializable,
    ERC20Upgradeable,
    TestUpgradedChainlinkClient,
    TestUpgradedEndorsementInterface,
    TestUpgradedRoles
{
    using Chainlink for Chainlink.Request;
    // TestUpgradedReward parameters:

    /** New stake offset (see whitepaper) */
    uint256 public O_n;

    /** Discounting component for the new stake (see whitepaper) */
    uint256 public D_n;

    /** Discounting component for the stake of first-level previous endorsers (see whitepaper) */
    uint256 public D_lvl1;

    /** Discounting component for the stake of second-level previous endorsers (see whitepaper) */
    uint256 public D_lvl2; //

    /** Discounting component for other previous endorsers' total stake (see whitepaper) */
    uint256 public D_o;

    bytes32 public constant PROXY_ENDORSER_ROLE =
        keccak256("PROXY_ENDORSER_ROLE");

    function __Endorsement_init(
        string memory name_,
        string memory symbol_,
        address _oracle,
        string memory _jobId,
        uint256 _fee,
        address _link
    ) internal virtual onlyInitializing {
        __ERC20_init(name_, symbol_);
        __ChainlinkClient_init();
        __Endorsement_init_unchained(_oracle, _jobId, _fee, _link);
    }

    function __Endorsement_init_unchained(
        address _oracle,
        string memory _jobId,
        uint256 _fee,
        address _link
    ) internal onlyInitializing {
        setChainlinkToken(_link);
        oracle = _oracle;
        jobId = stringToBytes32(_jobId);
        fee = _fee;
        O_n = 1;
        D_n = 30;
        D_lvl1 = 2;
        D_lvl2 = 20;
        D_o = 5000;
    }

    // Keeping track of stakes on endorsements:

    /** A map targetAddress => endorserAddress => stake mapping all endorser's stakes by their endorsement target */
    mapping(address => mapping(address => uint256))
        public previousEndorserStakes;

    /** A map targetAddress => stake with the total stake by target */
    mapping(address => uint) public totalStake;

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
    mapping(bytes32 => OracleRequest) private oracleRequests;

    /** Address of the Chainlink oracle operator contract */
    address internal oracle;

    /** Id for oracle jobs from this contract */
    bytes32 internal jobId;

    /** LINK fee to be paid to the oracle operator contract for each request */
    uint256 internal fee;


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
     * @return The reward in TestUpgradedUTT that shall be minted to previousEndorser
     */
    function computeReward(
        address target,
        address previousEndorser,
        uint256 D_lvl_p,
        uint256 s_n
    ) private view returns (uint256) {
        uint256 s_p = previousEndorserStakes[target][previousEndorser];
        uint256 s_o = totalStake[target] - s_p;

        return
            (s_p * (s_n + O_n) * D_o) / (D_lvl_p * (s_n + D_n) * (D_o + s_o));
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
    ) internal {
        //reward first-level previous endorsers
        for (uint8 i = 0; i < endorsersLevel1.length; i++) {
            uint256 endorserReward = computeReward(
                target,
                endorsersLevel1[i],
                D_lvl1,
                amount
            );

            reward(endorsersLevel1[i], endorserReward, true);
            emit RewardPreviousEndorserLevel1(
                endorsersLevel1[i],
                endorserReward
            );
        }

        //reward second-level previous endorsers
        for (uint8 i = 0; i < endorsersLevel2.length; i++) {
            uint256 endorserReward = computeReward(
                target,
                endorsersLevel2[i],
                D_lvl2,
                amount
            );

            reward(endorsersLevel2[i], endorserReward, true);
            emit RewardPreviousEndorserLevel2(
                endorsersLevel2[i],
                endorserReward
            );
        }

        totalStake[target] += amount;
        previousEndorserStakes[target][from] += amount;

        emit Endorse(from, target, amount, transactionId);
    }

    /**
     * @inheritdoc TestUpgradedEndorsementInterface
     */
    function endorse(
        address target,
        uint256 amount,
        string memory transactionId
    ) public override virtual {
        require(msg.sender == tx.origin, "should be a user");

        _triggerEndorse(msg.sender, target, amount, transactionId);
    }

    /**
     * @dev This is called via oracle to forward an endorse call from a proxy contract. The caller must have the
     *      PROXY_ENDORSER_ROLE.
     * @param source the endorser's address
     * @param target the endorsed entity (address is just used as an id here)
     * @param amount the stake for the new endorsement
     * @param transactionId an id representing the "business transaction" for which the endorsement was made; this is
     *        _not_ necessarily an Ethereum transaction id.
     */
    function proxyEndorse(
        address source,
        address target,
        uint256 amount,
        string memory transactionId
    ) public virtual onlyRole(PROXY_ENDORSER_ROLE) {
        _triggerEndorse(source, target, amount, transactionId);
    }

    /**
     * @dev This creates an oracle request to retrieve previous endorsers to be rewarded. The actual endorsement,
     *      staking and rewarding is done on its fulfillment.
     * @param source the endorser's address
     * @param target the endorsed entity (address is just used as an id here)
     * @param amount the stake for the new endorsement
     * @param transactionId an id representing the "business transaction" for which the endorsement was made; this is
     *        _not_ necessarily an Ethereum transaction id.
     */
    function _triggerEndorse(
        address source,
        address target,
        uint256 amount,
        string memory transactionId
    ) private {
        uint256 fromBalance = balanceOf(source);
        require(fromBalance >= amount, "TestUpgradedUTT: endorse amount exceeds balance");

        Chainlink.Request memory request = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfillEndorse.selector
        );
        request.add("targetAddress", addressToString(target));
        request.add("sourceAddress", addressToString(source));
        request.add("transactionId", transactionId);
        bytes32 requestId = sendOperatorRequestTo(oracle, request, fee);
        oracleRequests[requestId] = OracleRequest({
            from: source,
            target: target,
            amount: amount,
            transactionId: transactionId
        });
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
    ) external recordChainlinkFulfillment(_requestId) {
        OracleRequest memory r = oracleRequests[_requestId];
        require(r.target != address(0), "unknown endorsment");
        _burn(r.from, r.amount);
        _endorse(
            r.from,
            r.target,
            r.amount,
            r.transactionId,
            endorsersLevel1,
            endorsersLevel2
        );
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
     * @dev Abstract function to reward a user with TestUpgradedUTT and optionally UTU Coin.
     */
    function reward(address user, uint256 rewardUTT, bool rewardUTUCoin) internal virtual;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256 newTestUpgradedEndorsementVar;
    uint256[48] private __gap;

    function incrementnewTestUpgradedEndorsementVar() public {
        newTestUpgradedEndorsementVar += 1;
    }

    function getnewTestUpgradedEndorsementVar() public view returns (uint256) {
        return newTestUpgradedEndorsementVar;
    }
}
