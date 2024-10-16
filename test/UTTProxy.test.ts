import {
  convertFufillParams,
  decodeRunRequest,
} from "@chainlink/test-helpers/dist/src/contracts/oracle";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Contract, ContractTransaction, parseEther, AbiCoder } from "ethers";
import { ethers, run, upgrades } from "hardhat";
import { deployUTUCoinMock } from "./UTT.fixture";

async function fulfillClaimReward(
  tx: ContractTransaction,
  mockOperator: Contract,
  amount: number
) {
  const receipt = await tx.wait(1);
  if (!receipt.logs) throw new Error("No events found");
  const requestId = receipt.logs[0].topics[1];
  const request = decodeRunRequest(receipt.logs[3]);
  const abiCoder = new AbiCoder();
  const data = abiCoder.encode(["bytes32", "uint256"], [requestId, amount]);
  const fulfillParams = convertFufillParams(request, data);
  return mockOperator.fulfillOracleRequest2(...fulfillParams);
}

describe("UTTProxy", function () {
  async function deployContract() {
    const [owner, user1, user2] = await ethers.getSigners();

    const LinkToken = await ethers.getContractFactory("LinkToken");
    const linkToken = await LinkToken.deploy();
    await linkToken.waitForDeployment();
    
    const linkTokenAddress =  await linkToken.getAddress();
    const MockOperator = await ethers.getContractFactory("Operator");
    const mockOperator = await MockOperator.deploy(
      linkTokenAddress,
      owner.address
    );
    await mockOperator.waitForDeployment();
    
    const mockOperatorAddress = await mockOperator.getAddress();
    const UTTProxy = await ethers.getContractFactory("UTTProxy");

    const uttProxy = await upgrades
      .deployProxy(UTTProxy, [
        mockOperatorAddress,
        "",
        parseEther("0.1"),
        linkTokenAddress,
        "",
      ]);
    uttProxy.waitForDeployment();
    const uttProxyAddress = await uttProxy.getAddress();

    await linkToken.grantMintAndBurnRoles(owner);
    await linkToken.mint(uttProxyAddress, parseEther("1"));

    await mockOperator.setAuthorizedSenders([owner.address, uttProxyAddress]);

    return { contract: uttProxy, contractAddress: uttProxyAddress, linkToken, mockOperator, owner, user1, user2 };
  }

  describe("Endorse", function () {
    it("Should be able to make an endorsement", async function () {
      const { contract, user1, user2 } = await loadFixture(deployContract);
      await expect(
        contract.connect(user1).endorse(user2.address, 100, "000001")
      ).to.emit(contract, "ChainlinkRequested");
    });
  });

  describe("Claim rewards", function () {
    it("Should require UTU Coin address has been configured", async function () {
      const { contract, user1 } = await loadFixture(deployContract);
      await expect(contract.connect(user1).claimRewards()).to.be.revertedWith(
        "UTU Coin address not configured."
      );
    });

    it("Should trigger a chainlink request", async function () {
      const { contract, contractAddress, owner, user1 } = await loadFixture(deployContract);
      const utuCoinAddress = await (await deployUTUCoinMock(contractAddress, 0n)).getAddress();
      await contract.connect(owner).setUTUCoin(utuCoinAddress);
      await expect(contract.connect(user1).claimRewards()).to.emit(
        contract,
        "ChainlinkRequested"
      );
    });

    it("Shouldn't fulfilll claim reward when has unsuffiecient utu tokens", async function () {
      const { contract, contractAddress, owner, user1, mockOperator } = await loadFixture(
        deployContract
      );
      const utuCoin = await deployUTUCoinMock(contractAddress, 0n);
      const utuCoinAddress = await utuCoin.getAddress();

      await contract.connect(owner).setUTUCoin(utuCoinAddress);

      const tx = await contract.connect(user1).claimRewards();
      await expect(fulfillClaimReward(tx, mockOperator, 100)).to.not.emit(
        contract,
        "ClaimUTURewards"
      );

      expect(await utuCoin.balanceOf(user1.address)).to.be.equal(0);
    });

    it("Should fulfill claim reward", async function () {
      const { contract, contractAddress, owner, user1, mockOperator } = await loadFixture(
        deployContract
      );
      const utuCoin = await deployUTUCoinMock(contractAddress, 20000n);
      const utuCoinAddress = await utuCoin.getAddress();

      await contract.connect(owner).setUTUCoin(utuCoinAddress);

      const tx = await contract.connect(user1).claimRewards();
      await expect(fulfillClaimReward(tx, mockOperator, 100)).to.emit(
        contract,
        "ClaimUTURewards"
      );

      expect(await utuCoin.balanceOf(user1.address)).to.be.equal(100);
    });
  });
});
