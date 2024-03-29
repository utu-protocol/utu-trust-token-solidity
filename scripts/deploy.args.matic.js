const { ethers } = require("hardhat");

module.exports = [
  0, // initial account tokens
  "0x73ac0B4ba4Fc1c42B8DFFA39f3E4E0e95eb9b8Fd", // matic oracle
  "0eec7e1dd0d2476ca1a872dfb6633f48", // matic job id
  ethers.utils.parseEther("0.0001"), // matic fee
  "0xb0897686c545045afc77cf20ec7a532e3120e0f1", // matic link token address
];
