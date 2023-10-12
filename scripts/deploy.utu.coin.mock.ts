// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat

// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");

async function deployUTUCoin() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const UTUCoin = await ethers.getContractFactory("UTUCoinMock");
  //   const deployArgs = require(`./deploy.proxy.args.${network.name}`);
  const signer = await ethers.getSigner();

  const utuCoin = await UTUCoin.deploy.apply(UTUCoin, [
    signer.address,
    ethers.utils.parseEther("1000000000"),
  ]);

  await utuCoin.deployed();

  console.log("UTU Coin deployed to:", utuCoin.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployUTUCoin().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
