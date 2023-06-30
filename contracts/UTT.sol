// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "./MigratableEndorsement.sol";
import "./MigratableSocialConnector.sol";

contract UTT is
    MigratableEndorsement,
    MigratableSocialConnector,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable
{
    /** Discounting component for computing $UTU rewards corresponding to UTT rewards (see whitepaper) */
    uint256 public D_UTT;

    /** A mapping storing the amount of $UTU that can be claimed by a user */
    mapping (address => uint) public claimableUTU;

    address public UTUCoin;

    /** An amount of UTU Coin was rewarded */
    event RewardUTUCoin(
        address indexed _to,
        uint _value
    );

    /** Rewarded UTU Coin were claimed */
    event ClaimUTURewards(
        address indexed _by,
        uint _value
    );

    modifier onlyIfKYCed(address user) {
        for(uint i = 0; i <= maxConnectedTypeId; i++) {
            if(connectedTypeWhitelistedForKYC[i]) {
                _;
                return;
            }
        }
        error("User is not KYCed");
     }

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
        __Endorsement_init("UTU Trust Token", "UTT", _oracle, _jobId, _fee, _link);
        __SocialConnector_init();
        _mint(msg.sender, _mintAmount);

        D_UTT = 10;
    }

    /**
     * Sets the address of the UTU Coin contract.
     * @param _UTUCoin address of the UTU Coin contract.
     */
    function setUTUCoin(address _UTUCoin) external onlyOwner {
        UTUCoin = _UTUCoin;
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

    /**
    * Mints rewardUTT to the user and adds the corresponding amount of $UTU to the claimableUTU mapping.
    */
    function reward(address user, uint256 rewardUTT) internal {
        super._mint(user, rewardUTT);
        rewardUTU = rewardUTT / D_UTT;
        claimableUTU[user] += rewardUTU;
        emit RewardUTUCoin(user, rewardUTU);
    }

    /**
     * Claims the available $UTU rewards by sending the corresponding amount of $UTU to the user. Resets the amount of
     * claimable $UTU to 0.
     */
    function claimRewards() public onlyIfKYCed {
        uint256 amount = claimableUTU[msg.sender];
        claimableUTU[msg.sender] = 0;

        // Transfers amount $UTU from this contract to the user
        uint256 total = ERC20(UTUCoin).balanceOf(address(this));
        require(total > amount, "Not enough $UTU available to claim rewards.");

        ERC20(UTUCoin).safeTransfer(msg.sender, amount);

        emit ClaimUTURewards(msg.sender, amount);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
