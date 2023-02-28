const { ethers } = require("hardhat");

module.exports = [
	"0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f", // aurora oracle
	"9opc5e1dd8d2476ca1a890dfb6656f34", // aurora job id
	ethers.utils.parseEther("0.0001"), // aurora testnet fee
	"0x326C977E6efc84E512bB9C30f76E30c160eD06FB" // aurora testnet link token address
]
