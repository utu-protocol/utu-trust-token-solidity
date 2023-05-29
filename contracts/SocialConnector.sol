// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Roles.sol";

abstract contract SocialConnector is ERC20Upgradeable, Roles {
    /**
     * The `socialConnections` mapping is storing the connected socialIds
     * as so: address => socialTypeId => socialUserIdHash
     */
    mapping(address => mapping(uint256 => bytes32)) socialConnections;

    bytes32 public constant SOCIAL_CONNECTOR_ROLE = keccak256("SOCIAL_CONNECTOR_ROLE");

    /**
     * The `socialConnectionReward` variable is the amount of tokens to be minted
     * as a reward for connecting/verifying with a social platform user id.
     */
    uint256 public socialConnectionReward = 10000;
    // Events for connecting social media accounts/other user ids.

    /** Social media account was connected */
    event AddConnection(
        address indexed _user,
        uint indexed _connectedTypeId,
        bytes32 indexed _connectedUserIdHash
    );

    /** Social media account was disconnected */
    event RemoveConnection(
        address indexed _user,
        uint indexed _connectedTypeId,
        bytes32 indexed _connectedUserIdHash
    );

    function _saveConnection(
        address user,
        uint256 connectedTypeId,
        bytes32 connectedUserIdHash
    ) internal {
        socialConnections[user][connectedTypeId] = connectedUserIdHash;
        emit AddConnection(user, connectedTypeId, connectedUserIdHash);
    }

    /**
     * @dev Called by UTU's social media connector when the user connects a supported social media account, and rewards
     *      them for it with a configured amount of UTT. It's callable only by owner to prevent calls for which the
     *      connector hasn't verified that the connection was really made, and to prevent repeated dis/-reconnects
     *      (this might be solved differently in the future).
     * @param user the connecting user's address
     * @param connectedTypeId id of the social media platform; we allow a user to connect a particular platform only
     *        once.
     * @param connectedUserIdHash hash of the user account id or name; this value is hashed to preserve the user's
     *        privacy.
     */
    function addConnection(
        address user,
        uint256 connectedTypeId,
        bytes32 connectedUserIdHash
    ) public virtual onlyRole(SOCIAL_CONNECTOR_ROLE) {
        // only add connection if not previously added
        if (socialConnections[user][connectedTypeId] == 0) {
            _saveConnection(user, connectedTypeId, connectedUserIdHash);

            // mint reward
            super._mint(user, socialConnectionReward);
        }
    }

    /**
     * @dev Called by UTU's social media connector when the user removes a connection to a social media account. It's
     *      callable only by owner to prevent repeated dis/-reconnects (this might be solved differently in the future).
     * @param user the connecting user's address
     * @param connectedTypeId id of the social media platform
     */
    function removeConnection(
        address user,
        uint256 connectedTypeId
    ) public virtual onlyRole(SOCIAL_CONNECTOR_ROLE) {
        // only remove connection if currently connected
        if (socialConnections[user][connectedTypeId] != 0) {
            socialConnections[user][connectedTypeId] = 0;

            emit RemoveConnection(user, connectedTypeId, 0);
        }
    }

    /**
     * Sets the amount of UTT to be rewarded for (new) social media connections
     * @param amount of UTT to be rewarded for (new) social media connections
     */
    function setSocialConnectionReward(uint256 amount) public onlyOwner {
        socialConnectionReward = amount;
    }


    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
