import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

import {
  accessControlRevertError,
  ActionType,
  addConnection,
  deployUTT,
  endorse,
  proxyAction,
  withdrawStake,
} from "./UTT.fixture";

// The direct (same-chain) stake-withdrawal path is covered by the "Stake withdrawal"
// block in UTT.test.ts. This suite focuses on the cross-chain path — withdrawals
// forwarded from a UTTProxy via the unified proxyAction entry point — and on the
// previous-endorser accounting invariant.
describe("WithdrawStake (cross-chain via proxyAction)", function () {
  this.timeout(10000);

  const mockTransactionId = "tx-withdraw-1";

  describe("Proxy stake withdrawal (via proxyAction)", function () {
    it("should allow proxy role holders to withdraw stake on behalf of source", async function () {
      const { utt, mockOperator, user1, connector, proxyOracle, service1 } =
        await loadFixture(deployUTT);
      await addConnection(utt, connector, user1.address);
      await endorse(
        utt, mockOperator, user1, service1.address, 200, "endorse-tx", [], []
      );

      const balanceBefore = await utt.balanceOf(user1.address);

      await proxyAction(
        utt, proxyOracle, mockOperator,
        user1.address, service1.address, 80, mockTransactionId,
        ActionType.WITHDRAW_STAKE, [], []
      );

      const balanceAfter = await utt.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(80n);
      expect(
        await utt.previousEndorserStakes(service1.address, user1.address)
      ).to.equal(120);
    });

    it("should not allow non-proxy role holders", async function () {
      const { utt, user1, service1 } = await loadFixture(deployUTT);
      await expect(
        utt
          .connect(user1)
          .proxyAction(user1.address, service1.address, 50, mockTransactionId, ActionType.WITHDRAW_STAKE)
      ).to.be.revertedWith(
        await accessControlRevertError(utt, user1.address, "PROXY_ENDORSER_ROLE")
      );
    });

    it("should revert if amount exceeds source's stake", async function () {
      const { utt, mockOperator, user1, connector, proxyOracle, service1 } =
        await loadFixture(deployUTT);
      await addConnection(utt, connector, user1.address);
      await endorse(
        utt, mockOperator, user1, service1.address, 50, "endorse-tx", [], []
      );

      await expect(
        proxyAction(
          utt, proxyOracle, mockOperator,
          user1.address, service1.address, 60, mockTransactionId,
          ActionType.WITHDRAW_STAKE, [], []
        )
      ).to.be.revertedWith("UTT: withdraw amount exceeds stake");
    });
  });

  describe("Previous endorser accounting", function () {
    it("should not penalise previous endorsers (no oracle round-trip)", async function () {
      const { utt, mockOperator, user1, user2, service1, connector } =
        await loadFixture(deployUTT);
      await addConnection(utt, connector, user1.address);
      await addConnection(utt, connector, user2.address);

      // user1 endorses first; user2 endorses with user1 as previous endorser
      await endorse(
        utt, mockOperator, user1, service1.address, 200, "endorse-tx-1", [], []
      );
      await endorse(
        utt, mockOperator, user2, service1.address, 200, "endorse-tx-2", [user1.address], []
      );

      const user1StakeBefore = await utt.previousEndorserStakes(
        service1.address, user1.address
      );

      // user2 withdraws their stake — user1's stake must be untouched
      await withdrawStake(utt, user2, service1.address, 100, mockTransactionId);

      const user1StakeAfter = await utt.previousEndorserStakes(
        service1.address, user1.address
      );
      expect(user1StakeAfter).to.equal(user1StakeBefore);
    });
  });
});
