import * as dotenv from "dotenv";

import "@appliedblockchain/chainlink-plugins-fund-link";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "hardhat-abi-exporter";
import "hardhat-gas-reporter";
import "hardhat-tracer";
import { task } from "hardhat/config";
import "solidity-coverage";

dotenv.config();
require("./tasks");
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config = {
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
        contractSizer: {
          alphaSort: true,
          runOnCompile: true,
          disambiguatePaths: false,
        },
      },
      // Operator
      // Operator
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
        contractSizer: {
          alphaSort: true,
          runOnCompile: true,
          disambiguatePaths: false,
        },
      },
      {
        version: "0.7.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
        contractSizer: {
          alphaSort: true,
          runOnCompile: true,
          disambiguatePaths: false,
        },
      },
      // LinkToken
      {
        version: "0.4.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
        contractSizer: {
          alphaSort: true,
          runOnCompile: true,
          disambiguatePaths: false,
        },
      },
      {
        version: "0.4.23",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
        contractSizer: {
          alphaSort: true,
          runOnCompile: true,
          disambiguatePaths: false,
        },
      },
      {
        version: "0.4.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
        contractSizer: {
          alphaSort: true,
          runOnCompile: true,
          disambiguatePaths: false,
        },
      },
    ],
  },
  networks: {
    matic: {
      url: process.env.MATIC_URL || "",
      accounts:
        process.env.MAIN_PRIVATE_KEY !== undefined
          ? [process.env.MAIN_PRIVATE_KEY]
          : [],
    },
    mumbai: {
      url: process.env.MUMBAI_URL || "",
      accounts:
        process.env.TEST_PRIVATE_KEY !== undefined
          ? [process.env.TEST_PRIVATE_KEY]
          : [],
    },
    testnet_aurora: {
      url: process.env.AURORA_URL || "https://testnet.aurora.dev",
      accounts: [process.env.TEST_PRIVATE_KEY ?? ""],
      chainId: 1313161555,
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.TEST_PRIVATE_KEY !== undefined
          ? [process.env.TEST_PRIVATE_KEY]
          : [],
    },
    ganache: {
      url: process.env.GANACHE_URL || "http://127.0.0.1:7545",
      accounts:
        process.env.TEST_PRIVATE_KEY !== undefined
          ? [process.env.TEST_PRIVATE_KEY]
          : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "testnet_aurora",
        chainId: 1313161555,
        urls: {
          apiURL: "https://explorer.testnet.aurora.dev/api",
          browserURL: "https://explorer.testnet.aurora.dev",
        },
      },
    ],
  },
};

export default config;
