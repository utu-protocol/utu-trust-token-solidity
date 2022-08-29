const { ethers } = require("hardhat");

module.exports = [
  0, // initial account tokens
  "0x6aeb4210F87dC1fC22979C286258f26EcF7a1247", // matic oracle
  "4fc482a2-8ca3-477b-928f-ca21655378de", // matic job id
  ethers.utils.parseEther("0.000001"), // matic fee
  "0xb0897686c545045afc77cf20ec7a532e3120e0f1", // matic link token address
];
