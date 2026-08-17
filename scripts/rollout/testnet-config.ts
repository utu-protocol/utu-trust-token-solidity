import { getAddress } from "ethers";

import { normalizeExternalJobId } from "./job-id";

export interface CanonicalTestnetConfig {
  network: "testnet_ethereum";
  chainId: bigint;
  proxyAddress: string;
  linkTokenAddress: string;
  expectedOracleFee: bigint;
  desiredDd: bigint;
  desiredDMin: bigint;
  manifestPath: string;
}

export interface ProxyTestnetConfig {
  network: "testnet_base" | "testnet_optimism";
  chainId: bigint;
  proxyAddress: string;
  operatorAddress: string;
  linkTokenAddress: string;
  actionJobId: string;
  manifestPath: string;
}

export const CANONICAL_TESTNET: CanonicalTestnetConfig = {
  network: "testnet_ethereum",
  chainId: 11155111n,
  proxyAddress: getAddress("0x537BE61c5EFB865Df53CA55eeA07ceEe5d5fB162"),
  linkTokenAddress: getAddress("0x779877A7B0D9E8603169DdbD7836e478b4624789"),
  expectedOracleFee: 100000000000n,
  desiredDd: 5n,
  desiredDMin: 50n,
  manifestPath: ".openzeppelin/sepolia.json",
};

export const PROXY_TESTNETS: Record<ProxyTestnetConfig["network"], ProxyTestnetConfig> = {
  testnet_base: {
    network: "testnet_base",
    chainId: 84532n,
    proxyAddress: getAddress("0xC72b7A6146d3D53B614A4769A1A1459882ED4B1A"),
    operatorAddress: getAddress("0x1380FD912C44F3860D17EB6221F861F9c4611D97"),
    linkTokenAddress: getAddress("0xE4aB69C077896252FAFBD49EFD26B5D171A32410"),
    actionJobId: normalizeExternalJobId("a9ffd71b7f674f14bc71f78063204450"),
    manifestPath: ".openzeppelin/base-sepolia.json",
  },
  testnet_optimism: {
    network: "testnet_optimism",
    chainId: 11155420n,
    proxyAddress: getAddress("0xbdF3b87B410C50Ba9620d8Ac416A81e6bF7296eF"),
    operatorAddress: getAddress("0x6934c1F62a6d28a573E2b4071a754DDd29B81E54"),
    linkTokenAddress: getAddress("0xE4aB69C077896252FAFBD49EFD26B5D171A32410"),
    actionJobId: normalizeExternalJobId("318c8baf-0670-4465-8e98-9266895105be"),
    manifestPath: ".openzeppelin/op-sepolia.json",
  },
};

export function getProxyTestnetConfig(networkName: string): ProxyTestnetConfig {
  if (networkName !== "testnet_base" && networkName !== "testnet_optimism") {
    throw new Error(
      `Unsupported proxy rollout network '${networkName}'. Expected testnet_base or testnet_optimism.`
    );
  }

  return PROXY_TESTNETS[networkName];
}
