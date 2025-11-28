// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, network, upgrades } = require("hardhat");

async function upgradeUTT() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const UTT = await ethers.getContractFactory("UTT");
  const updagradeArgs = require(`./upgrade.args.${network.name}`);
  const contractAddress = updagradeArgs[0];
  const utt = await upgrades.upgradeProxy(contractAddress, UTT);

  await utt.waitForDeployment();
  const uttAddress = await utt.getAddress();

  console.log("UTT upgraded to:", uttAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
upgradeUTT().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
