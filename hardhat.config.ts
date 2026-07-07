import * as dotenv from "dotenv";

//import "@nomiclabs/hardhat-etherscan";
//import "@nomiclabs/hardhat-waffle";
import "@nomicfoundation/hardhat-toolbox"
import "@openzeppelin/hardhat-upgrades";
import '@typechain/hardhat'
import "hardhat-abi-exporter";

// Not available for current hardhat version:
// import "hardhat-tracer"; 

import { task } from "hardhat/config";

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
        version: "0.8.24",
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
        version: "0.8.20",
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
      {
        version: "0.8.19",
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
        version: "0.8.0",
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
      }
    ],
  },
  networks: {
    testnet_ethereum: {
      url: process.env.TESTNET_ETHEREUM_URL || "",
      accounts:
        process.env.TEST_PRIVATE_KEY !== undefined
          ? [process.env.TEST_PRIVATE_KEY]
          : [],
    },
    polygon: {
      url: process.env.POLYGON_URL || "",
      accounts:
        process.env.MAIN_PRIVATE_KEY !== undefined
          ? [process.env.MAIN_PRIVATE_KEY]
          : [],
    },
    testnet_polygon: {
      url: process.env.TESTNET_POLYGON_URL || "",
      accounts:
        process.env.TEST_PRIVATE_KEY !== undefined
          ? [process.env.TEST_PRIVATE_KEY]
          : [],
      chainId: 80002,
    },
    optimism: {
      url: process.env.OPTIMISM_URL,
      accounts: [process.env.MAIN_PRIVATE_KEY ?? ""],
    },
    testnet_optimism: {
      url: process.env.TESTNET_OPTIMISM_URL,
      accounts: [process.env.TEST_PRIVATE_KEY ?? ""],
    },
    base: { 
      url: process.env.BASE_URL,
      accounts: [process.env.MAIN_PRIVATE_KEY ?? ""],
    },
    testnet_base: { 
      url: process.env.TESTNET_BASE_URL,
      accounts: [process.env.TEST_PRIVATE_KEY ?? ""],
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
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      testnet_ethereum: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      testnet_polygon: process.env.POLYGONSCAN_API_KEY,
      optimism: process.env.OPTIMISM_ETHERSCAN_API_KEY,
      testnet_optimism: process.env.OPTIMISM_ETHERSCAN_API_KEY,
      base: null,
      testnet_base: null
    },
    customChains: [
      {
        network: "testnet_polygon",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://api-amoy.polygonscan.com",
        },
      },
      {
        network: "testnet_optimism",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://api-sepolia-optimistic.etherscan.io",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://base.blockscout.com//api",
          browserURL: "https://base.blockscout.com/"
        }
      },      
      {
        network: "testnet_base",
        chainId: 84532,
        urls: {
          apiURL: "https://base-sepolia.blockscout.com/api",
          browserURL: "https://base-sepolia.blockscout.com"
        }
      }            
    ],
  },
};

export default config;
