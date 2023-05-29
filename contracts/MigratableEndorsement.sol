// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Migratable.sol";
import "./Endorsement.sol";

abstract contract MigratableEndorsement is Migratable, Endorsement {
    struct EndorsementData {
        address from;
        address target;
        uint256 amount;
        string transactionId;
    }

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

    function migrateEndorsements(
        EndorsementData[] calldata _endorsements,
        address oldContractAddress
    ) public onlyOwner onlyMigratingDataFromOldContract {
        Endorsement oldContract = Endorsement(oldContractAddress);
        for (uint i = 0; i < _endorsements.length; i++) {
            EndorsementData memory endorsement = _endorsements[i];

            totalStake[endorsement.target] = oldContract.totalStake(endorsement.target);
            previousEndorserStakes[endorsement.target][endorsement.from] = oldContract.previousEndorserStakes(endorsement.target, endorsement.from);

            emit Endorse(endorsement.from, endorsement.target, endorsement.amount, endorsement.transactionId);
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


    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
