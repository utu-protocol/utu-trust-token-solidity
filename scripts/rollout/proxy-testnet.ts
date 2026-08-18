import { artifacts, ethers, network, upgrades } from "hardhat";

import {
  assertAddressEquals,
  assertHasCode,
  getProxyAdminOwner,
  getUpgradeTransaction,
  isExecutionEnabled,
  optionalWalletFromEnv,
  phaseIncludesE2e,
  readBooleanEnv,
  runtimeBytecodeMatches,
  toErrorMessage,
  updateRolloutReport,
  waitForSuccessfulTransaction,
  withPreservedFile,
} from "./common";
import { externalJobIdToBytes32 } from "./job-id";
import { getProxyTestnetConfig } from "./testnet-config";

const ERC20_BALANCE_ABI = [
  "function balanceOf(address account) view returns (uint256)",
];

async function main(): Promise<void> {
  const execute = isExecutionEnabled();
  const config = getProxyTestnetConfig(network.name);
  let migrationEnabledByThisRun = false;
  let migrationRecoveryRequired = false;

  try {
    const providerNetwork = await ethers.provider.getNetwork();
    if (providerNetwork.chainId !== config.chainId) {
      throw new Error(
        `Wrong chain for ${network.name}: expected ${config.chainId}, received ${providerNetwork.chainId}`
      );
    }

    await assertHasCode(ethers.provider, config.proxyAddress, "UTTProxy");
    await assertHasCode(
      ethers.provider,
      config.operatorAddress,
      "Chainlink Operator"
    );

    const previousImplementation =
      await upgrades.erc1967.getImplementationAddress(config.proxyAddress);
    const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(
      config.proxyAddress
    );
    await assertHasCode(
      ethers.provider,
      previousImplementation,
      "UTTProxy implementation"
    );

    const signerEnvs = ["TEST_PRIVATE_KEY"];
    const rolloutSigner = execute
      ? optionalWalletFromEnv(signerEnvs, ethers.provider)
      : null;
    const ownerSigner = rolloutSigner;
    const proxyAdminSigner = rolloutSigner;

    const proxy = await ethers.getContractAt("UTTProxy", config.proxyAddress);
    const ownerAddress = await proxy.owner();
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

    const configuredOperator = await proxy.oracle();
    assertAddressEquals(
      configuredOperator,
      config.operatorAddress,
      `${network.name} Operator`
    );
    const fee = await proxy.fee();
    if (fee <= 0n) {
      throw new Error(`${network.name} UTTProxy has an invalid zero LINK fee`);
    }

    const migratingInitially = await proxy.isMigrating();
    const currentActionJobId = await readOptionalBytes32(proxy, "actionJobId");
    const expectedActionJobId = externalJobIdToBytes32(config.actionJobId);
    const actionJobIdMatches =
      currentActionJobId?.toLowerCase() === expectedActionJobId.toLowerCase();

    const linkToken = new ethers.Contract(
      config.linkTokenAddress,
      ERC20_BALANCE_ABI,
      ethers.provider
    );
    const linkBalance = await linkToken.balanceOf(config.proxyAddress);
    const recommendedLinkBalance = fee * 3n;
    const hasRecommendedLinkBalance = linkBalance >= recommendedLinkBalance;

    const artifact = await artifacts.readArtifact("UTTProxy");
    const previousImplementationCode = await ethers.provider.getCode(
      previousImplementation
    );
    const implementationIsCurrent = runtimeBytecodeMatches(
      previousImplementationCode,
      artifact.deployedBytecode
    );
    const validationSigner =
      proxyAdminSigner?.wallet ?? ethers.Wallet.createRandom().connect(ethers.provider);
    const upgradeFactory = await ethers.getContractFactory(
      "UTTProxy",
      validationSigner
    );
    await withPreservedFile(config.manifestPath, !execute, () =>
      upgrades.validateUpgrade(config.proxyAddress, upgradeFactory)
    );

    const ownerBalance =
      ownerSigner === null
        ? null
        : await ethers.provider.getBalance(ownerSigner.wallet.address);
    const proxyAdminBalance =
      proxyAdminSigner === null
        ? null
        : await ethers.provider.getBalance(proxyAdminSigner.wallet.address);

    await updateRolloutReport({
      networks: {
        [network.name]: {
          kind: "cross-chain-utt-proxy",
          chainId: providerNetwork.chainId,
          status: "preflight-passed",
          error: null,
          failedAt: null,
          proxyAddress: config.proxyAddress,
          proxyAdminAddress,
          proxyAdminOwner,
          contractOwner: ownerAddress,
          operatorAddress: configuredOperator,
          previousImplementation,
          implementationIsCurrent,
          migratingInitially,
          actionJob: {
            externalId: config.actionJobId,
            expectedBytes32: expectedActionJobId,
            currentBytes32: currentActionJobId,
            matches: actionJobIdMatches,
          },
          chainlink: {
            linkTokenAddress: config.linkTokenAddress,
            linkBalance,
            fee,
            recommendedLinkBalance,
            sufficientForE2e: hasRecommendedLinkBalance,
          },
          signers: {
            owner: ownerSigner?.wallet.address ?? null,
            proxyAdmin: proxyAdminSigner?.wallet.address ?? null,
          },
          signerNativeBalances: {
            owner: ownerBalance,
            proxyAdmin: proxyAdminBalance,
          },
        },
      },
    });

    printPreflightSummary({
      execute,
      networkName: network.name,
      previousImplementation,
      implementationIsCurrent,
      ownerAddress,
      proxyAdminOwner,
      migratingInitially,
      actionJobIdMatches,
      linkBalance,
      recommendedLinkBalance,
    });

    const rolloutPhase = process.env.ROLLOUT_PHASE;
    if (!hasRecommendedLinkBalance && phaseIncludesE2e(rolloutPhase)) {
      throw new Error(
        `${network.name} UTTProxy has ${linkBalance} LINK wei; at least ${recommendedLinkBalance} is required for the three E2E actions. Fund it before running the complete rollout.`
      );
    }
    if (
      !hasRecommendedLinkBalance &&
      (execute || rolloutPhase === "preflight")
    ) {
      console.warn(
        `WARNING: ${network.name} UTTProxy has ${linkBalance} LINK wei; deployment can continue, but fund at least ${recommendedLinkBalance} before E2E testing or proxy use.`
      );
    }

    if (!execute) {
      return;
    }

    const resumeMigrating = readBooleanEnv("ROLLOUT_RESUME_MIGRATING", false);
    if (migratingInitially && !resumeMigrating) {
      throw new Error(
        `${network.name} UTTProxy was already migrating. Investigate why, then set ROLLOUT_RESUME_MIGRATING=true only to resume this rollout.`
      );
    }
    migrationRecoveryRequired = migratingInitially;
    const needsMutation =
      !implementationIsCurrent || !actionJobIdMatches || migratingInitially;
    if (!needsMutation) {
      await updateRolloutReport({
        networks: {
          [network.name]: {
            status: "completed-no-changes",
            error: null,
            failedAt: null,
            migrationRecoveryRequired: false,
            newImplementation: previousImplementation,
            completedAt: new Date().toISOString(),
          },
        },
      });
      console.log(`${network.name} is already on the requested rollout state.`);
      return;
    }

    if (ownerSigner === null) {
      throw new Error(
        `Execution requires the ${network.name} testnet deployer key in ${signerEnvs[0]}`
      );
    }
    if (!implementationIsCurrent && proxyAdminSigner === null) {
      throw new Error(
        `The ${network.name} upgrade requires the ProxyAdmin owner key in ${signerEnvs[0]}`
      );
    }

    assertFundedSigner(ownerBalance!, `${network.name} UTTProxy owner`);
    if (!implementationIsCurrent) {
      assertFundedSigner(proxyAdminBalance!, `${network.name} ProxyAdmin owner`);
    }
    const transactions: Record<string, unknown> = {};
    const ownerProxy = await ethers.getContractAt(
      "UTTProxy",
      config.proxyAddress,
      ownerSigner.wallet
    );
    if (!migratingInitially) {
      transactions.enableMigration = await waitForSuccessfulTransaction(
        await ownerProxy.startMigrationToNewContract(),
        `Block new ${network.name} proxy actions`
      );
      migrationEnabledByThisRun = true;
      migrationRecoveryRequired = true;
      await updateRolloutReport({
        networks: {
          [network.name]: {
            status: "proxy-actions-blocked",
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
      const upgradeTransaction = getUpgradeTransaction(upgraded, network.name);
      transactions.upgrade = await waitForSuccessfulTransaction(
        upgradeTransaction,
        `Upgrade ${network.name} UTTProxy`
      );
      newImplementation = await upgrades.erc1967.getImplementationAddress(
        config.proxyAddress
      );
      await updateRolloutReport({
        networks: {
          [network.name]: {
            status: "proxy-upgraded",
            newImplementation,
            transactions,
          },
        },
      });
    }

    const configuredProxy = await ethers.getContractAt(
      "UTTProxy",
      config.proxyAddress,
      ownerSigner.wallet
    );
    const installedJobId = await configuredProxy.actionJobId();
    if (installedJobId.toLowerCase() !== expectedActionJobId.toLowerCase()) {
      transactions.setActionJobId = await waitForSuccessfulTransaction(
        await configuredProxy.setActionJobId(config.actionJobId),
        `Set ${network.name} actionJobId`
      );
    }

    await verifyProxyConfiguration({
      proxyAddress: config.proxyAddress,
      expectedImplementation: newImplementation,
      expectedActionJobId,
      expectedOperator: config.operatorAddress,
    });

    if (migrationEnabledByThisRun || resumeMigrating) {
      transactions.disableMigration = await waitForSuccessfulTransaction(
        await configuredProxy.startMigrationToNewContract(),
        `Re-enable ${network.name} proxy actions`
      );
      migrationEnabledByThisRun = false;
      migrationRecoveryRequired = false;
    }

    const finalImplementation =
      await upgrades.erc1967.getImplementationAddress(config.proxyAddress);
    const finalProxy = await ethers.getContractAt("UTTProxy", config.proxyAddress);
    const finalActionJobId = await finalProxy.actionJobId();
    const migratingFinally = await finalProxy.isMigrating();
    if (migratingFinally) {
      throw new Error(`${network.name} UTTProxy remained in migration mode`);
    }
    if (finalActionJobId.toLowerCase() !== expectedActionJobId.toLowerCase()) {
      throw new Error(`${network.name} actionJobId final verification failed`);
    }

    await updateRolloutReport({
      networks: {
        [network.name]: {
          status: "completed",
          error: null,
          failedAt: null,
          migrationRecoveryRequired: false,
          newImplementation: finalImplementation,
          migratingFinally,
          actionJob: {
            externalId: config.actionJobId,
            expectedBytes32: expectedActionJobId,
            currentBytes32: finalActionJobId,
            matches: true,
          },
          transactions,
          completedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`${network.name} implementation: ${finalImplementation}`);
    console.log(`${network.name} actionJobId: ${config.actionJobId}`);
  } catch (error) {
    const message = toErrorMessage(error);
    await updateRolloutReport({
      networks: {
        [network.name]: {
          status: "failed",
          migrationEnabledByThisRun,
          migrationRecoveryRequired,
          error: message,
          failedAt: new Date().toISOString(),
        },
      },
    }).catch(() => undefined);
    if (migrationRecoveryRequired) {
      console.error(
        `${network.name} UTTProxy remains in migration mode. Fix the failure and resume with ROLLOUT_RESUME_MIGRATING=true.`
      );
    }
    throw error;
  }
}

async function readOptionalBytes32(
  contract: Awaited<ReturnType<typeof ethers.getContractAt>>,
  functionName: string
): Promise<string | null> {
  try {
    return String(await (contract as any)[functionName]());
  } catch {
    return null;
  }
}

function assertFundedSigner(balance: bigint, label: string): void {
  if (balance === 0n) {
    throw new Error(`${label} has no native token for gas`);
  }
}

async function verifyProxyConfiguration(args: {
  proxyAddress: string;
  expectedImplementation: string;
  expectedActionJobId: string;
  expectedOperator: string;
}): Promise<void> {
  const implementation = await upgrades.erc1967.getImplementationAddress(
    args.proxyAddress
  );
  assertAddressEquals(
    implementation,
    args.expectedImplementation,
    "UTTProxy implementation"
  );
  const proxy = await ethers.getContractAt("UTTProxy", args.proxyAddress);
  assertAddressEquals(
    await proxy.oracle(),
    args.expectedOperator,
    "UTTProxy Operator"
  );
  if (
    (await proxy.actionJobId()).toLowerCase() !==
    args.expectedActionJobId.toLowerCase()
  ) {
    throw new Error("UTTProxy actionJobId verification failed");
  }
}

function printPreflightSummary(args: {
  execute: boolean;
  networkName: string;
  previousImplementation: string;
  implementationIsCurrent: boolean;
  ownerAddress: string;
  proxyAdminOwner: string;
  migratingInitially: boolean;
  actionJobIdMatches: boolean;
  linkBalance: bigint;
  recommendedLinkBalance: bigint;
}): void {
  console.log(`\n${args.networkName} preflight`);
  console.log(`  mode: ${args.execute ? "EXECUTE" : "READ ONLY"}`);
  console.log(`  implementation: ${args.previousImplementation}`);
  console.log(`  local implementation already active: ${args.implementationIsCurrent}`);
  console.log(`  UTTProxy owner: ${args.ownerAddress}`);
  console.log(`  ProxyAdmin owner: ${args.proxyAdminOwner}`);
  console.log(`  migrating: ${args.migratingInitially}`);
  console.log(`  actionJobId matches: ${args.actionJobIdMatches}`);
  console.log(
    `  LINK balance (wei): ${args.linkBalance} (recommended: ${args.recommendedLinkBalance})`
  );
}

main().catch((error) => {
  console.error(toErrorMessage(error));
  process.exitCode = 1;
});
