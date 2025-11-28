// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat

// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");

async function deployLinkToken() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const LinkToken = await ethers.getContractFactory("Link");

  const linkToken = await LinkToken.deploy.apply(LinkToken);

  await linkToken.waitForDeployment();
  const linkTokenAddress = await linkToken.getAddress();

  console.log("Link Token deployed to:", linkTokenAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployLinkToken().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
