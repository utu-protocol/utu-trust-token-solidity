// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./TestUpgradedMigratableEndorsement.sol";
import "./TestUpgradedMigratableSocialConnector.sol";
import "./TestUpgradedReward.sol";

contract TestUpgradedMigratableReward is
    TestUpgradedReward,
    TestUpgradedMigratableEndorsement,
    TestUpgradedMigratableSocialConnector
{
    function migrateTotalClaimableUTUCoin(
        address oldContractAddress
    ) public onlyOwner onlyMigratingDataFromOldContract {
        TestUpgradedReward oldContract = TestUpgradedReward(oldContractAddress);
        totalClaimableUTUCoin = oldContract.totalClaimableUTUCoin();
    }

    function migrateClaimableUTUCoin(
        address[] calldata users,
        address oldContractAddress
    ) public onlyOwner onlyMigratingDataFromOldContract {
        TestUpgradedReward oldContract = TestUpgradedReward(oldContractAddress);
        for (uint i = 0; i < users.length; i++) {
            address user = users[i];
            claimableUTUCoin[user] = oldContract.claimableUTUCoin(user);
        }
    }


    function reward(
        address user,
        uint256 rewardUTT
    ) internal virtual override(TestUpgradedEndorsement, TestUpgradedSocialConnector, TestUpgradedReward) {
        super.reward(user, rewardUTT);
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
        override(TestUpgradedEndorsement, TestUpgradedMigratableEndorsement)
        onlyInitializing
    {
        super.__Endorsement_init(name_, symbol_, _oracle, _jobId, _fee, _link);
    }

    function __SocialConnector_init()
        internal
        virtual
        override(TestUpgradedSocialConnector, TestUpgradedMigratableSocialConnector)
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
        override(TestUpgradedSocialConnector, TestUpgradedMigratableSocialConnector)
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
        override(TestUpgradedSocialConnector, TestUpgradedMigratableSocialConnector)
        onlyNotMigrating
        onlyRole(SOCIAL_CONNECTOR_ROLE)
    {
        super.removeConnection(user, connectedTypeId);
    }

    function endorse(
        address target,
        uint256 amount,
        string memory transactionId
    ) public virtual override(TestUpgradedEndorsement, TestUpgradedMigratableEndorsement) onlyNotMigrating {
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
        override(TestUpgradedEndorsement, TestUpgradedMigratableEndorsement)
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
    uint256 newTestUpgradedMigratableRewardVar;
    uint256[48] private __gap;

    function incrementnewTestUpgradedMigratableRewardVar() public {
        newTestUpgradedMigratableRewardVar += 1;
    }

    function getnewTestUpgradedMigratableRewardVar() public view returns (uint256) {
        return newTestUpgradedMigratableRewardVar;
    }
}
