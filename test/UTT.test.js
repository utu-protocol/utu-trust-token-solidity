const {ethers} = require("hardhat");
const {expect} = require("chai");

const {AddressZero} = ethers.constants;

async function deploy() {
  const Contract = await ethers.getContractFactory("UTT");
  return await Contract.deploy().then((f) => f.deployed());
}


describe("UTU", function () {
  before(async function () {
    this.accounts = await ethers.getSigners();
    this.admin = this.accounts[0];
    this.regularAcc = this.accounts[1];
    this.regularAcc2 = this.accounts[2];
    this.regularAcc3 = this.accounts[3];

    this.service = this.accounts[4];
    this.service2 = this.accounts[5];
  });

  context("Endorsements", function () {
    beforeEach(async function () {
      this.utt = await deploy();
      this.precision = Math.pow(10,5);
      //send initial coins to first 3 addresses
      await this.utt.connect(this.admin).transfer(this.regularAcc.address, ethers.utils.parseEther("10"));
      await this.utt.connect(this.admin).transfer(this.regularAcc2.address, ethers.utils.parseEther("10"));
      await this.utt.connect(this.admin).transfer(this.regularAcc3.address, ethers.utils.parseEther("10"));

      await this.utt.connect(this.admin)
      .endorse(this.service.address, 1,[]);
      
    });
    
    it('should halve a number', async function(){
      let precision = 5;
      let result = await this.utt.connect(this.admin).multiplyByPercent(10, 50, precision);
      expect(result.toString()/Math.pow(10,5)).to.equal(5);

    })
    it("should take your tokens when you endorsing", async function () {
      let newBalance = await this.utt.connect(this.admin).balanceOf(this.admin.address);
      await expect(newBalance.toString() == '99000000000000000000');
    });
    it('should evaluate the formula in the whitepaper', async function(){
      await expect(this.utt.connect(this.admin)
      .endorse(this.service.address, 1,[this.regularAcc2.address, this.regularAcc3.address]))
      .to.emit(this.utt, 'EndorseRewardFormula')
      .withArgs(this.admin.address,2 * this.precision);
    })
    it('should not give tokens when theres no parent endorsers', async function(){
      await expect(this.utt.connect(this.admin)
      .endorse(this.service.address, 1,[this.regularAcc2.address, this.regularAcc3.address]))
      .to.not.emit(this.utt, 'ParentEndorsersReward')
    })
    it('should give back rewards to endorser', async function(){
      await expect(this.utt.connect(this.admin)
      .endorse(this.service.address, 1,[this.regularAcc2.address]))
      .to.emit(this.utt, 'SubmitRewardsEndorser')
      .withArgs(this.admin.address, 2 * this.precision);
    })
    it('should give token to parent endorser of endorsed service', async function(){    
      await this.utt.connect(this.regularAcc)
      .endorse(this.service.address, 1, []);

      await this.utt.connect(this.regularAcc2)
      .endorse(this.service2.address, 5, []);

      await expect(this.utt.connect(this.regularAcc3)
      .endorse(this.service.address, 3, [this.admin.address, this.regularAcc.address]))
      .to.emit(this.utt, 'EndorseRewardFormula')
      .withArgs(this.regularAcc3.address, 1 * this.precision);
    })
  });
});
