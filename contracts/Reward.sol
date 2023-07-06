// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./MigratableEndorsement.sol";
import "./MigratableSocialConnector.sol";

contract Reward is MigratableEndorsement, MigratableSocialConnector {
    using SafeERC20 for ERC20;

    /** Discounting component for computing UTU Coin rewards corresponding to UTT rewards (see whitepaper) */
    uint256 public D_UTT;

    /** A mapping storing the amount of UTU Coin that can be claimed by a user */
    mapping(address => uint) public claimableUTUCoin;

    /** Total claimable UTU Coin by all users */
    uint256 public totalClaimableUTUCoin;

    /** UTU Coin contract address */
    address public UTUCoin;

    /** An amount of UTU Coin was rewarded */
    event RewardUTUCoin(address indexed _to, uint _value);

    /** Rewarded UTU Coin were claimed */
    event ClaimUTURewards(address indexed _by, uint _value);

    modifier onlyIfKYCed(address user) {
        for (uint i = 0; i <= maxConnectedTypeId; i++) {
            if (
                connectedTypeWhitelistedForKYC[i] &&
                socialConnections[user][i] != 0
            ) {
                _;
                return;
            }
        }
        revert("User is not KYCed");
    }

    function __Reward_init() internal virtual onlyInitializing {
        __Reward_init_unchained();
    }

    function __Reward_init_unchained() internal onlyInitializing {
        D_UTT = 10;
    }

    /**
     * Sets the address of the UTU Coin contract.
     * @param _UTUCoin address of the UTU Coin contract.
     */
    function setUTUCoin(address _UTUCoin) external onlyOwner {
        UTUCoin = _UTUCoin;
    }

    /**
     * Mints rewardUTT to the user and adds the corresponding amount of UTU Coin to the claimableUTU mapping.
     */
    function reward(
        address user,
        uint256 rewardUTT
    ) internal override(Endorsement, SocialConnector) {
        super._mint(user, rewardUTT);
        uint256 rewardUTU = (rewardUTT * 10 ** 18) / D_UTT;
        claimableUTUCoin[user] += rewardUTU;
        totalClaimableUTUCoin += rewardUTU;
        emit RewardUTUCoin(user, rewardUTU);
    }

    /**
     * Claims the available UTU Coin rewards by sending the corresponding amount of UTU Coin to the sender.
     * Resets the amount of claimable UTU Coin for the sender to 0.
     */
    function claimRewards() public onlyIfKYCed(msg.sender) {
        require(UTUCoin != address(0), "UTU Coin address not configured.");

        uint256 amount = claimableUTUCoin[msg.sender];

        // Transfers amount UTU Coin from this contract to the user
        uint256 total = ERC20(UTUCoin).balanceOf(address(this));

        require(
            total >= amount,
            "Not enough UTU Coin available to claim rewards."
        );

        ERC20(UTUCoin).safeTransfer(msg.sender, amount);
        claimableUTUCoin[msg.sender] = 0;
        totalClaimableUTUCoin -= amount;

        emit ClaimUTURewards(msg.sender, amount);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
