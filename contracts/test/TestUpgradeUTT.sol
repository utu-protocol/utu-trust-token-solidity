// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "../MigratableReward.sol";


// this contract shouldn't be deployed it's just used for testing the upgradeability
contract TestUpgradeUTT is
    MigratableReward,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable
{

    /** Add a new variable in the upgrade */
    uint256 private counter;

    /**
     * Constructs new UTU Trust Token contract.
     * See also {ERC20-constructor}.
     * @param _mintAmount amount of UTT minted to the deploying address; only used in testing.
     * @param _oracle Chainlink oracle operator contract address
     * @param _jobId Id for oracle jobs from this contract
     * @param _fee Initial value for the LINK fee
     * @param _link LINK token address
     */

    function initialize(
        uint256 _mintAmount,
        address _oracle,
        string memory _jobId,
        uint256 _fee,
        address _link
    ) external initializer {
        __Roles_init();
        __Endorsement_init(
            "UTU Trust Token",
            "UTT",
            _oracle,
            _jobId,
            _fee,
            _link
        );
        __SocialConnector_init();
        _mint(msg.sender, _mintAmount);
    }

    /**
     * Returns 0 decimals (since we don't need decimals for this particular use case).
     */
    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    /**
     * Pauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_pause}.
     *
     */
    function pause() public virtual onlyOwner {
        _pause();
    }

    /**
     * Unpauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_unpause}.
     *
     */
    function unpause() public virtual onlyOwner {
        _unpause();
    }

    /**
     * @dev just calls super._beforeTokenTransfer()
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * Always reverts on external calls on transfer, since UTT is not transferable.
     */
    function transfer(
        address recipient,
        uint256 amount
    ) public pure virtual override returns (bool) {
        revert("Not allowed.");
    }

    /**
     * * Always reverts on external calls on approve, since UTT is not transferable.
     */
    function approve(
        address spender,
        uint256 amount
    ) public pure virtual override returns (bool) {
        revert("Not allowed.");
    }

    function incrementCounter() public {
        counter += 1;
    }

    function getCounter() public view returns (uint256) {
        return counter;
    }

}
