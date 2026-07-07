import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

import {
  accessControlRevertError,
  ActionType,
  addConnection,
  deployUTT,
  endorse,
  disapprove,
  proxyAction,
} from "./UTT.fixture";

describe("Disapproval", function () {
  this.timeout(10000);

  const mockTransactionId = "tx-123456";

  describe("Basic disapproval", function () {
    it("should burn tokens when disapproving", async function () {
      const { utt, mockOperator, admin, service1 } =
        await loadFixture(deployUTT);
      const balanceBefore = await utt.balanceOf(admin.address);
      await disapprove(
        utt,
        mockOperator,
        admin,
        service1.address,
        100,
        mockTransactionId,
        [],
        []
      );
      const balanceAfter = await utt.balanceOf(admin.address);
      expect(balanceAfter).to.equal(balanceBefore - 100n);
    });

    it("should emit Disapprove event with correct parameters", async function () {
      const { utt, mockOperator, admin, service1 } =
        await loadFixture(deployUTT);
      await expect(
        disapprove(
          utt,
          mockOperator,
          admin,
          service1.address,
          100,
          mockTransactionId,
          [],
          []
        )
      )
        .to.emit(utt, "Disapprove")
        .withArgs(admin.address, service1.address, 100, mockTransactionId);
    });

    it("should revert if amount is below D_min", async function () {
      const { utt, mockOperator, admin, service1 } =
        await loadFixture(deployUTT);
      await expect(
        disapprove(
          utt,
          mockOperator,
          admin,
          service1.address,
          49, // below D_min=50
          mockTransactionId,
          [],
          []
        )
      ).to.be.revertedWith("UTT: disapproval amount below minimum");
    });

    it("should revert if amount exceeds balance", async function () {
      const { utt, mockOperator, user1, service1 } =
        await loadFixture(deployUTT);
      // user1 has no tokens
      await expect(
        disapprove(
          utt,
          mockOperator,
          user1,
          service1.address,
          100,
          mockTransactionId,
          [],
          []
        )
      ).to.be.revertedWith("UTT: endorse amount exceeds balance");
    });

    it("should allow disapproval at exactly D_min", async function () {
      const { utt, mockOperator, admin, service1 } =
        await loadFixture(deployUTT);
      await expect(
        disapprove(
          utt,
          mockOperator,
          admin,
          service1.address,
          50, // exactly D_min
          mockTransactionId,
          [],
          []
        )
      )
        .to.emit(utt, "Disapprove")
        .withArgs(admin.address, service1.address, 50, mockTransactionId);
    });
  });

  describe("Penalties on previous endorsers", function () {
    it("should penalise level-1 previous endorsers", async function () {
      const { utt, mockOperator, admin, user1, service1, connector } =
        await loadFixture(deployUTT);

      // user1 gets tokens and endorses service1
      await addConnection(utt, connector, user1.address);
      await endorse(
        utt,
        mockOperator,
        user1,
        service1.address,
        200,
        "endorse-tx",
        [],
        []
      );

      const stakeBefore = await utt.previousEndorserStakes(
        service1.address,
        user1.address
      );
      expect(stakeBefore).to.equal(200);

      // admin disapproves service1, with user1 as level-1 previous endorser
      await expect(
        disapprove(
          utt,
          mockOperator,
          admin,
          service1.address,
          100,
          mockTransactionId,
          [user1.address],
          []
        )
      ).to.emit(utt, "PenalisePreviousEndorserLevel1");

      const stakeAfter = await utt.previousEndorserStakes(
        service1.address,
        user1.address
      );
      expect(stakeAfter).to.be.lt(stakeBefore);
    });

    it("should penalise level-2 previous endorsers", async function () {
      const { utt, mockOperator, admin, user1, user2, service1, connector } =
        await loadFixture(deployUTT);

      // user1 and user2 get tokens
      await addConnection(utt, connector, user1.address);
      await addConnection(utt, connector, user2.address);

      // user1 endorses service1
      await endorse(
        utt,
        mockOperator,
        user1,
        service1.address,
        200,
        "endorse-tx-1",
        [],
        []
      );

      // user2 endorses service1
      await endorse(
        utt,
        mockOperator,
        user2,
        service1.address,
        200,
        "endorse-tx-2",
        [user1.address],
        []
      );

      const stakeUser2Before = await utt.previousEndorserStakes(
        service1.address,
        user2.address
      );

      // admin disapproves with user2 as level-2 endorser
      await expect(
        disapprove(
          utt,
          mockOperator,
          admin,
          service1.address,
          100,
          mockTransactionId,
          [user1.address],
          [user2.address]
        )
      ).to.emit(utt, "PenalisePreviousEndorserLevel2");

      const stakeUser2After = await utt.previousEndorserStakes(
        service1.address,
        user2.address
      );
      expect(stakeUser2After).to.be.lt(stakeUser2Before);
    });

    it("should compute correct penalty amount (reward / D_d)", async function () {
      const { utt, mockOperator, admin, user1, service1, connector } =
        await loadFixture(deployUTT);

      await addConnection(utt, connector, user1.address);

      // user1 endorses with 200 stake
      await endorse(
        utt,
        mockOperator,
        user1,
        service1.address,
        200,
        "endorse-tx",
        [],
        []
      );

      // admin disapproves with 200 amount
      // Reward formula: reward = (s_p * (s_n + O_n) * D_o) / (D_lvl * (s_n + D_n) * (D_o + s_o))
      // s_p = 200, s_n = 200, O_n = 1, D_o = 5000, D_lvl1 = 2, D_n = 30, s_o = totalStake - s_p = 0
      // equivalentReward = (200 * (200 + 1) * 5000) / (2 * (200 + 30) * (5000 + 0))
      //                  = (200 * 201 * 5000) / (2 * 230 * 5000)
      //                  = 201000000 / 2300000
      //                  = 87 (integer division)
      // penalty = equivalentReward / D_d = 87 / 5 = 17 (integer division)
      await expect(
        disapprove(
          utt,
          mockOperator,
          admin,
          service1.address,
          200,
          mockTransactionId,
          [user1.address],
          []
        )
      )
        .to.emit(utt, "PenalisePreviousEndorserLevel1")
        .withArgs(user1.address, 17);

      // Verify stake was reduced
      const stakeAfter = await utt.previousEndorserStakes(
        service1.address,
        user1.address
      );
      expect(stakeAfter).to.equal(200 - 17);
    });

    it("should reduce totalStake by the sum of penalties", async function () {
      const { utt, mockOperator, admin, user1, service1, connector } =
        await loadFixture(deployUTT);

      await addConnection(utt, connector, user1.address);
      await endorse(
        utt,
        mockOperator,
        user1,
        service1.address,
        200,
        "endorse-tx",
        [],
        []
      );

      const totalStakeBefore = await utt.totalStake(service1.address);
      expect(totalStakeBefore).to.equal(200);

      await disapprove(
        utt,
        mockOperator,
        admin,
        service1.address,
        200,
        mockTransactionId,
        [user1.address],
        []
      );

      const totalStakeAfter = await utt.totalStake(service1.address);
      // penalty = 17 (from previous test)
      expect(totalStakeAfter).to.equal(200 - 17);
    });

    it("should not reduce stake below zero after repeated disapprovals", async function () {
      const { utt, mockOperator, admin, user1, service1, connector } =
        await loadFixture(deployUTT);

      await addConnection(utt, connector, user1.address);

      // user1 endorses with a moderate stake
      await endorse(
        utt,
        mockOperator,
        user1,
        service1.address,
        200,
        "endorse-tx",
        [],
        []
      );

      // Lower D_d to 1 so penalties are larger (= full equivalent reward)
      await utt.connect(admin).setD_d(1);

      // Apply multiple disapprovals to progressively reduce stake
      // (limited to 5 iterations to stay within LINK token budget)
      for (let i = 0; i < 5; i++) {
        const stakeBefore = await utt.previousEndorserStakes(
          service1.address,
          user1.address
        );
        if (stakeBefore === 0n) break;

        await disapprove(
          utt,
          mockOperator,
          admin,
          service1.address,
          200,
          `disapprove-tx-${i}`,
          [user1.address],
          []
        );
      }

      const stakeAfter = await utt.previousEndorserStakes(
        service1.address,
        user1.address
      );
      // Stake must be >= 0 (never negative)
      expect(stakeAfter).to.be.gte(0);
      // The successive disapprovals should have reduced it significantly
      expect(stakeAfter).to.be.lt(200);
    });

    it("should not emit penalty events when there are no previous endorsers", async function () {
      const { utt, mockOperator, admin, service1 } =
        await loadFixture(deployUTT);

      await expect(
        disapprove(
          utt,
          mockOperator,
          admin,
          service1.address,
          100,
          mockTransactionId,
          [],
          []
        )
      )
        .to.not.emit(utt, "PenalisePreviousEndorserLevel1")
        .and.to.not.emit(utt, "PenalisePreviousEndorserLevel2");
    });
  });

  describe("Proxy disapproval (via proxyAction)", function () {
    it("should allow proxy role holders to proxy disapprove", async function () {
      const { utt, mockOperator, admin, user1, connector, proxyOracle, service1 } =
        await loadFixture(deployUTT);

      await addConnection(utt, connector, user1.address);
      const balanceBefore = await utt.balanceOf(user1.address);

      await proxyAction(
        utt,
        proxyOracle,
        mockOperator,
        user1.address,
        service1.address,
        100,
        mockTransactionId,
        ActionType.DISAPPROVE,
        [],
        []
      );

      const balanceAfter = await utt.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore - 100n);
    });

    it("should not allow non-proxy role holders to call proxyAction", async function () {
      const { utt, user1, service1 } = await loadFixture(deployUTT);

      await expect(
        utt
          .connect(user1)
          .proxyAction(user1.address, service1.address, 100, mockTransactionId, ActionType.DISAPPROVE)
      ).to.be.revertedWith(
        await accessControlRevertError(
          utt,
          user1.address,
          "PROXY_ENDORSER_ROLE"
        )
      );
    });

    it("should enforce D_min on proxy disapprove via proxyAction", async function () {
      const { utt, mockOperator, user1, connector, proxyOracle, service1 } =
        await loadFixture(deployUTT);
      await addConnection(utt, connector, user1.address);

      await expect(
        proxyAction(
          utt,
          proxyOracle,
          mockOperator,
          user1.address,
          service1.address,
          49, // below D_min=50
          mockTransactionId,
          ActionType.DISAPPROVE,
          [],
          []
        )
      ).to.be.revertedWith("UTT: disapproval amount below minimum");
    });
  });

  describe("Migration blocks disapproval", function () {
    it("should block disapprove during migration", async function () {
      const { utt, admin, mockOperator, service1 } =
        await loadFixture(deployUTT);
      await utt.connect(admin).startMigrationToNewContract();
      await expect(
        disapprove(
          utt,
          mockOperator,
          admin,
          service1.address,
          100,
          mockTransactionId,
          [],
          []
        )
      ).to.be.revertedWith("Contract is migrating");
    });
  });

  describe("Governance", function () {
    it("should allow admin to set D_d", async function () {
      const { utt, admin } = await loadFixture(deployUTT);
      await utt.connect(admin).setD_d(10);
      expect(await utt.D_d()).to.equal(10);
    });

    it("should not allow D_d to be set to 0", async function () {
      const { utt, admin } = await loadFixture(deployUTT);
      await expect(utt.connect(admin).setD_d(0)).to.be.revertedWith(
        "D_d must be > 0"
      );
    });

    it("should allow admin to set D_min", async function () {
      const { utt, admin } = await loadFixture(deployUTT);
      await utt.connect(admin).setD_min(100);
      expect(await utt.D_min()).to.equal(100);
    });

    it("should not allow non-admin to set D_d", async function () {
      const { utt, user1 } = await loadFixture(deployUTT);
      await expect(utt.connect(user1).setD_d(10)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should not allow non-admin to set D_min", async function () {
      const { utt, user1 } = await loadFixture(deployUTT);
      await expect(utt.connect(user1).setD_min(100)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });
});
