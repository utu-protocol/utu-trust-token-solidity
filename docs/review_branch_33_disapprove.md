# Branch Review: `33-implement-disapprove-method` vs `main`

Reviewed: 2026-07-07
Scope: `git diff main...33-implement-disapprove-method` — 34 files, +1,571 / −43 lines.

## Summary

This branch delivers three related features for the UTT endorsement system and
unifies how they travel across chains:

1. **Disapprove** (issue #33): a user who has interacted with a target can
   disapprove of it, burning a fee and penalising the target's previous
   endorsers — the inverse of the endorsement reward flow.
2. **Stake withdrawal** (issue #63, merged in from `main` and extended here): a
   user can reduce or remove their existing stake on a target, getting the UTT
   re-minted back, with no oracle round-trip and no effect on other endorsers.
3. **Unified cross-chain `proxyAction` entry point**: instead of one Chainlink
   oracle job and one contract method per action (`proxyEndorse`,
   `proxyDisapprove`, `proxyWithdrawStake`, …), the proxy now forwards *all*
   actions through a single job and a single `proxyAction(...)` method,
   dispatching on an `ActionType` enum.

All contracts are UUPS-upgradeable, so every storage-affecting change is paired
with a storage-gap adjustment, and legacy entry points are retained as shims so
already-deployed proxies and in-flight oracle requests keep working through the
upgrade window.

## 1. Main contract: `contracts/Endorsement.sol`

### New protocol parameters

Two whitepaper parameters were added, with owner-only setters:

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `D_d`     | 5       | Penalty divisor: a previous endorser's penalty is their equivalent reward divided by `D_d`. `setD_d` rejects 0 to prevent division-by-zero in `_disapprove`. |
| `D_min`   | 50      | Minimum disapproval fee. Enforced in `disapprove()` and in `proxyAction()` for `DISAPPROVE`, so a dust-sized disapproval can't be used to cheaply grief endorsers. |

**Logic:** disapproval must cost the disapprover something meaningful (the fee
is burned, not transferred), and the resulting penalty is deliberately smaller
than the equivalent endorsement reward (divided by `D_d`). This keeps the
system biased toward endorsement while still making sustained bad behaviour by
a target expensive for those who vouched for it.

### `ActionType` enum and generalised oracle request

```solidity
enum ActionType { ENDORSE, DISAPPROVE, WITHDRAW_STAKE }
```

The `OracleRequest` struct gained an `actionType` field. Both endorse and
disapprove need the same off-chain data — the list of level-1 and level-2
previous endorsers from the UTU Trust API — so the former `_triggerEndorse`
was generalised into `_triggerOracleRequest(source, target, amount,
transactionId, actionType)`. The request is stored so the fulfillment callback
knows which action to apply.

Adding a field to a struct that is only used as a mapping value is
upgrade-safe for new entries; the only caveat is requests in flight at upgrade
time (see "Backwards compatibility" below — the legacy `fulfillEndorse`
callback covers those).

### `disapprove(target, amount, transactionId)`

Public user-facing method (mirrors `endorse`):

- `msg.sender == tx.origin` — same anti-contract-caller guard as `endorse`.
- `amount >= D_min`.
- Triggers the oracle request with `ActionType.DISAPPROVE`; nothing is burned
  or penalised until fulfillment.

### `fulfillPreviousEndorsers` — shared oracle callback

The old `fulfillEndorse` callback was superseded by
`fulfillPreviousEndorsers`, which:

1. Looks up the stored request (reverting on unknown ids — a new guard that
   `fulfillEndorse` did not have).
2. Burns `amount` from the requester (stake for endorse, fee for disapprove —
   in both cases the tokens leave circulation at fulfillment time, consistent
   with the pre-existing endorse behaviour).
3. Routes to `_endorse(...)` or `_disapprove(...)` based on the stored
   `actionType`.

New oracle job templates point at this selector; the old `fulfillEndorse` is
kept as a compatibility shim for existing jobs (it burns and endorses exactly
as before).

### `_disapprove` — the penalty logic

For each previous endorser at each level:

```
equivalentReward = computeReward(target, endorser, D_lvl, amount)
penalty          = equivalentReward / D_d
actualPenalty    = min(penalty, endorser's current recorded stake)
```

- The penalty is deducted from `previousEndorserStakes[target][endorser]` and
  from `totalStake[target]`. It is **not** transferred to anyone — reducing
  recorded stake shrinks the endorser's share of *future* rewards on that
  target, which is the real economic effect.
- Reusing `computeReward` with the existing `D_lvl1`/`D_lvl2` discounts means
  penalties follow exactly the same share-of-stake distribution as rewards:
  whoever would have profited most from this endorsement chain loses the most
  when it is disapproved. Only one new parameter (`D_d`) is needed.
- The `min(...)` clamp guarantees stakes never underflow to a revert, so a
  target with heavily-penalised endorsers can still be disapproved again
  (verified by the "repeated disapprovals" test).
- Emits `PenalisePreviousEndorserLevel1/2` per endorser and a final
  `Disapprove(from, target, amount, transactionId)` event.

Note the deliberate asymmetry with `_endorse`: disapproval does **not** create
a stake for the disapprover. The fee is simply burned; a disapprover gains no
future reward position.

### `withdrawStake(target, amount, transactionId)` and `_withdrawStake`

Atomic, same-transaction stake reduction:

- Requires `amount > 0`, `amount <= caller's stake on target`, and
  `amount <= totalStake[target]` (defensive; the second check implies it in
  practice).
- Decrements both stake mappings and **re-mints** the amount to the caller —
  the mirror image of `endorse`, which burns the stake at fulfillment. Supply
  accounting stays consistent: burn on stake-in, mint on stake-out.
- No oracle call and no penalty/reward for anyone else. Per the whitepaper,
  editing your own stake is purely a balance adjustment (see
  `docs/stake-withdrawal.md`).
- Emits `WithdrawStake(source, target, amount, transactionId)`.

### `proxyAction` — unified proxy entry point

```solidity
function proxyAction(source, target, amount, transactionId, actionType)
    public onlyRole(PROXY_ENDORSER_ROLE)
```

Called by the Chainlink node (holding `PROXY_ENDORSER_ROLE`) on behalf of a
user on another chain:

- `WITHDRAW_STAKE` → `_withdrawStake` directly (atomic, no second oracle
  round-trip).
- `DISAPPROVE` → re-checks `amount >= D_min` on the main chain (the proxy
  chain can't be trusted to know the current `D_min`), then triggers the
  previous-endorsers oracle request.
- `ENDORSE` → triggers the oracle request as before.

**Logic:** one method + one enum scales to future action types without new
roles, new methods, or new oracle jobs. `proxyEndorse` is retained as a
documented shim for legacy proxy deployments whose oracle jobs still call it.

### Storage gap

`__gap` shrank `49 → 47`, accounting for the two new storage variables
(`D_d`, `D_min`), preserving the storage layout for upgrades.

## 2. Interface: `contracts/EndorsementInterface.sol`

Adds `disapprove(...)` and `withdrawStake(...)` with full NatSpec, plus four
events: `Disapprove`, `WithdrawStake`, `PenalisePreviousEndorserLevel1`,
`PenalisePreviousEndorserLevel2`. Because both `UTT` (main) and `UTTProxy`
implement this interface, dApps can call the same ABI regardless of which
chain they are on — the proxy transparently forwards.

## 3. Migration wrappers: `MigratableEndorsement.sol`, `MigratableReward.sol`

Both override the new methods (`withdrawStake`, `disapprove`, `proxyAction`)
only to add the `onlyNotMigrating` modifier before delegating to `super`. This
follows the existing pattern for `endorse`/`proxyEndorse`: **no** state-changing
endorsement operation may run while a data migration to a new contract is in
progress, otherwise migrated state would diverge from live state.
`MigratableReward` needs the explicit `override(Endorsement,
MigratableEndorsement)` since it inherits both.

## 4. Cross-chain proxy: `contracts/UTTProxy.sol`

- New storage: `actionJobId` (with `setActionJobId` owner setter). The comment
  documents that the slot was previously named `disapproveJobId` during this
  branch's development but never deployed, so renaming is layout-safe. The old
  `jobId` slot is retained but documented as legacy/unused.
- `endorse`, and the new `disapprove` and `withdrawStake`, all funnel into a
  private `_emitAction(...)` that builds a single Chainlink request against
  `actionJobId`, adding an `actionType` uint to the CBOR payload alongside the
  existing source/target/amount/transactionId fields. It reverts with a clear
  message if `actionJobId` is unconfigured — an upgraded proxy fails loudly
  rather than emitting requests no job will pick up.
- New fulfillment callback `fulfillAction` (emits `ProxiedActionFulfilled`);
  the legacy `fulfill` callback is kept so Chainlink requests already in
  flight at upgrade time can still complete without reverting.
- `__gap` shrank `48 → 47` for the new `actionJobId` slot.

**Logic:** the proxy is intentionally thin — it validates nothing about
stakes or balances (it can't; that state lives on the main chain). It just
emits a well-formed oracle request and lets the main contract enforce all
rules when `proxyAction` lands there. That is why e.g. `D_min` is re-checked
on the main side.

## 5. Chainlink node & oracle jobs (`chainlink-node/`)

- **New job template** `utt-proxy-action.toml.template`: a `directrequest`
  job that decodes the proxy's CBOR payload (now including `actionType`),
  ABI-encodes a `proxyAction(address,address,uint256,string,uint8)` call, and
  submits it to the main UTT contract on the main chain with
  `failOnRevert="true"`. A `memo` task surfaces `actionType=<n>` in the run
  graph for operator visibility. This one job replaces what would otherwise
  have been three per network.
- **Per-network value files** gained a
  `__PROXY_JOB_VALUE_UTT_PROXY_ACTION_EXTERNAL_JOB_ID` export. Real job UUIDs
  are minted for Base and Optimism (both testnet and mainnet variants).
  Aurora and Lisk are intentionally excluded because support for those
  networks has been removed.
- **Dockerfile**: works around a broken PostgreSQL apt repository in the
  `smartcontract/chainlink:2.12.0` base image so `gettext` (for `envsubst`)
  still installs; also cleans apt lists. `docker-compose.yml` moves postgres
  to `16-alpine` (smaller image).

## 6. Hardhat tasks (`tasks/`)

Three new operational tasks, registered in `tasks/index.ts`, all following the
existing `endorse` task's structure:

- `disapprove` — call `disapprove(target, amount, transactionId)` on a UTT or
  UTTProxy address.
- `withdraw-stake` — call `withdrawStake(...)` likewise.
- `set-action-job-id` — owner task to configure `actionJobId` on an upgraded
  UTTProxy (the required post-upgrade step; until it runs, proxy actions
  revert with "Action job ID not configured").

## 7. Upgrade tooling (`scripts/`)

- `upgrade.ts` now also prints the ERC-1967 implementation address after an
  upgrade — needed for verifying the implementation contract on explorers.
- New `upgrade.args.testnet_polygon.js` supplies the Amoy UTT token address as
  a constructor/initializer argument for the testnet upgrade of the proxy.

## 8. Tests

~780 new test lines across four files, using a mock Chainlink operator to
drive the fulfillment callbacks:

- **`test/Disapproval.test.ts`** (new, 489 lines): burn behaviour, event
  emission, `D_min` enforcement (below / at exactly / via proxy), insufficient
  balance, level-1 and level-2 penalties, exact penalty math
  (`computeReward / D_d`), `totalStake` reduction, the no-underflow clamp
  under repeated disapprovals, no penalty events when there are no previous
  endorsers, `proxyAction` role enforcement, migration blocking, and
  governance of `D_d`/`D_min` (including the `D_d > 0` guard and non-admin
  rejection).
- **`test/UTT.test.ts`** (+162): same-chain stake withdrawal — partial and
  full withdrawal, invalid amounts, never-endorsed targets, that withdrawal
  emits **no** reward events and does not change claimable UTU Coin, and that
  it is blocked during migration and while paused.
- **`test/WithdrawStake.test.ts`** (new): the cross-chain path —
  `proxyAction(..., WITHDRAW_STAKE)` works for role holders, is refused
  otherwise, reverts when the amount exceeds the source's stake, and does not
  penalise previous endorsers (no oracle round-trip).
- **`test/UTTProxy.test.ts`** (+25): endorse and withdrawStake on the proxy
  emit `ChainlinkRequested` once `actionJobId` is set, and revert with
  "Action job ID not configured" when it isn't.
- **`test/UTT.fixture.ts`**: helpers `disapprove`, `withdrawStake`,
  `proxyAction`, and an `ActionType` constant mirroring the Solidity enum
  ordinals; `fulfillEndorse` renamed to `fulfillPreviousEndorsers` with a
  backwards-compatible alias.

## 9. Miscellaneous

- **`contracts/test/TestUpgradedEndorsement.sol`**: the upgrade-safety test
  contract mirrors the new storage (`D_d`, `D_min`, `actionType` in
  `OracleRequest`) and its gap math (`48 → 46`, since it also declares its own
  test variable), keeping the upgrade-validation tests honest.
- **`docs/stake-withdrawal.md`**: annotated as superseded — the original brief
  scoped cross-chain support out, but this branch completed it via
  `proxyAction`, so the "do not modify UTTProxy / EndorsementInterface"
  instructions no longer apply. A whitepaper-alignment note explains why
  withdrawal needs no oracle/reward logic.
- **`AGENTS.md`** (new): AI-agent working instructions — beads (`bd`) issue
  tracking workflow and non-interactive shell conventions. Unrelated to the
  Solidity feature work.
- **`.gitignore`**: ignores `.beads/` and Dolt database files (the issue
  tracker is synced to a private remote, not this repo; see also the
  "Stop tracking .beads/" commit).
- **`tsconfig.json`**: adds `emitDeclarationOnly` (paired with
  `allowImportingTsExtensions`) and reformats.
- **`hardhat.config.ts` / `.env.example`**: trailing-whitespace and
  missing-newline cleanups only.

## Design themes worth noting

1. **Symmetry with endorsement.** Disapproval reuses `computeReward` for
   penalty distribution and reuses the same oracle data (previous endorsers),
   so the penalty side of the economy is structurally identical to the reward
   side, scaled down by `D_d`. Withdrawal mirrors endorsement's burn with a
   mint.
2. **All rules enforced on the main chain.** The proxy is a dumb forwarder;
   balance checks, `D_min`, stake checks, and role checks all live on the main
   contract where the state is.
3. **Upgrade discipline.** Every new storage variable is matched by a gap
   decrement; legacy selectors (`proxyEndorse`, `fulfillEndorse`,
   `UTTProxy.fulfill`) and the legacy `jobId` slot are retained so deployed
   contracts and in-flight oracle requests survive the upgrade; the
   `TestUpgradedEndorsement` harness was updated to match.
4. **Operational fail-fast.** An upgraded proxy without a configured
   `actionJobId` reverts loudly instead of emitting orphaned oracle requests.

## Observations / possible follow-ups

- `_disapprove` computes penalties against endorsers' stakes *as they shrink
  during the loop* is not an issue here (each endorser is visited once per
  level), but the loop counters are `uint8`, capping each endorser list at 255
  entries — same pattern as the existing `_endorse`, so consistent, but a
  shared constraint to keep in mind for the API side.
- Aurora and Lisk are intentionally excluded from the unified proxy rollout
  because support for those networks has been removed.
- `UTTProxy.withdrawStake` costs the user LINK-funded oracle latency even
  though the main-chain operation is atomic; that is inherent to the
  cross-chain design (state lives on the main chain) rather than a defect.
