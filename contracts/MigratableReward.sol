// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./MigratableEndorsement.sol";
import "./MigratableSocialConnector.sol";
import "./Reward.sol";

contract MigratableReward is
    Reward,
    MigratableEndorsement,
    MigratableSocialConnector
{
    function migrateBalance(
        address[] calldata addresses,
        address oldContractAddress
    ) public onlyOwner onlyMigratingDataFromOldContract {
        IERC20Upgradeable oldContract = IERC20Upgradeable(oldContractAddress);
        for (uint i = 0; i < addresses.length; i++) {
            address addr = addresses[i];
            uint256 balance = oldContract.balanceOf(addr);
            uint256 currentBalance = balanceOf(addr);
            if (balance > currentBalance) {
                _mint(addr, balance);
            }
        }
    }

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


    function reward(
        address user,
        uint256 rewardUTT,
        bool rewardUTUCoin
    ) internal virtual override(Endorsement, SocialConnector, Reward) {
        super.reward(user, rewardUTT, rewardUTUCoin);
    }

    function __Endorsement_init(
        string memory name_,
        string memory symbol_,
        address _oracle,
        string memory _jobId,
        uint256 _fee,
        address _link
    )
        internal
        virtual
        override(Endorsement, MigratableEndorsement)
        onlyInitializing
    {
        super.__Endorsement_init(name_, symbol_, _oracle, _jobId, _fee, _link);
    }

    function __SocialConnector_init()
        internal
        virtual
        override(SocialConnector, MigratableSocialConnector)
        onlyInitializing
    {
        super.__SocialConnector_init();
    }

    function addConnection(
        address user,
        uint256 connectedTypeId,
        bytes32 connectedUserIdHash
    )
        public
        virtual
        override(SocialConnector, MigratableSocialConnector)
        onlyNotMigrating
        onlyRole(SOCIAL_CONNECTOR_ROLE)
    {
        super.addConnection(user, connectedTypeId, connectedUserIdHash);
    }

    function removeConnection(
        address user,
        uint256 connectedTypeId
    )
        public
        virtual
        override(SocialConnector, MigratableSocialConnector)
        onlyNotMigrating
        onlyRole(SOCIAL_CONNECTOR_ROLE)
    {
        super.removeConnection(user, connectedTypeId);
    }

    function endorse(
        address target,
        uint256 amount,
        string memory transactionId
    ) public virtual override(Endorsement, MigratableEndorsement) onlyNotMigrating {
        super.endorse(target, amount, transactionId);
    }

    function proxyEndorse(
        address source,
        address target,
        uint256 amount,
        string memory transactionId
    )
        public
        virtual
        override(Endorsement, MigratableEndorsement)
        onlyNotMigrating
        onlyRole(PROXY_ENDORSER_ROLE)
    {
        super.proxyEndorse(source, target, amount, transactionId);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
