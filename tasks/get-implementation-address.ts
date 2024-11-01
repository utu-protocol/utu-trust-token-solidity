import { task, types } from "hardhat/config";

task(
  "get-implementation-address",
  "Gets the implementation address of an ERC-1967 upgradable proxy."
)
  .addParam("address", "The address of the ERC-1967 upgradable proxy contract")
  .setAction(async function (taskArguments: any, { ethers, network }: any) {

    const implementationAddress = await upgrades.erc1967.getImplementationAddress(taskArguments.address);
    console.log("Implementation at:", implementationAddress);
  });
