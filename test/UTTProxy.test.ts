import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, run } from "hardhat";

describe("UTTProxy", function () {
  async function deployContract() {
    const [owner, user1, user2] = await ethers.getSigners();

    const LinkToken = await ethers.getContractFactory("LinkToken");
    const linkToken = await LinkToken.deploy().then((f) => f.deployed());
    const MockOperator = await ethers.getContractFactory("Operator");
    const mockOperator = await MockOperator.deploy(
      linkToken.address,
      owner.address
    ).then((f) => f.deployed());

    await mockOperator.setAuthorizedSenders([owner.address]);
    const UTTProxy = await ethers.getContractFactory("UTTProxy");

    const uttProxy = await UTTProxy.deploy(
      mockOperator.address,
      "",
      ethers.utils.parseEther("0.1"),
      linkToken.address
    );

    await run("fund-link", {
      contract: uttProxy.address,
      linkaddress: linkToken.address,
    });

    return { contract: uttProxy, linkToken, mockOperator, owner, user1, user2 };
  }

  describe("Endorse", function () {
    it("Should be able to burn their own token", async function () {
      const { contract, user1, user2 } = await loadFixture(deployContract);
      await expect(
        contract.connect(user1).endorse(user2.address, 100, "000001")
      ).to.emit(contract, "ChainlinkRequested");
    });
  });
});
