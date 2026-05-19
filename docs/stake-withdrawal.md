# Implement Stake Withdrawal

## Overview

Implement stake withdrawal for the canonical UTT implementation.

The product feature is **Stake Withdrawal**. The Solidity function name should be:

```solidity
withdrawStake(...)
```

The user story is:

- A user has previously endorsed a target with UTT.
- The user wants to withdraw part or all of that existing endorsement stake.
- The contract should decrease the stored stake.
- The contract should mint the same amount of UTT back to the user.

Current endorsement behavior in `contracts/Endorsement.sol` does the opposite:

- `fulfillEndorse(...)` burns UTT with `_burn(r.from, r.amount)`.
- `_endorse(...)` increases `totalStake[target]`.
- `_endorse(...)` increases `previousEndorserStakes[target][from]`.
- `_endorse(...)` may reward previous endorsers.

Stake withdrawal must reverse only the caller's active stake and UTT balance. It must not reverse historical rewards.

Terminology note:

- Use **canonical UTT implementation** for the `UTT` logic contract path in this repo.
- Use **cross-chain proxy support** for future work involving `contracts/UTTProxy.sol`.
- Avoid production-network language unless actually describing a deployment.

## Global Restrictions

Follow these restrictions exactly.

- Do not deploy anything.
- Do not update deployment scripts.
- Do not update `README.md`.
- Do not update `package.json` or `package-lock.json`.
- Do not update `contracts/UTTProxy.sol`.
- Do not add Chainlink jobs.
- Do not update files under `chainlink-node/`.
- Do not add cross-chain proxy stake withdrawal in this task.
- Do not add `withdrawStake(...)` to `contracts/EndorsementInterface.sol` for this task.
- Do not change UTU Coin reward claiming behavior.
- Do not claw back any UTT or UTU Coin rewards that previous endorsers already received.
- Do not add broad refactors.
- Do not add new storage variables for this feature.

Important reason for the interface restriction:

`contracts/UTTProxy.sol` implements `EndorsementInterface`. If `withdrawStake(...)` is added to `EndorsementInterface`, the project will require `UTTProxy` to implement it too. Cross-chain proxy support is out of scope for this task, so keep the new canonical UTT API in the inherited implementation contract instead.

## Task 1: Inspect The Existing Endorsement Flow

Read these files before editing:

```text
contracts/Endorsement.sol
contracts/MigratableEndorsement.sol
contracts/MigratableReward.sol
contracts/UTT.sol
test/UTT.test.ts
test/UTT.fixture.ts
```

Confirm these facts in the code:

- `Endorsement.sol` contains `previousEndorserStakes`.
- `Endorsement.sol` contains `totalStake`.
- `fulfillEndorse(...)` burns UTT.
- `_endorse(...)` increases both stake mappings.
- `MigratableEndorsement.sol` applies `onlyNotMigrating` to endorsement entrypoints.
- `MigratableReward.sol` resolves endorsement overrides for the final `UTT` inheritance graph.

Do not make cross-chain proxy changes while doing this inspection.

## Task 2: Implement Core Withdraw Stake Logic

Edit:

```text
contracts/Endorsement.sol
```

Add this event in `Endorsement.sol`:

```solidity
event WithdrawStake(
    address indexed _from,
    address indexed _to,
    uint256 _value,
    string _transactionId
);
```

Add an internal helper named `_withdrawStake`.

Required behavior:

- Accept `source`, `target`, `amount`, and `transactionId`.
- Revert when `amount == 0`.
- Read `previousEndorserStakes[target][source]`.
- Revert when `amount` is greater than the user's current stake for the target.
- Revert when `amount` is greater than `totalStake[target]`.
- Subtract `amount` from `previousEndorserStakes[target][source]`.
- Subtract `amount` from `totalStake[target]`.
- Mint `amount` UTT back to `source` with `_mint(source, amount)`.
- Emit `WithdrawStake(source, target, amount, transactionId)`.

Use this behavior shape:

```solidity
function _withdrawStake(
    address source,
    address target,
    uint256 amount,
    string memory transactionId
) internal {
    require(amount > 0, "UTT: withdraw amount must be greater than zero");

    uint256 currentStake = previousEndorserStakes[target][source];
    require(currentStake >= amount, "UTT: withdraw amount exceeds stake");
    require(totalStake[target] >= amount, "UTT: withdraw amount exceeds total stake");

    previousEndorserStakes[target][source] = currentStake - amount;
    totalStake[target] -= amount;

    _mint(source, amount);

    emit WithdrawStake(source, target, amount, transactionId);
}
```

Add a public entrypoint named `withdrawStake`.

Required behavior:

- Function signature should be:

```solidity
function withdrawStake(
    address target,
    uint256 amount,
    string memory transactionId
) public virtual
```

- It must require `msg.sender == tx.origin`, matching `endorse(...)`.
- It must call `_withdrawStake(msg.sender, target, amount, transactionId)`.

Do not:

- Call Chainlink.
- Fetch previous endorsers.
- Call `_triggerEndorse(...)`.
- Call `_endorse(...)`.
- Call `reward(...)`.
- Call `rewardUTUCoin(...)`.
- Change `claimableUTUCoin`.
- Change `totalClaimableUTUCoin`.

## Task 3: Add Migration-Safe Overrides

Edit:

```text
contracts/MigratableEndorsement.sol
contracts/MigratableReward.sol
```

In `contracts/MigratableEndorsement.sol`, add a `withdrawStake(...)` override.

Required behavior:

- Same arguments as `Endorsement.withdrawStake(...)`.
- Mark it `public virtual override`.
- Apply `onlyNotMigrating`.
- Call `super.withdrawStake(target, amount, transactionId)`.

In `contracts/MigratableReward.sol`, add a `withdrawStake(...)` override.

Required behavior:

- Same arguments as `Endorsement.withdrawStake(...)`.
- Mark it `public virtual override(Endorsement, MigratableEndorsement)`.
- Apply `onlyNotMigrating`.
- Call `super.withdrawStake(target, amount, transactionId)`.

Do not edit `contracts/UTT.sol` unless the compiler explicitly requires a small inheritance override.

## Task 4: Add UTT Implementation Tests

Edit:

```text
test/UTT.test.ts
```

Add a new describe block for stake withdrawal.

Use the existing helpers in:

```text
test/UTT.fixture.ts
```

Add tests for these cases:

1. User can withdraw part of their stake.
2. User can withdraw all of their stake.
3. Withdrawing stake increases the user's UTT balance by the withdrawn amount.
4. Withdrawing stake decreases `previousEndorserStakes[target][user]` by the withdrawn amount.
5. Withdrawing stake decreases `totalStake[target]` by the withdrawn amount.
6. Withdrawing stake emits `WithdrawStake(user, target, amount, transactionId)`.
7. Withdrawing `0` reverts with `UTT: withdraw amount must be greater than zero`.
8. Withdrawing more than the user's current stake reverts with `UTT: withdraw amount exceeds stake`.
9. Withdrawing stake for a target the user never endorsed reverts with `UTT: withdraw amount exceeds stake`.
10. Withdrawing stake does not emit `RewardPreviousEndorserLevel1`.
11. Withdrawing stake does not emit `RewardPreviousEndorserLevel2`.
12. Withdrawing stake does not emit `RewardUTUCoin`.
13. Withdrawing stake does not change `claimableUTUCoin`.
14. Withdrawing stake does not change `totalClaimableUTUCoin`.
15. Withdrawing stake is blocked while migration is active and reverts with `Contract is migrating`.
16. Withdrawing stake while the contract is paused reverts.

Test setup guidance:

- Use `addConnection(...)` when a non-admin user needs UTT before endorsing.
- Use the existing `endorse(...)` test helper to create stake before calling `withdrawStake(...)`.
- Use `previousEndorserStakes(target, user)` to check per-user stake.
- Use `totalStake(target)` to check target-level stake.
- Use `balanceOf(user)` to check minted-back UTT.

Do not add `UTTProxy` tests in this task.

## Task 5: Build And Test

Run:

```bash
npm run build
```

Run:

```bash
npm test
```

If the full test suite is too slow while iterating, first run the focused UTT tests:

```bash
npx hardhat test test/UTT.test.ts
```

The final result should pass `npm run build` and `npm test`.

If the project fails to compile because `UTTProxy` does not implement `withdrawStake(...)`, check whether `EndorsementInterface.sol` was edited. For this task, revert that interface change instead of updating `UTTProxy`.

## Task 6: Final Response Requirements

After implementation, report:

- Files changed.
- The behavior added.
- Tests run.
- Whether any tests failed.
- Any follow-up needed for cross-chain proxy support.

Explicitly state that deployment was not performed.

## Out Of Scope For This Task

These may be future tasks, but DO NOT implement them now:

- `UTTProxy.withdrawStake(...)`.
- `proxyWithdrawStake(...)`.
- New Chainlink withdraw-stake jobs.
- Updating cross-chain proxy job values.
- Updating deployment scripts.
- Deploying or upgrading contracts.
- Updating backend/indexer/frontend repositories.
- Reworking reward formulas.
- Reworking endorsement storage.
