const { ethers } = require("hardhat");


module.exports = [
  "0xC17985dfBF775aB5DAA9F9328423481d3Bb76f37", // aurora oracle operator
  "ce9c161d576e41598b5599f7e111c808", // aurora job id for UTT Proxy Endorse
  ethers.parseEther("0.0001"), // operator LINK fee
  "0x638D13D9a1c8854a3f5F94C705000B887208dF1f", // aurora mainnet link token address
  "d38e785276534600ba42401e4bad0156", // aurora job id for UTT Proxy Claim Rewards
];
