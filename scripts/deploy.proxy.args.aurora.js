const { ethers } = require("hardhat");

module.exports = [
  "0x53b6B5477193cCEdF9457F42a1591759cE75A095", // aurora oracle operator
  "ce9c161d576e41598b5599f7e111c808", // aurora job id for UTT Proxy Endorse
  ethers.utils.parseEther("0.0001"), // operator LINK fee
  "0x94190d8ef039c670c6d6b9990142e0ce2a1e3178", // aurora mainnet link token address
  "d38e785276534600ba42401e4bad0156", // aurora job id for UTT Proxy Claim Rewards
];
