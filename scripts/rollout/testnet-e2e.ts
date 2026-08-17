import {
  Contract,
  EventLog,
  JsonRpcProvider,
  getAddress,
  isAddress,
} from "ethers";
import { artifacts, ethers, network } from "hardhat";

import {
  isExecutionEnabled,
  optionalAddressList,
  parsePositiveIntegerEnv,
  requireEnv,
  sleep,
  toErrorMessage,
  updateRolloutReport,
  waitForSuccessfulTransaction,
  walletFromEnv,
  runtimeBytecodeMatches,
} from "./common";
import { externalJobIdToBytes32 } from "./job-id";
import { CANONICAL_TESTNET, getProxyTestnetConfig } from "./testnet-config";

const ERC20_BALANCE_ABI = [
  "function balanceOf(address account) view returns (uint256)",
];
const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

interface CanonicalEventRecord {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
}

async function main(): Promise<void> {
  const execute = isExecutionEnabled();
  const config = getProxyTestnetConfig(network.name);

  try {
    const providerNetwork = await ethers.provider.getNetwork();
    if (providerNetwork.chainId !== config.chainId) {
      throw new Error(
        `Wrong source chain: expected ${config.chainId}, received ${providerNetwork.chainId}`
      );
    }

    const userSigner = walletFromEnv(
      ["TEST_PRIVATE_KEY"],
      ethers.provider,
      "testnet E2E action user"
    );
    const targetRaw = requireEnv("TESTNET_ACTION_TARGET_ADDRESS");
    if (!isAddress(targetRaw)) {
      throw new Error("TESTNET_ACTION_TARGET_ADDRESS is not a valid address");
    }
    const targetAddress = getAddress(targetRaw);
    if (targetAddress === userSigner.wallet.address) {
      throw new Error("The E2E target must differ from the action user");
    }

    const endorseAmount = parsePositiveIntegerEnv("TESTNET_ENDORSE_AMOUNT", 100n);
    const withdrawAmount = parsePositiveIntegerEnv("TESTNET_WITHDRAW_AMOUNT", 1n);
    const disapproveAmount = parsePositiveIntegerEnv(
      "TESTNET_DISAPPROVE_AMOUNT",
      CANONICAL_TESTNET.desiredDMin
    );
    if (withdrawAmount > endorseAmount) {
      throw new Error("TESTNET_WITHDRAW_AMOUNT cannot exceed TESTNET_ENDORSE_AMOUNT");
    }

    const sourceProxy = await ethers.getContractAt(
      "UTTProxy",
      config.proxyAddress,
      userSigner.wallet
    );
    if (await sourceProxy.isMigrating()) {
      throw new Error(`${network.name} UTTProxy is in migration mode`);
    }
    const expectedActionJobId = externalJobIdToBytes32(config.actionJobId);
    if (
      (await sourceProxy.actionJobId()).toLowerCase() !==
      expectedActionJobId.toLowerCase()
    ) {
      throw new Error(`${network.name} UTTProxy actionJobId is not configured`);
    }

    const fee = await sourceProxy.fee();
    const linkToken = new Contract(
      config.linkTokenAddress,
      ERC20_BALANCE_ABI,
      ethers.provider
    );
    const sourceLinkBalance = await linkToken.balanceOf(config.proxyAddress);
    if (sourceLinkBalance < fee * 3n) {
      throw new Error(
        `${network.name} UTTProxy needs at least ${fee * 3n} LINK wei for three requests; current balance is ${sourceLinkBalance}`
      );
    }
    const sourceNativeBalance = await ethers.provider.getBalance(
      userSigner.wallet.address
    );
    if (sourceNativeBalance === 0n) {
      throw new Error(`${userSigner.wallet.address} has no native token on ${network.name}`);
    }

    const canonicalProvider = new JsonRpcProvider(requireEnv("TESTNET_ETHEREUM_URL"));
    const canonicalNetwork = await canonicalProvider.getNetwork();
    if (canonicalNetwork.chainId !== CANONICAL_TESTNET.chainId) {
      throw new Error(
        `TESTNET_ETHEREUM_URL returned chain ${canonicalNetwork.chainId}, expected ${CANONICAL_TESTNET.chainId}`
      );
    }
    const canonicalArtifact = await artifacts.readArtifact("UTT");
    const canonicalUtt = new Contract(
      CANONICAL_TESTNET.proxyAddress,
      canonicalArtifact.abi,
      canonicalProvider
    );
    const canonicalImplementation = await getEip1967ImplementationAddress(
      canonicalProvider,
      CANONICAL_TESTNET.proxyAddress
    );
    const canonicalImplementationCode = await canonicalProvider.getCode(
      canonicalImplementation
    );
    if (
      !runtimeBytecodeMatches(
        canonicalImplementationCode,
        canonicalArtifact.deployedBytecode
      )
    ) {
      throw new Error(
        `Canonical Ethereum Sepolia implementation ${canonicalImplementation} does not match the compiled UTT artifact`
      );
    }
    if (await canonicalUtt.paused()) {
      throw new Error("Canonical Ethereum Sepolia UTT is paused");
    }
    if (
      (await canonicalUtt.isMigratingDataFromOldContract()) ||
      (await canonicalUtt.isMigratingToNewContract())
    ) {
      throw new Error("Canonical Ethereum Sepolia UTT is in a migration state");
    }
    const currentDMin = await canonicalUtt.D_min();
    if (disapproveAmount < currentDMin) {
      throw new Error(
        `TESTNET_DISAPPROVE_AMOUNT must be at least the canonical D_min (${currentDMin})`
      );
    }

    const canonicalUserBalance = await canonicalUtt.balanceOf(
      userSigner.wallet.address
    );
    if (canonicalUserBalance < endorseAmount + disapproveAmount) {
      throw new Error(
        `E2E user needs at least ${endorseAmount + disapproveAmount} UTT on Ethereum Sepolia; current balance is ${canonicalUserBalance}`
      );
    }
    const canonicalLinkToken = new Contract(
      CANONICAL_TESTNET.linkTokenAddress,
      ERC20_BALANCE_ABI,
      canonicalProvider
    );
    const canonicalLinkBalance = await canonicalLinkToken.balanceOf(
      CANONICAL_TESTNET.proxyAddress
    );
    const requiredCanonicalLink = CANONICAL_TESTNET.expectedOracleFee * 2n;
    if (canonicalLinkBalance < requiredCanonicalLink) {
      throw new Error(
        `Canonical Ethereum Sepolia UTT needs at least ${requiredCanonicalLink} LINK wei for endorsement and disapproval oracle requests; current balance is ${canonicalLinkBalance}`
      );
    }

    const chainlinkNodeAddresses = optionalAddressList(
      "TESTNET_CHAINLINK_NODE_ADDRESSES"
    );
    if (chainlinkNodeAddresses.length === 0) {
      throw new Error(
        "TESTNET_CHAINLINK_NODE_ADDRESSES must contain at least one destination-chain node wallet"
      );
    }
    const proxyRole = await canonicalUtt.PROXY_ENDORSER_ROLE();
    const chainlinkNodeBalances: Record<string, bigint> = {};
    for (const nodeAddress of chainlinkNodeAddresses) {
      if (!(await canonicalUtt.hasRole(proxyRole, nodeAddress))) {
        throw new Error(`${nodeAddress} is missing canonical PROXY_ENDORSER_ROLE`);
      }
      const nodeBalance = await canonicalProvider.getBalance(nodeAddress);
      if (nodeBalance === 0n) {
        throw new Error(`${nodeAddress} has no Ethereum Sepolia ETH for Chainlink action transactions`);
      }
      chainlinkNodeBalances[nodeAddress] = nodeBalance;
    }

    const stakeBefore = await canonicalUtt.previousEndorserStakes(
      targetAddress,
      userSigner.wallet.address
    );
    await updateRolloutReport({
      e2e: {
        [network.name]: {
          status: "preflight-passed",
          error: null,
          failedAt: null,
          sourceProxy: config.proxyAddress,
          canonicalProxy: CANONICAL_TESTNET.proxyAddress,
          canonicalImplementation,
          actionUser: userSigner.wallet.address,
          targetAddress,
          amounts: {
            endorse: endorseAmount,
            withdraw: withdrawAmount,
            disapprove: disapproveAmount,
          },
          balances: {
            sourceNative: sourceNativeBalance,
            sourceLink: sourceLinkBalance,
            canonicalUtt: canonicalUserBalance,
            canonicalLink: canonicalLinkBalance,
            chainlinkNodes: chainlinkNodeBalances,
          },
          stakeBefore,
        },
      },
    });

    console.log(`\n${network.name} E2E preflight`);
    console.log(`  mode: ${execute ? "EXECUTE" : "READ ONLY"}`);
    console.log(`  action user: ${userSigner.wallet.address}`);
    console.log(`  target: ${targetAddress}`);
    console.log(`  canonical UTT balance: ${canonicalUserBalance}`);
    console.log(`  existing target stake: ${stakeBefore}`);

    if (!execute) {
      return;
    }

    const idPrefix = `utu-rollout-${network.name}-${Date.now()}`;
    const actions: Record<string, unknown> = {};

    actions.endorse = await executeAction({
      sourceProxy,
      canonicalUtt,
      actionName: "endorse",
      eventName: "Endorse",
      sourceAddress: userSigner.wallet.address,
      targetAddress,
      amount: endorseAmount,
      transactionId: `${idPrefix}-endorse`,
    });
    const stakeAfterEndorse = await canonicalUtt.previousEndorserStakes(
      targetAddress,
      userSigner.wallet.address
    );
    if (stakeAfterEndorse < stakeBefore + endorseAmount) {
      throw new Error(
        `Canonical stake did not increase by at least ${endorseAmount} after endorsement`
      );
    }

    actions.withdraw = await executeAction({
      sourceProxy,
      canonicalUtt,
      actionName: "withdrawStake",
      eventName: "WithdrawStake",
      sourceAddress: userSigner.wallet.address,
      targetAddress,
      amount: withdrawAmount,
      transactionId: `${idPrefix}-withdraw`,
    });
    const stakeAfterWithdraw = await canonicalUtt.previousEndorserStakes(
      targetAddress,
      userSigner.wallet.address
    );
    if (stakeAfterWithdraw !== stakeAfterEndorse - withdrawAmount) {
      throw new Error("Canonical stake did not decrease by the withdrawal amount");
    }

    actions.disapprove = await executeAction({
      sourceProxy,
      canonicalUtt,
      actionName: "disapprove",
      eventName: "Disapprove",
      sourceAddress: userSigner.wallet.address,
      targetAddress,
      amount: disapproveAmount,
      transactionId: `${idPrefix}-disapprove`,
    });

    await updateRolloutReport({
      e2e: {
        [network.name]: {
          status: "completed",
          error: null,
          failedAt: null,
          actions,
          stakeAfterEndorse,
          stakeAfterWithdraw,
          completedAt: new Date().toISOString(),
        },
      },
    });
    console.log(`${network.name} E2E completed successfully.`);
  } catch (error) {
    const message = toErrorMessage(error);
    await updateRolloutReport({
      e2e: {
        [network.name]: {
          status: "failed",
          error: message,
          failedAt: new Date().toISOString(),
        },
      },
    }).catch(() => undefined);
    throw error;
  }
}

async function executeAction(args: {
  sourceProxy: Contract;
  canonicalUtt: Contract;
  actionName: "endorse" | "withdrawStake" | "disapprove";
  eventName: "Endorse" | "WithdrawStake" | "Disapprove";
  sourceAddress: string;
  targetAddress: string;
  amount: bigint;
  transactionId: string;
}): Promise<Record<string, unknown>> {
  const canonicalStartBlock = await args.canonicalUtt.runner!.provider!.getBlockNumber();
  const sourceTransaction = await (args.sourceProxy as any)[args.actionName](
    args.targetAddress,
    args.amount,
    args.transactionId
  );
  const sourceReceipt = await waitForSuccessfulTransaction(
    sourceTransaction,
    `${network.name} ${args.actionName}`
  );
  await updateRolloutReport({
    e2e: {
      [network.name]: {
        status: `${args.actionName}-submitted`,
        actions: {
          [args.actionName]: {
            transactionId: args.transactionId,
            sourceTransaction: sourceReceipt,
          },
        },
      },
    },
  });
  const canonicalEvent = await waitForCanonicalEvent({
    contract: args.canonicalUtt,
    eventName: args.eventName,
    sourceAddress: args.sourceAddress,
    targetAddress: args.targetAddress,
    transactionId: args.transactionId,
    startBlock: canonicalStartBlock,
  });
  console.log(
    `${args.eventName} observed on Ethereum Sepolia in ${canonicalEvent.transactionHash}`
  );
  const result = {
    transactionId: args.transactionId,
    sourceTransaction: sourceReceipt,
    canonicalEvent,
  };
  await updateRolloutReport({
    e2e: {
      [network.name]: {
        status: `${args.actionName}-completed`,
        actions: {
          [args.actionName]: result,
        },
      },
    },
  });
  return result;
}

async function waitForCanonicalEvent(args: {
  contract: Contract;
  eventName: "Endorse" | "WithdrawStake" | "Disapprove";
  sourceAddress: string;
  targetAddress: string;
  transactionId: string;
  startBlock: number;
}): Promise<CanonicalEventRecord> {
  const timeoutSeconds = Number(
    parsePositiveIntegerEnv("ROLLOUT_E2E_TIMEOUT_SECONDS", 600n)
  );
  const pollSeconds = Number(
    parsePositiveIntegerEnv("ROLLOUT_E2E_POLL_SECONDS", 5n)
  );
  const deadline = Date.now() + timeoutSeconds * 1000;
  const filter = (args.contract.filters as any)[args.eventName](
    args.sourceAddress,
    args.targetAddress
  );
  let nextBlock = args.startBlock;

  while (Date.now() < deadline) {
    const latestBlock = await args.contract.runner!.provider!.getBlockNumber();
    if (latestBlock >= nextBlock) {
      const logs = await args.contract.queryFilter(filter, nextBlock, latestBlock);
      for (const log of logs) {
        if (
          log instanceof EventLog &&
          String(log.args._transactionId) === args.transactionId
        ) {
          return {
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.index,
          };
        }
      }
      nextBlock = latestBlock + 1;
    }
    await sleep(pollSeconds * 1000);
  }

  throw new Error(
    `Timed out after ${timeoutSeconds}s waiting for canonical ${args.eventName} (${args.transactionId})`
  );
}

async function getEip1967ImplementationAddress(
  provider: JsonRpcProvider,
  proxyAddress: string
): Promise<string> {
  const storedValue = await provider.getStorage(
    proxyAddress,
    EIP1967_IMPLEMENTATION_SLOT
  );
  const implementation = getAddress(`0x${storedValue.slice(-40)}`);
  if (implementation === "0x0000000000000000000000000000000000000000") {
    throw new Error(`${proxyAddress} has an empty EIP-1967 implementation slot`);
  }
  return implementation;
}

main().catch((error) => {
  console.error(toErrorMessage(error));
  process.exitCode = 1;
});
