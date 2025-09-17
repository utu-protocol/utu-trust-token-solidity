const { ethers } = require("hardhat");


// value for proxy on base sepolia testnet
module.exports = [
  "0x1380FD912C44F3860D17EB6221F861F9c4611D97", //  oracle operator contract
  "89c86d27881e4854a61a87070363d7d7", // job id for UTT Proxy Endorse
  ethers.parseEther("0.0000001"), // operator LINK fee
  "0xE4aB69C077896252FAFBD49EFD26B5D171A32410", // link token address
  "6cdee6e7c62b43469926f7dc7bc8ffae", // job id for UTT Proxy Claim Rewards
];
