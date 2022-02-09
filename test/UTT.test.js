const { ethers } = require("hardhat");
const { expect } = require("chai");

const { AddressZero } = ethers.constants;

async function deploy(...params) {
  const Contract = await ethers.getContractFactory("UTT");
  return await Contract.deploy(...params).then((f) => f.deployed());
}


describe("UTT", function () {
  let mintAmount = ethers.utils.parseEther('1000000');
  let utt;
  let admin;
  let user1;
  let user2;
  let user3;
  let service1;
  let service2;
  let accounts;
  let precision = Math.pow(10, 5);

  before(async function () {
    [admin, user1, user2, user3, service1, service2, ...accounts] =
      await ethers.getSigners();
  });

  beforeEach(async function () {
    utt = await deploy(mintAmount);

    //send initial coins to first 3 addresses
    await utt.connect(admin).transfer(user1.address, ethers.utils.parseEther('10'));
    await utt.connect(admin).transfer(user2.address, ethers.utils.parseEther('10'));
    await utt.connect(admin).transfer(user3.address, ethers.utils.parseEther('10'));

    // await utt.connect(this.admin).endorse(service.address, 1, [], []);
    // await utt.connect(this.admin).endorse(service.address, 1, [], []);

  });

  describe("Endorsements", function () {

    it('should halve a number correctly', async function () {
      const result = await utt.connect(admin).multiplyByPercent(10, 50, 5);
      expect(result).to.deep.equal(ethers.BigNumber.from(5).mul(Math.pow(10, 5)));
    })

    it("should take your tokens when you endorsing", async function () {
      expect(
        await utt.connect(admin).balanceOf(admin.address)
      ).to.equal(ethers.utils.parseEther('999970'));
    });

    it('should evaluate the formula in the whitepaper', async function () {
      await expect(
        utt.connect(admin)
          .endorse(service1.address, 1, [user2.address, user3.address], [])
      )
        .to.emit(utt, 'EndorseRewardFormula')
        .withArgs(admin.address, 2 * precision);
    })

    it('should not give tokens when theres no parent endorsers', async function () {
      await expect(
        utt.connect(admin)
          .endorse(service1.address, 1, [user2.address, user3.address], [])
      )
        .to.not.emit(utt, 'ParentEndorsersReward')
    })

    it('should give back rewards to endorser', async function () {
      await expect(
        utt.connect(admin)
          .endorse(service1.address, 1, [user2.address], [])
      )
        .to.emit(utt, 'SubmitRewardsEndorser')
        .withArgs(admin.address, 2 * precision);
    })

    it('should give token to parent endorser of endorsed service', async function () {
      await utt.connect(user1).endorse(service1.address, 1, [], []);
      await utt.connect(user2).endorse(service2.address, 5, [], []);

      await expect(
        utt.connect(user3)
          .endorse(service1.address, 3, [admin.address, user1.address], [])
      )
        .to.emit(utt, 'EndorseRewardFormula')
        .withArgs(user3.address, 1 * precision);
    })

  });
});
