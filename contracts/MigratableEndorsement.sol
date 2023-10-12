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

    function __Endorsement_init(
        string memory name_,
        string memory symbol_,
        address _oracle,
        string memory _jobId,
        uint256 _fee,
        address _link
    ) internal virtual override onlyInitializing {
        super.__Endorsement_init(name_, symbol_, _oracle, _jobId, _fee, _link);
        __Migratable_init();
    }

    function migrateEndorsements(
        EndorsementData[] calldata _endorsements,
        address oldContractAddress
    ) public onlyOwner onlyMigratingDataFromOldContract {
        Endorsement oldContract = Endorsement(oldContractAddress);
        for (uint i = 0; i < _endorsements.length; i++) {
            EndorsementData memory endorsement = _endorsements[i];

            totalStake[endorsement.target] = oldContract.totalStake(
                endorsement.target
            );
            previousEndorserStakes[endorsement.target][
                endorsement.from
            ] = oldContract.previousEndorserStakes(
                endorsement.target,
                endorsement.from
            );
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
