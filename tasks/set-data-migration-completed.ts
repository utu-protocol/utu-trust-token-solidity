import BigNumber from "bignumber.js";
import { task, types } from "hardhat/config";
import fs from "fs";

task(
  "set-data-migration-completed",
  "Calls setDataMigrationCompleted() on the given UTT contract"
)
  .addParam("address", "The address of the UTT contract")
  .setAction(async function (taskArguments: any, { ethers, network }: any) {
    console.log(taskArguments);
    const UTT = await ethers.getContractAt("UTT", taskArguments.address);

    const transactionResponse = await UTT.setDataMigrationCompleted();

    console.log(
      `Set data migration completed. Transaction Hash: ${transactionResponse.hash}`
    );
  });
