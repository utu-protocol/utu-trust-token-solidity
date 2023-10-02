import BigNumber from "bignumber.js";
import { task, types } from "hardhat/config";
import fs from "fs";

task(
  "endorse",
  "Make an endorsement"
)
  .addParam("uttaddress", "The address of the UTT contract")
  .addParam("targetaddress", "The address of the target of the endorsement")
  .addParam("amount", "The amount of UTT to endorse with")
  .addOptionalParam("transactionId", "The transaction id of the endorsement", "", types.string)

  .setAction(async function (taskArguments: any, { ethers, network }: any) {
    console.log(taskArguments);
    const UTT = await ethers.getContractAt("UTT", taskArguments.uttaddress);

    const transactionResponse = await UTT.endorse(
      taskArguments.targetaddress, taskArguments.amount, taskArguments.transactionId);

    console.log(
      `Endorsement completed. Transaction Hash: ${transactionResponse.hash}`
    );
  });
