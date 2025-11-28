const { ethers } = require("hardhat");

const signerAddress = new ethers.Wallet(process.env.TEST_PRIVATE_KEY).address;

module.exports = [
    signerAddress,
    ethers.parseEther("1000000000"),
];
