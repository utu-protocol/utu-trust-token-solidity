const { ethers } = require("hardhat");


module.exports = [
  10000, // test value
  "0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f", // testnet_base oracle
  "0eec7e1dd0d2476ca1a872dfb6633f48", // testnet_base job id
  ethers.parseEther("0.0001"), // testnet_base fee
  "0xE4aB69C077896252FAFBD49EFD26B5D171A32410", // testnet_base link token address
];
