const { ethers } = require("hardhat");

module.exports = [
  "0xbeF02f42F30b1233977DF88986DbB4D27D9c5b09", // aurora oracle
  "ce9c161d576e41598b5599f7e111c808", // aurora job id for UTT Proxy Endorse
  ethers.utils.parseEther("0.1"), // aurora testnet fee
  "0x6934c1F62a6d28a573E2b4071a754DDd29B81E54", // aurora testnet link token address
  "d38e785276534600ba42401e4bad0156", // aurora job id for UTT Proxy Claim Rewards
];
