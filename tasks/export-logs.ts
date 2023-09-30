// const { ethers, network } = require("hardhat");
import { task, types } from "hardhat/config";
import fs from "fs";

task("export-logs", "Exports logs from a contract")
  .addParam("address", "The address of the contract")
  .addOptionalParam("fromBlock", "The block to start from", 0, types.int)
  .addOptionalParam(
    "toBlock",
    "The block to end at; if not given, up to the latest mined block at runtime",
    null,
    types.int
  )
  .setAction(async function (taskArguments: any, { ethers, network }: any) {
    const { provider } = ethers;
    const UTT = await ethers.getContractAt("UTT", taskArguments.address);
    const maxBlock = taskArguments.toBlock || (await provider.getBlockNumber());
    const batchSize = 10000 - 1;
    const minBlock = taskArguments.fromBlock;
    console.log("min-block:", minBlock, "max-block:", maxBlock);
    const data = [];

    for (let i = minBlock; i <= maxBlock; i += batchSize) {
      const y = i + batchSize;
      const res = await UTT.queryFilter({}, i, y);
      data.push(...res);
      console.log(
        "current min-block:",
        i,
        "current max-block:",
        y,
        "==>",
        "logs found:",
        res.length
      );
    }
    const timestamp = new Date().getTime();
    const filename = `${network.name}-utt-data-${timestamp}`;
    await createFile(data, filename);
  });

export const createFile = async (
  data: any,
  name: string,
  extension: string = "json"
) => {
  return new Promise((resolve, reject) => {
    const currentFolder = process.cwd();
    const folderName = `${currentFolder}/exports`;
    console.log(folderName);
    const filename = `${folderName}/${name}.${extension}`;
    if (!fs.existsSync(folderName)) {
      // Create the folder.
      fs.mkdirSync(folderName);
    }
    fs.writeFile(filename, JSON.stringify(data), (err: any) => {
      if (err) reject(err);
      console.log(`File ${filename} created successfully`);
      resolve(true);
    });
  });
};
