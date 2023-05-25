import BigNumber from "bignumber.js";
// import data from "../exports/mumbai-utt-data-1684153540470.json";
import { task } from "hardhat/config";

const data: any[] = [];

task("migrate-data", "Mints from the NFT contract")
  .addParam("sourceaddress", "The address of the old contract")
  .addParam("targetaddress", "The address to the new contract")
  .setAction(async function (taskArguments: any, { ethers, network }: any) {
    const accountsWithBalance = getAccountWithBalance();
    console.log(taskArguments);
    const UTT = await ethers.getContractAt(
      "MigratableUTT",
      taskArguments.targetaddress
    );
    const transactionResponse = await UTT.migrateBalance(
      accountsWithBalance,
      taskArguments.sourceaddress
    );
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
    const addConnections = getAddConnections();
    const addConnectionsTransactionResponse =
      await UTT.migrateSocialConnections(addConnections);
    console.log(`Transaction Hash: ${addConnectionsTransactionResponse.hash}`);

    const endorsements = getEndorsements();
    const endorsementsTransactionResponse = await UTT.migrateEndorsements(
      endorsements,
      taskArguments.sourceaddress
    );
    console.log(`Transaction Hash: ${endorsementsTransactionResponse.hash}`);
  });

export const getAccountWithBalance = () => {
  const transferEvents = data.filter((e: any) => e.event === "Transfer");
  const accountsWithBalance = new Set();
  transferEvents.forEach((e: any) => {
    accountsWithBalance.add(e.args[0]);
    accountsWithBalance.add(e.args[1]);
  });
  const accounts = Array.from(accountsWithBalance).filter(
    (a) => a !== "0x0000000000000000000000000000000000000000"
  );
  return accounts;
};

export const getAddConnections = () => {
  const events = data
    .filter((e: any) => e.event === "AddConnection")
    .map((e: any) => {
      const connectedTypeId = new BigNumber(e.args[1].hex).toNumber();
      return {
        user: e.args[0],
        connectedTypeId,
        connectedUserIdHash: e.args[2],
      };
    });
  return events;
};

export const getEndorsements = () => {
  const events = data
    .filter((e: any) => e.event === "Endorse")
    .map((e: any) => {
      const amount = new BigNumber(e.args[2].hex).toNumber();
      return {
        from: e.args[0],
        target: e.args[1],
        amount: amount,
        transactionId: e.args[3],
      };
    });
  return events;
};
