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

    // address : social_media_platform_id
    mapping (address => uint256) socialConnections;

    mapping (address => uint256) connectionRewards;
    mapping (address => address[]) parentEndorsers;
    uint256 public constant maximumBoundRate = 2; //RMAX
    uint256 public constant discountingRateEndor = 1; //DN
    uint256 public constant discountingRateGrandendor = 1; //DP
    uint256 public totalEndorsedCoins;
    
    event Endorse(address indexed _from, address indexed _to, uint indexed _id, uint _value);
 
    event AddConnection(address indexed _user, uint indexed _socialId);

    event EndorseRewardFormula(address sender, uint256 reward);
    event ParentEndorsersReward(address sender, uint256 reward);
    event SubmitRewardsEndorser(address sneder, uint256 reward);
    event SubmitReward(address sender, uint256 reward);
    event Log(uint256 logger);
    event AddConnection(address indexed _user, uint indexed _socialId);
    
    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE` and `PAUSER_ROLE` to the
     * account that deploys the contract. Grants `MINTER_ROLE` to the bridge.
     *
     * See {ERC20-constructor}.
     */
    constructor() public ERC20("UTU Endorse (ERC20)", "ENDR") {
        _mint(msg.sender, 100000000000000000000000);
    }

    function division(uint a, uint b, uint precision) public pure returns ( uint) {
     return a*(10**precision)/b;
    }
    function multiplyByPercent(uint a, uint b, uint precision) public pure returns(uint){
        return a*(10**precision)*b/100;
    }

    /**
     * @dev Pauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_pause}.
     *
     */
    function pause() public onlyOwner virtual {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_unpause}.
     *
     */
    function unpause() public onlyOwner virtual {
        _unpause();
    }

    function getReward(uint256 reward, address[] memory endorsers) private pure returns (uint256){
        if(endorsers.length==0){
            return reward;
        }
        else{
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
        address recipient,
        uint256 amount,
        address[] memory endorsers
    ) public {
        require(msg.sender == tx.origin, "should be an user");
        totalEndorsedCoins += amount;
        uint256 currentEndorsedToken = balanceOf(recipient);

        //rewards are given as in the formula in the whitepaper
        uint256 reward = (maximumBoundRate * division(
            (discountingRateEndor*amount+discountingRateGrandendor*currentEndorsedToken),totalEndorsedCoins, 5));
    
        //reward recomended endorsers
        for(uint8 i=0; i<endorsers.length; i++){
            address current = endorsers[i];
            uint256 endorserReward = getReward(reward, parentEndorsers[current]);    

            //give tokens to endorser
            super._mint(address(endorsers[i]), endorserReward);
            emit SubmitRewardsEndorser(msg.sender, endorserReward);
        
            //reward parents of recomended endorsers
            for(uint8 j=0; j<parentEndorsers[current].length; j++){
                uint256 parentEndorLength = parentEndorsers[current].length;
                uint prevRewardForEndors = division(multiplyByPercent(reward,10,5),parentEndorLength,5);
                address parentEndorser = parentEndorsers[current][j];

                //submit tokens to endorsers
                super._mint(parentEndorser, prevRewardForEndors);
                emit ParentEndorsersReward(msg.sender, prevRewardForEndors);
            }
        }
        
        parentEndorsers[msg.sender] = endorsers;
        transfer(recipient, amount);
    
        emit EndorseRewardFormula(msg.sender, reward);
    }

    /**
     * @dev The admin (backend) can set verified social media
     * connections.
     */
    function addConnection(
        address user,
        uint256 socialId
    ) public onlyOwner {
        socialConnections[user] = socialId;

        emit AddConnection(user, socialId);
    }

    /**
     * @dev The admin (backend) can remove social media connections.
     */
    function removeConnection(
        address user
    ) public onlyOwner {
        socialConnections[user] = 0;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
