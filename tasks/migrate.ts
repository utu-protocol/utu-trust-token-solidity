import { task, types } from "hardhat/config";
import fs from "fs";
import _ from "lodash";

/**
 * The expected gas usages for each of the migration, per entry. This is taken from an execution on testnet.
 */
const EXPECTED_GAS_USAGE = {
  migrateBalance: 29376,
  migrateSocialConnections: 8133,
  migrateEndorsements: 2930,
};

// Function to compute the batch size
function computeBatchSize(arrayLength, gasEstimate, maxGas) {
  return Math.ceil(arrayLength / (gasEstimate / maxGas));
}

task("migrate-data", "Migrates data from an old UTT contract to a new version.")
  .addParam("sourceaddress", "The address of the old UTT contract.")
  .addParam("targetaddress", "The address to the new UTT contract.")
  .addParam("fromFile", "input data file (as created by the export-logs task.)")
  .addOptionalParam(
    "maxGas",
    "The max gas to use per transaction.",
    5000000,
    types.int
  )
  .addOptionalParam(
    "gasMargin",
    "Multiply the estimated gas usage by this factor to add a margin for safety.",
    1.1,
    types.float
  )
  .addOptionalParam(
    "maxFeePerGas",
    "Manually set a max. gas price in GWEI for all transactions. Empty string means to automatically " +
      "determine gas price. If given, --maxPriorityFeePerGas should also be given.",
    "",
    types.string
  )
  .addOptionalParam(
    "maxPriorityFeePerGas",
    "Manually set a max. priority fee in GWEI for all transactions. Empty string means to automatically " +
      "determine priority fee. If given, --maxFeePerGas should also be given.",
    "",
    types.string
  )
  .addOptionalParam(
    "startNonce",
    "Manually set a nonce for the first transaction; useful for speeding up stuck migration transactions " +
      "because of too low gas price, possibly together with --gas-price and --skip. 0 means use the current next " +
      "nonce of the signer.",
    0,
    types.int
  )
  .addOptionalParam(
    "skip",
    "Skip the first N transactions. Useful for resuming an aborted migration, or, together with " +
      "--gas-price and --start-nonce for speeding up stuck migration transactions because of too low gas price.",
    0,
    types.int
  )
  .addOptionalParam(
    "maxConnectedTypeId",
    "The max connected type id to migrate (can e.g. be used to limit costs)",
    Number.MAX_VALUE,
    types.int
  )
  .setAction(async function (taskArguments: any, { ethers, network }: any) {
    const BigNumber = ethers.BigNumber;

    function addMargin(gasEstimate: typeof BigNumber): typeof BigNumber {
      return gasEstimate.mul(Math.floor(taskArguments.gasMargin * 100)).div(100);
    }

    const data = JSON.parse(fs.readFileSync(taskArguments.fromFile, "utf8"));
    const accountsWithBalance = getAccountWithBalance(data);
    const addConnections = getAddConnections(BigNumber, data, taskArguments.maxConnectedTypeId);
    const endorsements = getEndorsements(BigNumber, data);
    const endorsementRewards = getEndorsementRewards(BigNumber, data);

    const UTT = await ethers.getContractAt("UTT", taskArguments.targetaddress);

    const [
      migrateBalanceGasEstimate,
      addConnectionsGasEstimate,
      migrateEndorsementsGasEstimate,
      endorsementRewardsGasEstimate,
    ] = await Promise.all([
      UTT.estimateGas.migrateBalance(accountsWithBalance, taskArguments.sourceaddress)
        .catch((e: Error) => {
          console.log("Error estimating gas for migrateBalance; using fallback");
          return BigNumber.from(EXPECTED_GAS_USAGE.migrateBalance).mul(accountsWithBalance.length);
        })
        .then(addMargin),
      UTT.estimateGas.migrateSocialConnections(addConnections)
        .catch((e: Error) => {
          console.log("Error estimating gas for migrateSocialConnections; using fallback");
          return BigNumber.from(EXPECTED_GAS_USAGE.migrateSocialConnections).mul(addConnections.length);
        })
        .then(addMargin),
      UTT.estimateGas.migrateEndorsements(endorsements, taskArguments.sourceaddress)
        .catch((e: Error) => {
          console.log("Error estimating gas for migrateEndorsements; using fallback");
          return BigNumber.from(EXPECTED_GAS_USAGE.migrateEndorsements).mul(endorsements.length);
        })
        .then(addMargin),
      1
    ]);

    console.log(`Estimated gas (with margin) for migrateBalance: ${migrateBalanceGasEstimate}`);
    console.log(`Estimated gas (with margin) for migrateSocialConnections: ${addConnectionsGasEstimate}`);
    console.log(`Estimated gas (with margin) for migrateEndorsements: ${migrateEndorsementsGasEstimate}`);
    console.log(`Estimated gas (with margin) for endorsementRewards: ${endorsementRewardsGasEstimate}`);

    const totalGas = migrateBalanceGasEstimate.add(addConnectionsGasEstimate).add(migrateEndorsementsGasEstimate);
    console.log(`Total estimated gas: ${totalGas}`);

    const gasPrice = await ethers.provider.getGasPrice();
    const totalCost = totalGas.mul(gasPrice);
    console.log(`Total estimated gas price: ${ethers.utils.formatUnits(totalCost, "ether")}`);

    const signer = (await ethers.getSigners())[0];
    const balance = await signer.getBalance();

    if (false && balance.lt(totalCost)) {
      const missingCost = totalCost.sub(balance);
      throw new Error(`Insufficient funds. Balance of ${signer.address} on ${network.name} (${network.chainId}) is ${ethers.utils.formatEther(balance)}. Missing ${ethers.utils.formatEther(missingCost)} ETH/MATIC/....`);
    }

    const accountsWithBalanceBatchSize = computeBatchSize(accountsWithBalance.length, migrateBalanceGasEstimate, taskArguments.maxGas);
    const addConnectionsBatchSize = computeBatchSize(addConnections.length, addConnectionsGasEstimate, taskArguments.maxGas);
    const endorsementsBatchSize = computeBatchSize(endorsements.length, migrateEndorsementsGasEstimate, taskArguments.maxGas);
    const endorsementRewardsBatchSize = computeBatchSize(endorsementRewards.length, endorsementRewardsGasEstimate, taskArguments.maxGas);

    // Use lodash to chunk arrays
    const accountsWithBalanceChunks = _.chunk(accountsWithBalance, accountsWithBalanceBatchSize);
    const addConnectionsChunks = _.chunk(addConnections, addConnectionsBatchSize);
    const endorsementsChunks = _.chunk(endorsements, endorsementsBatchSize);
    const endorsementRewardsChunks = _.chunk(endorsementRewards, endorsementRewardsBatchSize);

    const startNonce = taskArguments.startNonce - taskArguments.skip || await ethers.provider.getTransactionCount(signer.address, 'latest');
    // Convert gas price to Wei, if given
    const maxFeePerGasInWei = taskArguments.maxFeePerGas
      ? ethers.utils.parseUnits(taskArguments.maxFeePerGas, "gwei")
      : undefined;

    const maxPriorityFeePerGasInWei = taskArguments.maxPriorityFeePerGas
      ? ethers.utils.parseUnits(taskArguments.maxPriorityFeePerGas, "gwei")
      : undefined;

    let totalTxNumber = 0;
    async function migrate(UTT: any, method: Function, chunks: any[], restArgs: any[]): Promise<(typeof BigNumber)[]> {
      let chunkIndex = 0;
      const gasUsedPs = [];
      for (const chunk of chunks) {
        //if(totalTxNumber > 0) break;

        if(totalTxNumber >= taskArguments.skip) {
          const tx = await method.apply(UTT, [chunk, ...restArgs, {
              nonce: startNonce + totalTxNumber,
              maxFeePerGas: maxFeePerGasInWei,
              maxPriorityFeePerGas: maxPriorityFeePerGasInWei,
          }]);
          gasUsedPs.push(tx.wait().then(receipt => receipt.gasUsed));
          console.log(`Calling ${method.name} for chunk ${chunkIndex + 1} of ${chunks.length} (${chunk.length} ` +
            `entries). Transaction Hash: ${tx.hash}`);
        } else {
          console.log(`Skipping ${method.name} for chunk ${chunkIndex + 1} of ${chunks.length}.`);
        }
        chunkIndex++;
        totalTxNumber++;
      }
      return gasUsedPs;
    }

    // Execute transactions in sequence
    let totalGasUsedPs: Promise<(typeof BigNumber)[]>[] = [];

    //totalGasUsedPs = totalGasUsedPs.concat(await migrate(UTT, UTT.migrateBalance, accountsWithBalanceChunks, [taskArguments.sourceaddress]));
    //totalGasUsedPs = totalGasUsedPs.concat(await migrate(UTT, UTT.migrateSocialConnections, addConnectionsChunks, []));
    //totalGasUsedPs = totalGasUsedPs.concat(await migrate(UTT, UTT.migrateEndorsements, endorsementsChunks, [taskArguments.sourceaddress]));
    //totalGasUsedPs = totalGasUsedPs.concat(await migrate(UTT, UTT.migrateEndorsementRewards, endorsementRewardsChunks, []));
    console.log("EndorsementRewardsChunks", endorsementRewardsChunks);

    const totalGasUsed = await Promise.all(totalGasUsedPs)
      .then((totalGasUsed) => totalGasUsed.reduce((a, b) => a.add(b), BigNumber.from(0)));
    console.log("Total gas used:", totalGasUsed.toString());
  });

export const getAccountWithBalance = (data: object[]) => {
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

export const getAddConnections = (
  BigNumber: any,
  data: object[],
  maxConnectedTypeId: number
) => {
  const events = data
    .filter((e: any) => e.event === "AddConnection")
    .reduce((agg: Array<object>, e: any) => {
      const connectedTypeId = BigNumber.from(e.args[1].hex).toNumber();
      if (connectedTypeId <= maxConnectedTypeId) {
        agg.push({
          user: e.args[0],
          connectedTypeId,
          connectedUserIdHash: e.args[2],
        });
      } else {
        console.log(
          `Skipping connection with connectedTypeId ${connectedTypeId}`
        );
      }
      return agg;
    }, []);
  return events;
};

export const getEndorsements = (BigNumber: any, data: object[]) => {
  const events = data
    .filter((e: any) => e.event === "Endorse")
    .map((e: any) => {
      const amount = BigNumber.from(e.args[2].hex).toNumber();
      return {
        from: e.args[0],
        target: e.args[1],
        amount: amount,
        transactionId: e.args[3],
      };
    });
  return events;
};

export const getEndorsementRewards = (BigNumber: any, data: object[]) => {
  const events = data
    .filter((e: any) => e.event.startsWith("RewardPreviousEndorserLevel"))
    .map((e: any) => {
      const amount = BigNumber.from(e.args[1].hex).toNumber();
      return {
        user: e.args[0],
        target: amount
      };
    });
  return events;
};
