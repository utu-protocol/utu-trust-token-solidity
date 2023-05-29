import {
  convertFufillParams,
  decodeRunRequest,
} from "@chainlink/test-helpers/dist/src/contracts/oracle";
import { Contract, ContractTransaction, Signer } from "ethers";
import { ethers, run, upgrades } from "hardhat";

export async function deployUTT(migrated: boolean = true) {
  const mintAmount = ethers.utils.parseEther("10000000");
  const [
    admin,
    user1,
    user2,
    user3,
    service1,
    service2,
    connector,
    proxyOracle,
  ] = await ethers.getSigners();
  const LinkToken = await ethers.getContractFactory("LinkToken");
  const linkToken = await LinkToken.deploy().then((f) => f.deployed());
  const MockOperator = await ethers.getContractFactory("Operator");
  const mockOperator = await MockOperator.deploy(
    linkToken.address,
    admin.address
  ).then((f) => f.deployed());
  await mockOperator.setAuthorizedSenders([admin.address]);

  const UTT = await ethers.getContractFactory("UTT");
  const utt: Contract = await upgrades
    .deployProxy(UTT, [
      mintAmount,
      mockOperator.address,
      "",
      ethers.utils.parseEther("0.1"),
      linkToken.address,
    ])
    .then((f: any) => f.deployed());

  await run("fund-link", {
    contract: utt.address,
    linkaddress: linkToken.address,
  });

  await utt
    .connect(admin)
    .grantRole(await utt.SOCIAL_CONNECTOR_ROLE(), connector.address);

  await utt
    .connect(admin)
    .grantRole(await utt.PROXY_ENDORSER_ROLE(), proxyOracle.address);

  if (migrated) {
    await utt.connect(admin).setDataMigrationCompleted();
  }
  return {
    admin,
    user1,
    user2,
    user3,
    service1,
    service2,
    connector,
    proxyOracle,
    utt,
    mockOperator,
    linkToken,
  };
}

export async function deployUTTUnmigrated() {
  return deployUTT(false);
}

async function fullfilEndorse(
  tx: ContractTransaction,
  mockOperator: Contract,
  endorsersLevel1: string[],
  endorsersLevel2: string[]
) {
  const receipt = await tx.wait(1);
  if (!receipt.events) throw new Error("No events found");
  const requestId = receipt.events[0].topics[1];
  const request = decodeRunRequest(receipt.logs[3]);
  const abiCoder = new ethers.utils.AbiCoder();
  const data = abiCoder.encode(
    ["bytes32", "address[]", "address[]"],
    [requestId, [...endorsersLevel1], [...endorsersLevel2]]
  );
  const fulfillParams = convertFufillParams(request, data);
  return mockOperator.fulfillOracleRequest2(...fulfillParams);
}
export async function endorse(
  utt: Contract,
  mockOperator: Contract,
  sender: Signer,
  target: string,
  amount: number,
  transactionId: string,
  endorsersLevel1: string[],
  endorsersLevel2: string[]
) {
  const tx = await utt.connect(sender).endorse(target, amount, transactionId);
  return fullfilEndorse(tx, mockOperator, endorsersLevel1, endorsersLevel2);
}

export async function proxyEndorse(
  utt: Contract,
  proxySender: Signer,
  mockOperator: Contract,
  sender: string,
  target: string,
  amount: number,
  transactionId: string,
  endorsersLevel1: string[],
  endorsersLevel2: string[]
) {
  const tx = await utt
    .connect(proxySender)
    .proxyEndorse(sender, target, amount, transactionId);
  return fullfilEndorse(tx, mockOperator, endorsersLevel1, endorsersLevel2);
}

export async function addConnection(
  utt: Contract,
  connector: Signer,
  userAddress: string,
  connectedTypeId = 0
) {
  return await utt
    .connect(connector)
    .addConnection(userAddress, connectedTypeId, getHash(userAddress));
}

export function getHash(address: string) {
  return ethers.utils.formatBytes32String(address.slice(0, 31));
}

export async function generateRandomAccounts(numAccounts: number) {
  const randomAccounts = [];

  for (let i = 0; i < numAccounts; i++) {
    const wallet = ethers.Wallet.createRandom();
    randomAccounts.push(wallet);
  }

  return randomAccounts;
}
