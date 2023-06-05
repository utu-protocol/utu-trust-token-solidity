// const { ethers, network } = require("hardhat");
import { task } from "hardhat/config";
import fs from "fs";

task("export-logs", "Mints from the NFT contract")
  .addParam("address", "The address to receive a token")
  .setAction(async function (taskArguments: any, { ethers, network }: any) {
    const { provider } = ethers;
    const UTT = await ethers.getContractAt("UTT", taskArguments.address);
    const toBlock = await provider.getBlockNumber();
    const blockSize = 10000 - 1;
    const minBlock = 0;
    console.log("min-block:", minBlock, "max-block:", toBlock);
    const data = [];

    for (let i = minBlock; i < toBlock; i += blockSize) {
      const y = i + blockSize;
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
