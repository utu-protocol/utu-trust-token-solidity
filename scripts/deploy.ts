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
    "0x2be8C0Fe5BD0a6E40F3a62795fBe2A9B7da35038", // kovan oracle
    "0eec7e1dd0d2476ca1a872dfb6633f48", // kovan job id
    ethers.utils.parseEther("0.1"), // kovan fee
    "0x01be23585060835e02b77ef475b0cc51aa1e0709" // kovan link token address
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
