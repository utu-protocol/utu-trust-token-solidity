const { ethers } = require("hardhat");


module.exports = [
  "0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f", // testnet_polygon oracle
  "0eec7e1dd0d2476ca1a872dfb6633f48", // testnet_polygon job id
  ethers.parseEther("0.0000001"), // testnet_polygon fee
  "0x326C977E6efc84E512bB9C30f76E30c160eD06FB", // testnet_polygon link token address
];
