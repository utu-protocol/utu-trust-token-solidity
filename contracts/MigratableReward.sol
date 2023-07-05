// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./MigratableEndorsement.sol";
import "./MigratableSocialConnector.sol";
import "./Reward.sol";

contract MigratableReward is Reward {

    function migrateTotalClaimableUTUCoin(
        address oldContractAddress
    ) public onlyOwner onlyMigratingDataFromOldContract {
        Reward oldContract = Reward(oldContractAddress);
        totalClaimableUTUCoin = oldContract.totalClaimableUTUCoin();
    }

    function migrateClaimableUTUCoin(
        address[] calldata users,
        address oldContractAddress
    ) public onlyOwner onlyMigratingDataFromOldContract {
        Reward oldContract = Reward(oldContractAddress);
        for (uint i = 0; i < users.length; i++) {
            address user = users[i];
            claimableUTUCoin[user] = oldContract.claimableUTUCoin(user);
        }
    }
}
