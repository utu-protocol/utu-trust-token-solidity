import { updateRolloutReport } from "./common";

async function main(): Promise<void> {
  await updateRolloutReport({
    status: "completed",
    completedAt: new Date().toISOString(),
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
