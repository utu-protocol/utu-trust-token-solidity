// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Roles.sol";

contract Migratable is Roles {
    /** Contract migration data flag; when migrating data from the old contract. */
    bool public isMigratingDataFromOldContract;

    /** Contract migration flag; when migrating any further Migratables or social connections are disabled. */
    bool public isMigratingToNewContract;

    function __Migratable_init() internal virtual onlyInitializing {
        __Migratable_init_unchained();
    }

    function __Migratable_init_unchained() internal onlyInitializing {
        isMigratingDataFromOldContract = true;
    }

    /**
     * Requires that the contract is not migrating.
     */
    modifier onlyMigratingDataFromOldContract() {
        require(
            isMigratingDataFromOldContract,
            "Contract has already migrated data from the old contract"
        );
        _;
    }

    /**
     * Requires that the contract is not migrating.
     */
    modifier onlyNotMigrating() {
        require(
            !isMigratingDataFromOldContract && !isMigratingToNewContract,
            "Contract is migrating"
        );
        _;
    }

    function setDataMigrationCompleted()
        public
        onlyOwner
        onlyMigratingDataFromOldContract
    {
        isMigratingDataFromOldContract = false;
    }

    /**
     * Toggles the migration flag. While migrating, no new Migratables or social media (dis)connections can be made.
     * @dev Migratables can still be fulfilled; thus the actual migration process should not be started until
     *      all pending fulfillments are done.
     */
    function startMigrationToNewContract() public onlyOwner {
        isMigratingToNewContract = !isMigratingToNewContract;
    }
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
