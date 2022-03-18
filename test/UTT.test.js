const { ethers, run } = require("hardhat");
const { expect } = require("chai");
const {
  decodeRunRequest,
  convertFufillParams,
} = require("@chainlink/test-helpers/dist/src/contracts/oracle");

async function endorse(
  utt,
  mockOperator,
  sender,
  target,
  amount,
  transactionId,
  endorsersLevel1,
  endorsersLevel2
) {
  const tx = await utt.connect(sender).endorse(target, amount, transactionId);
  const receipt = await tx.wait(1);
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

/**
 * Invokes the addConnection() method on the contract for the given user address, which, if successful, will mint some
 * UTT to their account.
 */
async function addConnection(utt, admin, userAddress, connectedTypeId = 0) {
  connectedUserIdHash = ethers.utils.formatBytes32String(userAddress.slice(0,31));
  return await utt.connect(admin).addConnection(userAddress, connectedTypeId, connectedUserIdHash);
}

describe("UTT", function () {
  const mintAmount = ethers.utils.parseEther("1000000");

  let utt;
  let mockOperator;

  let mockTransactionId = '123456';

  let admin;
  let user1;
  let user2;
  let user3;
  let service1;
  let service2;

  before(async function () {
    [admin, user1, user2, user3, service1, service2] =
      await ethers.getSigners();
  });

  beforeEach(async function () {
    const LinkToken = await ethers.getContractFactory("LinkToken");
    const linkToken = await LinkToken.deploy().then((f) => f.deployed());
    const MockOperator = await ethers.getContractFactory("Operator");
    mockOperator = await MockOperator.deploy(
      linkToken.address,
      admin.address
    ).then((f) => f.deployed());
    await mockOperator.setAuthorizedSenders([admin.address]);

    const UTT = await ethers.getContractFactory("UTT");
    utt = await UTT.deploy(
      mintAmount,
      mockOperator.address,
      "",
      ethers.utils.parseEther("0.1"),
      linkToken.address
    ).then((f) => f.deployed());

    await run("fund-link", {
      contract: utt.address,
      linkaddress: linkToken.address,
    });

    // send initial coins to first 3 addresses
    // await utt
    //   .connect(admin)
    //   .transfer(user1.address, ethers.utils.parseEther("10"));
    // await utt
    //   .connect(admin)
    //   .transfer(user2.address, ethers.utils.parseEther("10"));
    // await utt
    //   .connect(admin)
    //   .transfer(user3.address, ethers.utils.parseEther("10"));

    // await utt.connect(this.admin).endorse(service.address, 1, [], []);
    // await utt.connect(this.admin).endorse(service.address, 1, [], []);
  });

  describe("Endorsements", function () {

    it("should take your tokens when you endorsing", async function () {
      const balanceBefore = await utt.connect(admin).balanceOf(admin.address);
      await endorse(
          utt,
          mockOperator,
          admin,
          service1.address,
          1,
          mockTransactionId,
          [user2.address, user3.address],
          []
        );
      const balanceAfter = await utt.connect(admin).balanceOf(admin.address);
      expect(balanceAfter).to.be.lt(balanceBefore);
    });

    it("should emit an Endorse event with correct parameters", async function () {
      await expect(
        endorse(
          utt,
          mockOperator,
          admin,
          service1.address,
          3,
          mockTransactionId,
          [user2.address, user3.address],
          []
        )
      )
        .to.emit(utt, "Endorse")
        .withArgs(admin.address, service1.address, 3, mockTransactionId);
    });

    it("should not emit and RewardPreviousEndorserLevel2 event when there are no 2nd-level previous endorsers",
      async function () {
      await expect(
        endorse(
          utt,
          mockOperator,
          admin,
          service1.address,
          1,
          mockTransactionId,
          [user2.address, user3.address],
          []
        )
      ).to.not.emit(utt, "RewardPreviousEndorserLevel2");
    });

    it("Reward 1st-level previous endorsers for admin", async function () {
      await expect(
        endorse(
          utt,
          mockOperator,
          admin,
          service1.address,
          1000,
          mockTransactionId,
          [user2.address],
          []
        )
      )
        .to.emit(utt, "RewardPreviousEndorserLevel1")
        // We didn't previously call endorse for user2, so reward should be 0 despite it being in endorsersLevel1:
        .withArgs(user2.address, 0);
    });

    it("Reward 1st-level previous endorsers for user1", async function () {
      // First obtain some UTT for user1 which they can stake:
      await addConnection(utt, admin, user1.address);

      await expect(
        endorse(
          utt,
          mockOperator,
          user1,
          service1.address,
          1000,
          mockTransactionId,
          [user2.address],
          []
        )
      )
        .to.emit(utt, "RewardPreviousEndorserLevel1")
        // We didn't previously call endorse for user2, so reward should be 0 despite it being in endorsersLevel1:
        .withArgs(user2.address, 0);
    });

    it("Reward the correct amount for the first-level endorser", async function () {
      // Obtain some UTT for user1 which they can stake:
      await addConnection(utt, admin, user1.address);

      await endorse(utt, mockOperator, admin, service1.address, 200, mockTransactionId, [], []);

      await expect(
        endorse(
          utt,
          mockOperator,
          user1,
          service1.address,
          1000,
          mockTransactionId,
          [admin.address],
          []
        )
      )
        .to.emit(utt, "RewardPreviousEndorserLevel1")
        // We didn't previously call endorse for user2, so reward should be 0 despite it being in endorsersLevel1:
        .withArgs(admin.address, 87);
    });

    it("Reward the correct amount for the second-level endorser", async function () {
      // Obtain some UTT for user1 and user2 which they can stake:
      await addConnection(utt, admin, user1.address);
      await addConnection(utt, admin, user2.address);

      await endorse(utt, mockOperator, admin, service1.address, 200, mockTransactionId, [], []);
      await endorse(utt, mockOperator, user1, service1.address, 200, mockTransactionId, [admin.address], []);

      await expect(
        endorse(
          utt,
          mockOperator,
          user2,
          service1.address,
          200,
          mockTransactionId,
          [admin.address],
          [user1.address]
        )
      )
        .to.emit(utt, "RewardPreviousEndorserLevel2")
        .withArgs(user1.address, 8);
    });
  });
});
