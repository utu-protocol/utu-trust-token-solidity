// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./TestUpgradedUTURewardsInterface.sol";
import "./TestUpgradedEndorsement.sol";
import "./TestUpgradedSocialConnector.sol";

contract TestUpgradedReward is TestUpgradedUTURewardsInterface, TestUpgradedEndorsement, TestUpgradedSocialConnector {
    using SafeERC20 for ERC20;

    /** Discounting component for computing UTU Coin rewards corresponding to TestUpgradedUTT rewards (see whitepaper) */
    uint256 public D_UTT;

    /** A mapping storing the amount of UTU Coin that can be claimed by a user */
    mapping(address => uint) public claimableUTUCoin;

    /** Total claimable UTU Coin by all users */
    uint256 public totalClaimableUTUCoin;

    /** UTU Coin contract address */
    address public UTUCoin;

    /**
     * Checks if the user is connected to any social connection type which is whitelisted for claiming UTU Coin rewards.
     */
    modifier onlyIfWhitelisted(address user) {
        for (uint i = 0; i <= maxConnectedTypeId; i++) {
            if (
                connectedTypeWhitelisted[i] &&
                socialConnections[user][i] != 0
            ) {
                _;
                return;
            }
        }
        revert("User is not whitelisted");
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

    /** Sets the discounting component D_UTT. */
    function setUTT(uint256 val) public onlyOwner {
        D_UTT = val;
    }

    /**
     * Mints rewardUTT to the user and, if isUTUCoinReward, also calls rewardUTUCoin.
     * @dev This function doesn't emit any event; callers are expected to emit their own specific events which indicate
     *      the reason for the reward.
     * @param user address of the user to be rewarded.
     * @param rewardUTT amount of TestUpgradedUTT to be rewarded.
     * @param isUTUCoinReward whether to also reward UTU Coin.
     */
    function reward(
        address user,
        uint256 rewardUTT,
        bool isUTUCoinReward
    ) internal virtual override(TestUpgradedEndorsement, TestUpgradedSocialConnector) {
        super._mint(user, rewardUTT);
        if(isUTUCoinReward) rewardUTUCoin(user, rewardUTT);
    }

    /**
     * Adds the corresponding amount of UTU Coin for the given amount of TestUpgradedUTT to the claimableUTU mapping, according to
     * the discounting component D_UTT.
     * @dev This function emits a generic RewardUTUCoin event. Callers are expected to emit their own specific events
     *      which indicate the reason for the reward. It is typically called by reward(), for which callers are also
     *      expected to do that anyway.
     * @param user address of the user to be rewarded.
     * @param rewardUTT amount of TestUpgradedUTT to be rewarded.
     */
    function rewardUTUCoin(
        address user,
        uint256 rewardUTT
    ) internal {
        uint256 rewardUTU = (rewardUTT * 10 ** 18) / D_UTT;
        claimableUTUCoin[user] += rewardUTU;
        totalClaimableUTUCoin += rewardUTU;
        emit RewardUTUCoin(user, rewardUTU);
    }

    /**
     * @inheritdoc TestUpgradedUTURewardsInterface
     */
    function claimRewards() public override onlyIfWhitelisted(msg.sender) {
        require(UTUCoin != address(0), "UTU Coin address not configured.");

        uint256 amount = claimableUTUCoin[msg.sender];

        require(
            amount > 0,
            "Insufficient claimable rewards for the target."
        );

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
     * Returns the amount of $UTU rewards that can be claimed by the target.
     * @param target the address of the target for which the claimable rewards are requested.
     */
    function getClaimableRewards(
        address target
    ) public view virtual onlyIfWhitelisted(target) returns (uint) {
        return claimableUTUCoin[target];
    }

    function proxyClaimRewards(
        address target, uint256 amount
    ) public virtual onlyRole(PROXY_ENDORSER_ROLE) onlyIfWhitelisted(target) {

        require(
            claimableUTUCoin[target] >= amount,
            "Insufficient claimable rewards for the target."
        );

        claimableUTUCoin[target] -= amount;
        totalClaimableUTUCoin -= amount;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256 newTestUpgradedRewardVar;
    uint256[48] private __gap;

    function incrementnewTestUpgradedRewardVar() public {
        newTestUpgradedRewardVar += 1;
    }

    function getnewTestUpgradedRewardVar() public view returns (uint256) {
        return newTestUpgradedRewardVar;
    }
}
