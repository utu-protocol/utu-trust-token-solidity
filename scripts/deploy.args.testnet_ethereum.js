const { ethers } = require("hardhat");

module.exports = [
  10000, // test value
  "0x9F0E25966DdCEa17524CED8bC8Fe2C78a29B5cAA", // testnet_ethereum oracle
  "0eec7e1dd0d2476ca1a872dfb6633f48", // testnet_ethereum job id
  ethers.parseEther("0.001"), // testnet_ethereum fee
  "0x779877A7B0D9E8603169DdbD7836e478b4624789", // testnet_ethereum link token address
];
