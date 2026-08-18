// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { getUpgradeTransaction } from "./rollout/common";

const { ethers, network, upgrades } = require("hardhat");

async function upgradeUTTProxy() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const upgradeArgs = require(`./upgrade.proxy.args.${network.name}`);
  const contractAddress = upgradeArgs[0];

  if (
    typeof contractAddress !== "string" ||
    !ethers.isAddress(contractAddress) ||
    contractAddress === ethers.ZeroAddress
  ) {
    throw new Error(
      `Missing or invalid UTTProxy address in scripts/upgrade.proxy.args.${network.name}.js`
    );
  }

  const previousImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(contractAddress);
  const UTTProxy = await ethers.getContractFactory("UTTProxy");
  await upgrades.validateUpgrade(contractAddress, UTTProxy);
  const uttProxy = await upgrades.upgradeProxy(contractAddress, UTTProxy);

  const upgradeTransaction = getUpgradeTransaction(uttProxy, "UTTProxy");
  const receipt = await upgradeTransaction.wait();
  if (receipt === null || receipt.status !== 1) {
    throw new Error(
      `UTTProxy upgrade transaction failed: ${upgradeTransaction.hash}`
    );
  }

  const uttProxyAddress = await uttProxy.getAddress();
  const implementationAddress =
    await upgrades.erc1967.getImplementationAddress(uttProxyAddress);

  console.log("UTTProxy upgraded to:", uttProxyAddress);
  console.log("Previous implementation:", previousImplementationAddress);
  console.log("Implementation at:", implementationAddress);
  console.log("Upgrade transaction:", upgradeTransaction.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
upgradeUTTProxy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
