// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./MigratableEndorsement.sol";
import "./MigratableSocialConnector.sol";
import "./UTT.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MigratableUTT is
    MigratableEndorsement,
    MigratableSocialConnector,
    UTT
{
    constructor(
        uint256 _mintAmount,
        address _oracle,
        string memory _jobId,
        uint256 _fee,
        address _link
    ) UTT(_mintAmount, _oracle, _jobId, _fee, _link) {}

    function addConnection(
        address user,
        uint256 connectedTypeId,
        bytes32 connectedUserIdHash
    )
        public
        override(MigratableSocialConnector, SocialConnector)
        onlyNotMigrating
        onlyRole(SOCIAL_CONNECTOR_ROLE)
    {
        super.addConnection(user, connectedTypeId, connectedUserIdHash);
    }

    function removeConnection(
        address user,
        uint256 connectedTypeId
    )
        public
        override(MigratableSocialConnector, SocialConnector)
        onlyNotMigrating
        onlyRole(SOCIAL_CONNECTOR_ROLE)
    {
        super.removeConnection(user, connectedTypeId);
    }

    function endorse(
        address target,
        uint256 amount,
        string memory transactionId
    ) public override(MigratableEndorsement, Endorsement) onlyNotMigrating {
        super.endorse(target, amount, transactionId);
    }

    function proxyEndorse(
        address source,
        address target,
        uint256 amount,
        string memory transactionId
    )
        public
        override(MigratableEndorsement, Endorsement)
        onlyNotMigrating
        onlyRole(PROXY_ENDORSER_ROLE)
    {
        super.proxyEndorse(source, target, amount, transactionId);
    }

    /**
     * Returns 0 decimals (since we don't need decimals for this particular use case).
     */
    function decimals()
        public
        view
        virtual
        override(ERC20, UTT)
        returns (uint8)
    {
        return 0;
    }

    /**
     * @dev just calls super._beforeTokenTransfer()
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(UTT, ERC20) {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * Always reverts on external calls on transfer, since UTT is not transferable.
     */
    function transfer(
        address recipient,
        uint256 amount
    ) public pure override(ERC20, UTT) returns (bool) {
        revert("Not allowed.");
    }

    /**
     * * Always reverts on external calls on approve, since UTT is not transferable.
     */
    function approve(
        address spender,
        uint256 amount
    ) public pure override(ERC20, UTT) returns (bool) {
        revert("Not allowed.");
    }
}
