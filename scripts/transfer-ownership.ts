import { ethers, network } from "hardhat";

// ProxyAdmin deployed on Sepolia — controls upgrade rights for all transparent proxies
const PROXY_ADMIN_ADDRESS = "0x36db1ab0527efb234C263c70A7a125d02E43C9a8";

const NEW_OWNER = process.env.NEW_OWNER || "";

async function transferOwnership() {
  if (!NEW_OWNER || !ethers.isAddress(NEW_OWNER)) {
    throw new Error("Set NEW_OWNER env var to a valid Ethereum address");
  }

  const [signer] = await ethers.getSigners();
  console.log(`Network:     ${network.name}`);
  console.log(`Signer:      ${signer.address}`);
  console.log(`ProxyAdmin:  ${PROXY_ADMIN_ADDRESS}`);
  console.log(`New owner:   ${NEW_OWNER}`);

  const proxyAdmin = await ethers.getContractAt(
    ["function transferOwnership(address newOwner) external",
     "function owner() view returns (address)"],
    PROXY_ADMIN_ADDRESS,
    signer
  );

  const currentOwner = await proxyAdmin.owner();
  console.log(`\nCurrent owner: ${currentOwner}`);
  if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer (${signer.address}) is not the current owner`);
  }

  const tx = await proxyAdmin.transferOwnership(NEW_OWNER, { gasLimit: 100_000 });
  console.log(`\nTx sent: ${tx.hash}`);
  await tx.wait();
  console.log("Ownership transferred successfully.");
}

transferOwnership().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
