import {task} from "hardhat/config";

task("show-pending-transactions", "Show all pending transactions for the signer")
  .setAction(async (_, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const address = await signer.getAddress();

    // Get the nonce of the latest confirmed transaction
    const confirmedNonce = await signer.getTransactionCount("latest");
    console.log("Confirmed nonce:", confirmedNonce);

    // Get the nonce of the latest transaction, including pending transactions
    const pendingNonce = await signer.getTransactionCount("pending");
    console.log("Pending nonce:", confirmedNonce);

    // Collect the pending transactions
    const pendingTransactions = [];

    for (let nonce = confirmedNonce; nonce < pendingNonce; nonce++) {
      console.log("Getting transaction with nonce", nonce);
      const tx = await hre.ethers.provider.getTransaction(hre.ethers.utils.keccak256(hre.ethers.utils.serializeTransaction({
        nonce,
        gasLimit: 21000,  // Use some default values here; actual values don't matter
        gasPrice: 1,
        to: "0x0000000000000000000000000000000000000000",
        value: 0
      })));

      if (tx) {
        pendingTransactions.push(tx);
      }
    }

    // Display the pending transactions
    console.log(`Pending transactions for address ${address}:`);
    pendingTransactions.forEach((tx) => {
      console.log(`Transaction Hash: ${tx.hash}`);
    });
  });
