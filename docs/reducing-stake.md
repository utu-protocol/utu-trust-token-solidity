# Reducing Stake Feature Plan

This document explains how to implement The reducing stake functionality: allowing a user to reduce stake in a target they previously endorsed and receive the same amount of UTT back.

The intent is to have enough context to understand the feature, implement it safely, test it, and deploy the right contracts without duplicating the whole project README.

## Working Assumptions

- The feature name should be `reduceStake`.
- Reducing stake can be partial or full.
- Reducing stake releases the caller's own UTT only.
- Reducing stake must not reward previous endorsers.
- Reducing stake must not create claimable UTU Coin.
- Reducing stake must not claw back historical UTT or UTU Coin rewards already given to other users.
- Keep `transactionId` on the new function/event unless product decides otherwise, because endorsements already use it and off-chain systems can use it for correlation.
- Main UTT support is the core feature. Proxy-chain support should be treated as optional/phase 2 unless the release requires users on proxy chains to reduce stake there too.

## Context From The Current System

For broader architecture, see `README.md` lines 104-205. The key points for this feature are:

- `contracts/UTT.sol` is the main upgradeable token contract. It inherits endorsement, reward, migration, social connector, pause, and ERC20 behavior.
- `contracts/Endorsement.sol` owns the endorsement state and logic.
- `contracts/EndorsementInterface.sol` exposes endorsement functions and events.
- `contracts/MigratableEndorsement.sol` and `contracts/MigratableReward.sol` wrap endorsement entrypoints so they respect migration state and inheritance rules.
- `contracts/Reward.sol` mints UTT rewards and accounts for claimable UTU Coin rewards.
- `contracts/UTTProxy.sol` is used on other chains. It does not own business state; it forwards calls to the main UTT contract through Chainlink.

Important token behavior:

- UTT has `decimals() == 0`; stake values are whole UTT.
- UTT is not transferable through normal ERC20 `transfer` or `approve`.
- Burning UTT means `_burn(user, amount)`: user balance decreases and total supply decreases.
- Minting UTT means `_mint(user, amount)`: user balance increases and total supply increases.

## Current Endorsement Flow

Current endorsement does this:

1. User calls `endorse(target, amount, transactionId)`.
2. `Endorsement._triggerEndorse(...)` checks the user has enough UTT.
3. `_triggerEndorse(...)` creates a Chainlink request for previous endorsers.
4. Chainlink calls `fulfillEndorse(...)`.
5. `fulfillEndorse(...)` burns the endorser's UTT with `_burn(r.from, r.amount)`.
6. `_endorse(...)` rewards previous endorsers.
7. `_endorse(...)` increases stake:
   - `totalStake[target] += amount`
   - `previousEndorserStakes[target][from] += amount`
8. `_endorse(...)` emits `Endorse(from, target, amount, transactionId)`.

The part we need to reverse is the burn plus the two stake-map increases. We do not reverse the previous-endorser rewards because the contract does not track those rewards per endorsement, and some UTU Coin rewards may already have been claimed.

## Main Contract Change

Add a direct main-chain function to reduce stake:

```solidity
function reduceStake(
    address target,
    uint256 amount,
    string memory transactionId
) external;
```

Add a matching event:

```solidity
event ReduceStake(
    address indexed _from,
    address indexed _to,
    uint256 _value,
    string _transactionId
);
```

Interface note: `UTTProxy.sol` currently implements `EndorsementInterface`. If `reduceStake(...)` is added to `EndorsementInterface`, `UTTProxy` must also implement it or the project will not compile. For a main-chain-only first PR, either declare the function/event directly in `Endorsement.sol` or create a small separate stake-reduction interface. Update `EndorsementInterface` only if proxy-chain support is included in the same PR.

The implementation should:

1. Require `amount > 0`.
2. Read `previousEndorserStakes[target][source]`.
3. Require the current stake is at least `amount`.
4. Subtract `amount` from `previousEndorserStakes[target][source]`.
5. Subtract `amount` from `totalStake[target]`.
6. Mint the same amount back to the source with `_mint(source, amount)`.
7. Emit `ReduceStake(source, target, amount, transactionId)`.

Do not:

- Call Chainlink.
- Fetch previous endorsers.
- Call `reward(...)`.
- Call `rewardUTUCoin(...)`.
- Change `claimableUTUCoin` or `totalClaimableUTUCoin`.
- Try to claw back prior rewards.

Recommended helper shape:

```solidity
function _reduceStake(
    address source,
    address target,
    uint256 amount,
    string memory transactionId
) internal {
    require(amount > 0, "UTT: reduce amount must be greater than zero");

    uint256 currentStake = previousEndorserStakes[target][source];
    require(currentStake >= amount, "UTT: reduce amount exceeds stake");

    previousEndorserStakes[target][source] = currentStake - amount;
    totalStake[target] -= amount;

    _mint(source, amount);

    emit ReduceStake(source, target, amount, transactionId);
}
```

## Files To Update For The Main Feature

Update `contracts/Endorsement.sol`:

- Add `_reduceStake(...)`.
- Add public/external `reduceStake(...)`.
- Add `ReduceStake(...)`, unless the event lives in a separate interface.
- Keep the same `msg.sender == tx.origin` rule as `endorse(...)` unless product explicitly decides to support smart-contract wallets.

Update `contracts/MigratableEndorsement.sol`:

- Override `reduceStake(...)`.
- Apply `onlyNotMigrating`, matching how `endorse(...)` is guarded.

Update `contracts/MigratableReward.sol`:

- Add the matching `reduceStake(...)` override because `UTT` reaches endorsement functions through this multiple-inheritance layer.

`contracts/UTT.sol` is not expected to need a direct code change. If Solidity asks for an explicit override, add only what the compiler requires.

Do not update `contracts/EndorsementInterface.sol` for a main-chain-only PR unless `UTTProxy.sol` is also updated. This keeps the compile scope honest and prevents accidentally pulling proxy-chain work into the MVP.

## Optional Proxy-Chain Support

Only do this if users must be able to reduce stake from `UTTProxy` chains, such as Aurora, Optimism, Lisk, or Base. For current proxy architecture, see `README.md` lines 173-205.

Main UTT update:

- Add `reduceStake(...)` and `ReduceStake(...)` to `contracts/EndorsementInterface.sol`, because `UTTProxy` will implement the cross-chain forwarding path too.
- Add `proxyReduceStake(source, target, amount, transactionId)`.
- Guard it with `onlyRole(PROXY_ENDORSER_ROLE)`.
- Reuse `_reduceStake(...)`.
- Apply `onlyNotMigrating` in the migratable wrappers.

`UTTProxy.sol` update:

- Add `bytes32 public reduceStakeJobId`.
- Add owner setter `setReduceStakeJobId(string memory _reduceStakeJobId)`.
- Add `reduceStake(target, amount, transactionId)` that sends a Chainlink request containing:
  - `sourceAddress`
  - `targetAddress`
  - `amount`
  - `transactionId`
- Add a fulfillment event/function like the existing proxied endorsement fulfillment.
- Require `reduceStakeJobId != 0` before sending the request.
- Reduce the storage gap by the number of new storage slots added.

Do not change the existing `initialize(...)` signature for deployed upgradeable proxies. Existing proxies have already initialized. Use a setter or a `reinitializer`; a setter is enough if operations can configure the job id after upgrade.

Chainlink update:

- Add a job template similar to `chainlink-node/jobs/network-specific/utt-proxy-endorse.toml.template`.
- The encoded main-contract call should be:

```text
proxyReduceStake(address source, address target, uint256 amount, string transactionId)
```

- Add a new external job id variable to each chain's values file, for example `__PROXY_JOB_VALUE_UTT_PROXY_REDUCE_STAKE_EXTERNAL_JOB_ID`.
- For the existing proxy job setup pattern, refer to `README.md` lines 320-358.

Important proxy behavior: `UTTProxy` cannot validate the user's main-contract stake locally. It can only submit the request. The actual stake check happens on the main UTT contract when `proxyReduceStake(...)` executes.

## Tests To Add

Main UTT tests in `test/UTT.test.ts`:

- User can reduce part of their stake.
- User can reduce all of their stake.
- User balance increases by the reduced amount.
- `previousEndorserStakes[target][user]` decreases by the reduced amount.
- `totalStake[target]` decreases by the reduced amount.
- `ReduceStake` emits the expected values.
- Reducing more than the user's stake reverts.
- Reducing stake for a target the user never endorsed reverts.
- Reducing `0` reverts.
- Reducing stake does not emit `RewardPreviousEndorserLevel1`, `RewardPreviousEndorserLevel2`, or `RewardUTUCoin`.
- Reducing stake does not change `claimableUTUCoin` or `totalClaimableUTUCoin`.
- Reducing stake is blocked while migration is active.
- Upgrade tests still pass.

Optional proxy tests in `test/UTTProxy.test.ts`:

- Owner can set `reduceStakeJobId`.
- Non-owner cannot set `reduceStakeJobId`.
- `UTTProxy.reduceStake(...)` emits `ChainlinkRequested`.
- Calling `reduceStake(...)` without a configured job id reverts.
- Fulfillment emits the new proxy fulfillment event.

Optional fixture updates in `test/UTT.fixture.ts`:

- Add a helper similar to `proxyEndorse(...)` if tests call `proxyReduceStake(...)`.
- Reuse the existing `endorse(...)` helper to create stake before reduction tests.

Build/test commands are already documented in `README.md` lines 72-82. The upgradeability helper for generated test contracts is documented in `README.md` lines 89-100.

## Off-Chain Updates

Update any service that consumes endorsement events so it also understands `ReduceStake`.

Likely consumers:

- Backend/indexer/listener that tracks endorsement graph state.
- API surfaces that expose a user's current stake.
- Frontend flows that let the user choose an amount to reduce.
- ABI/typechain consumers that need the new function and event.

The backend should treat `ReduceStake(from, to, value, transactionId)` as a decrease in the weighted endorsement from `from` to `to`. If the remaining stake becomes zero, product/backend should decide whether to remove the edge from active recommendations or keep a zero-weight historical edge.

Frontend/API should expose:

- Current stake for `(target, user)`, read from `previousEndorserStakes(target, user)`.
- A reduce amount input capped at the current stake.
- Clear copy that reducing stake returns UTT but does not undo historical rewards.

## Deployment And Upgrade Guide

This feature is an implementation upgrade, not a data migration. Existing stake data already lives in `previousEndorserStakes` and `totalStake`, so there is no endorsement state to rewrite.

Current deployed contract addresses are listed in `README.md` lines 5-69. Use those addresses to identify which proxy contract needs upgrading.

What must be updated:

- Main UTT implementation: always.
- Main UTT ABI/typechain artifacts: always.
- Frontend/backend/indexer ABI usage: always, if they call `reduceStake` or watch `ReduceStake`.
- README current implementation address: after the upgrade, if this repo keeps those addresses current.

What does not need updating for the main-chain-only feature:

- Main UTT proxy address. Users keep interacting with the same proxy address.
- Existing stake mappings. No migration required.
- UTU Coin contract.
- Existing Chainlink previous-endorser job.
- Existing UTTProxy contracts, unless proxy-chain reduce stake is included.

If proxy-chain support is included, also update:

- Main UTT implementation with `proxyReduceStake(...)`.
- Every deployed `UTTProxy` implementation on supported chains.
- Chainlink node job templates and network values for the new reduce-stake job.
- Each upgraded `UTTProxy` contract's `reduceStakeJobId`.
- Chainlink node deployment so it registers the new job.

Deployment flow:

1. Implement the contract changes and tests.
2. Run build and tests. Refer to `README.md` lines 72-82.
3. For main UTT, follow the existing upgrade flow in `README.md` lines 430-453.
4. Verify the new implementation. Refer to `README.md` lines 455-483.
5. Update downstream ABIs/typechain/frontend/backend/indexer code.
6. Update the README's current implementation address if the team uses it as the source of deployed-address truth.

Proxy-chain deployment flow, only if proxy support is included:

1. Add the reduce-stake Chainlink job template and job id values. Follow the existing job setup pattern in `README.md` lines 320-358.
2. Confirm the Chainlink node wallet has `PROXY_ENDORSER_ROLE` on the main UTT contract. The existing role setup is documented in `README.md` lines 362-367.
3. Upgrade each `UTTProxy` using the same upgrade approach as the main UTT script, but with `scripts/upgrade.proxy.args.<network>.js` and `npm run upgrade:proxy`.
4. Configure each upgraded proxy by calling `setReduceStakeJobId("<32_char_hex_job_id>")`.
5. Confirm each `UTTProxy` has enough LINK for oracle requests. The existing proxy funding/config pattern is in `README.md` lines 406-414.
6. Rebuild/redeploy the Chainlink node so the new jobs are registered. The existing process is documented in `README.md` lines 337-358.
7. Verify upgraded proxy implementations using the verification guidance in `README.md` lines 469-477.

## Implementation Checklist

- Decide whether proxy-chain support is in scope for the first PR.
- Add `reduceStake` and `ReduceStake` to `Endorsement.sol` or a separate interface.
- Update `EndorsementInterface.sol` only if `UTTProxy.sol` is also updated.
- Implement `_reduceStake` in `Endorsement.sol`.
- Add migration-guarded overrides in `MigratableEndorsement.sol` and `MigratableReward.sol`.
- Add main UTT tests.
- Add optional proxy support and tests only if required.
- Update off-chain ABI consumers.
- Upgrade main UTT.
- Upgrade UTTProxy contracts only if proxy support ships.
- Verify implementations.
