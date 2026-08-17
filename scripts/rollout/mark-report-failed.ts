import { requireEnv, updateRolloutReport } from "./common";

async function main(): Promise<void> {
  await updateRolloutReport({
    status: "failed",
    error: {
      exitCode: Number(requireEnv("ROLLOUT_FAILURE_EXIT_CODE")),
      shellLine: Number(requireEnv("ROLLOUT_FAILURE_LINE")),
    },
    failedAt: new Date().toISOString(),
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
