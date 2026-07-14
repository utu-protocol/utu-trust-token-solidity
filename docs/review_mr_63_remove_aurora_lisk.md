# MR Review: !63 — Remove support for Aurora and Lisk

Reviewed: 2026-07-14
MR: https://gitlab.com/ututrust/utu-trust-token-solidity/-/merge_requests/63 (closes issue #65)
Branches: `65-remove-support-for-aurora-and-lisk` → `main`
Scope: `git diff main...65-remove-support-for-aurora-and-lisk` — 24 files, +9 / −3,476 lines.

## Summary

This MR is a pure infrastructure/configuration removal: it deletes all tooling,
configuration, and documentation for the Aurora and Lisk networks. **No
Solidity contracts are touched** — there are no storage-layout, upgrade-safety,
or on-chain behavioural implications for the remaining networks (Ethereum,
Polygon, Optimism, Base).

The removal is thorough and internally consistent. A whole-repo search
(excluding build artifacts) finds no dangling references to either network:
the only remaining mentions are two documentation notes that intentionally
record that Aurora and Lisk were excluded because support was removed.

What is removed, by area:

| Area | Files | Notes |
|------|-------|-------|
| Hardhat networks | `hardhat.config.ts` | `aurora`, `testnet_aurora`, `lisk`, `testnet_lisk` network entries, their etherscan API-key entries, and their `customChains` blocks |
| Deploy/upgrade args | `scripts/deploy.{operator,proxy}.args.{aurora,lisk,testnet_aurora,testnet_lisk}.js`, `scripts/upgrade.proxy.args.testnet_aurora.js` | 9 files |
| OpenZeppelin manifests | `.openzeppelin/unknown-{1135,1313161554,1313161555,4202}.json` | Aurora mainnet/testnet, Lisk mainnet/Sepolia (see caveat 1) |
| Chainlink node config | `chainlink-node/config/chainlink-config.toml.template`, `chainlink-node/.env.example` | Aurora and Lisk `[[EVM]]` blocks and their env vars (see caveat 2) |
| Chainlink job values | `chainlink-node/jobs/network-specific/values-{137,11155111}/{aurora,lisk,testnet_aurora,testnet_lisk}.sh` | 4 files with operator addresses and job ids (recoverable from git history) |
| Env examples | `.env.example` | `AURORA_URL`, `TESTNET_AURORA_URL`, `LISK_URL`, `TESTNET_LISK_URL` |
| Docs | `README.md`, `docs/review_branch_33_disapprove.md`, `docs/upgrade_contract_strategy.md` | Deployment-address sections removed; "job ids pending for Aurora/Lisk" notes replaced with "intentionally excluded" |

## Consistency checks performed

- **No dangling references**: `grep -riE 'aurora|lisk'` across the repo
  (excluding `node_modules`, build artifacts, and git history) matches only the
  intentional "support has been removed" notes in
  `docs/review_branch_33_disapprove.md` and `docs/upgrade_contract_strategy.md`.
- **Deploy scripts stay coherent**: `scripts/deploy.proxy.ts`,
  `scripts/deploy.operator.ts`, and `scripts/upgrade.proxy.ts` load their args
  files dynamically via `require('./….args.${network.name}')`. Since the
  aurora/lisk network names no longer exist in `hardhat.config.ts`, they can
  never be selected, so deleting their args files cannot break any reachable
  code path.
- **`customChains` cleanup**: removing the Lisk block in `hardhat.config.ts`
  also removed a stray sparse-array comma (`, ,`) that main carried after the
  `testnet_lisk` entry — a small correctness bonus.
- **Incidental fixes**: the README's job-ID guidelines paragraph had its
  typos fixed ("my share" → "may share", "migt" → "might") and its example
  re-based on Optimism/Base; `chainlink-config.toml.template` gained its
  missing trailing newline.

## Caveats / findings

Both findings are operational rather than code defects; neither blocks the
merge, but both deserve a conscious decision.

### 1. Deleted OpenZeppelin manifests track proxies that are still live on-chain (CONFIRMED)

The four deleted `.openzeppelin/unknown-*.json` manifests are the upgrade
plugin's record of the transparent proxies deployed on Aurora and Lisk — and
those proxies are still deployed and live (the removed README sections listed
their mainnet addresses, e.g. `0xaE53DcC6…` on Aurora and `0x3B2A3a6E…` on
Lisk). Removing the manifests does nothing on-chain, but if one of those live
proxies ever needs an emergency admin action or upgrade (e.g. a security fix
to pause the contract), `upgrades.upgradeProxy` will find no network manifest,
cannot validate storage-layout compatibility, and will abort (or deploy a
fresh, unlinked implementation). Recovery requires restoring the manifest from
git history — plus re-adding the network config — or running
`upgrades.forceImport`.

**Recommendation**: fine to merge as-is if the intent is that those
deployments are permanently abandoned; otherwise note in the MR/issue that
`git show main:.openzeppelin/unknown-<chainid>.json` is the recovery path.

### 2. Stale Aurora/Lisk jobs in an existing Chainlink node database (PLAUSIBLE)

`chainlink-node/entrypoint.sh` creates/re-creates jobs only from the generated
job files (`for job_file in /chainlink/jobs/*.toml; … jobs delete … jobs
create …`). It never deletes jobs that no longer have a generated file. An
existing node whose persistent Postgres volume still contains aurora/lisk
direct-request jobs will, after redeploying with the new config template, hold
jobs whose `evmChainID` (1313161554 / 1135 / 4202) is no longer configured.
Depending on the Chainlink version this makes those job services error at
startup ("no EVM chain with id …") and can degrade or crash-loop the node that
also serves the still-supported Optimism/Base/Polygon proxies, until the stale
jobs are removed manually via the Chainlink CLI/UI.

**Recommendation**: before (or immediately after) redeploying the oracle node
with this config, manually delete the Aurora and Lisk jobs from the node.

## Verdict

Approve, with the two operational caveats above communicated to whoever
operates the oracle node and holds the upgrade keys. The removal itself is
complete, leaves no dangling references, touches no contracts, and cannot
affect the remaining networks at the code level.

---

*Review method: manual diff walkthrough plus a multi-agent review (4
independent finder passes over the diff, each candidate finding independently
adversarially verified; 4 candidates → 2 survived verification, reported
above).*
