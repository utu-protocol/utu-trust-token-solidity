// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, network, upgrades } from "hardhat";

async function deployUTT() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  console.log("Getting UTT contract factory.");
  const UTT = await ethers.getContractFactory("UTT");
  const deployArgs = require(`./deploy.args.${network.name}`);
  const options = { timeout: 0 };

  console.log("Deploying upgradable proxy for UTT.");
  const utt = await upgrades.deployProxy(UTT, deployArgs, options);

  console.log("Waiting for utt to finish deploying.");
  await utt.waitForDeployment();
  const uttAddress = await utt.getAddress();

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(uttAddress);

  console.log("UTT deployed to:", uttAddress);
  console.log("Implementation at:", implementationAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployUTT().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
