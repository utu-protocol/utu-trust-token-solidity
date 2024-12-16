const { ethers } = require("hardhat");


// value for proxy on optimism goerli testnet
module.exports = [
  "0x68d806F671dcBdaF0bB7f4E836EE2dFe30Ba131C", //  oracle operator contract
  "4c489da76e08405b8cf521afc6a65cd5", // job id for UTT Proxy Endorse
  ethers.parseEther("0.0000001"), // operator LINK fee
  "0xB7dA7E0B8C1f82A647066C34eE2317A5AC6Adc09", // link token address
  "dd1d470112d74e1f847c499b57ca5495", // job id for UTT Proxy Claim Rewards
];
