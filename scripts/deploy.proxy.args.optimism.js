const { ethers } = require("hardhat");

module.exports = [
  "0x68d806F671dcBdaF0bB7f4E836EE2dFe30Ba131C", // oracle operator
  "18cb4a46-518e-48c9-b753-446386b16bac", // job id for UTT Proxy Endorse
  ethers.utils.parseEther("0.0001"), // operator LINK fee
  "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6", // link token address
  "cdf5d5ac-b468-435e-a51a-d2798e80f15e", // job id for UTT Proxy Claim Rewards
];
