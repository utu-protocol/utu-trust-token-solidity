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

    // Events that might be emitted during the endorsement process.

    /** A new staked endorsement was created. */
    event Endorse(
        address indexed _from,
        address indexed _to,
        uint _value,
        string _transactionId
    );

    /** A first-level previous endorser was rewarded */
    event RewardPreviousEndorserLevel1(address endorser, uint256 reward);

    /** A second-level previous endorser was rewarded */
    event RewardPreviousEndorserLevel2(address endorser, uint256 reward);
}
