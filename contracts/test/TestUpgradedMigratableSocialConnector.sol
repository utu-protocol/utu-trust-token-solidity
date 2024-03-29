// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./TestUpgradedMigratable.sol";
import "./TestUpgradedSocialConnector.sol";

abstract contract TestUpgradedMigratableSocialConnector is TestUpgradedMigratable, TestUpgradedSocialConnector {
    struct Connection {
        address user;
        uint256 connectedTypeId;
        bytes32 connectedUserIdHash;
    }

    function __SocialConnector_init() internal virtual override onlyInitializing {
        super.__SocialConnector_init();
        __Migratable_init();
    }

    function migrateSocialConnections(
        Connection[] calldata _connections
    ) public onlyOwner onlyMigratingDataFromOldContract {
        for (uint256 i = 0; i < _connections.length; i++) {
            Connection memory connection = _connections[i];
            _saveConnection(
                connection.user,
                connection.connectedTypeId,
                connection.connectedUserIdHash
            );
        }
    }

    function addConnection(
        address user,
        uint256 connectedTypeId,
        bytes32 connectedUserIdHash
    ) public virtual override onlyNotMigrating onlyRole(SOCIAL_CONNECTOR_ROLE) {
        super.addConnection(user, connectedTypeId, connectedUserIdHash);
    }

    function removeConnection(
        address user,
        uint256 connectedTypeId
    ) public virtual override onlyNotMigrating onlyRole(SOCIAL_CONNECTOR_ROLE) {
        super.removeConnection(user, connectedTypeId);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256 newTestUpgradedMigratableSocialConnectorVar;
    uint256[48] private __gap;

    function incrementnewTestUpgradedMigratableSocialConnectorVar() public {
        newTestUpgradedMigratableSocialConnectorVar += 1;
    }

    function getnewTestUpgradedMigratableSocialConnectorVar() public view returns (uint256) {
        return newTestUpgradedMigratableSocialConnectorVar;
    }
}
