const { ethers } = require("hardhat");

module.exports = [
  0, // test value
  "0x0880633c47A2cba76Ef082e2bCD2103Af14c68EE", // testnet_ethereum oracle
  "0eec7e1dd0d2476ca1a872dfb6633f48", // testnet_ethereum job id
  ethers.parseEther("0.001"), // testnet_ethereum fee
  "0x779877A7B0D9E8603169DdbD7836e478b4624789", // testnet_ethereum link token address
];
