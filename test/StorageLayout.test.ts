import fs from "node:fs";

import { expect } from "chai";
import {
  assertStorageUpgradeSafe,
  type StorageLayout,
} from "@openzeppelin/upgrades-core";
import { artifacts } from "hardhat";

describe("Deployed UTT storage compatibility", function () {
  it("should preserve all pre-disapproval Endorsement slots", async function () {
    const currentLayout = await getCurrentUttStorageLayout();
    const expectedSlots: Record<string, string> = {
      O_n: "405",
      D_n: "406",
      D_lvl1: "407",
      D_lvl2: "408",
      D_o: "409",
      previousEndorserStakes: "410",
      totalStake: "411",
      oracleRequests: "412",
      oracle: "413",
      jobId: "414",
      fee: "415",
      D_d: "416",
      D_min: "417",
      socialConnections: "465",
    };

    for (const [label, expectedSlot] of Object.entries(expectedSlots)) {
      const item = currentLayout.storage.find((entry) => entry.label === label);
      expect(item, `${label} missing from UTT storage layout`).to.not.equal(undefined);
      expect(item!.slot, `${label} moved from its expected slot`).to.equal(expectedSlot);
    }
  });

  it("should be upgrade-safe from the tracked Sepolia implementation", async function () {
    const currentLayout = await getCurrentUttStorageLayout();
    const deployedLayout = getTrackedLayout(
      ".openzeppelin/sepolia.json",
      "0x89fA6ee038f3b4D8C050c6E1709Fa3d19d9be49E"
    );

    expect(() =>
      assertStorageUpgradeSafe(deployedLayout, currentLayout, false)
    ).not.to.throw();
  });

  it("should be upgrade-safe from the tracked Polygon implementation", async function () {
    const currentLayout = await getCurrentUttStorageLayout();
    const deployedLayout = getTrackedLayout(
      ".openzeppelin/polygon.json",
      "0x9147E7DD575926239E4b5Ac96B4663847A07c0b1"
    );

    expect(() =>
      assertStorageUpgradeSafe(deployedLayout, currentLayout, false)
    ).not.to.throw();
  });
});

async function getCurrentUttStorageLayout(): Promise<StorageLayout> {
  const buildInfo = await artifacts.getBuildInfo("contracts/UTT.sol:UTT");
  if (buildInfo === undefined) {
    throw new Error("UTT build info is unavailable; compile before running tests");
  }
  const compilerLayout = (
    buildInfo.output.contracts["contracts/UTT.sol"].UTT as unknown as {
      storageLayout: StorageLayout;
    }
  ).storageLayout;

  return {
    solcVersion: buildInfo.solcVersion,
    storage: compilerLayout.storage.map((item) => ({
      ...item,
      src: item.src ?? "",
    })),
    types: compilerLayout.types,
  } as StorageLayout;
}

function getTrackedLayout(filePath: string, implementationAddress: string): StorageLayout {
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    impls: Record<string, { address: string; layout: StorageLayout }>;
  };
  const deployment = Object.values(manifest.impls).find(
    ({ address }) => address.toLowerCase() === implementationAddress.toLowerCase()
  );
  if (deployment === undefined) {
    throw new Error(`${implementationAddress} is missing from ${filePath}`);
  }
  return deployment.layout;
}
