const { ethers } = require("hardhat");

// value for proxy on optimism goerli testnet
module.exports = [
  "0x6934c1F62a6d28a573E2b4071a754DDd29B81E54", //  oracle operator contract
  "18cb4a46-518e-48c9-b753-446386b16bac", // job id for UTT Proxy Endorse
  ethers.utils.parseEther("0.0001"), // operator LINK fee
  "0xdc2CC710e42857672E7907CF474a69B63B93089f", // link token address
  "cdf5d5ac-b468-435e-a51a-d2798e80f15e", // job id for UTT Proxy Claim Rewards
];
