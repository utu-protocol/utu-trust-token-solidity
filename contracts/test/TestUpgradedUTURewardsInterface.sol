/**
 * @title UTU Coin Rewards Interface
 * This interface defines the public functions and events that are used for claiming UTU Coin ($UTU) rewards.
 */
interface TestUpgradedUTURewardsInterface {
    /**
     * Claims the available $UTU rewards by the sender; the amount might be sent to the sender asynchronously, e.g. when
     * calling this on a proxy rather than the main contract.
     * It might require prior whitelisting of the sender.
     * Each amount of rewarded $UTU can only be claimed once.
     */
    function claimRewards() external;

    /** An amount of $UTU was rewarded. Only be emitted on the TestUpgradedUTT main contract but not on proxy contracts. */
    event RewardUTUCoin(address indexed _to, uint _value);

    /** Rewarded $UTU were claimed. Emitted on the blockchain where the reward was claimed from. */
    event ClaimUTURewards(address indexed _by, uint _value);
}
