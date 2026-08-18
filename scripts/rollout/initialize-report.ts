import { requireEnv, updateRolloutReport } from "./common";

async function main(): Promise<void> {
  await updateRolloutReport({
    schemaVersion: 1,
    rollout: "UTU cross-chain testnet rollout",
    mode: requireEnv("ROLLOUT_EXECUTE") === "true" ? "execute" : "read-only",
    phase: requireEnv("ROLLOUT_PHASE"),
    startedAt: requireEnv("ROLLOUT_STARTED_AT"),
    git: {
      commit: requireEnv("ROLLOUT_GIT_COMMIT"),
      branch: requireEnv("ROLLOUT_GIT_BRANCH"),
      dirty: requireEnv("ROLLOUT_GIT_DIRTY") === "true",
    },
    status: "started",
    error: null,
    failedAt: null,
    completedAt: null,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
