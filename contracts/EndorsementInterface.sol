/**
 * @title Endorsement Interface
 * This interface defines the public functions and events that are used for making endorsements. Note that if an
 * Endorsement contract is proxied to other blockchains to provide the endorse function there, different events might be
 * emitted on the main and on the proxy contract.
 */
interface EndorsementInterface {
    /**
     * @notice Creates a new staked endorsement, where the caller is the endorser. Previous endorsers, retrieved
     *         from the UTU Trust API via an oracle, will be rewarded according to the reward formula from the
     *         whitepaper.
     *         Note that the endorsement might not be created immediately, but only on the callback from an oracle call,
     *         or after being forwarded to the main UTT contract if called on a proxy.
     *         An Endorse event is emitted on the main contract once the endorsement is created, as well as
     *         RewardPreviousEndorserLevel1 and RewardPreviousEndorserLevel2 events, if applicable.
     * @param target the endorsed entity (address is just used as an id here)
     * @param amount the stake for the new endorsement
     * @param transactionId an id representing the "business transaction" for which the endorsement was made; this is
     *        _not_ necessarily an Ethereum transaction id.
     */
    function endorse(
        address target,
        uint256 amount,
        string memory transactionId
    ) external;

    /**
     * @notice Creates a disapproval, where the caller disapproves of the target after having interacted with it.
     *         Previous endorsers, retrieved from the UTU Trust API via an oracle, will be penalised according to the
     *         penalty formula from the whitepaper.
     *         Note that the disapproval might not be applied immediately, but only on the callback from an oracle call,
     *         or after being forwarded to the main UTT contract if called on a proxy.
     * @param target the disapproved entity (address is just used as an id here)
     * @param amount the disapproval fee in UTT (burned); must be >= D_min
     * @param transactionId an id representing the "business transaction" for which the disapproval was made; this is
     *        _not_ necessarily an Ethereum transaction id.
     */
    function disapprove(
        address target,
        uint256 amount,
        string memory transactionId
    ) external;

    /**
     * @notice Reduces the caller's existing stake on a previously endorsed target. UTT is re-minted back to the
     *         caller. Per whitepaper, this is purely a balance adjustment: no oracle is consulted and previous
     *         endorsers are not penalised.
     * @param target the previously endorsed entity
     * @param amount the amount of stake to withdraw; must be <= the caller's current stake on `target`
     * @param transactionId business transaction id
     */
    function withdrawStake(
        address target,
        uint256 amount,
        string memory transactionId
    ) external;

    // Events that might be emitted during the endorsement process.

    /** A new staked endorsement was created. */
    event Endorse(
        address indexed _from,
        address indexed _to,
        uint _value,
        string _transactionId
    );

    /** A disapproval was created. */
    event Disapprove(
        address indexed _from,
        address indexed _to,
        uint _value,
        string _transactionId
    );

    /** An endorser withdrew part or all of their stake on a target. */
    event WithdrawStake(
        address indexed _from,
        address indexed _to,
        uint _value,
        string _transactionId
    );

    /** A first-level previous endorser was rewarded */
    event RewardPreviousEndorserLevel1(address endorser, uint256 reward);

    /** A second-level previous endorser was rewarded */
    event RewardPreviousEndorserLevel2(address endorser, uint256 reward);

    /** A first-level previous endorser was penalised */
    event PenalisePreviousEndorserLevel1(address endorser, uint256 penalty);

    /** A second-level previous endorser was penalised */
    event PenalisePreviousEndorserLevel2(address endorser, uint256 penalty);
}
