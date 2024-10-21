# UTU Trust Token Contract

This project implements the UTU Trust Token (UTT) smart contract.

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

  
## Test Nets

- UTT contract on Ethereum Testnet (Sepolia):
    - Upgradable proxy: [0x537BE61c5EFB865Df53CA55eeA07ceEe5d5fB162](https://sepolia.etherscan.io/address/0x537BE61c5EFB865Df53CA55eeA07ceEe5d5fB162)
    - Current implementation: [0x89fA6ee038f3b4D8C050c6E1709Fa3d19d9be49E](https://sepolia.etherscan.io/address/0x8408F3D9E02E3965b4396d1abD395a0e7E5DE162)
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
- UTT proxy contract on Optimism Goerli Testnet:
  - Upgradable proxy: [0xfD458e4fb718eFAAEf0e28597b9cF6D5C240E8f7](https://goerli-optimism.etherscan.io/address/0xfd458e4fb718efaaef0e28597b9cf6d5c240e8f7)
  - Current implementation: [0xbdF3b87B410C50Ba9620d8Ac416A81e6bF7296eF](https://goerli-optimism.etherscan.io/address/0xbdf3b87b410c50ba9620d8ac416a81e6bf7296ef)
  - Oracle operator contract: [0xbeF02f42F30b1233977DF88986DbB4D27D9c5b09](https://explorer.testnet.aurora.dev/address/0xbeF02f42F30b1233977DF88986DbB4D27D9c5b09)
  - UTU Coin (bridged from Ethereum Görli testnet): [0xd40530105E196B3ad21fA94b6D4ce5f9DcB50b1a](https://goerli-optimism.etherscan.io/token/0xd40530105E196B3ad21fA94b6D4ce5f9DcB50b1a#balances)


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

TODO: update this section

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

#### UTT v1 (non-upgradable:)

Verify deployment at `<address>` on `<network>`
(additionally requires an API key in the `ETHERSCAN_API_KEY` env variable):
```shell
npm run verify -- --constructor-args ./scripts/deploy.args.<network>.js --network <network> <address>
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

### Set up a Chainlink Node in AWS

Based on the following sources:

- [Running a Chainlink Node](https://docs.chain.link/docs/running-a-chainlink-node/)
- [Quick Start Reference Deployment](https://aws-quickstart.github.io/quickstart-chainlinklabs-chainlink-node/)
- [Set Up a Chainlink Node on AWS Console | Tutorial](https://www.youtube.com/watch?v=klqQnzBUqUw)

We need to create an EC2 instance:
* 1\. Creating a new instance
    * 1.1\. Visit the EC2 dashboard. If there’s a running instance (and it’s dedicated for the chainlink node job), skip to step 2.1. If there’s no such instance, proceed to the next step.
    * 1.2\. Click the `Launch instance` button.
    * 1.3\. Select `t2.small` instance type.
    * 1.4\. Click on the `Review and Launch` button.
    * 1.5\. Click on the `Launch` button.
    * 1.6\. Set a key pair name.
    * 1.7\. If you would like to SSH into the instance later (through your chosen terminal emulator, instead of the AWS web UI), hit the `Download Key Pair` button.
    * 1.8\. Click on the `Launch instances` button.
    * 1.9\. Click on the `View instances` button, to see the running instances (incl. the one we’ve just launched).
* 2\. Connecting to the instance.
    * 2.1\. Click on the instance ID.
    * 2.2\. Click on the `Connect` button (it will redirect you to the `Connect to instance` page).
    * 2.3\. Click on the `Connect` button (it will open a new terminal session).
    * 2.4\. Check if Docker is up-and-running by executing the following command:

```shell
$ systemctl status docker
```

If it’s running, procced to step 2.6. If it’s not, proceed to the next step.

   * 2.5\. Since Docker is not set up, you’ll have to manually install and configure it by issuing the following commands:

```shell
$ sudo systemctl start docker
$ sudo gpasswd -a $USER docker
```

   * 2.6\. Go ahead and create a directory for the Chainlink node.

```shell
$ mkdir ~/.chainlink
$ cd ~/.chainlink
```

   * 2.7\. Create a new .env file inside the directory and fill in the credentials.

```shell
$ vim ~/.chainlink/.env
```

RDS instance:
* 3\. Creating a new database instance.
   * 3.1\. Visit the RDS dashboard. If there’s a PostgreSQL instance running (and it’s dedicated for the chainlink node job), skip to step 4.1. If there’s no such instance, proceed to the next step.
   * 3.2\. Click on the `Create database` button.
   * 3.3\. Select PostgreSQL.
   * 3.4\. Select PostgerSQL 14.5 version.
   * 3.5\. Select `Free tier` template (if it’s not available, try with different versions and keep in mind that the UI might take several seconds to update the set of available templates).
   * 3.6\. Set database identifier, e.g. `chainlink-db`.
   * 3.7\. Set master username, e.g. `postgres`.
   * 3.8\. Set master password and write it down somewhere safe.
   * 3.9\. Disable storage autoscaling by deselecting `Enable storage autoscaling`.
   * 3.10\. Click on `Additional configuration`.
   * 3.11\. Set your initial database name, e.g. `chainlink-ethereum-db`.
   * 3.12\. Disable automatic backups by deselecting `Enable automatic backups`.
   * 3.13\. Go ahead and hit `Create database`.
* 4\. Set up database credentials.
   * 4.1\. Visit the RDS dashboard.
   * 4.2\. Click on the DB identifier, e.g. `chainlink-db`.
   * 4.3\. Copy the database endpoint (Connectivity & security panel). If it’s not available, it’s probably because you’ve just created the database and it has not been fully deployed. Take a short break and give it a few minutes.
   * 4.4\. Connect to the EC2 instance (as described in steps 2.1/2.2./2.3.)
   * 4.5\. Edit `~/.chainlink/.env` (as described in step 2.7) and update the database endpoint (the environment variable is called `DATABASE_URL` and you have to replace all nested variables).

```
DATABASE_URL=postgresql://$USERNAME:$PASSWORD@$SERVER:$PORT/$DATABASE
```

`$USERNAME` and `$PASSWORD` have been created in step 3.7.
must be set to the default value of 5432 (unless something else has been set during the database creation).
`$DATABASE` is what we’ve set in step 3.11.
`$SERVER` corresponds to the endpoint we’ve copied in step 4.3.

Docker:
* 5\. Set up the Docker container
   * 5.1\. Pull the image from hub.docker.com/r/smartcontract/chainlink.

```shell
$ docker pull smartcontract/chainlink:1.7.1-root
```

   * 5.2\. Change your working directory

```shell
$ cd ~/.chainlink
```

   * 5.3\. Start the container.

```shell
$ docker run -p 6688:6688 -v ~/.chainlink:/chainlink -it --env-file=.env smartcontract/chainlink:1.7.1-root local n
```

### Set up a Chainlink Node job

1. Visit `$NODE_ADDRESS:6688` (`$NODE_ADDRESS` is the public IPv4 DNS of your previously configured EC2 instance).
2. Login with your ChainLink node account credentials.
3. Navigate to the jobs page (press the "Jobs" button in the top menu).
4. Press the "New Job" button.
5. Paste the following TOML job specification
6. Replace `REPLACE_WITH_ORACLE_CONTRACT_ADDRESS` with the oracle contract address everywhere specified in the job definition
7. Replace `REPLACE_WITH_UTU_CLIENT_DB_ID` with the utu client db id in the job definition
8. Press Create Job

```toml
type = "directrequest"
schemaVersion = 1
name = "UTT Check Previous Endorsers Job"
contractAddress = "REPLACE_WITH_ORACLE_CONTRACT_ADDRESS"
maxTaskDuration = "0s"
observationSource = """
    decode_log  [type="ethabidecodelog"
                 abi="OracleRequest(bytes32 indexed specId, address requester, bytes32 requestId, uint256 payment, address callbackAddr, bytes4 callbackFunctionId, uint256 cancelExpiration, uint256 dataVersion, bytes data)"
                 data="$(jobRun.logData)"
                 topics="$(jobRun.logTopics)"]

    decode_cbor  [type="cborparse" data="$(decode_log.data)"]

    decode_log -> decode_cbor -> http

    http [type="http"
          method=POST
          url="http://trust-api-core-service/previousEndorsersRequest"
          headers="[\\"UTU-Trust-Api-Client-Id\\", \\"REPLACE_WITH_UTU_CLIENT_DB_ID\\"]"
          requestData="{\\"sourceAddress\\": $(decode_cbor.sourceAddress), \\"targetAddress\\": $(decode_cbor.targetAddress), \\"transactionId\\":  $(decode_cbor.transactionId)}"
          allowUnrestrictedNetworkAccess=true]

    firstLevelPreviousEndorsers [type="jsonparse"
                data="$(http)"
                path="result,firstLevelPreviousEndorsers"]

    secondLevelPreviousEndorsers [type="jsonparse"
                data="$(http)"
                path="result,secondLevelPreviousEndorsers"]

    http -> firstLevelPreviousEndorsers -> encode_mwr
    http -> secondLevelPreviousEndorsers -> encode_mwr

    encode_mwr [type="ethabiencode"
                abi="(bytes32 requestId, address[] firstLevelPreviousEndorsers, address[] secondLevelPreviousEndorsers)"
                data="{\\"requestId\\": $(decode_log.requestId), \\"firstLevelPreviousEndorsers\\": $(firstLevelPreviousEndorsers), \\"secondLevelPreviousEndorsers\\": $(secondLevelPreviousEndorsers) }"]

    encode_tx  [type="ethabiencode"
                abi="fulfillOracleRequest2(bytes32 requestId, uint256 payment, address callbackAddress, bytes4 callbackFunctionId, uint256 expiration, bytes calldata data)"
                data="{\\"requestId\\": $(decode_log.requestId), \\"payment\\":   $(decode_log.payment), \\"callbackAddress\\": $(decode_log.callbackAddr), \\"callbackFunctionId\\": $(decode_log.callbackFunctionId), \\"expiration\\": $(decode_log.cancelExpiration), \\"data\\": $(encode_mwr)}"]

    submit_tx  [type="ethtx" to="REPLACE_WITH_ORACLE_CONTRACT_ADDRESS" data="$(encode_tx)" minConfirmations="2"]

    encode_mwr -> encode_tx -> submit_tx
"""
externalJobID = "0eec7e1d-d0d2-476c-a1a8-72dfb6633f48"
```

### Feed contracts with tokens

1. Send Link tokens to the UTT contract.
2. Send Matic tokens to the chainlink oracle node address (you can get the chainlink oracle node address from it's dashboard).
3. Make sure the UTT Contract Owner's address has enough Matic tokens since they will be needed in case the `addConnection` function will be used (from the social media connector).
