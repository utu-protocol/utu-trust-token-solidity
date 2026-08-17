#!/usr/bin/env bash

set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
readonly PROJECT_ROOT

phase="preflight"
execute="false"
allow_dirty="false"
report_path=""

usage() {
  cat <<'EOF'
Usage: npm run rollout:testnets -- [options]

Safely rolls out the unified action flow on Ethereum Sepolia, Base Sepolia,
and Optimism Sepolia. The default is a read-only preflight.

Options:
  --phase <preflight|deploy|canonical|proxies|e2e|all>
  --execute       Send testnet transactions after all preflight checks pass.
  --report <path> Write the JSON deployment record to this path.
  --allow-dirty   Permit execution from a dirty worktree (recorded in report).
  --help          Show this help.

Examples:
  npm run rollout:testnets
  npm run rollout:testnets -- --phase deploy --execute
  npm run rollout:testnets -- --phase e2e --execute
  npm run rollout:testnets -- --phase proxies --execute --report deployments/retry.json
EOF
}

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

on_error() {
  local exit_code=$?
  local failure_line="${BASH_LINENO[0]}"
  trap - ERR
  set +e
  if [[ -n "${report_path}" && -f "${report_path}" ]]; then
    ROLLOUT_FAILURE_EXIT_CODE="${exit_code}" \
      ROLLOUT_FAILURE_LINE="${failure_line}" \
      ./node_modules/.bin/ts-node --transpile-only \
      scripts/rollout/mark-report-failed.ts >/dev/null 2>&1
  fi
  printf '\nRollout stopped at line %s. No later phase was executed.\n' "${failure_line}" >&2
  if [[ -n "${report_path}" ]]; then
    printf 'Deployment record: %s\n' "${report_path}" >&2
  fi
  exit "${exit_code}"
}
trap on_error ERR

while (($# > 0)); do
  case "$1" in
    --phase)
      (($# >= 2)) || fail "--phase requires a value"
      phase="$2"
      shift 2
      ;;
    --execute)
      execute="true"
      shift
      ;;
    --report)
      (($# >= 2)) || fail "--report requires a path"
      report_path="$2"
      shift 2
      ;;
    --allow-dirty)
      allow_dirty="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

case "${phase}" in
  preflight|deploy|canonical|proxies|e2e|all) ;;
  *) fail "Unsupported phase '${phase}'" ;;
esac
if [[ "${phase}" == "preflight" && "${execute}" == "true" ]]; then
  fail "--execute cannot be combined with --phase preflight"
fi

cd "${PROJECT_ROOT}"

command -v node >/dev/null || fail "Node.js is required"
command -v npm >/dev/null || fail "npm is required"
command -v git >/dev/null || fail "git is required"

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[[ "${node_major}" == "20" ]] || fail "Node.js 20 is required; current version is $(node --version)"
[[ -d node_modules ]] || fail "node_modules is missing; run npm ci first"

started_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
readonly started_at
timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
readonly timestamp
if [[ -z "${report_path}" ]]; then
  report_path="${PROJECT_ROOT}/deployment-records/testnet-rollout-${timestamp}.json"
elif [[ "${report_path}" != /* ]]; then
  report_path="${PROJECT_ROOT}/${report_path}"
fi

git_commit="$(git rev-parse HEAD)"
git_branch="$(git branch --show-current)"
[[ -n "${git_branch}" ]] || git_branch="DETACHED_HEAD"
if [[ -n "$(git status --porcelain)" ]]; then
  git_dirty="true"
else
  git_dirty="false"
fi

if [[ "${execute}" == "true" && "${git_dirty}" == "true" && "${allow_dirty}" != "true" ]]; then
  fail "Execution requires a clean worktree. Commit/review the rollout code first, or use --allow-dirty deliberately."
fi

if [[ "${execute}" == "true" && "${phase}" != "preflight" ]]; then
  printf '%s\n' 'Operational prerequisite: stop new canonical and proxy action submissions, then allow known Chainlink requests to finish before continuing.'
  printf '%s\n' 'Pausing canonical UTT protects token state changes but does not prevent new oracle requests.'
  confirmation="${ROLLOUT_CONFIRMATION:-}"
  if [[ -t 0 ]]; then
    printf 'Type UPGRADE UTU TESTNETS to authorize testnet transactions: '
    read -r confirmation
  fi
  [[ "${confirmation}" == "UPGRADE UTU TESTNETS" ]] || fail "Testnet rollout confirmation was not provided"
fi

export ROLLOUT_EXECUTE="${execute}"
export ROLLOUT_PHASE="${phase}"
export ROLLOUT_REPORT_PATH="${report_path}"
export ROLLOUT_STARTED_AT="${started_at}"
export ROLLOUT_GIT_COMMIT="${git_commit}"
export ROLLOUT_GIT_BRANCH="${git_branch}"
export ROLLOUT_GIT_DIRTY="${git_dirty}"

if [[ "${execute}" == "true" ]]; then
  mode_label="EXECUTE"
else
  mode_label="READ ONLY"
fi

npx ts-node --transpile-only scripts/rollout/initialize-report.ts

printf '\nUTU testnet rollout\n'
printf '  phase: %s\n' "${phase}"
printf '  mode: %s\n' "${mode_label}"
printf '  commit: %s\n' "${git_commit}"
printf '  report: %s\n\n' "${report_path}"

run_quality_checks() {
  npm run build
  npm test
}

run_canonical() {
  local mode="$1"
  env ROLLOUT_EXECUTE="${mode}" npx hardhat run scripts/rollout/canonical-testnet.ts --network testnet_ethereum
}

run_proxy() {
  local network_name="$1"
  local mode="$2"
  env ROLLOUT_EXECUTE="${mode}" npx hardhat run scripts/rollout/proxy-testnet.ts --network "${network_name}"
}

run_e2e() {
  local network_name="$1"
  local mode="$2"
  env ROLLOUT_EXECUTE="${mode}" npx hardhat run scripts/rollout/testnet-e2e.ts --network "${network_name}"
}

run_quality_checks

case "${phase}" in
  preflight)
    run_canonical false
    run_proxy testnet_base false
    run_proxy testnet_optimism false
    ;;
  deploy)
    run_canonical false
    run_proxy testnet_base false
    run_proxy testnet_optimism false
    if [[ "${execute}" == "true" ]]; then
      run_canonical true
      run_proxy testnet_base true
      run_proxy testnet_optimism true
    fi
    ;;
  canonical)
    run_canonical "${execute}"
    ;;
  proxies)
    run_proxy testnet_base "${execute}"
    run_proxy testnet_optimism "${execute}"
    ;;
  e2e)
    run_e2e testnet_base "${execute}"
    run_e2e testnet_optimism "${execute}"
    ;;
  all)
    run_canonical false
    run_proxy testnet_base false
    run_proxy testnet_optimism false
    if [[ "${execute}" == "true" ]]; then
      run_canonical true
      run_proxy testnet_base true
      run_proxy testnet_optimism true
      run_e2e testnet_base true
      run_e2e testnet_optimism true
    fi
    ;;
esac

npx ts-node --transpile-only scripts/rollout/finalize-report.ts

printf '\nRollout phase completed successfully.\n'
printf 'Deployment record: %s\n' "${report_path}"
