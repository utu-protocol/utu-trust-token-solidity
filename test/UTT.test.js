const { ethers, run } = require("hardhat");
const { expect } = require("chai");
const {
  decodeRunRequest,
  convertFufillParams,
} = require("@chainlink/test-helpers/dist/src/contracts/oracle");

async function fullfilEndorse(
  tx,
  mockOperator,
  endorsersLevel1,
  endorsersLevel2
) {
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
  return fullfilEndorse(tx, mockOperator, endorsersLevel1, endorsersLevel2);
}

async function proxyEndorse(
  utt,
  proxySender,
  mockOperator,
  sender,
  target,
  amount,
  transactionId,
  endorsersLevel1,
  endorsersLevel2
) {
  const tx = await utt
    .connect(proxySender)
    .proxyEndorse(sender, target, amount, transactionId);
  return fullfilEndorse(tx, mockOperator, endorsersLevel1, endorsersLevel2);
}

function getHash(address) {
  return ethers.utils.formatBytes32String(address.slice(0, 31));
}

/**
 * Invokes the addConnection() method on the contract for the given user address, which, if successful, will mint some
 * UTT to their account.
 */
async function addConnection(utt, connector, userAddress, connectedTypeId = 0) {
  return await utt
    .connect(connector)
    .addConnection(userAddress, connectedTypeId, getHash(userAddress));
}

describe("UTT", function () {
  const mintAmount = ethers.utils.parseEther("1000000");

  let utt;
  let mockOperator;

  const mockTransactionId = "123456";

  let admin;
  let user1;
  let user2;
  let user3;
  let service1;
  let connector;
  let proxyOracle;

  before(async function () {
    [admin, user1, user2, user3, service1, connector, proxyOracle] =
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

    await utt
      .connect(admin)
      .grantRole(await utt.SOCIAL_CONNECTOR_ROLE(), connector.address);

    await utt
      .connect(admin)
      .grantRole(await utt.PROXY_ENDORSER_ROLE(), proxyOracle.address);

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
    it("should not be allowed to endorse an amount greater than the balance", async function () {
      const balance = await utt.connect(user1).balanceOf(user1.address);
      const amount = 100;
      expect(balance).to.be.lt(amount);
      await expect(
        endorse(
          utt,
          mockOperator,
          user1,
          service1.address,
          amount,
          mockTransactionId,
          [user2.address, user3.address],
          []
        )
      ).to.be.revertedWith("UTT: endorse amount exceeds balance");
    });

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

    it("should not emit and RewardPreviousEndorserLevel2 event when there are no 2nd-level previous endorsers", async function () {
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
      await addConnection(utt, connector, user1.address);

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
      await addConnection(utt, connector, user1.address);

      await endorse(
        utt,
        mockOperator,
        admin,
        service1.address,
        200,
        mockTransactionId,
        [],
        []
      );

      await expect(
        endorse(
          utt,
          mockOperator,
          user1,
          service1.address,
          200,
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
      await addConnection(utt, connector, user1.address);
      await addConnection(utt, connector, user2.address);

      await endorse(
        utt,
        mockOperator,
        admin,
        service1.address,
        200,
        mockTransactionId,
        [],
        []
      );
      await endorse(
        utt,
        mockOperator,
        user1,
        service1.address,
        200,
        mockTransactionId,
        [admin.address],
        []
      );

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

  describe("User tries to addConnection", function () {
    it("should not allow a user to add a connection by themselves", async function () {
      await expect(
        utt
          .connect(user1)
          .addConnection(user1.address, 0, getHash(user1.address))
      ).to.be.revertedWith(`AccessControl:`);
    });

    it("should not allow a user to remove a connection by themselves", async function () {
      await expect(
        utt.connect(user1).removeConnection(user1.address, 0)
      ).to.be.revertedWith(`AccessControl:`);
    });
  });

  describe("Migration", function () {
    it("should allow admin toggle migration flag", async function () {
      await utt.connect(admin).toggleMigrationFlag();
      const isMigrationFlagSet = await utt.isMigrating();
      await expect(isMigrationFlagSet).to.be.true;
    });

    it("should allow not allow non admin toggle migration flag", async function () {
      await expect(utt.connect(user1).toggleMigrationFlag()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should pause endorse when migration is set", async function () {
      await utt.connect(admin).toggleMigrationFlag();
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
      ).to.be.revertedWith("Contract is migrating");
    });

    it("should allow not allow add connection during migration", async function () {
      await utt.connect(admin).toggleMigrationFlag();
      await expect(
        addConnection(utt, connector, user1.address)
      ).to.be.revertedWith("Contract is migrating");
    });
  });

  describe("Admin Set Parameters", function () {
    async function expectSetParameter(name) {
      const setter = `set${name}`;
      await utt.connect(admin)[setter](20);
      const val = await utt.connect(admin)[name]();
      expect(val).to.equal(20);
    }

    it("should set O_n", async function () {
      expectSetParameter("O_n");
    });

    it("should set D_n", async function () {
      expectSetParameter("D_n");
    });

    it("should set D_lvl1", async function () {
      expectSetParameter("D_lvl1");
    });

    it("should set D_lvl2", async function () {
      expectSetParameter("D_lvl2");
    });

    it("should set D_o", async function () {
      expectSetParameter("D_o");
    });
  });

  describe("User tries to set parameters", function () {
    async function expectSetParameterNotAllowed(name) {
      const setter = `set${name}`;
      expect(utt.connect(user1)[setter](20)).to.revertedWith(
        "Ownable: caller is not the owner"
      );
    }

    it("should not be allowed to set O_n", async function () {
      expectSetParameterNotAllowed("O_n");
    });

    it("should not be allowed to set D_n", async function () {
      expectSetParameterNotAllowed("D_n");
    });

    it("should not be allowed to set D_lvl1", async function () {
      expectSetParameterNotAllowed("D_lvl1");
    });

    it("should not be allowed to set D_lvl2", async function () {
      expectSetParameterNotAllowed("D_lvl2");
    });

    it("should not be allowed to set D_o", async function () {
      expectSetParameterNotAllowed("D_o");
    });
  });

  describe("Proxy endorsing", function () {
    it("should allow proxy role holders to proxy endorse", async function () {
      await addConnection(utt, connector, user1.address);
      const balanceBefore = await utt.connect(admin).balanceOf(user1.address);
      await proxyEndorse(
        utt,
        proxyOracle,
        mockOperator,
        user1.address,
        user2.address,
        1000,
        mockTransactionId,
        [user2.address],
        []
      );
      const balanceAfter = await utt.connect(admin).balanceOf(user1.address);
      expect(balanceAfter).to.be.lt(balanceBefore);
    });
    it("should not allow non proxy role holder to proxy endorse", async function () {
      await expect(
        utt
          .connect(user1)
          .proxyEndorse(user1.address, user2.address, 1, getHash(user1.address))
      ).to.be.revertedWith(`AccessControl:`);
    });
  });
});
