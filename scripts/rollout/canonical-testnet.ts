import { artifacts, ethers, network, upgrades } from "hardhat";

import {
  assertAddressEquals,
  assertHasCode,
  getProxyAdminOwner,
  getUpgradeTransaction,
  isExecutionEnabled,
  optionalWalletFromEnv,
  optionalAddressList,
  readBooleanEnv,
  runtimeBytecodeMatches,
  toErrorMessage,
  updateRolloutReport,
  waitForSuccessfulTransaction,
  withPreservedFile,
} from "./common";
import { CANONICAL_TESTNET } from "./testnet-config";

const ERC20_BALANCE_ABI = [
  "function balanceOf(address account) view returns (uint256)",
];

async function main(): Promise<void> {
  const execute = isExecutionEnabled();
  const config = CANONICAL_TESTNET;
  let pausedByThisRun = false;
  let pauseRecoveryRequired = false;

  try {
    if (network.name !== config.network) {
      throw new Error(
        `Canonical rollout must run on ${config.network}, not ${network.name}`
      );
    }

    const providerNetwork = await ethers.provider.getNetwork();
    if (providerNetwork.chainId !== config.chainId) {
      throw new Error(
        `Wrong chain: expected ${config.chainId}, received ${providerNetwork.chainId}`
      );
    }

    await assertHasCode(ethers.provider, config.proxyAddress, "Canonical UTT proxy");
    const previousImplementation =
      await upgrades.erc1967.getImplementationAddress(config.proxyAddress);
    const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(
      config.proxyAddress
    );
    await assertHasCode(
      ethers.provider,
      previousImplementation,
      "Canonical UTT implementation"
    );

    const signerEnvs = ["TEST_PRIVATE_KEY"];
    const rolloutSigner = execute
      ? optionalWalletFromEnv(signerEnvs, ethers.provider)
      : null;
    const ownerSigner = rolloutSigner;
    const proxyAdminSigner = rolloutSigner;
    const roleAdminSigner = rolloutSigner;
    const chainlinkNodeAddresses = optionalAddressList(
      "TESTNET_CHAINLINK_NODE_ADDRESSES"
    );
    if (chainlinkNodeAddresses.length === 0) {
      throw new Error(
        "TESTNET_CHAINLINK_NODE_ADDRESSES must contain at least one destination-chain node wallet"
      );
    }

    const utt = await ethers.getContractAt("UTT", config.proxyAddress);
    const ownerAddress = await utt.owner();
    const proxyAdminOwner = await getProxyAdminOwner(
      ethers.provider,
      proxyAdminAddress
    );
    if (ownerSigner !== null) {
      assertAddressEquals(
        ownerSigner.wallet.address,
        ownerAddress,
        `${ownerSigner.sourceEnv} signer`
      );
    }
    if (proxyAdminSigner !== null) {
      assertAddressEquals(
        proxyAdminSigner.wallet.address,
        proxyAdminOwner,
        `${proxyAdminSigner.sourceEnv} signer`
      );
    }

    const proxyRole = await utt.PROXY_ENDORSER_ROLE();
    const proxyRoleAdmin = await utt.getRoleAdmin(proxyRole);
    const missingProxyRoles: string[] = [];
    for (const nodeAddress of chainlinkNodeAddresses) {
      if (!(await utt.hasRole(proxyRole, nodeAddress))) {
        missingProxyRoles.push(nodeAddress);
      }
    }
    if (
      missingProxyRoles.length > 0 &&
      roleAdminSigner !== null &&
      !(await utt.hasRole(proxyRoleAdmin, roleAdminSigner.wallet.address))
    ) {
      throw new Error(
        `${roleAdminSigner.sourceEnv} signer ${roleAdminSigner.wallet.address} cannot administer PROXY_ENDORSER_ROLE`
      );
    }

    const pausedInitially = await utt.paused();
    const migratingData = await utt.isMigratingDataFromOldContract();
    const migratingToNewContract = await utt.isMigratingToNewContract();
    if (migratingData || migratingToNewContract) {
      throw new Error(
        "Canonical UTT is in a migration state; resolve that state before upgrading"
      );
    }

    const currentDd = await readOptionalBigInt(utt, "D_d");
    const currentDMin = await readOptionalBigInt(utt, "D_min");
    const linkToken = new ethers.Contract(
      config.linkTokenAddress,
      ERC20_BALANCE_ABI,
      ethers.provider
    );
    const linkBalance = await linkToken.balanceOf(config.proxyAddress);

    const artifact = await artifacts.readArtifact("UTT");
    const previousImplementationCode = await ethers.provider.getCode(
      previousImplementation
    );
    const implementationIsCurrent = runtimeBytecodeMatches(
      previousImplementationCode,
      artifact.deployedBytecode
    );
    const validationSigner =
      proxyAdminSigner?.wallet ?? ethers.Wallet.createRandom().connect(ethers.provider);
    const upgradeFactory = await ethers.getContractFactory("UTT", validationSigner);
    await withPreservedFile(config.manifestPath, !execute, () =>
      upgrades.validateUpgrade(config.proxyAddress, upgradeFactory)
    );

    const signerBalances = {
      owner:
        ownerSigner === null
          ? null
          : await ethers.provider.getBalance(ownerSigner.wallet.address),
      proxyAdmin:
        proxyAdminSigner === null
          ? null
          : await ethers.provider.getBalance(proxyAdminSigner.wallet.address),
      roleAdmin:
        roleAdminSigner === null
          ? null
          : await ethers.provider.getBalance(roleAdminSigner.wallet.address),
    };

    await updateRolloutReport({
      networks: {
        [network.name]: {
          kind: "canonical-utt",
          chainId: providerNetwork.chainId,
          status: "preflight-passed",
          error: null,
          failedAt: null,
          proxyAddress: config.proxyAddress,
          proxyAdminAddress,
          proxyAdminOwner,
          contractOwner: ownerAddress,
          previousImplementation,
          implementationIsCurrent,
          pausedInitially,
          migration: {
            migratingData,
            migratingToNewContract,
          },
          disapprovalParameters: {
            currentDd,
            currentDMin,
            desiredDd: config.desiredDd,
            desiredDMin: config.desiredDMin,
          },
          chainlink: {
            nodeAddresses: chainlinkNodeAddresses,
            missingProxyRoles,
            linkTokenAddress: config.linkTokenAddress,
            linkBalance,
          },
          signers: {
            owner: ownerSigner?.wallet.address ?? null,
            proxyAdmin: proxyAdminSigner?.wallet.address ?? null,
            roleAdmin: roleAdminSigner?.wallet.address ?? null,
          },
          signerNativeBalances: signerBalances,
        },
      },
    });

    printPreflightSummary({
      execute,
      previousImplementation,
      implementationIsCurrent,
      ownerAddress,
      proxyAdminOwner,
      pausedInitially,
      currentDd,
      currentDMin,
      missingProxyRoles,
      linkBalance,
    });

    if (!execute) {
      return;
    }

    const resumePaused = readBooleanEnv("ROLLOUT_RESUME_PAUSED", false);
    if (pausedInitially && !resumePaused) {
      throw new Error(
        "Canonical UTT was already paused. Investigate why, then set ROLLOUT_RESUME_PAUSED=true only to resume this rollout."
      );
    }
    pauseRecoveryRequired = pausedInitially;
    const needsMutation =
      !implementationIsCurrent ||
      currentDd !== config.desiredDd ||
      currentDMin !== config.desiredDMin ||
      missingProxyRoles.length > 0 ||
      pausedInitially;
    if (!needsMutation) {
      await updateRolloutReport({
        networks: {
          [network.name]: {
            status: "completed-no-changes",
            error: null,
            failedAt: null,
            pauseRecoveryRequired: false,
            newImplementation: previousImplementation,
            completedAt: new Date().toISOString(),
          },
        },
      });
      console.log("Canonical Ethereum Sepolia UTT is already on the requested rollout state.");
      return;
    }

    if (ownerSigner === null) {
      throw new Error(
        `Execution requires the canonical testnet deployer key in ${signerEnvs[0]}`
      );
    }
    if (!implementationIsCurrent && proxyAdminSigner === null) {
      throw new Error(
        `The canonical upgrade requires the ProxyAdmin owner key in ${signerEnvs[0]}`
      );
    }
    if (missingProxyRoles.length > 0 && roleAdminSigner === null) {
      throw new Error(
        `Granting canonical proxy roles requires the role administrator key in ${signerEnvs[0]}`
      );
    }
    if (
      missingProxyRoles.length > 0 &&
      !(await utt.hasRole(proxyRoleAdmin, roleAdminSigner!.wallet.address))
    ) {
      throw new Error(
        `${roleAdminSigner!.sourceEnv} signer ${roleAdminSigner!.wallet.address} cannot administer PROXY_ENDORSER_ROLE`
      );
    }

    assertFundedSigner(signerBalances.owner!, "canonical UTT owner");
    if (!implementationIsCurrent) {
      assertFundedSigner(signerBalances.proxyAdmin!, "canonical ProxyAdmin owner");
    }
    if (missingProxyRoles.length > 0) {
      assertFundedSigner(signerBalances.roleAdmin!, "canonical role administrator");
    }

    const transactions: Record<string, unknown> = {};
    if (!pausedInitially) {
      const ownerUtt = await ethers.getContractAt(
        "UTT",
        config.proxyAddress,
        ownerSigner.wallet
      );
      transactions.pause = await waitForSuccessfulTransaction(
        await ownerUtt.pause(),
        "Pause canonical UTT"
      );
      pausedByThisRun = true;
      pauseRecoveryRequired = true;
      await updateRolloutReport({
        networks: {
          [network.name]: {
            status: "canonical-paused",
            transactions,
          },
        },
      });
    }

    let newImplementation = previousImplementation;
    if (!implementationIsCurrent) {
      const upgraded = await upgrades.upgradeProxy(
        config.proxyAddress,
        upgradeFactory
      );
      const upgradeTransaction = getUpgradeTransaction(upgraded, "canonical");
      transactions.upgrade = await waitForSuccessfulTransaction(
        upgradeTransaction,
        "Upgrade canonical UTT"
      );
      newImplementation = await upgrades.erc1967.getImplementationAddress(
        config.proxyAddress
      );
      await updateRolloutReport({
        networks: {
          [network.name]: {
            status: "canonical-upgraded",
            newImplementation,
            transactions,
          },
        },
      });
    }

    const configuredUtt = await ethers.getContractAt(
      "UTT",
      config.proxyAddress,
      ownerSigner.wallet
    );
    if ((await configuredUtt.D_d()) !== config.desiredDd) {
      transactions.setDd = await waitForSuccessfulTransaction(
        await configuredUtt.setD_d(config.desiredDd),
        "Set D_d"
      );
    }
    if ((await configuredUtt.D_min()) !== config.desiredDMin) {
      transactions.setDMin = await waitForSuccessfulTransaction(
        await configuredUtt.setD_min(config.desiredDMin),
        "Set D_min"
      );
    }

    const roleTransactions: Record<string, unknown> = {};
    if (missingProxyRoles.length > 0) {
      const roleAdminUtt = await ethers.getContractAt(
        "UTT",
        config.proxyAddress,
        roleAdminSigner!.wallet
      );
      for (const nodeAddress of missingProxyRoles) {
        roleTransactions[nodeAddress] = await waitForSuccessfulTransaction(
          await roleAdminUtt.grantRole(proxyRole, nodeAddress),
          `Grant PROXY_ENDORSER_ROLE to ${nodeAddress}`
        );
      }
    }
    if (Object.keys(roleTransactions).length > 0) {
      transactions.grantProxyRoles = roleTransactions;
    }

    await verifyCanonicalConfiguration({
      proxyAddress: config.proxyAddress,
      expectedImplementation: newImplementation,
      desiredDd: config.desiredDd,
      desiredDMin: config.desiredDMin,
      proxyRole,
      nodeAddresses: chainlinkNodeAddresses,
    });

    if (pausedByThisRun || resumePaused) {
      transactions.unpause = await waitForSuccessfulTransaction(
        await configuredUtt.unpause(),
        "Unpause canonical UTT"
      );
      pausedByThisRun = false;
      pauseRecoveryRequired = false;
    }

    const finalImplementation =
      await upgrades.erc1967.getImplementationAddress(config.proxyAddress);
    const finalUtt = await ethers.getContractAt("UTT", config.proxyAddress);
    const finalDd = await finalUtt.D_d();
    const finalDMin = await finalUtt.D_min();
    const pausedFinally = await finalUtt.paused();
    if (pausedFinally) {
      throw new Error("Canonical UTT remained paused after configuration");
    }

    await updateRolloutReport({
      networks: {
        [network.name]: {
          status: "completed",
          error: null,
          failedAt: null,
          pauseRecoveryRequired: false,
          newImplementation: finalImplementation,
          pausedFinally,
          disapprovalParameters: {
            currentDd: finalDd,
            currentDMin: finalDMin,
            desiredDd: config.desiredDd,
            desiredDMin: config.desiredDMin,
          },
          transactions,
          completedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`Canonical UTT implementation: ${finalImplementation}`);
    console.log(`D_d=${finalDd}; D_min=${finalDMin}; paused=${pausedFinally}`);
  } catch (error) {
    const message = toErrorMessage(error);
    await updateRolloutReport({
      networks: {
        [network.name]: {
          status: "failed",
          pausedByThisRun,
          pauseRecoveryRequired,
          error: message,
          failedAt: new Date().toISOString(),
        },
      },
    }).catch(() => undefined);
    if (pauseRecoveryRequired) {
      console.error(
        "Canonical UTT was paused by this run and remains paused. Fix the failure and resume with ROLLOUT_RESUME_PAUSED=true."
      );
    }
    throw error;
  }
}

async function readOptionalBigInt(
  contract: Awaited<ReturnType<typeof ethers.getContractAt>>,
  functionName: string
): Promise<bigint | null> {
  try {
    return BigInt(await (contract as any)[functionName]());
  } catch {
    return null;
  }
}

function assertFundedSigner(balance: bigint, label: string): void {
  if (balance === 0n) {
    throw new Error(`${label} has no native token for gas`);
  }
}

async function verifyCanonicalConfiguration(args: {
  proxyAddress: string;
  expectedImplementation: string;
  desiredDd: bigint;
  desiredDMin: bigint;
  proxyRole: string;
  nodeAddresses: string[];
}): Promise<void> {
  const implementation = await upgrades.erc1967.getImplementationAddress(
    args.proxyAddress
  );
  assertAddressEquals(
    implementation,
    args.expectedImplementation,
    "Canonical implementation"
  );
  const utt = await ethers.getContractAt("UTT", args.proxyAddress);
  if ((await utt.D_d()) !== args.desiredDd) {
    throw new Error("D_d verification failed");
  }
  if ((await utt.D_min()) !== args.desiredDMin) {
    throw new Error("D_min verification failed");
  }
  for (const nodeAddress of args.nodeAddresses) {
    if (!(await utt.hasRole(args.proxyRole, nodeAddress))) {
      throw new Error(`PROXY_ENDORSER_ROLE verification failed for ${nodeAddress}`);
    }
  }
}

function printPreflightSummary(args: {
  execute: boolean;
  previousImplementation: string;
  implementationIsCurrent: boolean;
  ownerAddress: string;
  proxyAdminOwner: string;
  pausedInitially: boolean;
  currentDd: bigint | null;
  currentDMin: bigint | null;
  missingProxyRoles: string[];
  linkBalance: bigint;
}): void {
  console.log("\nCanonical Ethereum Sepolia preflight");
  console.log(`  mode: ${args.execute ? "EXECUTE" : "READ ONLY"}`);
  console.log(`  implementation: ${args.previousImplementation}`);
  console.log(`  local implementation already active: ${args.implementationIsCurrent}`);
  console.log(`  UTT owner: ${args.ownerAddress}`);
  console.log(`  ProxyAdmin owner: ${args.proxyAdminOwner}`);
  console.log(`  paused: ${args.pausedInitially}`);
  console.log(`  D_d: ${args.currentDd ?? "unavailable"}`);
  console.log(`  D_min: ${args.currentDMin ?? "unavailable"}`);
  console.log(`  missing node roles: ${args.missingProxyRoles.length}`);
  console.log(`  LINK balance (wei): ${args.linkBalance}`);
}

main().catch((error) => {
  console.error(toErrorMessage(error));
  process.exitCode = 1;
});
