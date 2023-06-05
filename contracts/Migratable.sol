// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Roles.sol";

contract Migratable is Roles {
    /** Contract migration data flag; when migrating data from the old contract. */
    bool public isMigratingDataFromOldContract = true;

    /** Contract migration flag; when migrating any further endorsements or social connections are disabled. */
    bool public isMigratingToNewContract;

    /**
     * Requires that the contract is not migrating.
     */
    modifier onlyMigratingDataFromOldContract() {
        require(isMigratingDataFromOldContract, "Contract has already migrated data from the old contract");
        _;
    }

    /**
     * Requires that the contract is not migrating.
     */
    modifier onlyNotMigrating() {
        require(!isMigratingDataFromOldContract && !isMigratingToNewContract, "Contract is migrating");
        _;
    }

    function setDataMigrationCompleted() public onlyOwner onlyMigratingDataFromOldContract {
        isMigratingDataFromOldContract = false;
    }

    /**
     * Toggles the migration flag. While migrating, no new endorsements or social media (dis)connections can be made.
     * @dev Endorsements can still be fulfilled; thus the actual migration process should not be started until
     *      all pending fulfillments are done.
     */
    function toggleMigrationFlag() public onlyOwner {
        isMigratingToNewContract = !isMigratingToNewContract;
    }
}
