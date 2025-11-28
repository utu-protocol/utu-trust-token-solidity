// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, network, upgrades } = require("hardhat");

async function upgradeUTTProxy() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const UTTProxy = await ethers.getContractFactory("UTTProxy");
  const updagradeArgs = require(`./upgrade.proxy.args.${network.name}`);
  const contractAddress = updagradeArgs[0];
  const uttProxy = await upgrades.upgradeProxy(contractAddress, UTTProxy);

  await uttProxy.waitForDeployment();
  const uttProxyAddress = await uttProxy.getAddress();

  console.log("UTTProxy upgraded to:", uttProxyAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
upgradeUTTProxy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
