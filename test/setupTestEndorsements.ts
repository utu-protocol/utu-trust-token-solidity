// Script used to produce mock response from utu-trust-token-listener localhost:3000/api/endorsements to be used in
// utu-trust-api core integration tests:
// 1. Run npx hardhat node
// 2. Run this script with: npx hardhat --network localhost run test/setupTestEndorsements.js
// 3. Run utu-trust-token-listener on port 3000 for local hardhat test network (http://127.0.0.1:8545/) and contract
//        address 0x5fbdb2315678afecb367f032d93f642f64180aa3
// 4. Run curl localhost:3000/api/endorsements

import {BigNumber, Transaction} from "ethers";

const { ethers } = require("hardhat");

async function setupTestEndorsements() {
  const UTT = await ethers.getContractFactory("UTT");
  const utt = await UTT.deploy();

  const lastValue = "0.03";
  utt.on(utt.filters.Endorse(), (source: string, target: string, index: BigNumber, value: BigNumber, tx: Transaction) => {
    const formattedValue = ethers.utils.formatEther(value);
    console.log("Endorsed", target, "with", formattedValue)
    if(lastValue === formattedValue) process.exit(0);
  });

  // Create some endorsements on the (constant) hardhat testnet accounts:
  const endorsementResults = [];
  endorsementResults[0] = await utt.endorse("0x70997970c51812dc3a010c7d01b50e0d17dc79c8", ethers.utils.parseEther("0.01"), "000001");
  endorsementResults[1] = await utt.endorse("0x70997970c51812dc3a010c7d01b50e0d17dc79c8", ethers.utils.parseEther("0.02"), "000002");
  endorsementResults[2] = await utt.endorse("0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", ethers.utils.parseEther(lastValue), "000003");
  return endorsementResults;
}

//setupTestEndorsements().then(console.log);

