const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("CloutXToken", function () {
  let CloutXToken, cloutXToken;
  let owner, user1, user2, user3, rewardPool;
  let initialSupply = ethers.utils.parseEther("1000000000"); // 1 billion CLX

  beforeEach(async function () {
    [owner, user1, user2, user3, rewardPool] = await ethers.getSigners();
    
    CloutXToken = await ethers.getContractFactory("CloutXToken");
    cloutXToken = await upgrades.deployProxy(CloutXToken, [
      "CloutX", "CLX", initialSupply, owner.address, rewardPool.address
    ], { kind: 'uups' });
    await cloutXToken.deployed();
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await cloutXToken.name()).to.equal("CloutX");
      expect(await cloutXToken.symbol()).to.equal("CLX");
      expect(await cloutXToken.totalSupply()).to.equal(initialSupply);
      expect(await cloutXToken.balanceOf(owner.address)).to.equal(initialSupply);
      expect(await cloutXToken.rewardPool()).to.equal(rewardPool.address);
    });

    it("Should set initial tax configuration", async function () {
      const taxConfig = await cloutXToken.getTaxConfig();
      expect(taxConfig.buyTax).to.equal(200); // 2%
      expect(taxConfig.sellTax).to.equal(200); // 2%
      expect(taxConfig.transferTax).to.equal(100); // 1%
      expect(taxConfig.burnRate).to.equal(5000); // 50%
      expect(taxConfig.rewardRate).to.equal(5000); // 50%
    });

    it("Should set initial anti-bot configuration", async function () {
      const antiBotConfig = await cloutXToken.getAntiBotConfig();
      expect(antiBotConfig.maxTxAmount).to.equal(initialSupply.div(100));
      expect(antiBotConfig.maxWalletAmount).to.equal(initialSupply.div(50));
      expect(antiBotConfig.cooldownPeriod).to.equal(60);
      expect(antiBotConfig.antiBotEnabled).to.be.true;
    });

    it("Should exclude owner and reward pool from taxes", async function () {
      expect(await cloutXToken.isExcludedFromTax(owner.address)).to.be.true;
      expect(await cloutXToken.isExcludedFromTax(rewardPool.address)).to.be.true;
      expect(await cloutXToken.isExcludedFromLimits(owner.address)).to.be.true;
      expect(await cloutXToken.isExcludedFromLimits(rewardPool.address)).to.be.true;
    });
  });

  describe("Transfer and Tax Logic", function () {
    beforeEach(async function () {
      // Transfer some tokens to users for testing
      await cloutXToken.transfer(user1.address, ethers.utils.parseEther("1000000"));
      await cloutXToken.transfer(user2.address, ethers.utils.parseEther("1000000"));
    });

    it("Should transfer tokens without tax for excluded addresses", async function () {
      // Exclude user1 from tax for this test
      await cloutXToken.setExcludedFromTax(user1.address, true);
      
      const transferAmount = ethers.utils.parseEther("1000");
      const initialBalance = await cloutXToken.balanceOf(user2.address);
      
      await cloutXToken.connect(user1).transfer(user2.address, transferAmount);
      
      expect(await cloutXToken.balanceOf(user2.address)).to.equal(
        initialBalance.add(transferAmount)
      );
      
      // Reset exclusion for other tests
      await cloutXToken.setExcludedFromTax(user1.address, false);
    });

    it("Should apply transfer tax for non-excluded addresses", async function () {
      const transferAmount = ethers.utils.parseEther("1000");
      const initialRewardBalance = await cloutXToken.balanceOf(rewardPool.address);
      
      await cloutXToken.connect(user1).transfer(user3.address, transferAmount);
      
      // Calculate expected tax (1% transfer tax)
      const taxAmount = transferAmount.mul(100).div(10000); // 1%
      const burnAmount = taxAmount.mul(5000).div(10000); // 50% burned
      const rewardAmount = taxAmount.mul(5000).div(10000); // 50% to rewards
      const netTransfer = transferAmount.sub(taxAmount);
      
      expect(await cloutXToken.balanceOf(user3.address)).to.equal(netTransfer);
      expect(await cloutXToken.balanceOf(rewardPool.address)).to.equal(initialRewardBalance.add(rewardAmount));
    });

    it("Should burn tokens on transfer", async function () {
      const transferAmount = ethers.utils.parseEther("1000");
      const initialTotalSupply = await cloutXToken.totalSupply();
      const initialBurnedAmount = await cloutXToken.totalBurned();
      
      await cloutXToken.connect(user1).transfer(user3.address, transferAmount);
      
      const taxAmount = transferAmount.mul(100).div(10000);
      const burnAmount = taxAmount.mul(5000).div(10000);
      
      expect(await cloutXToken.totalSupply()).to.equal(initialTotalSupply.sub(burnAmount));
      expect(await cloutXToken.totalBurned()).to.equal(initialBurnedAmount.add(burnAmount));
    });

    it("Should calculate tax correctly", async function () {
      const amount = ethers.utils.parseEther("1000");
      const [taxAmount, burnAmount, rewardAmount] = await cloutXToken.calculateTax(
        amount, false, false
      );
      
      expect(taxAmount).to.equal(amount.mul(100).div(10000)); // 1% transfer tax
      expect(burnAmount).to.equal(taxAmount.mul(5000).div(10000)); // 50% burned
      expect(rewardAmount).to.equal(taxAmount.mul(5000).div(10000)); // 50% to rewards
    });
  });

  describe("Anti-Bot Protection", function () {
    beforeEach(async function () {
      await cloutXToken.transfer(user1.address, ethers.utils.parseEther("1000000"));
    });

    it("Should enforce transaction amount limits", async function () {
      const maxTxAmount = await cloutXToken.getAntiBotConfig().then(config => config.maxTxAmount);
      const exceedAmount = maxTxAmount + ethers.utils.parseEther("1");
      
      await expect(
        cloutXToken.connect(user1).transfer(user2.address, exceedAmount)
      ).to.be.revertedWith("CloutX: Transaction amount exceeds maximum");
    });

    it("Should enforce wallet balance limits", async function () {
      const maxWalletAmount = await cloutXToken.getAntiBotConfig().then(config => config.maxWalletAmount);
      const currentBalance = await cloutXToken.balanceOf(user2.address);
      
      // Transfer amount that would exceed wallet limit
      const transferAmount = maxWalletAmount.sub(currentBalance).add(ethers.utils.parseEther("1000"));
      
      await expect(
        cloutXToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.reverted;
    });

    it("Should enforce cooldown period", async function () {
      const cooldownPeriod = await cloutXToken.getAntiBotConfig().then(config => config.cooldownPeriod);
      
      await cloutXToken.connect(user1).transfer(user2.address, ethers.utils.parseEther("1000"));
      
      await expect(
        cloutXToken.connect(user1).transfer(user2.address, ethers.utils.parseEther("1000"))
      ).to.be.revertedWith("CloutX: Cooldown period not met");
    });

    it("Should allow excluded addresses to bypass limits", async function () {
      await cloutXToken.setExcludedFromLimits(user1.address, true);
      await cloutXToken.setExcludedFromLimits(user2.address, true);
      
      const maxTxAmount = await cloutXToken.getAntiBotConfig().then(config => config.maxTxAmount);
      const transferAmount = maxTxAmount.add(ethers.utils.parseEther("1"));
      
      // Make sure user1 has enough balance
      const currentBalance = await cloutXToken.balanceOf(user1.address);
      if (currentBalance.lt(transferAmount)) {
        await cloutXToken.transfer(user1.address, transferAmount.sub(currentBalance));
      }
      
      // Should not revert
      await cloutXToken.connect(user1).transfer(user2.address, transferAmount);
    });
  });

  describe("Governance Functions", function () {
    it("Should allow owner to update tax configuration", async function () {
      const newBuyTax = 300; // 3%
      const newSellTax = 400; // 4%
      const newTransferTax = 200; // 2%
      const newBurnRate = 6000; // 60%
      const newRewardRate = 4000; // 40%
      
      await cloutXToken.updateTaxConfig(
        newBuyTax, newSellTax, newTransferTax, newBurnRate, newRewardRate
      );
      
      const taxConfig = await cloutXToken.getTaxConfig();
      expect(taxConfig.buyTax).to.equal(newBuyTax);
      expect(taxConfig.sellTax).to.equal(newSellTax);
      expect(taxConfig.transferTax).to.equal(newTransferTax);
      expect(taxConfig.burnRate).to.equal(newBurnRate);
      expect(taxConfig.rewardRate).to.equal(newRewardRate);
    });

    it("Should allow owner to update anti-bot configuration", async function () {
      const newMaxTxAmount = ethers.utils.parseEther("5000000");
      const newMaxWalletAmount = ethers.utils.parseEther("10000000");
      const newCooldownPeriod = 120;
      const newAntiBotEnabled = false;
      
      await cloutXToken.updateAntiBotConfig(
        newMaxTxAmount, newMaxWalletAmount, newCooldownPeriod, newAntiBotEnabled
      );
      
      const antiBotConfig = await cloutXToken.getAntiBotConfig();
      expect(antiBotConfig.maxTxAmount).to.equal(newMaxTxAmount);
      expect(antiBotConfig.maxWalletAmount).to.equal(newMaxWalletAmount);
      expect(antiBotConfig.cooldownPeriod).to.equal(newCooldownPeriod);
      expect(antiBotConfig.antiBotEnabled).to.equal(newAntiBotEnabled);
    });

    it("Should allow owner to update reward pool", async function () {
      const newRewardPool = user3.address;
      
      await cloutXToken.updateRewardPool(newRewardPool);
      
      expect(await cloutXToken.rewardPool()).to.equal(newRewardPool);
      expect(await cloutXToken.isExcludedFromTax(newRewardPool)).to.be.true;
      expect(await cloutXToken.isExcludedFromLimits(newRewardPool)).to.be.true;
    });

    it("Should allow owner to exclude addresses from tax", async function () {
      await cloutXToken.setExcludedFromTax(user1.address, true);
      expect(await cloutXToken.isExcludedFromTax(user1.address)).to.be.true;
      
      await cloutXToken.setExcludedFromTax(user1.address, false);
      expect(await cloutXToken.isExcludedFromTax(user1.address)).to.be.false;
    });

    it("Should allow owner to exclude addresses from limits", async function () {
      await cloutXToken.setExcludedFromLimits(user1.address, true);
      expect(await cloutXToken.isExcludedFromLimits(user1.address)).to.be.true;
      
      await cloutXToken.setExcludedFromLimits(user1.address, false);
      expect(await cloutXToken.isExcludedFromLimits(user1.address)).to.be.false;
    });
  });

  describe("Pausable Functionality", function () {
    it("Should allow governance to pause and unpause", async function () {
      await cloutXToken.setPaused(true);
      expect(await cloutXToken.paused()).to.be.true;
      
      await cloutXToken.setPaused(false);
      expect(await cloutXToken.paused()).to.be.false;
    });

    it("Should prevent transfers when paused", async function () {
      await cloutXToken.setPaused(true);
      
      await expect(
        cloutXToken.transfer(user1.address, ethers.utils.parseEther("1000"))
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Events", function () {
    it("Should emit TaxCollected event on transfer", async function () {
      const transferAmount = ethers.utils.parseEther("1000");
      
      // Ensure user1 has enough balance for transfer + tax
      const currentBalance = await cloutXToken.balanceOf(user1.address);
      const taxAmount = transferAmount.mul(100).div(10000); // 1% tax
      const totalNeeded = transferAmount.add(taxAmount);
      
      if (currentBalance.lt(totalNeeded)) {
        await cloutXToken.transfer(user1.address, totalNeeded.sub(currentBalance));
      }
      
      await expect(cloutXToken.connect(user1).transfer(user3.address, transferAmount))
        .to.emit(cloutXToken, "TaxCollected");
    });

    it("Should emit TaxConfigUpdated event", async function () {
      await expect(
        cloutXToken.updateTaxConfig(300, 400, 200, 6000, 4000)
      ).to.emit(cloutXToken, "TaxConfigUpdated")
        .withArgs(300, 400, 200, 6000, 4000);
    });

    it("Should emit AntiBotConfigUpdated event", async function () {
      await expect(
        cloutXToken.updateAntiBotConfig(
          ethers.utils.parseEther("5000000"),
          ethers.utils.parseEther("10000000"),
          120,
          false
        )
      ).to.emit(cloutXToken, "AntiBotConfigUpdated")
        .withArgs(ethers.utils.parseEther("5000000"), ethers.utils.parseEther("10000000"), 120, false);
    });
  });

  describe("Error Handling", function () {
    it("Should revert on invalid tax configuration", async function () {
      await expect(
        cloutXToken.updateTaxConfig(1100, 200, 100, 5000, 5000) // 11% tax > 10% max
      ).to.be.revertedWith("CloutX: Buy tax too high");
    });

    it("Should revert on invalid burn/reward split", async function () {
      await expect(
        cloutXToken.updateTaxConfig(200, 200, 100, 6000, 5000) // 110% total
      ).to.be.revertedWith("CloutX: Invalid burn/reward split");
    });

    it("Should revert on invalid cooldown period", async function () {
      await expect(
        cloutXToken.updateAntiBotConfig(
          ethers.utils.parseEther("5000000"),
          ethers.utils.parseEther("10000000"),
          20, // < 30 seconds minimum
          true
        )
      ).to.be.revertedWith("CloutX: Cooldown too short");
    });

    it("Should revert on invalid reward pool address", async function () {
      await expect(
        cloutXToken.updateRewardPool(ethers.constants.AddressZero)
      ).to.be.revertedWith("CloutX: Invalid reward pool address");
    });
  });
});

// Helper function for anyValue matcher
function anyValue() {
  return true;
} 