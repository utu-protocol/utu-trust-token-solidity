# Cross-Chain Testnet Rollout

## Scope

`npm run rollout:testnets` safely coordinates the testnet deployment sequence for:

1. Canonical UTT on Ethereum Sepolia.
2. UTTProxy on Base Sepolia.
3. UTTProxy on Optimism Sepolia.
4. Optional post-deployment `endorse`, `withdrawStake`, and `disapprove` checks through Chainlink.

The command cannot target Polygon, Base mainnet, or Optimism mainnet. Production rollout must use a separately reviewed runbook.

## Safety Model

The default mode is read-only. Transaction execution requires all of the following:

- `--execute`.
- A clean Git worktree, unless `--allow-dirty` is deliberately supplied.
- Interactive confirmation by typing `UPGRADE UTU TESTNETS`, or the same value in `ROLLOUT_CONFIRMATION` for a non-interactive run.
- Matching chain IDs, proxy addresses, contract bytecode, owners, ProxyAdmin owners, roles, job IDs, and balances.
- OpenZeppelin storage-layout validation against the deployed proxy.

No private key is printed or written to the deployment record.

## Prerequisites

Before execution:

1. Use Node.js 20 and run `npm ci`.
2. Review and commit the exact source revision to deploy.
3. Confirm with DevOps that the unified action jobs for Base Sepolia and Optimism Sepolia are running.
4. Obtain every Ethereum Sepolia destination wallet used by those jobs and set `TESTNET_CHAINLINK_NODE_ADDRESSES`.
5. Stop new canonical and proxy action submissions, then allow known Chainlink requests to finish before starting the rollout. Keep submissions stopped until all upgrades and configuration checks pass. Pausing canonical UTT protects token state changes, but does not prevent users from creating new oracle requests.
6. Fund owner and ProxyAdmin wallets with the relevant testnet native tokens.
7. Before E2E testing or proxy use, fund both UTTProxy contracts with enough test LINK for at least three requests.
8. Before E2E testing, fund canonical Ethereum Sepolia UTT with LINK and give the E2E account sufficient UTT.

Copy the rollout variables from `.env.example` into the local `.env`. Every testnet transaction uses `TEST_PRIVATE_KEY`; execution verifies its derived address against every required on-chain owner and role before sending anything. Read-only mode does not load a signer.

The E2E amounts are raw integer UTT units, exactly as accepted by the contracts and existing Hardhat action tasks; they are not human-formatted decimal values.

## Read-Only Preflight

```bash
nvm use 20
npm run rollout:testnets
```

This compiles the contracts, runs the complete test suite, validates all three upgrade paths, and creates a JSON preflight report without sending transactions.

## Deployment Execution

```bash
npm run rollout:testnets -- --phase deploy --execute
```

The script's only explicit transaction authorization is typing `UPGRADE UTU TESTNETS` (or setting
`ROLLOUT_CONFIRMATION` for a non-interactive run). The operational prerequisites above still need to be
confirmed by the team before execution.

The script performs these operations in order:

1. Pause canonical Ethereum Sepolia UTT.
2. Upgrade its implementation if the compiled runtime differs.
3. Set and verify `D_d = 5` and `D_min = 50`.
4. Grant `PROXY_ENDORSER_ROLE` to missing Chainlink destination wallets.
5. Unpause canonical UTT only after all canonical checks pass.
6. Block new Base Sepolia proxy actions, upgrade, set `actionJobId`, verify, and re-enable actions.
7. Repeat the proxy sequence for Optimism Sepolia.

Insufficient proxy LINK is reported during deployment but does not block contract upgrades. The proxies must be funded before E2E testing or live proxy actions.

## Post-Deployment E2E

After funding and deployment verification, run the cross-chain actions separately:

```bash
npm run rollout:testnets -- --phase e2e --execute
```

This sends each action from both proxy chains and waits for its matching canonical event. E2E uses `TEST_PRIVATE_KEY` as the action user and requires the target variable from `.env.example`, sufficient source-chain LINK, source-chain native gas, canonical UTT, and funded Chainlink destination wallets.

Use `--phase all --execute` only when deployment and E2E should run as one strict operation. In that mode, insufficient E2E funding blocks deployment before any rollout transaction is sent.

## Resuming Safely

Each phase can run independently:

```bash
npm run rollout:testnets -- --phase canonical --execute
npm run rollout:testnets -- --phase proxies --execute
npm run rollout:testnets -- --phase e2e --execute
```

If canonical configuration fails after the script pauses UTT, it deliberately leaves UTT paused. After investigating and fixing the failure, resume with:

```bash
export ROLLOUT_RESUME_PAUSED=true
npm run rollout:testnets -- --phase canonical --execute
```

If a proxy upgrade fails after enabling migration mode, it deliberately leaves that proxy blocked. Resume only after investigation:

```bash
export ROLLOUT_RESUME_MIGRATING=true
npm run rollout:testnets -- --phase proxies --execute
```

An implementation deployment can update a tracked `.openzeppelin/*.json` manifest before a later rollout step fails. Before resuming, inspect `git diff -- .openzeppelin`, review the recorded implementation address, and commit legitimate manifest changes so the clean-worktree guard can pass. Use `--allow-dirty` only after deliberately reviewing the exact diff.

Do not unpause or disable migration merely to make the script continue. Resolve the reported failed invariant first.

## Deployment Record

Every run writes a timestamped, Git-ignored local file under `deployment-records/`. Use `--report <path>` when an explicitly located record is needed. It contains:

- Git commit, branch, dirty status, timestamp, and execution mode.
- Proxy, ProxyAdmin, owner, Operator, LINK token, and Chainlink wallet addresses.
- Previous and resulting implementation addresses.
- Upgrade, configuration, role, source-action, and canonical-event transaction hashes.
- Installed action job IDs and final `D_d`/`D_min` values.
- Failure state and recovery context when a phase stops.

OpenZeppelin also updates the tracked `.openzeppelin/*.json` manifests when it deploys an implementation. Preserve and review those manifest changes together with the generated deployment record.
