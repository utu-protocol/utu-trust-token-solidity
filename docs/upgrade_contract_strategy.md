# Contract Upgrade Strategy

This document explains, from first principles, how the UTT contracts are
upgraded, and then walks through how to test the changes on the
`33-implement-disapprove-method` branch (disapprove, stake withdrawal, and the
unified `proxyAction` cross-chain flow) — locally, and on a testnet.

---

## Part 1: The big picture — how can a smart contract be "upgraded" at all?

### The problem

Once a smart contract is deployed to a blockchain, its code is immutable.
Nobody — not even the deployer — can change it. But real projects need bug
fixes and new features (like the `disapprove` method on this branch). So how
do projects "upgrade" contracts?

### The trick: the proxy pattern

The answer is to split the contract into **two** contracts:

```
                users, dApps, oracles
                        │
                        ▼
   ┌──────────────────────────────────────┐
   │  PROXY  (never changes)              │   ← this is the address everyone
   │  - holds ALL the state/storage       │     knows and talks to
   │  - holds all the UTT balances,       │
   │    stakes, roles, parameters         │
   │  - has no business logic of its own  │
   └──────────────┬───────────────────────┘
                  │  delegatecall
                  ▼
   ┌──────────────────────────────────────┐
   │  IMPLEMENTATION  (replaceable)       │   ← this is what we deploy anew
   │  - contains the actual code:         │     when we "upgrade"
   │    endorse(), disapprove(),          │
   │    withdrawStake(), ...              │
   │  - holds NO state                    │
   └──────────────────────────────────────┘
```

- The **proxy** is deployed once and its address never changes. All tokens,
  stakes, and settings live in *its* storage.
- The **implementation** contains the code. When someone calls
  `endorse(...)` on the proxy, the proxy uses a low-level EVM feature called
  `delegatecall` to run the implementation's code *against the proxy's own
  storage*.
- **Upgrading** = deploying a new implementation contract and telling the
  proxy to point at it. The address, the balances, the stakes — everything —
  stays exactly where it was. Only the code changes.

This repo uses [OpenZeppelin's upgradeable-contracts framework]
(https://docs.openzeppelin.com/upgrades-plugins/) (the
`@openzeppelin/hardhat-upgrades` Hardhat plugin), which manages all of this
for us: `upgrades.deployProxy(...)` deploys implementation + proxy together,
and `upgrades.upgradeProxy(...)` deploys a new implementation and re-points
the existing proxy.

> **Naming caution:** in this codebase the word "proxy" is used for two
> different things. The *upgradeability proxy* described above (every
> deployed contract has one), and **`UTTProxy.sol`**, which is the
> *cross-chain satellite contract* deployed on secondary chains (Base,
> Optimism, …) that forwards user actions to the main UTT contract via a
> Chainlink oracle. `UTTProxy` is itself deployed behind an upgradeability
> proxy too. This document says "implementation" and "proxy address" for the
> upgrade mechanics, and "UTTProxy" for the cross-chain contract.

### How can we ADD state if the proxy never changes? (storage slots)

An obvious puzzle: the proxy holds all the state, the proxy is immutable —
so how did this branch add new state variables like `D_d` and `D_min`?

The answer is that the proxy's storage was never a fixed schema in the first
place. Every contract on the EVM — the proxy included — has a storage space
of 2²⁵⁶ numbered **slots**, each 32 bytes wide, and **all of them implicitly
exist from day one, initialized to zero**. The proxy isn't deployed with
"room for exactly 12 variables"; it's deployed with an effectively infinite,
empty grid of slots.

Crucially, the proxy's own code knows nothing about `totalStake` or `D_d`.
The *meaning* of each slot is defined entirely by the **implementation's**
code. When Solidity compiles `Endorsement.sol`, it assigns each declared
variable a slot number by position: first variable → slot 0, second →
slot 1, and so on. When a call arrives at the proxy and is `delegatecall`ed
to the implementation, the implementation's code runs statements like "read
slot 7" against the proxy's storage.

So "adding state" doesn't modify the proxy at all. The new implementation
simply contains code that reads and writes **slots that were always there
but were never touched before** — slots still holding their default zero
value. A previously-meaningless slot just acquires a meaning.

Concretely, on this branch, `Endorsement.sol`'s layout went from:

```
slot N          : D_o
slot N+1 … N+49 : uint256[49] __gap      ← 49 reserved, never-written slots
slot N+50       : (first variable of the next contract in the chain)
```

to:

```
slot N          : D_o
slot N+1        : D_d      ← was __gap[0], always zero until now
slot N+2        : D_min    ← was __gap[1], always zero until now
slot N+3 … N+49 : uint256[47] __gap
slot N+50       : (next contract's first variable — UNCHANGED position)
```

The two new variables took over the first two gap slots, and the gap shrank
from 49 to 47 so everything *after* it keeps the same slot numbers. From the
proxy's perspective nothing happened — two slots that used to be ignored
zeros are now read as `D_d` and `D_min`.

Two consequences follow directly from this picture:

1. **New state always starts at zero.** The slot existed all along holding
   `0`, and no initializer runs on upgrade to change that (rule 4 below).
   This is exactly why the post-upgrade checklist requires calling
   `setD_d(5)` and `setD_min(50)`: the `D_d = 5;` line in
   `__endorsement_init` only ever runs on a *fresh* deployment.

2. **You can only append, never rearrange.** The danger is never "the proxy
   runs out of room" — it's that a new implementation assigns a *different
   meaning to an already-used slot*. If `D_d` had been inserted *above*
   `D_o` instead of taking a gap slot, the new code would read the old
   `D_o` value (5000) as `D_d`, and every variable below would shift and be
   garbage. That is the corruption that rules 1–2 below, and the
   OpenZeppelin plugin's layout check, exist to prevent.

### The rules that make upgrades safe

The proxy pattern comes with strict rules. Breaking them silently corrupts
live user data, so understand these before touching contract code:

1. **Never reorder, remove, or retype existing storage variables.**
   The proxy's storage is just a numbered list of slots. The old
   implementation wrote "totalStake at slot 7"; if your new implementation
   thinks slot 7 is something else, every existing balance is garbage. New
   variables may only be *appended*.

2. **Storage gaps (`__gap`).** Each of our base contracts (e.g.
   `Endorsement.sol`) ends with a reserved array like
   `uint256[47] private __gap;`. This pre-books empty slots so a base
   contract can add variables later without shifting the slots of everything
   inheriting from it. **Every time you add a state variable to a contract,
   you must shrink its gap by the same number of slots.** Example from this
   branch: `Endorsement.sol` added `D_d` and `D_min` (2 slots), so its gap
   went from `uint256[49]` to `uint256[47]`.

3. **No constructors — use initializers.** A constructor would run in the
   implementation's own (unused) storage, not the proxy's. Upgradeable
   contracts instead have an `initialize(...)` function that runs once,
   through the proxy, at first deployment.

4. **Initializers do NOT re-run on upgrade.** This is the one that bites
   people. If a new version adds a variable with a "default" set in the
   initializer, an *upgraded* deployment never executes that line — the
   variable is simply `0`. That's why new parameters need owner setters, and
   why the post-upgrade checklist below includes calling them. (Concretely on
   this branch: after upgrading, `D_d` and `D_min` are **0**, and
   `D_d == 0` would make `_disapprove` divide by zero.)

5. **Keep old entry points alive during transitions.** Other deployed systems
   (the Chainlink node, old UTTProxy versions, in-flight oracle requests)
   still call old function selectors during the rollout window. This branch
   keeps `proxyEndorse`, `fulfillEndorse`, and `UTTProxy.fulfill` as
   documented backwards-compatibility shims for exactly this reason.

The OpenZeppelin plugin enforces rule 1 and 3 automatically: it records every
deployment's storage layout in the `.openzeppelin/<network>.json` manifest
files (checked into this repo — one per network) and **refuses to upgrade**
if the new layout is incompatible. Treat those manifest files as precious;
without them the plugin can't validate your upgrade.

### Who is allowed to upgrade?

The proxies are administered by the deployer account (the one whose key is in
`.env` as `<NETWORK>_PRIVATE_KEY`). Only that account can execute an upgrade.
The same account is typically the contract `owner`, needed for post-upgrade
setter calls like `setD_min` or `setActionJobId`.

---

## Part 2: The upgrade workflow in this repo

### Prerequisites

```bash
npm install
cp .env.example .env    # then fill in node URLs, private keys, explorer API keys
```

Networks are defined in `hardhat.config.ts` (`testnet_polygon` = Polygon
Amoy, `testnet_base` = Base Sepolia, `polygon`, `base`, `optimism`, etc.).
Every command below takes `--network <name>`.

### The scripts

| Command | What it does |
|---|---|
| `npm run build` | Compile contracts |
| `npm test` | Run the full test suite on a local in-memory chain |
| `npm run deploy -- --network <net>` | Fresh deploy of the main UTT contract (implementation + proxy) |
| `npm run deploy:proxy -- --network <net>` | Fresh deploy of the cross-chain `UTTProxy` |
| `npm run upgrade -- --network <net>` | **Upgrade** the main UTT: deploys new implementation, re-points existing proxy |
| `npm run upgrade:proxy -- --network <net>` | **Upgrade** an existing `UTTProxy` |
| `npm run verify -- --network <net> <address>` | Verify source code on the block explorer |

The upgrade scripts read the *existing proxy address* from a per-network args
file: `scripts/upgrade.args.<network>.js` for the main contract and
`scripts/upgrade.proxy.args.<network>.js` for UTTProxy. For example, this
branch added `scripts/upgrade.args.testnet_polygon.js` containing the Amoy
UTT proxy address. **To upgrade on a network, that file must exist and hold
the right address.**

`scripts/upgrade.ts` then does the whole dance in one call:

```js
const utt = await upgrades.upgradeProxy(contractAddress, UTT);
// prints the (unchanged) proxy address and the NEW implementation address
```

The printed implementation address is what you pass to `npm run verify` so
the explorer shows the new source.

### Step-by-step: performing an upgrade

1. **Compile and test locally**: `npm run build && npm test`.
2. **Check the args file** for your target network exists and contains the
   deployed proxy address (double-check against the explorer / the
   `.openzeppelin/<network>.json` manifest).
3. **Dry-run on a testnet first** (see Part 3) — always Amoy/Base Sepolia
   before Polygon/Base mainnet.
4. **Run the upgrade**:
   `npm run upgrade -- --network testnet_polygon`
   The OpenZeppelin plugin validates storage-layout compatibility against the
   manifest and aborts if anything is unsafe.
5. **Verify the new implementation** on the explorer:
   `npm run verify -- --network testnet_polygon <implementation address>`
6. **Run the post-upgrade configuration** (see checklist below — an upgrade
   is not finished when the transaction confirms).
7. **Smoke-test** with the hardhat tasks (`endorse`, `disapprove`,
   `withdraw-stake`) against the live proxy address.

### Post-upgrade checklist for THIS branch's changes

Because initializers don't re-run (rule 4 above), upgrading an existing
deployment to this branch's code requires these follow-up transactions:

**On the main UTT contract (e.g. Polygon/Amoy):**

- [ ] `setD_d(5)` — penalty divisor. **Mandatory**: it is `0` after upgrade
      and disapproval fulfillment would revert on division by zero.
- [ ] `setD_min(50)` — minimum disapproval fee. Also `0` after upgrade,
      which would allow free-ish griefing disapprovals.
- [ ] Confirm the Chainlink node's oracle address still holds
      `PROXY_ENDORSER_ROLE` (roles live in proxy storage, so they survive the
      upgrade — just confirm, don't re-grant blindly).

**On each UTTProxy (Base, Optimism, …):**

- [ ] `npx hardhat set-action-job-id --network <net> --proxyaddress <addr>
      --jobid <externalJobID>` — the new unified action job id. Until this is
      set, *all* proxy actions (including plain endorse!) revert with
      `"Action job ID not configured"`. This is deliberate fail-fast design,
      but it means the proxy is down for endorsements between the upgrade and
      this call — do them back-to-back.

**On the Chainlink node:**

- [ ] Create the `utt-proxy-action` job from
      `chainlink-node/jobs/network-specific/utt-proxy-action.toml.template`,
      with the network's values file providing
      `__PROXY_JOB_VALUE_UTT_PROXY_ACTION_EXTERNAL_JOB_ID`. Job ids are
      already minted for Base and Optimism. Aurora and Lisk are intentionally
      excluded because support for those networks has been removed.
- [ ] Keep the old `utt-proxy-endorse` job running during the transition so
      legacy proxies and in-flight requests complete; retire it once all
      proxies are upgraded and configured.

---

## Part 3: Testing the changes on this branch

Test in three widening circles: unit tests → local chain → testnet. Only
after all three pass should mainnet be touched.

### Level 1: Unit tests (free, seconds)

```bash
npm test
```

This runs everything on Hardhat's in-memory chain with a **mock Chainlink
operator** (`test/UTT.fixture.ts` deploys it), so the full oracle round-trip
— request event, off-chain "answer", fulfillment callback — is simulated
without any real node. The suites relevant to this branch:

- `test/Disapproval.test.ts` — burn/fee behaviour, `D_min` enforcement,
  level-1/level-2 penalty math (`computeReward / D_d`), the no-underflow
  clamp, `proxyAction` role checks, migration blocking, `setD_d`/`setD_min`
  governance.
- `test/UTT.test.ts` ("Stake withdrawal" describe block) — partial/full
  withdrawal, error cases, no reward events, pause/migration blocking.
- `test/WithdrawStake.test.ts` — the cross-chain path via
  `proxyAction(..., WITHDRAW_STAKE)`.
- `test/UTTProxy.test.ts` — proxy emits `ChainlinkRequested` once
  `actionJobId` is set, and reverts clearly when it isn't.

Run a single suite while iterating:

```bash
npx hardhat test test/Disapproval.test.ts
```

**Upgrade-safety tests.** `test/UTT.test.ts` also contains upgrade tests that
deploy the contract, upgrade it in-place to generated `TestUpgraded*`
variants (see `contracts/test/` and
`npm run generate-upgraded-test-contracts`), and then mutate variables that
sit *after* every `__gap` in the inheritance chain. If someone adds a storage
variable without shrinking the corresponding gap, these tests fail. Since
this branch touched three gaps (`Endorsement`, `UTTProxy`,
`TestUpgradedEndorsement`), make sure this section passes.

### Level 2: Local Hardhat node (free, minutes)

For interactive poking beyond the test suite:

```bash
npm start                      # terminal 1: local chain at localhost:8545
npm run deploy -- --network localhost    # terminal 2
```

Then exercise the new user-facing methods with the hardhat tasks added on
this branch:

```bash
npx hardhat endorse        --network localhost --uttaddress <UTT> --targetaddress <T> --amount 100
npx hardhat withdraw-stake --network localhost --uttaddress <UTT> --targetaddress <T> --amount 40
npx hardhat disapprove     --network localhost --uttaddress <UTT> --targetaddress <T> --amount 50
```

Note: on a local node with no Chainlink node, `endorse` and `disapprove` only
get as far as *emitting the oracle request* — the penalty/reward logic runs
on fulfillment, which nothing will deliver. `withdraw-stake` is atomic and
completes fully. For full round-trips locally you'd run the dockerised
Chainlink node (`chainlink-node/docker-compose.yml`); in practice the mock
operator in the unit tests covers this better.

### Testing the upgrade itself: do we need to deploy the OLD version first?

A common question: to test an upgrade, must we first deploy the pre-change
contract to a testnet and then upgrade it? Usually **no** — the old version
is typically *already deployed*, and that existing deployment is the best
possible test subject. Three options, in order of preference:

#### Option 1: Upgrade the existing testnet deployment (the usual case)

The pre-change UTT is already live on Polygon Amoy — that is why
`scripts/upgrade.args.testnet_polygon.js` holds the Amoy proxy address and
why `.openzeppelin/unknown-80002.json` (Amoy's manifest) is in the repo.
That deployment *is* "a version of the contract before the changes," and it
carries accumulated real state: balances, stakes, granted roles, past
endorsements. Upgrading it tests the one thing that matters — that the new
code lands on top of genuine old state without corrupting it. A fresh deploy
of the old code would give an *emptier*, less realistic test than what is
already sitting there. This is what the Level 3 walkthrough below does.

#### Option 2: Fork the live network locally (free rehearsal, nothing deployed)

To rehearse before touching even the testnet — or to rehearse the *mainnet*
upgrade specifically — Hardhat can fork a live chain in memory:

```bash
npx hardhat node --fork $POLYGON_URL        # local chain mirroring mainnet state
npm run upgrade -- --network localhost      # args file pointing at the real proxy address
```

The fork contains the actual deployed proxy with its actual production
storage. You can run the upgrade, call `setD_d`/`setD_min`, and poke
`disapprove`/`withdrawStake` against real state, locally and for free. You
will need to impersonate the owner account
(`hardhat_impersonateAccount`) since the real key isn't pointed at
localhost — fine for a dry-run.

#### Option 3: Deploy the old code fresh, then upgrade (virgin networks only)

Only when targeting a network with no prior deployment (or when you want a
disposable sandbox that won't disturb the shared Amoy instance) do the
two-step dance:

1. Check out the pre-change code — cleanest with a worktree so you don't
   juggle branch switches: `git worktree add ../utt-main main`
2. From that checkout: `npm run deploy -- --network testnet_polygon`
   (fresh proxy + old implementation).
3. **Seed some state** — a few endorsements, grant `PROXY_ENDORSER_ROLE`,
   etc. Upgrading an empty contract proves very little; the point is
   verifying old state survives.
4. Copy the new entry the deploy wrote into
   `.openzeppelin/<network>.json` over to your branch checkout, and put the
   new proxy address in `upgrade.args.<network>.js`. **This manifest handoff
   is the step people trip over** — the plugin refuses to upgrade a proxy it
   has no layout record for (or requires `forceImport`), so the deploy-time
   manifest entry must travel with you to the branch checkout.
5. From the branch checkout, run the upgrade and the post-upgrade checklist,
   then verify the seeded state is intact and the new methods work.

### Level 3: Testnet dry-run of the actual upgrade (cheap, hours)

This is the important one for an upgrade branch, because it tests the thing
unit tests can't: **upgrading a really-deployed, state-carrying proxy**, with
a real Chainlink node in the loop. The testnet topology mirrors production:
main UTT on **Polygon Amoy** (`testnet_polygon`), UTTProxies on **Base
Sepolia** (`testnet_base`) and **Optimism Sepolia** (`testnet_optimism`).

1. **Fund the deployer** with testnet gas tokens (Amoy POL, Base/OP Sepolia
   ETH — from public faucets) and make sure the oracle operator has testnet
   LINK where needed.

2. **Upgrade the main contract on Amoy** (args file
   `scripts/upgrade.args.testnet_polygon.js` was added on this branch):

   ```bash
   npm run upgrade -- --network testnet_polygon
   npm run verify  -- --network testnet_polygon <printed implementation address>
   ```

   The upgrade preserves all existing Amoy state — balances, stakes, roles —
   which is exactly what you want to verify survives.

3. **Set the new parameters** (they are 0 after the upgrade — see Part 2):
   call `setD_d(5)` and `setD_min(50)` as the owner (via a console/explorer
   write call or a small script).

4. **Upgrade the UTTProxy on Base Sepolia / OP Sepolia**:

   ```bash
   npm run upgrade:proxy -- --network testnet_base
   ```

   (Requires `scripts/upgrade.proxy.args.testnet_base.js` with the deployed
   UTTProxy address — add it if missing, following the existing
   `upgrade.proxy.args.*.js` files.)

5. **Create the Chainlink job** on the testnet node from
   `utt-proxy-action.toml.template`. The external job ids for Base Sepolia
   (`a9ffd71b7f674f14bc71f78063204450`) and OP Sepolia
   (`318c8baf-0670-4465-8e98-9266895105be`) are already minted in
   `chainlink-node/jobs/network-specific/values-11155111/`.

6. **Point the proxy at the job**:

   ```bash
   npx hardhat set-action-job-id --network testnet_base \
     --proxyaddress <UTTProxy> --jobid a9ffd71b7f674f14bc71f78063204450
   ```

7. **End-to-end smoke tests** — the real point of the exercise. On Base
   Sepolia, run each action against the UTTProxy address and then check the
   result *on Amoy* (events on the main UTT contract, updated stakes):

   ```bash
   # same-chain sanity on Amoy first (direct, no oracle for withdraw):
   npx hardhat endorse        --network testnet_polygon --uttaddress <UTT> --targetaddress <T> --amount 100
   npx hardhat withdraw-stake --network testnet_polygon --uttaddress <UTT> --targetaddress <T> --amount 40
   npx hardhat disapprove     --network testnet_polygon --uttaddress <UTT> --targetaddress <T> --amount 50

   # then cross-chain through the proxy:
   npx hardhat endorse        --network testnet_base --uttaddress <UTTProxy> --targetaddress <T> --amount 100
   npx hardhat disapprove     --network testnet_base --uttaddress <UTTProxy> --targetaddress <T> --amount 50
   npx hardhat withdraw-stake --network testnet_base --uttaddress <UTTProxy> --targetaddress <T> --amount 40
   ```

   What to check after each cross-chain call:
   - The Chainlink dashboard shows the `UTT Proxy Action` job run, with the
     `actionType=<n>` memo in the run graph (0=endorse, 1=disapprove,
     2=withdraw).
   - On Amoy: `Endorse` / `Disapprove` / `WithdrawStake` events on the main
     UTT, penalty events (`PenalisePreviousEndorserLevel1/2`) where previous
     endorsers exist, and stake mappings updated
     (`getPreviousEndorserStakes`, `totalStake`).
   - Error paths: a disapprove below `D_min` through the proxy should show a
     *failed* job run (the job template uses `failOnRevert="true"`), and a
     proxy call before step 6 should revert with
     `"Action job ID not configured"`.
   - Legacy compatibility: a not-yet-upgraded proxy on another testnet should
     still endorse fine through the old `utt-proxy-endorse` job and the
     `proxyEndorse` shim.

8. **Only then**: repeat the same sequence, in the same order, on mainnet
   (Polygon main contract first, then each proxy chain + its job + its
   `set-action-job-id`, one chain at a time).

### If something goes wrong

- **The upgrade transaction itself failed / was rejected by the plugin**:
  nothing changed on-chain; fix the storage-layout complaint and retry.
- **The upgrade succeeded but behaviour is wrong**: the fastest rollback is
  another upgrade — re-point the proxy at the previous (still deployed)
  implementation, whose address is in `.openzeppelin/<network>.json`. State
  written by the bad version stays, so assess that before and after.
- **Proxy actions failing on a secondary chain**: check, in order:
  `actionJobId` set? Chainlink job created with the matching `externalJobID`?
  Oracle operator address correct and funded? Job run visible in the
  dashboard, and if it reverted, what the main-chain revert reason was.

---

## Quick reference

```bash
npm test                                          # full suite incl. upgrade-safety tests
npm run upgrade -- --network testnet_polygon      # upgrade main UTT (Amoy)
npm run upgrade:proxy -- --network testnet_base   # upgrade UTTProxy (Base Sepolia)
npm run verify -- --network <net> <impl-address>  # explorer verification
npx hardhat set-action-job-id --network <net> --proxyaddress <a> --jobid <id>
npx hardhat disapprove/withdraw-stake/endorse --network <net> --uttaddress <a> ...
```

Related reading: `docs/review_branch_33_disapprove.md` (what changed on this
branch and why), `docs/stake-withdrawal.md` (original stake-withdrawal brief),
`chainlink-node/README.md` if present, and the OpenZeppelin upgrades docs at
https://docs.openzeppelin.com/upgrades-plugins/.
