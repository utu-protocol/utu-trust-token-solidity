import { task, types } from "hardhat/config";

task(
  "disapprove",
  "Make a disapproval"
)
  .addParam("uttaddress", "The address of the UTT (or UTTProxy) contract")
  .addParam("targetaddress", "The address of the target of the disapproval")
  .addParam("amount", "The amount of UTT to disapprove with (must be >= D_min)")
  .addOptionalParam("transactionId", "The transaction id of the disapproval", "", types.string)

  .setAction(async function (taskArguments: any, { ethers, network }: any) {
    console.log(taskArguments);
    const UTT = await ethers.getContractAt("UTT", taskArguments.uttaddress);

    try {
      const transactionResponse = await UTT.disapprove(
        taskArguments.targetaddress, taskArguments.amount, taskArguments.transactionId
      );
      console.log(`Disapproval completed. Transaction Hash: ${transactionResponse.hash}`);
    } catch (error) {
      console.error("Error during disapproval:", error);
      if (error.data && error.data.message) {
        console.error("Revert reason:", error.data.message);
      }
    }
  });
