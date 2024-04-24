const { ethers } = require("hardhat");

module.exports = [
  "0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f", // polygon_testnet oracle
  "0eec7e1dd0d2476ca1a872dfb6633f48", // polygon_testnet job id
  ethers.utils.parseEther("0.0001"), // polygon_testnet fee
  "0x326C977E6efc84E512bB9C30f76E30c160eD06FB", // polygon_testnet link token address
];
