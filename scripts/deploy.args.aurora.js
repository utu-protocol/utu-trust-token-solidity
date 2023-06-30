const { ethers } = require("hardhat");

module.exports = [
  "0x08bC44B3d592f7F746F33E50Ab0433BbEf3f9071", // aurora oracle
  "ce9c161d576e41598b5599f7e111c808", // aurora job id
  ethers.utils.parseEther("0.1"), // aurora testnet fee
  "0x6934c1F62a6d28a573E2b4071a754DDd29B81E54", // aurora testnet link token address
];
