// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

contract UTU is Context, AccessControl, ERC20Burnable, ERC20Pausable, Ownable {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /**
     * The endorsement structure: every endorsement is composed of:
     * - Endorsement address is the key of the mapping
     * - Id is the sequence of the endorsements for that account
     * - Accepted Status - true if the user has accepted the endorsement
     */

    mapping (address => mapping (uint256 => address)) endorsements;
    mapping (address => uint256) endorsementId;

    event Endorse(address indexed _from, address indexed _to, uint indexed _id, uint _value);

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE` and `PAUSER_ROLE` to the
     * account that deploys the contract. Grants `MINTER_ROLE` to the bridge.
     *
     * See {ERC20-constructor}.
     */
    constructor() public ERC20("UTU Endorse (ERC20)", "ENDR") {
        _mint(msg.sender, 100000000000000000000);
    }
    
    /**
     * @dev Pauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_pause}.
     *
     * Requirements:
     *
     * - the caller must have the `PAUSER_ROLE`.
     */
    function pause() public virtual {
        require(
            hasRole(PAUSER_ROLE, _msgSender()),
            "Contract: must have pauser role to pause"
        );
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_unpause}.
     *
     * Requirements:
     *
     * - the caller must have the `PAUSER_ROLE`.
     */
    function unpause() public virtual {
        require(
            hasRole(PAUSER_ROLE, _msgSender()),
            "Contract: must have pauser role to unpause"
        );
        _unpause();
    }

    /**
     * @dev Sends a tip of tokens to the previous address
     * that endorsed the current one.
     *
     * Invokes `super._transfer()`.
     */
    function endorse(
        address recipient,
        uint256 amount
    ) public {

        require(msg.sender == tx.origin, "should be an user");

        // TODO: migrated from Sophia code
        // how exactly the users will acquire endorsement tokens?

        // get previous endorser
        uint256 sequence = endorsementId[msg.sender];

        // TODO: what do we do with the case when there is no previous endorser?
        // shall the token amount sent be still transferred and to whom?
        // if (sequence >= 1) {

            uint256 nextSequence = sequence + 1;
            address previousEndorser = endorsements[msg.sender][sequence];

            // update state
            endorsementId[msg.sender] = nextSequence;
            endorsements[msg.sender][nextSequence] = recipient;

            // internal transfer
            super._transfer(msg.sender, recipient, amount);

            // emit event
            emit Endorse(msg.sender, recipient, nextSequence, amount);

        // }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
