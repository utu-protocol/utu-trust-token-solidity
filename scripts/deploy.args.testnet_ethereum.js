const { ethers } = require("hardhat");

module.exports = [
  0, // test value
  "0x34d9297629323795CE29190159206cDD81e6B2d2", // testnet_polygon oracle
  "0x34d9297629323795CE29190159206cDD81e6B2d2", // testnet_polygon job id
  ethers.parseEther("0.001"), // testnet_polygon fee
  "0x34d9297629323795CE29190159206cDD81e6B2d2", // testnet_polygon link token address
];
