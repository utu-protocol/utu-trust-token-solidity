// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, network, upgrades } = require("hardhat");

async function deployProxy() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const UTTProxy = await ethers.getContractFactory("UTTProxy");
  const deployArgs = require(`./deploy.proxy.args.${network.name}`);
  const uttProxy = await upgrades.deployProxy(UTTProxy, deployArgs);
  console.log("waiting for uttProxy to deploy");
  await uttProxy.deployed();

  console.log("UTTProxy deployed to:", uttProxy.address);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployProxy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
