const { ethers } = require("hardhat");

module.exports = [
  0, // test value
  "0x6934c1F62a6d28a573E2b4071a754DDd29B81E54", // testnet_polygon oracle
  "0eec7e1dd0d2476ca1a872dfb6633f48", // testnet_polygon job id
  ethers.utils.parseEther("0.0001"), // testnet_polygon fee
  "0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904", // testnet_polygon link token address
];
