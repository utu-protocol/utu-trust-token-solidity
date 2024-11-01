const { ethers } = require("hardhat");


// value for proxy on optimism goerli testnet
module.exports = [
  "0xC3586558ddb1Cc6C7c5338691842b8d5F47D253d", //  oracle operator contract
  "18cb4a46518e48c9b753446386b16bac", // job id for UTT Proxy Endorse
  ethers.parseEther("0.0000001"), // operator LINK fee
  "0xE4aB69C077896252FAFBD49EFD26B5D171A32410", // link token address
  "cdf5d5acb468435ea51ad2798e80f15e", // job id for UTT Proxy Claim Rewards
];
