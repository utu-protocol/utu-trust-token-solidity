// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const UTT = await ethers.getContractFactory("UTT");
  const utt = await UTT.deploy(
    ethers.utils.parseEther("1000000"), // test value
    "0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f", // mumbai oracle
    "0eec7e1dd0d2476ca1a872dfb6633f48", // mumbai job id
    ethers.utils.parseEther("0.01"), // mumbai fee
    "0x326C977E6efc84E512bB9C30f76E30c160eD06FB" // mumbai link token address
  );

  await utt.deployed();

  console.log("UTT deployed to:", utt.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
