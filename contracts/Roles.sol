// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Roles is OwnableUpgradeable, AccessControlUpgradeable {

     /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    function __Roles_init() internal onlyInitializing {
        __Roles_init_unchained();
    }

    function __Roles_init_unchained() internal onlyInitializing {
        __AccessControl_init();
        __Ownable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

}
