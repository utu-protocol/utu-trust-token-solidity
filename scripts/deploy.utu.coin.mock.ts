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

  const deployArgs = require(`./deploy.utu.coin.mock.args`);  
  const utuCoin = await UTUCoin.deploy.apply(UTUCoin, deployArgs);

  await utuCoin.waitForDeployment();
  const utuCoinAddress = await utuCoin.getAddress();

  console.log("UTU Coin deployed to:", utuCoinAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployUTUCoin().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
