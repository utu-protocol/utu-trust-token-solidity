# UTU Trust Token Contract

This project contains the UTU Trust Token (UTT) smart contract, which implements UTU Protocol, a decentralized trust and reputation system that enables endorsements, rewards, and penalties between users. The mechanism and tokenomics are detailed in the [UTU Protocol Whitepaper](https://docs.google.com/document/d/1syxWDbJ5Ch0OiMiMfPQ3AWDiyY0Ol4pLJacTvczDo6I/edit?usp=sharing).

## Existing Deployments

There are two types of UTT deployments:
1. The main UTT contract on Polygon main net and on Ethereum Sepolia test net.
2. UTTProxy deployments on other chains (main and test nets) to allow users of those chains to interact with UTT directly on their chain; calls are forwarded to the main UTT contract via oracle.

Additionally, we have `Lock` deployments from [Unlock Protocol](https://unlock-protocol.com/) to facilitate charging fees for accessing feedback details.

## Main Nets

- UTT main contract on Polygon
  - Upgradable proxy: [0xE62dc4c82a9749Bf2E40F73138B3CFee0a2EC89F](https://polygonscan.com/address/0xe62dc4c82a9749bf2e40f73138b3cfee0a2ec89f)
  - Current implementation: [0x9147E7DD575926239E4b5Ac96B4663847A07c0b1](https://polygonscan.com/address/0x9147e7dd575926239e4b5ac96b4663847a07c0b1#code)
  - Oracle operator contract: [0x73ac0B4ba4Fc1c42B8DFFA39f3E4E0e95eb9b8Fd](https://polygonscan.com/address/0x73ac0B4ba4Fc1c42B8DFFA39f3E4E0e95eb9b8Fd)
- UTT proxy contract on Aurora:
  - Upgradable proxy: [0xaE53DcC63d7895600e2510A986Dc2b65c953E26c](https://explorer.mainnet.aurora.dev/address/0xaE53DcC63d7895600e2510A986Dc2b65c953E26c)
  - Current implementation: [0x90C6B69383695b4Dc4125ca010C61f78dff93fb0](https://explorer.mainnet.aurora.dev/address/0x90C6B69383695b4Dc4125ca010C61f78dff93fb0)
  - Oracle operator contract: [0xC17985dfBF775aB5DAA9F9328423481d3Bb76f37](https://explorer.mainnet.aurora.dev/address/0xC17985dfBF775aB5DAA9F9328423481d3Bb76f37)
  - UTU Coin: [0x7aa1a72f744Cdcd4c89918AEBFbe4F1d1D1156E6](https://explorer.mainnet.aurora.dev/address/0x7aa1a72f744Cdcd4c89918AEBFbe4F1d1D1156E6)
- UTT proxy contract on Optimism:
  - Upgradable proxy: [0xb2e9dB661F992d2F3013e4AFcE01C72d52f58A37](https://optimistic.etherscan.io/address/0xb2e9dB661F992d2F3013e4AFcE01C72d52f58A37)
  - Current implementation: [0x53b6B5477193cCEdF9457F42a1591759cE75A095](https://optimistic.etherscan.io/address/0x53b6b5477193ccedf9457f42a1591759ce75a095)
  - Oracle operator contract: [0x68d806F671dcBdaF0bB7f4E836EE2dFe30Ba131C](https://optimistic.etherscan.io/address/0x68d806F671dcBdaF0bB7f4E836EE2dFe30Ba131C)
  - UTU Coin (bridged from Ethereum): [0xf7dC37493e2e375dFDEbec75E71D555af68648Bf](https://optimistic.etherscan.io/token/0xf7dC37493e2e375dFDEbec75E71D555af68648Bf)
- UTT proxy contract on LISK:
  - Upgradable proxy: [0x3B2A3a6E8C087fe399a24e08D3Cab12f17e033C3](https://blockscout.lisk.com/address/0x3B2A3a6E8C087fe399a24e08D3Cab12f17e033C3)
  - Current implementation: [0x53b6B5477193cCEdF9457F42a1591759cE75A095](https://blockscout.lisk.com/address/0x53b6B5477193cCEdF9457F42a1591759cE75A095)
  - Oracle operator contract: [0x68d806F671dcBdaF0bB7f4E836EE2dFe30Ba131C](https://blockscout.lisk.com/address/0x68d806F671dcBdaF0bB7f4E836EE2dFe30Ba131C)
  - UTU Coin (bridged from Ethereum): [0x398697b203cA909e05690B6684D56938964b07A0](https://blockscout.lisk.com/address/0x398697b203cA909e05690B6684D56938964b07A0)

  
## Test Nets

- UTT contract on Ethereum Testnet (Sepolia):
    - Upgradable proxy: [0x537BE61c5EFB865Df53CA55eeA07ceEe5d5fB162](https://sepolia.etherscan.io/address/0x537BE61c5EFB865Df53CA55eeA07ceEe5d5fB162)
    - Current implementation: [0x89fA6ee038f3b4D8C050c6E1709Fa3d19d9be49E](https://sepolia.etherscan.io/address/0x89fa6ee038f3b4d8c050c6e1709fa3d19d9be49e)
    - Oracle operator contract: [0x9F0E25966DdCEa17524CED8bC8Fe2C78a29B5cAA](https://sepolia.etherscan.io/address/0x9F0E25966DdCEa17524CED8bC8Fe2C78a29B5cAA)
    - UTU Coin (mock): [0xC3586558ddb1Cc6C7c5338691842b8d5F47D253d](https://sepolia.etherscan.io/address/0xC3586558ddb1Cc6C7c5338691842b8d5F47D253d)
  - Unlock Protocol UTU Lock: [0x833601B71Ee6Bc5f62416DCc54a5e329BD04b9A5](https://app.unlock-protocol.com/locks/lock?address=0x833601B71Ee6Bc5f62416DCc54a5e329BD04b9A5&network=11155111)
- UTT contract on Polygon Testnet (Amoy):
  - Upgradable proxy: [0xCa5cD80157334dAc231B65d886467B036CDf0024](https://amoy.polygonscan.com/address/0xCa5cD80157334dAc231B65d886467B036CDf0024)
  - Current implementation: [0xC72b7A6146d3D53B614A4769A1A1459882ED4B1A](https://amoy.polygonscan.com/address/0xC72b7A6146d3D53B614A4769A1A1459882ED4B1A#code)
  - Oracle operator contract: [0x0880633c47A2cba76Ef082e2bCD2103Af14c68EE](https://amoy.polygonscan.com/address/0x0880633c47A2cba76Ef082e2bCD2103Af14c68EE)
  - UTU Coin (mock): [0xfD458e4fb718eFAAEf0e28597b9cF6D5C240E8f7](https://amoy.polygonscan.com/address/0xfD458e4fb718eFAAEf0e28597b9cF6D5C240E8f7)
- UTT proxy contract on Aurora Testnet:
  - Upgradable proxy: [0x2ac7F081f8eB51ce393bA298e4C020b0DeF420E1](https://explorer.testnet.aurora.dev/address/0x2ac7F081f8eB51ce393bA298e4C020b0DeF420E1/transactions#address-tabs)
  - Current implementation: [0xd6A3423cCAB82efDC507EBefFEcEd576577d17E2](https://explorer.testnet.aurora.dev/address/0xd6A3423cCAB82efDC507EBefFEcEd576577d17E2)
  - Oracle operator contract: [0xbeF02f42F30b1233977DF88986DbB4D27D9c5b09](https://explorer.testnet.aurora.dev/address/0xbeF02f42F30b1233977DF88986DbB4D27D9c5b09)
  - UTU Coin (mock): [0xb0fc0bA00acDF415de3b66047E9CEE562C569bA1](https://explorer.testnet.aurora.dev/address/0xb0fc0bA00acDF415de3b66047E9CEE562C569bA1)
    (this version is mocked, not bridged)
- UTT proxy contract on Optimism Sepolia Testnet:
  - Upgradable proxy: [0xbdF3b87B410C50Ba9620d8Ac416A81e6bF7296eF](https://sepolia-optimistic.etherscan.io/address/0xbdF3b87B410C50Ba9620d8Ac416A81e6bF7296eF)
  - Current implementation: [0xC3586558ddb1Cc6C7c5338691842b8d5F47D253d](https://sepolia-optimistic.etherscan.io/address/0xC3586558ddb1Cc6C7c5338691842b8d5F47D253d)
  - Oracle operator contract: [0x6934c1F62a6d28a573E2b4071a754DDd29B81E54](https://sepolia-optimistic.etherscan.io/address/0x6934c1F62a6d28a573E2b4071a754DDd29B81E54)
  - UTU Coin (bridged from Ethereum Sepolia testnet): [tbd](tbd)
- UTT proxy contract on LISK Sepolia Testnet:
  - Upgradable proxy: [0x0125f1E709eC3dEA2aD8152826fD4b9496086B71](https://sepolia-blockscout.lisk.com/address/0x0125f1E709eC3dEA2aD8152826fD4b9496086B71)
  - Current implementation: [0xbdF3b87B410C50Ba9620d8Ac416A81e6bF7296eF](https://sepolia-blockscout.lisk.com/address/0xbdF3b87B410C50Ba9620d8Ac416A81e6bF7296eF)
  - Oracle operator contract: [0xC3586558ddb1Cc6C7c5338691842b8d5F47D253d](https://sepolia-blockscout.lisk.com/address/0xC3586558ddb1Cc6C7c5338691842b8d5F47D253d)
  - UTU Coin (bridged from Ethereum Sepolia testnet): [0x4b82a31EBCD41fD4b98123cF141853aCD1166875](https://sepolia-blockscout.lisk.com/address/0x4b82a31EBCD41fD4b98123cF141853aCD1166875)
- UTT contract on Base Testnet (Sepolia):
  - Upgradable proxy: [0x2b4F9c644b0C8010bB26Fc572001A156F9371C48](https://base-sepolia.blockscout.com/address/0x2b4F9c644b0C8010bB26Fc572001A156F9371C48)
  - Current implementation: [0xbdF3b87B410C50Ba9620d8Ac416A81e6bF7296eF](https://base-sepolia.blockscout.com/address/0xbdF3b87B410C50Ba9620d8Ac416A81e6bF7296eF)
  - Oracle operator contract: [0xC3586558ddb1Cc6C7c5338691842b8d5F47D253d](https://base-sepolia.blockscout.com/address/0xC3586558ddb1Cc6C7c5338691842b8d5F47D253d)
  - UTU Coin (bridged from Ethereum Sepolia testnet): [0x6934c1F62a6d28a573E2b4071a754DDd29B81E54](https://base-sepolia.blockscout.com/address/0x6934c1F62a6d28a573E2b4071a754DDd29B81E54)  


## Building, Testing

### Compile the contract
```shell
npm run build
```

### Run tests
```shell
npm run test
```

### Start a local testnet
```shell
npm start
```

### Generate upgraded test contracts
To test upgradeability of contracts, particularly that all base contracts have a `__gap` for future storage variables, there's  [scripts/generate-upgraded-test-contracts.ts](scripts/generate-upgraded-test-contracts.ts) 

To run it:
```shell
npm run generate-upgraded-test-contracts

```

It generates upgraded test contracts for all contracts in the contracts directory, adding a variable to each so that we can test that the upgrade was successful. The generated files for non-upgradable contracts (Operator.sol, UTTProxy.sol) should be removed.

It also prints out the code to add to the "Should allow contract upgrading with other attributes and functions" test in UTT.test.ts. Remove lines for non-upgradable contracts (such as Operator.sol, UTTProxy.sol).

## Architecture

### Main UTT Contract Architecture

The main UTT contract on Polygon mainnet is built using a modular, upgradeable architecture that combines multiple inheritance layers; each inherited contract's purpose is to implement specific aspects of the total UTT functionality.

#### Contract Hierarchy
```
UTT (Main Contract)
├── MigratableReward
│   ├── Reward (UTU Coin reward distribution)
│   ├── MigratableEndorsement (Data migration for endorsements)
│   │   ├── Migratable (Base migration functionality)
│   │   └── Endorsement (Core endorsement logic)
│   │       ├── ChainlinkClient (Oracle integration)
│   │       ├── EndorsementInterface
│   │       └── Roles (Access control)
│   └── MigratableSocialConnector (Social media account linking)
│       ├── Migratable
│       └── SocialConnector
├── ERC20BurnableUpgradeable (Token burning capability)
└── ERC20PausableUpgradeable (Emergency pause functionality)
```

#### Core Functionality Modules

1. **Token Properties**:
   - ERC20 token with 0 decimals (whole numbers only)
   - Non-transferable (transfers are blocked)
   - Burnable 
   - Pausable for emergency controls
   - Upgradeable using OpenZeppelin proxy pattern

2. **Endorsement System** (`Endorsement.sol`):
   - `endorse()`: Direct endorsements on Polygon
   - `proxyEndorse()`: Cross-chain endorsements from proxy contracts (requires `PROXY_ENDORSER_ROLE`), see below.
   - Chainlink oracle integration for fetching previous endorsers
   - Reward calculations based on previous endorsers, see white paper.

3. **Reward Distribution** (`Reward.sol`):
   - UTT token rewards for endorsements
   - UTU Coin reward distribution (separate ERC20 token)
     - Requires being connected to whitelisted social media platforms
     - `claimUTURewards()`: Claim accumulated UTU Coin rewards
     - `proxyClaimRewards()`: Cross-chain reward claiming

4. **Social Connector** (`SocialConnector.sol`):
   - Link Ethereum addresses to social media accounts
   - `addConnection()`: Connect social media accounts (requires `SOCIAL_CONNECTOR_ROLE`)
   - Rewards for verified social connections (once only per address and platforms)

5. **Role-Based Access Control** (`Roles.sol`):
   - `DEFAULT_ADMIN_ROLE`: Contract administration
   - `PROXY_ENDORSER_ROLE`: Allows oracle to execute cross-chain endorsements
   - `SOCIAL_CONNECTOR_ROLE`: Allows social media connector service to connect accounts

6. **Migration System** (`Migratable*.sol`):
   - Support for migrating data from previous contract versions
   - Endorsement data migration
   - Social connection migration
   - Balance migration
   - Migration state controls

#### Key Technical Features

- **Upgradeability**: Uses OpenZeppelin's upgradeable proxy pattern with proper storage gaps
- **Oracle Integration**: Chainlink oracles fetch endorsement history for reward calculations
- **Cross-Chain Support**: Special functions (`proxyEndorse`, `proxyClaimRewards`) for proxy contract calls
- **Data Migration**: Comprehensive migration system for contract upgrades
- **Access Control**: Granular role-based permissions for different operations

### Cross-Chain Proxy Design

The UTU Trust Token system uses a cross-chain proxy architecture to enable users on multiple EVM chains to interact with the main UTT contract deployed on Polygon mainnet. 

This architecture's purpose is to allow the system to maintain a single source of truth on Polygon while providing native UX, and therefore easy intergratability into apps, on other chains.

#### Proxy Mechanism Components

1. **Main UTT Contract** (Polygon mainnet): The authoritative contract containing all state, logic, and token balances
2. **UTTProxy Contracts** (Other chains): Stateless proxy contracts that forward calls to the main contract via Chainlink oracles
3. **Chainlink Oracle Infrastructure**: Facilitates cross-chain communication between proxy contracts and the main contract

#### Proxy Mechanism Properties

- **Stateless Proxies**: UTTProxy contracts don't hold any business logic state - they're pure proxies that forward operations
- **Oracle-Mediated Communication**: All cross-chain calls go through Chainlink oracles with specific job configurations
- **Role-Based Access**: The oracle node wallet must have `PROXY_ENDORSER_ROLE` on the main UTT contract to execute proxy operations
- **Two-Way Communication**:
  - Endorsements: User → UTTProxy → Oracle → Main UTT Contract
  - Reward Claims: User → UTTProxy → Oracle → Query Main UTT → Execute Claim → Return Result

#### Oracle Jobs

Two distinct Chainlink jobs handle cross-chain operations:

1. **UTT Proxy Endorse Job**: Listens for endorsement requests on proxy chains and executes `proxyEndorse()` on the main contract
2. **UTT Proxy Claim Rewards Job**: Handles reward claiming by querying claimable amounts and executing `proxyClaimRewards()` on the main contract

#### Data Flow Example (Endorsement)
```
User (Chain B) → UTTProxy.endorse() → Oracle Request → Chainlink Node →
Main UTT.proxyEndorse() (Polygon) → Oracle Response → UTTProxy fulfillment
```


## Deploying

### Deploy Oracle Contract

1. `npm run deploy:operator -- --network <network>`[^1] 
2. [Set up a Chainlink node](https://github.com/utu-protocol/utu-trust-token-solidity/main/README.md#set-up-a-chainlink-node-in-aws)
3. Whitelist the node address by calling `setAuthorizedSenders` from the `Operator` contract
4. Create jobs according to the job specification files in [chainlink-jobs](chainlink-jobs); each job has an external id, which is included in the job specification file. The external id is used in the `UTT` and `UTTProxy` contracts to identify the job.

[^1]: One can also deploy [Chainlink Operator v0.7 Contract](https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.7/Operator.sol) via [Remix](https://remix.ethereum.org/), or by cloning the [Chainlink contracts repo](https://github.com/smartcontractkit/chainlink/tree/develop/contracts) and using Hardhat

### Deploy UTT Contract

The following require the `PRIVATE_KEY` and `<NETWORK>_URL`
environment variables to be set appropriately.

Create a deploy args config file in `scripts/` named `deploy.args.${network}.js` for the network you want to deploy on. 

Example for the Ethereum testnet deployment:

```javascript
const { ethers } = require("hardhat");

module.exports = [
	1000000, // UTT assigned to deployer for testing
	"0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f", // Ethereum testnet oracle contract address
	"0eec7e1dd0d2476ca1a872dfb6633f48", // External Job ID for the "UTT Check Previous Endorsers Job"
	parseEther("0.0001"), // Ethereum testnet LINK fee
	"0x779877A7B0D9E8603169DdbD7836e478b4624789" // Ethereum testnet LINK token address
]
```

We need to provide a node URL to the deployer, e.g. for Ethereum testnet:

```TESTNET_ETHEREUM_URL=https://eth-sepolia.g.alchemy.com/v2/<key>```

Deploy on `<network>` (e.g. `testnet_ethereum`):
```shell
npm run deploy -- --network <network>
```

### Deploy Proxy Contract

Follow these steps to deploy UTTProxy on a new chain, let's call it "target chain", and connect it to the main UTT contract:

#### 1. Prerequisites Setup

**Environment Variables:**

Add/update in .env (or console environment):
- `<NETWORK>_URL` - RPC endpoint for the new chain
- Appropriate API keys for contract verification (if supported)
- `TEST_PRIVATE_KEY` or `MAIN_PRIVATE_KEY` - Deployer wallet private key, should be same as for other networks; 
  - Our testnet deployer wallet is 0xc8c745De6a84DFF8E604c1fD4BE18baDd8433135
  - Our mainnet deployer wallet is 0x0D1e9d15F6198C5458ca0Cd24b48f4D9B4AB942e

**Network Configuration:**
Add new network configuration in `hardhat.config.ts`:

1. **Add to networks section:**
```javascript
new_chain: {
  url: process.env.NEW_CHAIN_URL,
  accounts: [process.env.MAIN_PRIVATE_KEY ?? ""],
  chainId: <chain_id>
}
```

2. **Add to etherscan.customChains for contract verification:**
```javascript
{
  network: "new_chain",
  chainId: <chain_id>,
  urls: {
    apiURL: "https://<explorer_domain>/api",
    browserURL: "https://<explorer_domain>"
  }
}
```

**Note:** For Blockscout explorers, set the corresponding `etherscan.apiKey` entry to `null` (no API key required). For Etherscan-based explorers, you'll need to provide the appropriate API key.

#### 2. Find or Deploy LINK Token 

If the target chain is already supported by Chainlink and has a faucet, we can use this. LINK token addresses on all supported chains are [listed in the Chainlink docs](https://docs.chain.link/resources/link-token-contracts). 

Otherwise, we can deploy our own LINK token like so:

```bash
npm run deploy:link-token -- --network <new_chain>
```

Note down the address for the next step.

#### 3. Deploy Chainlink Operator Contract

Create `scripts/deploy.operator.args.<new_chain>.js`:
```javascript
module.exports = [
  "0x<LINK_TOKEN_ADDRESS>", // LINK token address on this chain
];
```

```bash
npm run deploy:operator -- --network <new_chain>
```

**Verify Operator Contract:**
```bash
npm run verify -- --constructor-args ./scripts/deploy.operator.args.<new_chain>.js --contract contracts/mocks/Operator.sol:UTUOperator --network <new_chain> <operator_address>
```

#### 4. Configure Oracle Node Jobs

**Configure Job Parameters:**
Create network-specific job configuration in `chainlink-node/jobs/network-specific/values-<main_utt_chain_id>/<new_chain>.sh`:
```bash
export __PROXY_JOB_VALUE_NETWORK="<new_chain>"
export __PROXY_JOB_VALUE_PROXY_NETWORK_ID="<new_chain_id>"
export __PROXY_JOB_VALUE_PROXY_ORACLE_OPERATOR_ADDRESS="<operator_address_from_step_3>"
export __PROXY_JOB_VALUE_UTT_PROXY_ENDORSE_EXTERNAL_JOB_ID="<32_char_hex_job_id>"
export __PROXY_JOB_VALUE_UTT_PROXY_CLAIM_REWARD_EXTERNAL_JOB_ID="<32_char_hex_job_id>"
```


**Job ID Guidelines:**
- Randomly generated 32-character hex strings (no hyphens), e.g. `30d3f168244f40788be35c05f6c5924f`; e.g. use a uuid v4 generator and remove hyphens.
- Mainnet and testnet variants of the same proxy chain my share job ids, but job ids of different proxy chains must be different. E.g. Aurora mainnet job id for the endorse job migt be equal to the Aurora testnet job, but must be different from the Optimism mainnet job. 

**Redeploy Oracle Node:**
After adding the new chain configuration, rebuild and redeploy the Chainlink oracle node container to pick up the new jobs:

1. **Build the updated container:**
   ```bash
   cd chainlink-node
   make docker-build
   ```

2. **Deploy the container** (choose one):
   - **Local deployment:** `make docker-run` (uses docker-compose)
   - Deployment in k8s cluster:
      - **Standard way via pushing to registry:** 
        - `make docker-push` 
        - Update infrastructure project to use new version.
        - Redeploy chainlink node.
      - **Direct deployment:** `make k8s-deploy` (e.g. for quick debugging on staging); be sure to use the correct `K8S_NAMESPACE` env variable.
   
The container automatically processes job templates during startup:
- `utt-proxy-endorse.toml.template` → Creates endorsement proxy jobs
- `utt-proxy-claim-rewards.toml.template` → Creates reward claiming proxy jobs

**Whitelist Oracle Node:**
In the operator contract, call `setAuthorizedSenders` to whitelist the Chainlink node address.

#### 5. Configure Oracle Node Access on Main UTT Contract

On the main UTT contract (Polygon), grant the oracle node wallet address the `PROXY_ENDORSER_ROLE`:
```solidity
utt.grantRole(await utt.PROXY_ENDORSER_ROLE(), <chainlink_node_wallet_address>);
```

#### 6. Deploy UTU Coin Contract (Optional)
If the chain needs a local UTU Coin token:
```bash
npm run deploy:utu-coin-mock -- --network <new_chain>
```

#### 7. Create UTTProxy Deployment Arguments

Create `scripts/deploy.proxy.args.<new_chain>.js`:
```javascript
const { ethers } = require("hardhat");

module.exports = [
  "<OPERATOR_CONTRACT_ADDRESS>", // from step 3
  "<32_char_hex_endorse_job_id>", // same as step 4, no hyphens
  ethers.parseEther("0.0000001"), // LINK fee
  "<LINK_TOKEN_ADDRESS>", // from step 2
  "<32_char_hex_claim_job_id>", // same as step 4, no hyphens
];
```

#### 8. Deploy UTTProxy Contract
```bash
npm run deploy:proxy -- --network <new_chain>
```

This deploys an upgradeable proxy with the UTTProxy implementation.

**Verify UTTProxy Contract:**
```bash
# Verify implementation
npm run verify -- --network <new_chain> <implementation_address>

# Verify proxy
npm run verify -- --constructor-args ./scripts/deploy.proxy.args.<new_chain>.js --network <new_chain> <proxy_address>
```

#### 9. Configure UTTProxy Contract

**Set UTU Coin Address (if applicable):**
```solidity
uttProxy.setUTUCoin(<utu_coin_address>);
```

**Fund with LINK tokens:**
Send LINK tokens to the UTTProxy contract address for oracle payments.

#### 10. Test Cross-Chain Functionality

**Test Endorsement Flow:**
1. User calls `endorse()` on UTTProxy (new chain)
2. UTTProxy sends oracle request to operator
3. Chainlink node picks up job, calls `proxyEndorse()` on main UTT contract (Polygon)
4. Oracle fulfills request back to UTTProxy

**Test Reward Claiming:**
1. User calls `claimUTURewards()` on UTTProxy
2. Oracle queries main UTT contract for claimable rewards
3. Oracle calls `proxyClaimRewards()` on main UTT contract
4. Oracle returns reward amount to UTTProxy

### Upgrade UTT Contract

The following requires the `PRIVATE_KEY` and `<NETWORK>_URL` environment variables to be set appropriately.

Create an upgrade args config file in `scripts/` named `upgrade.args.${network}.js` for the network you want to deploy on.

```js

module.exports = [
   "0xb0897686c545045afc77cf20ec7a532e3120e0f1", // UTT contract address to upgrade
];
```

The address provided must be the deployed UTT contract that needs to be updated.

E.g. for Ethereum testnet:

`TESTNET_ETHEREUM_URL=0xb0897686c545045afc77cf20ec7a532e3120e0f1/v2/<key>`

Deploy on `<network>` (e.g. testnet_ethereum):

```bash
npm run upgrade -- --network <network>
```

## Verifying

### Using etherscan API

#### UTT >= v2 (upgradable):

```shell
npm run verify -- --network <network> <implementation-address>
```
and then
```shell
npm run verify -- --constructor-args ./scripts/deploy.args.<network>.js  --network <network> <upgradable-proxy-address>
```

#### UTTProxy (upgradable):

```shell
npm run verify -- --network <network> <implementation-address>
```
and then
```shell
npm run verify -- --constructor-args ./scripts/deploy.proxy.args.<network>.js  --network <network> <upgradable-proxy-address>
```


#### Verifying the operator contract:
```shell
npm run verify -- --constructor-args ./scripts/deploy.operator.args.<network>.js --contract contracts/mocks/Operator.sol:UTUOperator --network <network> <address>
```

### Using flattened contract source

Note that the etherscan API isn't available on Ethereum testnet. One can
verify manually using the UI and single-file verification. A
flattened source file for this purpose can be created like so:

1. `npx hardhat flatten contracts/UTT.sol > UTT.flattened.sol`
2. remove all but one `// SPDX-License-Identifier:` lines
3. replace occurrences of `ENSResolver_Chainlink` with `ENSResolver` (because the
   flattener seems to ignore the "as" in `import ... as ...` statements).

### Other hardhat commands

Since this is a `hardhat` project, so one can also use the usual hardhat
commands to
build/test/deploy:

```shell
npx hardhat compile
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.ts
npx hardhat flatten contracts/UTT.sol > UTT.flattened.sol
```
etc.

## Previous Endorsers Oracle

The smart contract uses a Chainlink Oracle to retrieve the first- and
second-level previous endorsers from the UTU Trust API to compute the
endorsement rewards (see
[Whitepaper](https://docs.google.com/document/d/1syxWDbJ5Ch0OiMiMfPQ3AWDiyY0Ol4pLJacTvczDo6I/edit?usp=sharing)).

The following describes how to set up and run a custom Chainlink Oracle node
on AWS.

### Chainlink Node 

A Dockerfile and accompanying docker-compose.yml are provided under the [chainlink-node](chainlink-node) directory. 

It automatically creates the correct configuration and jobs, using templates under the [config](chainlink-node/config) and [jobs](chainlink-node/jobs) sub-directories.

The Makefile can be used to conveniently build and deploy the docker image.

### Feed contracts with tokens

1. Send Link tokens to the UTT contract.
2. Send Matic tokens to the chainlink oracle node address (you can get the chainlink oracle node address from it's dashboard).
3. Make sure the UTT Contract Owner's address has enough Matic tokens since they will be needed in case the `addConnection` function will be used (from the social media connector).
