// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Migratable.sol";
import "./Endorsement.sol";

abstract contract MigratableEndorsement is Migratable, Endorsement {
    function migrateBalance(
        address[] calldata addresses,
        address oldContractAddress
    ) public onlyOwner onlyMigratingDataFromOldContract {
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

    function endorse(
        address target,
        uint256 amount,
        string memory transactionId
    ) public virtual override onlyNotMigrating {
        super.endorse(target, amount, transactionId);
    }

    function proxyEndorse(
        address source,
        address target,
        uint256 amount,
        string memory transactionId
    ) public virtual override onlyNotMigrating onlyRole(PROXY_ENDORSER_ROLE) {
        super.proxyEndorse(source, target, amount, transactionId);
    }
}
