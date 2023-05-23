import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import {
  addConnection,
  deployUTT,
  deployUTTUnmigrated,
  endorse,
  generateRandomAccounts,
  getHash,
  proxyEndorse,
} from "./UTT.fixture";

import { ethers } from "hardhat";

/**
 * Invokes the addConnection() method on the contract for the given user address, which, if successful, will mint some
 * UTT to their account.
 */

describe("UTT", function () {
  const mockTransactionId = "123456";

  beforeEach(async function () {
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
      const { utt, mockOperator, user1, service1, user2, user3 } =
        await loadFixture(deployUTT);
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
      const { utt, mockOperator, admin, service1, user2, user3 } =
        await loadFixture(deployUTT);
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
      const { utt, mockOperator, admin, service1, user2, user3 } =
        await loadFixture(deployUTT);
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
      const { utt, mockOperator, admin, service1, user2, user3 } =
        await loadFixture(deployUTT);
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
      const { utt, mockOperator, admin, service1, user2 } = await loadFixture(
        deployUTT
      );
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
      const { utt, mockOperator, user1, service1, user2, connector } =
        await loadFixture(deployUTT);
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
      const { utt, mockOperator, admin, service1, user1, connector } =
        await loadFixture(deployUTT);
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
      const { utt, mockOperator, admin, service1, user1, user2, connector } =
        await loadFixture(deployUTT);
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
      const { utt, user1 } = await loadFixture(deployUTT);
      await expect(
        utt
          .connect(user1)
          .addConnection(user1.address, 0, getHash(user1.address))
      ).to.be.revertedWith(`AccessControl:`);
    });

    it("should not allow a user to remove a connection by themselves", async function () {
      const { utt, user1 } = await loadFixture(deployUTT);
      await expect(
        utt.connect(user1).removeConnection(user1.address, 0)
      ).to.be.revertedWith(`AccessControl:`);
    });
  });

  describe("Migration", function () {
    it("should allow admin toggle migration flag", async function () {
      const { utt, admin } = await loadFixture(deployUTT);
      await utt.connect(admin).toggleMigrationFlag();
      const isMigrationFlagSet = await utt.isMigratingToNewContract();
      await expect(isMigrationFlagSet).to.be.true;
    });

    it("should allow not allow non admin toggle migration flag", async function () {
      const { utt, user1 } = await loadFixture(deployUTT);
      await expect(utt.connect(user1).toggleMigrationFlag()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should pause endorse when migration is set", async function () {
      const { utt, admin, mockOperator, service1, user2, user3 } =
        await loadFixture(deployUTT);
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
      const { utt, admin, connector, user1 } = await loadFixture(deployUTT);
      await utt.connect(admin).toggleMigrationFlag();
      await expect(
        addConnection(utt, connector, user1.address)
      ).to.be.revertedWith("Contract is migrating");
    });
  });

  describe("Admin Set Parameters", function () {
    async function expectSetParameter(name: string) {
      const { utt, admin } = await loadFixture(deployUTT);
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
    async function expectSetParameterNotAllowed(name: string) {
      const { utt, user1 } = await loadFixture(deployUTT);
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
      const { utt, admin, mockOperator, connector, user1, proxyOracle, user2 } =
        await loadFixture(deployUTT);
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
      const { utt, user1, user2 } = await loadFixture(deployUTT);
      await expect(
        utt
          .connect(user1)
          .proxyEndorse(user1.address, user2.address, 1, getHash(user1.address))
      ).to.be.revertedWith(`AccessControl:`);
    });
  });

  describe("Migration", function () {
    it("should allow balance migration", async function () {
      const accounts = await generateRandomAccounts(200);
      const { utt: oldContract, connector } = await loadFixture(deployUTT);
      const user1 = accounts[0];
      const { utt, admin } = await loadFixture(deployUTTUnmigrated);
      // to check if it doesn't double mint
      accounts.push(user1);

      await addConnection(oldContract, connector, user1.address);

      const balanceBefore = await oldContract.balanceOf(user1.address);

      const addresses = accounts.map((account) => account.address);

      await expect(
        utt.connect(admin).migrateBalance(addresses, oldContract.address)
      ).to.emit(utt, "Transfer");

      const balanceAfter = await utt.balanceOf(user1.address);
      expect(balanceAfter).to.be.eq(balanceBefore);
    });
  });
});
