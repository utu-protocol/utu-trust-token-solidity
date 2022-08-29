const { ethers } = require("hardhat");

module.exports = [
	1000000, // test value
	"0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f", // mumbai oracle
	"0eec7e1dd0d2476ca1a872dfb6633f48", // mumbai job id
	ethers.utils.parseEther("0.000001"), // mumbai fee
	"0x326C977E6efc84E512bB9C30f76E30c160eD06FB" // mumbai link token address
]
