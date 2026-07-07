import { task, types } from "hardhat/config";

task(
  "withdraw-stake",
  "Withdraw (reduce) a previously staked endorsement"
)
  .addParam("uttaddress", "The address of the UTT (or UTTProxy) contract")
  .addParam("targetaddress", "The previously endorsed target")
  .addParam("amount", "The amount of stake to withdraw")
  .addOptionalParam("transactionId", "The transaction id of the withdrawal", "", types.string)

  .setAction(async function (taskArguments: any, { ethers, network }: any) {
    console.log(taskArguments);
    const UTT = await ethers.getContractAt("UTT", taskArguments.uttaddress);

    try {
      const transactionResponse = await UTT.withdrawStake(
        taskArguments.targetaddress, taskArguments.amount, taskArguments.transactionId
      );
      console.log(`Stake withdrawal completed. Transaction Hash: ${transactionResponse.hash}`);
    } catch (error) {
      console.error("Error during stake withdrawal:", error);
      if (error.data && error.data.message) {
        console.error("Revert reason:", error.data.message);
      }
    }
  });
