// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

contract UTT is ERC20Burnable, ERC20Pausable, Ownable {
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

    mapping (address => address[]) parentEndorsers;
    uint256 public constant maximumBoundRate = 2; //RMAX
    uint256 public constant discountingRateDN = 1; // DN
    uint256 public constant discountingRateDP = 1; // DP
    uint256 public totalEndorsedCoins;
    
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
        uint256 _mintAmount
    )
        ERC20("UTU Endorse (ERC20)", "ENDR")
    {
        _mint(msg.sender, _mintAmount);
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
    function endorse(
        address target,
        uint256 amount,
        address[] memory endorsers,
        address[] memory previousEndorsers
    )
        public
    {
        require(msg.sender == tx.origin, "should be an user");
        totalEndorsedCoins += amount;
        uint256 currentEndorsedToken = balanceOf(target);

        //rewards are given as in the formula in the whitepaper
        uint256 reward = (maximumBoundRate * division (
            (discountingRateDN * amount + discountingRateDP * currentEndorsedToken), totalEndorsedCoins, 5));
    
        //reward recommended endorsers
        for(uint8 i=0; i < endorsers.length; i++){
            address current = endorsers[i];
            uint256 endorserReward = getReward(reward, parentEndorsers[current]);    

            // distribute tokens to endorser
            super._mint(address(endorsers[i]), endorserReward);
            emit SubmitRewardsEndorser(msg.sender, endorserReward);
        
            //reward parents of recommended endorsers
            for(uint8 j=0; j < parentEndorsers[current].length; j++){
                uint256 parentEndorsersLength = parentEndorsers[current].length;
                uint prevRewardForEndorser = division(multiplyByPercent(reward, 10, 5), parentEndorsersLength, 5);
                address parentEndorser = parentEndorsers[current][j];

                //submit tokens to endorsers
                super._mint(parentEndorser, prevRewardForEndorser);
                emit ParentEndorsersReward(msg.sender, prevRewardForEndorser);
            }
        }
        
        parentEndorsers[msg.sender] = endorsers;
        transfer(target, amount);
    
        emit EndorseRewardFormula(msg.sender, reward);
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
}
