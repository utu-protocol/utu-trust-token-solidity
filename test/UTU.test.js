const { ethers } = require("hardhat");
const { expect } = require("chai");

const { AddressZero } = ethers.constants;

async function deploy() {
  const Contract = await ethers.getContractFactory("UTU");
  return await Contract.deploy().then((f) => f.deployed());
}

describe("UTU", function () {
  before(async function () {
    this.accounts = await ethers.getSigners();
    this.admin = this.accounts[0];
    this.regularAcc = this.accounts[1];
  });

  context("Endorsements", function () {
    beforeEach(async function () {
      this.utu = await deploy();
    });

     it("should be possible to endorse anyone", async function () {
       await expect(
         this.utu.connect(this.admin).endorse(this.regularAcc.address, ethers.utils.parseEther("1")
      ))
        .to.emit(this.utu, "Endorse")
         .withArgs(this.admin.address, this.regularAcc.address, 1, ethers.utils.parseEther("1"));
    });
  });
});