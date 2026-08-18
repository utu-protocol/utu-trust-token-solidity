import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect } from "chai";
import { getAddress } from "ethers";

import {
  deepMerge,
  phaseIncludesE2e,
  readBooleanEnv,
  updateRolloutReport,
  withPreservedFile,
} from "../scripts/rollout/common";
import { externalJobIdToBytes32 } from "../scripts/rollout/job-id";
import {
  CANONICAL_TESTNET,
  PROXY_TESTNETS,
} from "../scripts/rollout/testnet-config";

describe("testnet rollout configuration", function () {
  it("should pin the intended canonical and proxy networks", function () {
    expect(CANONICAL_TESTNET.chainId).to.equal(11155111n);
    expect(CANONICAL_TESTNET.proxyAddress).to.equal(
      getAddress("0x537BE61c5EFB865Df53CA55eeA07ceEe5d5fB162")
    );
    expect(PROXY_TESTNETS.testnet_base.chainId).to.equal(84532n);
    expect(PROXY_TESTNETS.testnet_base.proxyAddress).to.equal(
      getAddress("0xC72b7A6146d3D53B614A4769A1A1459882ED4B1A")
    );
    expect(PROXY_TESTNETS.testnet_optimism.chainId).to.equal(11155420n);
    expect(PROXY_TESTNETS.testnet_optimism.proxyAddress).to.equal(
      getAddress("0xbdF3b87B410C50Ba9620d8Ac416A81e6bF7296eF")
    );
  });

  it("should produce exactly 32 bytes for every proxy action job id", function () {
    for (const config of Object.values(PROXY_TESTNETS)) {
      expect(externalJobIdToBytes32(config.actionJobId)).to.match(
        /^0x[0-9a-f]{64}$/
      );
    }
  });

  it("should deep-merge network report updates without losing earlier transactions", function () {
    const merged = deepMerge(
      {
        networks: {
          testnet_base: {
            status: "proxy-upgraded",
            transactions: { upgrade: { hash: "0x01" } },
          },
        },
      },
      {
        networks: {
          testnet_base: {
            status: "completed",
            transactions: { setActionJobId: { hash: "0x02" } },
          },
        },
      }
    );

    expect(merged).to.deep.equal({
      networks: {
        testnet_base: {
          status: "completed",
          transactions: {
            upgrade: { hash: "0x01" },
            setActionJobId: { hash: "0x02" },
          },
        },
      },
    });
  });

  it("should atomically persist bigint values in a rollout report", async function () {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "utu-rollout-test-")
    );
    const reportPath = path.join(temporaryDirectory, "report.json");
    const previousReportPath = process.env.ROLLOUT_REPORT_PATH;
    process.env.ROLLOUT_REPORT_PATH = reportPath;

    try {
      await updateRolloutReport({ chainId: 84532n });
      await updateRolloutReport({ status: "completed" });
      expect(JSON.parse(fs.readFileSync(reportPath, "utf8"))).to.deep.equal({
        chainId: "84532",
        status: "completed",
      });
      expect(fs.readdirSync(temporaryDirectory)).to.deep.equal(["report.json"]);
    } finally {
      if (previousReportPath === undefined) {
        delete process.env.ROLLOUT_REPORT_PATH;
      } else {
        process.env.ROLLOUT_REPORT_PATH = previousReportPath;
      }
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("should restore OpenZeppelin manifests after read-only validation", async function () {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "utu-manifest-test-")
    );
    const manifestPath = path.join(temporaryDirectory, "manifest.json");
    fs.writeFileSync(manifestPath, "original\n");

    try {
      await withPreservedFile(manifestPath, true, async () => {
        fs.writeFileSync(manifestPath, "generated\n");
      });
      expect(fs.readFileSync(manifestPath, "utf8")).to.equal("original\n");
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("should reject ambiguous boolean environment values", function () {
    const previousValue = process.env.ROLLOUT_TEST_BOOLEAN;
    process.env.ROLLOUT_TEST_BOOLEAN = "sometimes";
    try {
      expect(() => readBooleanEnv("ROLLOUT_TEST_BOOLEAN", false)).to.throw(
        "ROLLOUT_TEST_BOOLEAN must be true or false"
      );
    } finally {
      if (previousValue === undefined) {
        delete process.env.ROLLOUT_TEST_BOOLEAN;
      } else {
        process.env.ROLLOUT_TEST_BOOLEAN = previousValue;
      }
    }
  });

  it("should keep E2E requirements separate from deployment", function () {
    expect(phaseIncludesE2e("deploy")).to.equal(false);
    expect(phaseIncludesE2e("canonical")).to.equal(false);
    expect(phaseIncludesE2e("proxies")).to.equal(false);
    expect(phaseIncludesE2e("e2e")).to.equal(true);
    expect(phaseIncludesE2e("all")).to.equal(true);
  });
});
