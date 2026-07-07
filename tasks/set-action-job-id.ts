import { task } from "hardhat/config";

task(
  "set-action-job-id",
  "Set the unified action oracle job id (actionJobId) on a UTTProxy"
)
  .addParam("proxyaddress", "The address of the UTTProxy contract")
  .addParam("jobid", "The external job id of the utt-proxy-action Chainlink job")

  .setAction(async function (taskArguments: any, { ethers, network }: any) {
    console.log(taskArguments);
    const uttProxy = await ethers.getContractAt("UTTProxy", taskArguments.proxyaddress);

    try {
      const transactionResponse = await uttProxy.setActionJobId(taskArguments.jobid);
      console.log(`setActionJobId completed. Transaction Hash: ${transactionResponse.hash}`);
    } catch (error) {
      console.error("Error during setActionJobId:", error);
      if (error.data && error.data.message) {
        console.error("Revert reason:", error.data.message);
      }
    }
  });
