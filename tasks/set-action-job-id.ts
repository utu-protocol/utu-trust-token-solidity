import { task } from "hardhat/config";

import { normalizeExternalJobId } from "../scripts/rollout/job-id";

task(
  "set-action-job-id",
  "Set the unified action oracle job id (actionJobId) on a UTTProxy"
)
  .addParam("proxyaddress", "The address of the UTTProxy contract")
  .addParam("jobid", "The external job id of the utt-proxy-action Chainlink job")

  .setAction(async function (taskArguments: any, { ethers }: any) {
    console.log(taskArguments);
    const normalizedJobId = normalizeExternalJobId(taskArguments.jobid);
    const uttProxy = await ethers.getContractAt(
      "UTTProxy",
      taskArguments.proxyaddress
    );

    const transactionResponse = await uttProxy.setActionJobId(normalizedJobId);
    const receipt = await transactionResponse.wait();
    if (receipt === null) {
      throw new Error("setActionJobId transaction was not mined");
    }

    console.log(
      `setActionJobId completed. Transaction Hash: ${transactionResponse.hash}`
    );
  });
