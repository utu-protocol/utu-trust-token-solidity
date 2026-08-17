import fs from "node:fs";
import path from "node:path";

import {
  Contract,
  Provider,
  TransactionReceipt,
  TransactionResponse,
  Wallet,
  ZeroAddress,
  getAddress,
  isAddress,
  keccak256,
} from "ethers";

export interface RolloutWallet {
  wallet: Wallet;
  sourceEnv: string;
}

export interface TransactionRecord {
  hash: string;
  blockNumber: number;
  gasUsed: string;
}

type JsonObject = Record<string, unknown>;

const TRUE_VALUES = new Set(["1", "true", "yes"]);

export function isExecutionEnabled(): boolean {
  return readBooleanEnv("ROLLOUT_EXECUTE", false);
}

export function phaseIncludesE2e(phase: string | undefined): boolean {
  return phase === "all" || phase === "e2e";
}

export function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue.trim() === "") {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }
  if (["0", "false", "no"].includes(normalized)) {
    return false;
  }

  throw new Error(`${name} must be true or false`);
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function optionalAddressList(name: string): string[] {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    return [];
  }

  const addresses = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      if (!isAddress(value) || value === ZeroAddress) {
        throw new Error(`${name} contains an invalid or zero address`);
      }
      return getAddress(value);
    });

  return [...new Set(addresses)];
}

export function walletFromEnv(
  envNames: string[],
  provider: Provider,
  label: string
): RolloutWallet {
  const configuredWallet = optionalWalletFromEnv(envNames, provider);
  if (configuredWallet !== null) {
    return configuredWallet;
  }

  throw new Error(
    `Missing ${label} private key. Set one of: ${envNames.join(", ")}`
  );
}

export function optionalWalletFromEnv(
  envNames: string[],
  provider: Provider
): RolloutWallet | null {
  const sourceEnv = envNames.find((name) => process.env[name]?.trim());
  if (!sourceEnv) {
    return null;
  }

  try {
    return {
      wallet: new Wallet(process.env[sourceEnv]!.trim(), provider),
      sourceEnv,
    };
  } catch {
    throw new Error(`${sourceEnv} does not contain a valid private key`);
  }
}

export function assertAddressEquals(
  actual: string,
  expected: string,
  label: string
): void {
  if (getAddress(actual) !== getAddress(expected)) {
    throw new Error(
      `${label} mismatch: expected ${getAddress(expected)}, received ${getAddress(actual)}`
    );
  }
}

export async function assertHasCode(
  provider: Provider,
  address: string,
  label: string
): Promise<void> {
  if ((await provider.getCode(address)) === "0x") {
    throw new Error(`${label} ${getAddress(address)} has no deployed bytecode`);
  }
}

export async function getProxyAdminOwner(
  provider: Provider,
  adminAddress: string
): Promise<string> {
  const adminCode = await provider.getCode(adminAddress);
  if (adminCode === "0x") {
    return getAddress(adminAddress);
  }

  const proxyAdmin = new Contract(
    adminAddress,
    ["function owner() view returns (address)"],
    provider
  );
  return getAddress(await proxyAdmin.owner());
}

export function runtimeBytecodeMatches(
  deployedCode: string,
  artifactDeployedBytecode: string
): boolean {
  if (deployedCode === "0x" || artifactDeployedBytecode === "0x") {
    return false;
  }
  return keccak256(deployedCode) === keccak256(artifactDeployedBytecode);
}

export async function waitForSuccessfulTransaction(
  transaction: TransactionResponse,
  label: string
): Promise<TransactionRecord> {
  const confirmations = getConfirmations();
  console.log(`${label}: submitted ${transaction.hash}`);
  const receipt = await transaction.wait(confirmations);
  if (receipt === null || receipt.status !== 1) {
    throw new Error(`${label} transaction failed: ${transaction.hash}`);
  }

  console.log(`${label}: confirmed in block ${receipt.blockNumber}`);
  return transactionRecord(receipt);
}

export function getConfirmations(): number {
  const rawValue = process.env.ROLLOUT_CONFIRMATIONS?.trim() ?? "1";
  const confirmations = Number(rawValue);
  if (!Number.isSafeInteger(confirmations) || confirmations < 1) {
    throw new Error("ROLLOUT_CONFIRMATIONS must be a positive integer");
  }
  return confirmations;
}

export function parsePositiveIntegerEnv(name: string, defaultValue?: bigint): bigint {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable ${name}`);
  }

  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`${name} must be a positive integer`);
  }
  const parsed = BigInt(rawValue);
  if (parsed <= 0n) {
    throw new Error(`${name} must be greater than zero`);
  }
  return parsed;
}

export async function updateRolloutReport(patch: JsonObject): Promise<void> {
  const reportPath = path.resolve(requireEnv("ROLLOUT_REPORT_PATH"));
  await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });

  let current: JsonObject = {};
  try {
    current = JSON.parse(await fs.promises.readFile(reportPath, "utf8")) as JsonObject;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const merged = deepMerge(current, patch);
  const temporaryPath = `${reportPath}.${process.pid}.tmp`;
  await fs.promises.writeFile(
    temporaryPath,
    `${JSON.stringify(merged, jsonReplacer, 2)}\n`,
    { mode: 0o600 }
  );
  await fs.promises.rename(temporaryPath, reportPath);
}

export async function withPreservedFile<T>(
  filePath: string,
  preserve: boolean,
  action: () => Promise<T>
): Promise<T> {
  if (!preserve) {
    return action();
  }

  const absolutePath = path.resolve(filePath);
  let originalContents: Buffer | null = null;
  try {
    originalContents = await fs.promises.readFile(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  try {
    return await action();
  } finally {
    if (originalContents === null) {
      await fs.promises.rm(absolutePath, { force: true });
    } else {
      await fs.promises.writeFile(absolutePath, originalContents);
    }
  }
}

export function deepMerge(base: JsonObject, patch: JsonObject): JsonObject {
  const result: JsonObject = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = result[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMerge(existing, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function transactionRecord(receipt: TransactionReceipt): TransactionRecord {
  return {
    hash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
