const { ethers } = require("hardhat");


module.exports = [
  "0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f", // testnet_ethereum oracle
  "0eec7e1dd0d2476ca1a872dfb6633f48", // testnet_ethereum job id
  ethers.parseEther("0.0001"), // testnet_ethereum fee
  "0x779877A7B0D9E8603169DdbD7836e478b4624789", // testnet_ethereum link token address
];
