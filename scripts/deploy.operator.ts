// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat

// Runtime Environment's members available in the global scope.
const { ethers, network } = require("hardhat");

async function deployOperator() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const UTUOperator = await ethers.getContractFactory("UTUOperator");
  const deployArgs = require(`./deploy.operator.args.${network.name}`);

  const utuOperator = await UTUOperator.deploy.apply(UTUOperator, deployArgs);

  await utuOperator.deployed();

  console.log("UTU Operator deployed to:", utuOperator.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployOperator().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
