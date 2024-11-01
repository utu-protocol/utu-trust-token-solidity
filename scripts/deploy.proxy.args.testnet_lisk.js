const { ethers } = require("hardhat");


// value for proxy on optimism goerli testnet
module.exports = [
  "0xC3586558ddb1Cc6C7c5338691842b8d5F47D253d", //  oracle operator contract
  "30d3f168244f40788be35c05f6c5924f", // job id for UTT Proxy Endorse
  ethers.parseEther("0.0000001"), // operator LINK fee
  "0xE4aB69C077896252FAFBD49EFD26B5D171A32410", // link token address
  "2d3086720bcd4847bf088ffb976d9508", // job id for UTT Proxy Claim Rewards
];
