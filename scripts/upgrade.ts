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

  const upgradeArgs = require(`./upgrade.args.${network.name}`);
  const contractAddress = upgradeArgs[0];
  if (
    typeof contractAddress !== "string" ||
    !ethers.isAddress(contractAddress) ||
    contractAddress === ethers.ZeroAddress
  ) {
    throw new Error(
      `Missing or invalid UTT proxy address in scripts/upgrade.args.${network.name}.js`
    );
  }

  const previousImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(contractAddress);
  const UTT = await ethers.getContractFactory("UTT");
  await upgrades.validateUpgrade(contractAddress, UTT);
  const utt = await upgrades.upgradeProxy(contractAddress, UTT);

  const upgradeTransaction = utt.deploymentTransaction();
  if (upgradeTransaction === null) {
    throw new Error("OpenZeppelin did not return the UTT upgrade transaction");
  }
  const receipt = await upgradeTransaction.wait();
  if (receipt === null || receipt.status !== 1) {
    throw new Error(`UTT upgrade transaction failed: ${upgradeTransaction.hash}`);
  }

  const uttAddress = await utt.getAddress();
  const implementationAddress =
    await upgrades.erc1967.getImplementationAddress(uttAddress);

  console.log("UTT upgraded to:", uttAddress);
  console.log("Previous implementation:", previousImplementationAddress);
  console.log("Implementation at:", implementationAddress);
  console.log("Upgrade transaction:", upgradeTransaction.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
upgradeUTT().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
