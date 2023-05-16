// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract CanMigrate is ERC20, Ownable {
    /** Contract migration data flag; when migrating data from the old contract. */
    bool public isMigratingData = true;

    /** Contract migration flag; when migrating any further endorsements or social connections are disabled. */
    bool public isMigrating;

    struct Connection {
        address user;
        uint256 connectedTypeId;
        bytes32 connectedUserIdHash;
    }

    /**
     * Requires that the contract is not migrating.
     */
    modifier onlyMigratingData() {
        require(isMigratingData, "Contract has already migrate data");
        _;
    }

    /**
     * Requires that the contract is not migrating.
     */
    modifier notMigrating() {
        require(!isMigrating && !isMigratingData, "Contract is migrating");
        _;
    }

    function migrateBalance(
        address[] calldata addresses,
        address oldContractAddress
    ) public onlyOwner onlyMigratingData {
        IERC20 oldContract = IERC20(oldContractAddress);
        for (uint i = 0; i < addresses.length; i++) {
            address addr = addresses[i];
            uint256 balance = oldContract.balanceOf(addr);
            uint256 currentBalance = balanceOf(addr);
            if (balance > currentBalance) {
                _mint(addr, balance);
            }
        }
    }

    function migrateAddConnections(
        Connection[] calldata _connections
    ) public onlyOwner onlyMigratingData {
        for (uint256 i = 0; i < _connections.length; i++) {
            Connection memory connection = _connections[i];
            _saveConnection(
                connection.user,
                connection.connectedTypeId,
                connection.connectedUserIdHash
            );
        }
    }

    function setDataMigrationCompleted() public onlyOwner onlyMigratingData {
        isMigratingData = false;
    }

    function _saveConnection(
        address user,
        uint256 connectedTypeId,
        bytes32 connectedUserIdHash
    ) internal virtual;

    /**
     * Toggles the migration flag. While migrating, no new endorsements or social media (dis)connections can be made.
     * @dev Endorsements can still be fulfilled; thus the actual migration process should not be started until
     *      all pending fulfillments are done.
     */
    function toggleMigrationFlag() public onlyOwner {
        isMigrating = !isMigrating;
    }
}
