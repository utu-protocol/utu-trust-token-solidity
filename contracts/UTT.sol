// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

contract UTT is ERC20Burnable, ERC20Pausable, Ownable {
    /**
     * The endorsement structure: every endorsement is composed of:
     * - Endorsement address is the key of the mapping
     * - Id is the sequence of the endorsements for that account
     * - Accepted Status - true if the user has accepted the endorsement
     */

    mapping (address => mapping (uint256 => address)) endorsements;
    mapping (address => uint256) endorsementId;

    // address : social_media_platform_id
    mapping (address => uint256) socialConnections;

    mapping (address => uint256) connectionRewards;

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
     */
    function pause() public onlyOwner virtual {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_unpause}.
     *
     */
    function unpause() public onlyOwner virtual {
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

        // In the sophia contract there was a piece of code which
        // allowed tokens to be minted to the transaction sender
        // at the time of invoking the endorse function.

        // get previous endorser
        uint256 sequence = endorsementId[recipient];
        address previousEndorser = endorsements[recipient][sequence];

        // TODO: what to do in the case when there is no previous endorser?
        // shall the token amount sent be still transferred and to whom?
        // Or maybe endorse it in full to the recipient (which seems logical)
        //
        // if (sequence >= 1) {

            uint256 nextSequence = sequence + 1;

            // update state
            endorsementId[recipient] = nextSequence;
            endorsements[recipient][nextSequence] = recipient;

            // Send tokens (endorse) the recipient

            // TODO: How to split the endorsement between the recipient and
            // the previous endorser?
            super._transfer(msg.sender, recipient, amount);
            // super._transfer(msg.sender, previousEndorser, 0);

            // TODO: shall we add the recipient address and the address of
            // the previous endorser to the emitted event as well?
            emit Endorse(msg.sender, recipient, nextSequence, amount);

        // }
    }

    /**
     * @dev The admin (backend) can set verified social media
     * connections.
     */
    function addConnection(
        address user,
        uint256 socialId
    ) public onlyOwner {
        socialConnections[user] = socialId;
    }

    /**
     * @dev The admin (backend) can remove social media connections.
     */
    function removeConnection(
        address user
    ) public onlyOwner {
        socialConnections[user] = 0;
    }


    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
