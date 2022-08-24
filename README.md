# UTU Trust Token Contract

This project implements the UTU Trust Token (UTT) smart contract. 


## Building, Testing 

Compile the contract:
```shell
npm run build                     
```

Run tests:
```shell
npm run test
```

Start a local testnet:
```shell
npm start
```                                     

## Deploying 

### Deploy Oracle Contract

1. Deploy [Chainlink Operator](https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.7/Operator.sol) contract via [Remix](https://remix.ethereum.org/) or by cloning the [Chainlink contracts repo](https://github.com/smartcontractkit/chainlink/tree/develop/contracts) and using Hardhat
2. [Set up a Chainlink node](https://github.com/utu-protocol/utu-trust-token-solidity/main/README.md#set-up-a-chainlink-node-in-aws)
3. Whitelist the node address by calling `setAuthorizedSenders` from the `Operator` contract

### Deploy UTT Contract

The following require the `PRIVATE_KEY` and `<NETWORK>_URL` 
environment variables to be set appropriately.

Create a deploy args config file in `scripts/` named `deploy.args.${network}.js` for the network you want to deploy on.

```javascript
const { ethers } = require("hardhat");

module.exports = [
	1000000, // test value
	"0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f", // mumbai oracle
	"0eec7e1dd0d2476ca1a872dfb6633f48", // mumbai job id
	ethers.utils.parseEther("0.01"), // mumbai fee
	"0x326C977E6efc84E512bB9C30f76E30c160eD06FB" // mumbai link token address
]
```

E.g. for Polygon Mumbai:

```MUMBAI_URL=https://polygon-mumbai.g.alchemy.com/v2/<key>``` 

Deploy on `<network>` (e.g. mumbai):
```shell
npm run deploy -- --network <network>
```                                     

## Verifying

### Using etherscan API 

Verify deployment at `<address>` on `<network>`  
(additionally requires an API key in the `ETHERSCAN_API_KEY` env variable):
```shell
npm run verify --  ./scripts/deploy.args.<network>.js --network <network> <address>
```                                     

### Using flattened contract source 

Note that the etherscan API isn't available on Polygon Mumbai. One can 
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
   * 3.11\. Set your initial database name, e.g. `chainlink-polygon-db`.
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
5. Paste the following TOML job specification and press "Create Job".

```toml
type = "directrequest"
schemaVersion = 1
name = "UTT Check Previous Endorsers Job"
contractAddress = "0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f"
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

    submit_tx  [type="ethtx" to="0xf64991a3C1C448df967e5DC8e8Cc1D3b3BD0034f" data="$(encode_tx)" minConfirmations="2"]

    encode_mwr -> encode_tx -> submit_tx
"""
externalJobID = "0eec7e1d-d0d2-476c-a1a8-72dfb6633f48"
```
