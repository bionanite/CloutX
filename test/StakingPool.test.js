const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("StakingPool", function () {
  let CloutXToken, cloutXToken;
  let StakingPool, stakingPool;
  let RewardOracleManager, rewardOracleManager;
  let owner, user1, user2, user3, rewardPool;
  let initialSupply = ethers.utils.parseEther("1000000000"); // 1 billion CLX

  beforeEach(async function () {
    [owner, user1, user2, user3, rewardPool] = await ethers.getSigners();
    
    // Deploy CLX token using upgrades proxy
    CloutXToken = await ethers.getContractFactory("CloutXToken");
    cloutXToken = await upgrades.deployProxy(CloutXToken, [
      "CloutX", "CLX", initialSupply, owner.address, rewardPool.address
    ], { kind: 'uups' });
    await cloutXToken.deployed();
    
    // Deploy staking pool using upgrades proxy
    StakingPool = await ethers.getContractFactory("StakingPool");
    stakingPool = await upgrades.deployProxy(StakingPool, [
      cloutXToken.address, owner.address
    ], { kind: 'uups' });
    await stakingPool.deployed();
    
    // Deploy reward oracle manager using upgrades proxy
    RewardOracleManager = await ethers.getContractFactory("RewardOracleManager");
    rewardOracleManager = await upgrades.deployProxy(RewardOracleManager, [
      cloutXToken.address, stakingPool.address, owner.address
    ], { kind: 'uups' });
    await rewardOracleManager.deployed();
    
    // Link contracts
    await cloutXToken.updateStakingContract(stakingPool.address);
    await stakingPool.updateRewardOracleManager(rewardOracleManager.address);
    
    // Transfer tokens to users for testing
    await cloutXToken.transfer(user1.address, ethers.utils.parseEther("1000000"));
    await cloutXToken.transfer(user2.address, ethers.utils.parseEther("1000000"));
    await cloutXToken.transfer(user3.address, ethers.utils.parseEther("1000000"));
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await stakingPool.cloutXToken()).to.equal(cloutXToken.address);
      expect(await stakingPool.rewardOracleManager()).to.equal(rewardOracleManager.address);
      expect(await stakingPool.totalStakedAmount()).to.equal(0);
    });

    it("Should create default staking tiers", async function () {
      const tiers = await stakingPool.getAllStakingTiers();
      expect(tiers.length).to.equal(4);
      
      // Check 30-day tier
      expect(tiers[0].lockPeriod).to.equal(30 * 24 * 3600); // 30 days
      expect(tiers[0].baseAPY).to.equal(800); // 8%
      expect(tiers[0].maxStakeAmount).to.equal(ethers.utils.parseEther("1000000"));
      expect(tiers[0].isActive).to.be.true;
      
      // Check 60-day tier
      expect(tiers[1].lockPeriod).to.equal(60 * 24 * 3600); // 60 days
      expect(tiers[1].baseAPY).to.equal(1200); // 12%
      expect(tiers[1].maxStakeAmount).to.equal(ethers.utils.parseEther("2000000"));
      expect(tiers[1].isActive).to.be.true;
      
      // Check 90-day tier
      expect(tiers[2].lockPeriod).to.equal(90 * 24 * 3600); // 90 days
      expect(tiers[2].baseAPY).to.equal(1600); // 16%
      expect(tiers[2].maxStakeAmount).to.equal(ethers.utils.parseEther("5000000"));
      expect(tiers[2].isActive).to.be.true;
      
      // Check 180-day tier
      expect(tiers[3].lockPeriod).to.equal(180 * 24 * 3600); // 180 days
      expect(tiers[3].baseAPY).to.equal(2400); // 24%
      expect(tiers[3].maxStakeAmount).to.equal(ethers.utils.parseEther("10000000"));
      expect(tiers[3].isActive).to.be.true;
    });
  });

  describe("Staking Functions", function () {
    beforeEach(async function () {
      // Approve staking pool to spend user tokens
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await cloutXToken.connect(user2).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
    });

    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("10000");
      const tierIndex = 0; // 30-day tier
      const autoCompound = false;
      
      await stakingPool.connect(user1).stake(stakeAmount, tierIndex, autoCompound);
      
      const userStakes = await stakingPool.getUserStakes(user1.address);
      expect(userStakes.length).to.equal(1);
      expect(userStakes[0].amount).to.equal(stakeAmount);
      expect(userStakes[0].tierIndex).to.equal(tierIndex);
      expect(userStakes[0].autoCompound).to.equal(autoCompound);
      expect(userStakes[0].startTime).to.be.greaterThan(0);
      expect(userStakes[0].lockEndTime).to.be.greaterThan(userStakes[0].startTime);
      
      expect(await stakingPool.totalStaked(user1.address)).to.equal(stakeAmount);
      expect(await stakingPool.totalStakedAmount()).to.equal(stakeAmount);
    });

    it("Should enforce tier maximum stake amounts", async function () {
      const tierIndex = 0; // 30-day tier, max 1M tokens
      const exceedAmount = ethers.utils.parseEther("1100000"); // 1.1M tokens
      
      await expect(
        stakingPool.connect(user1).stake(exceedAmount, tierIndex, false)
      ).to.be.revertedWith("StakingPool: Amount exceeds tier maximum");
    });

    it("Should prevent staking with inactive tier", async function () {
      // Deactivate tier 0
      await stakingPool.updateStakingTier(0, 30 * 24 * 3600, 800, ethers.utils.parseEther("1000000"), false);
      
      await expect(
        stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, false)
      ).to.be.revertedWith("StakingPool: Tier inactive");
    });

    it("Should allow multiple stakes from same user", async function () {
      const stakeAmount1 = ethers.utils.parseEther("10000");
      const stakeAmount2 = ethers.utils.parseEther("20000");
      
      await stakingPool.connect(user1).stake(stakeAmount1, 0, false);
      
      // Wait for cooldown period to pass
      await ethers.provider.send("evm_increaseTime", [61]); // 61 seconds
      await ethers.provider.send("evm_mine");
      
      await stakingPool.connect(user1).stake(stakeAmount2, 1, true);
      
      const userStakes = await stakingPool.getUserStakes(user1.address);
      expect(userStakes.length).to.equal(2);
      expect(await stakingPool.totalStaked(user1.address)).to.equal(stakeAmount1.add(stakeAmount2));
    });
  });

  describe("Unstaking Functions", function () {
    beforeEach(async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, false);
    });

    it("Should allow unstaking after lock period", async function () {
      const userStakes = await stakingPool.getUserStakes(user1.address);
      const lockEndTime = userStakes[0].lockEndTime;
      
      // Fast forward past lock period
      await ethers.provider.send("evm_setNextBlockTimestamp", [lockEndTime + 1]); await ethers.provider.send("evm_mine");
      
      const initialBalance = await cloutXToken.balanceOf(user1.address);
      const initialStaked = await stakingPool.totalStaked(user1.address);
      
      await stakingPool.connect(user1).unstake(0);
      
      expect(await cloutXToken.balanceOf(user1.address)).to.be.greaterThan(initialBalance);
      expect(await stakingPool.totalStaked(user1.address)).to.equal(initialStaked - ethers.utils.parseEther("10000"));
      
      // Stake should be cleared
      const updatedStakes = await stakingPool.getUserStakes(user1.address);
      expect(updatedStakes[0].amount).to.equal(0);
    });

    it("Should prevent unstaking before lock period ends", async function () {
      await expect(
        stakingPool.connect(user1).unstake(0)
      ).to.be.revertedWith("StakingPool: Lock period not ended");
    });

    it("Should allow emergency unstake with penalty", async function () {
      const initialBalance = await cloutXToken.balanceOf(user1.address);
      const initialStaked = await stakingPool.totalStaked(user1.address);
      
      await stakingPool.connect(user1).emergencyUnstake(0);
      
      // Should receive less than staked amount due to penalty
      expect(await cloutXToken.balanceOf(user1.address)).to.be.greaterThan(initialBalance);
      expect(await cloutXToken.balanceOf(user1.address)).to.be.lessThan(
        initialBalance + ethers.utils.parseEther("10000")
      );
      
      expect(await stakingPool.totalStaked(user1.address)).to.equal(initialStaked - ethers.utils.parseEther("10000"));
    });

    it("Should prevent emergency unstake after lock period", async function () {
      const userStakes = await stakingPool.getUserStakes(user1.address);
      const lockEndTime = userStakes[0].lockEndTime;
      
      await ethers.provider.send("evm_setNextBlockTimestamp", [lockEndTime + 1]); await ethers.provider.send("evm_mine");
      
      await expect(
        stakingPool.connect(user1).emergencyUnstake(0)
      ).to.be.revertedWith("StakingPool: Use regular unstake");
    });
  });

  describe("Reward Functions", function () {
    beforeEach(async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, false);
    });

    it("Should calculate rewards correctly", async function () {
      // Fast forward 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 3600]); await ethers.provider.send("evm_mine");
      
      const rewards = await stakingPool.getUserTotalRewards(user1.address);
      expect(rewards).to.be.greaterThan(0);
    });

    it("Should allow claiming rewards", async function () {
      // Fast forward 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 3600]); await ethers.provider.send("evm_mine");
      
      const initialBalance = await cloutXToken.balanceOf(user1.address);
      
      await stakingPool.connect(user1).claimRewards(0);
      
      expect(await cloutXToken.balanceOf(user1.address)).to.be.greaterThan(initialBalance);
    });

    it("Should prevent claiming rewards for inactive stake", async function () {
      const userStakes = await stakingPool.getUserStakes(user1.address);
      const lockEndTime = userStakes[0].lockEndTime;
      
      await ethers.provider.send("evm_setNextBlockTimestamp", [lockEndTime + 1]); await ethers.provider.send("evm_mine");
      await stakingPool.connect(user1).unstake(0);
      
      await expect(
        stakingPool.connect(user1).claimRewards(0)
      ).to.be.revertedWith("StakingPool: Stake not active");
    });
  });

  describe("Auto-Compound Functionality", function () {
    beforeEach(async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, true);
    });

    it("Should allow toggling auto-compound", async function () {
      await stakingPool.connect(user1).toggleAutoCompound(0);
      
      const userStakes = await stakingPool.getUserStakes(user1.address);
      expect(userStakes[0].autoCompound).to.be.false;
      
      await stakingPool.connect(user1).toggleAutoCompound(0);
      
      const updatedStakes = await stakingPool.getUserStakes(user1.address);
      expect(updatedStakes[0].autoCompound).to.be.true;
    });
  });

  describe("Loyalty Multipliers", function () {
    beforeEach(async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
    });

    it("Should apply wallet age multiplier", async function () {
      // Set wallet age to 90 days
      await rewardOracleManager.updateWalletAge(user1.address, 90 * 24 * 3600);
      
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, false);
      
      const userStakes = await stakingPool.getUserStakes(user1.address);
      expect(userStakes[0].loyaltyMultiplier).to.be.greaterThan(0);
    });

    it("Should apply CloutScore multiplier", async function () {
      // Set CloutScore to 8000 (80%)
      await rewardOracleManager.updateCloutScore(user1.address, 8000, true);
      
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, false);
      
      const userStakes = await stakingPool.getUserStakes(user1.address);
      expect(userStakes[0].loyaltyMultiplier).to.be.greaterThan(0);
    });

    it("Should cap loyalty multiplier", async function () {
      // Set very high CloutScore and wallet age
      await rewardOracleManager.updateCloutScore(user1.address, 10000, true);
      await rewardOracleManager.updateWalletAge(user1.address, 365 * 24 * 3600);
      
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, false);
      
      const userStakes = await stakingPool.getUserStakes(user1.address);
      expect(userStakes[0].loyaltyMultiplier).to.be.lessThanOrEqual(2000); // 20% cap
    });
  });

  describe("Governance Functions", function () {
    it("Should allow governance to add staking tier", async function () {
      const lockPeriod = 365 * 24 * 3600; // 1 year
      const baseAPY = 3000; // 30%
      const maxStakeAmount = ethers.utils.parseEther("20000000");
      
      await stakingPool.addStakingTier(lockPeriod, baseAPY, maxStakeAmount);
      
      const tiers = await stakingPool.getAllStakingTiers();
      expect(tiers.length).to.equal(5);
      expect(tiers[4].lockPeriod).to.equal(lockPeriod);
      expect(tiers[4].baseAPY).to.equal(baseAPY);
      expect(tiers[4].maxStakeAmount).to.equal(maxStakeAmount);
      expect(tiers[4].isActive).to.be.true;
    });

    it("Should allow governance to update staking tier", async function () {
      const newLockPeriod = 45 * 24 * 3600; // 45 days
      const newBaseAPY = 1000; // 10%
      const newMaxStakeAmount = ethers.utils.parseEther("1500000");
      const newIsActive = false;
      
      await stakingPool.updateStakingTier(0, newLockPeriod, newBaseAPY, newMaxStakeAmount, newIsActive);
      
      const tiers = await stakingPool.getAllStakingTiers();
      expect(tiers[0].lockPeriod).to.equal(newLockPeriod);
      expect(tiers[0].baseAPY).to.equal(newBaseAPY);
      expect(tiers[0].maxStakeAmount).to.equal(newMaxStakeAmount);
      expect(tiers[0].isActive).to.equal(newIsActive);
    });

    it("Should enforce APY limits", async function () {
      await expect(
        stakingPool.addStakingTier(30 * 24 * 3600, 6000, ethers.utils.parseEther("1000000")) // 60% APY > 50% max
      ).to.be.revertedWith("StakingPool: APY too high");
    });

    it("Should enforce lock period limits", async function () {
      await expect(
        stakingPool.addStakingTier(20 * 24 * 3600, 1000, ethers.utils.parseEther("1000000")) // 20 days < 30 min
      ).to.be.revertedWith("StakingPool: Lock period too short");
      
      await expect(
        stakingPool.addStakingTier(400 * 24 * 3600, 1000, ethers.utils.parseEther("1000000")) // 400 days > 365 max
      ).to.be.revertedWith("StakingPool: Lock period too long");
    });
  });

  describe("Oracle Integration", function () {
    it("Should allow oracle to update CloutScore", async function () {
      await rewardOracleManager.updateCloutScore(user1.address, 7500, true);
      
      const cloutScore = await stakingPool.getCloutScore(user1.address);
      expect(cloutScore.score).to.equal(7500);
      expect(cloutScore.isVerified).to.be.true;
    });

    it("Should allow oracle to update wallet age", async function () {
      const walletAge = 120 * 24 * 3600; // 120 days
      await rewardOracleManager.updateWalletAge(user1.address, walletAge);
      
      // This would be tested through the loyalty multiplier calculation
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, false);
      
      const userStakes = await stakingPool.getUserStakes(user1.address);
      expect(userStakes[0].loyaltyMultiplier).to.be.greaterThan(0);
    });

    it("Should prevent non-oracle from updating scores", async function () {
      await expect(
        stakingPool.connect(user1).updateCloutScore(user1.address, 5000, true)
      ).to.be.revertedWith("StakingPool: Only reward oracle manager");
    });
  });

  describe("Events", function () {
    beforeEach(async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
    });

    it("Should emit Staked event", async function () {
      await expect(
        stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, false)
      ).to.emit(stakingPool, "Staked")
        .withArgs(user1.address, 0, ethers.utils.parseEther("10000"), 0, anyValue, false);
    });

    it("Should emit Unstaked event", async function () {
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, false);
      
      const userStakes = await stakingPool.getUserStakes(user1.address);
      const lockEndTime = userStakes[0].lockEndTime;
      
      await ethers.provider.send("evm_setNextBlockTimestamp", [lockEndTime + 1]); await ethers.provider.send("evm_mine");
      
      await expect(
        stakingPool.connect(user1).unstake(0)
      ).to.emit(stakingPool, "Unstaked")
        .withArgs(user1.address, 0, ethers.utils.parseEther("10000"), anyValue, false);
    });

    it("Should emit AutoCompoundToggled event", async function () {
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("10000"), 0, true);
      
      await expect(
        stakingPool.connect(user1).toggleAutoCompound(0)
      ).to.emit(stakingPool, "AutoCompoundToggled")
        .withArgs(user1.address, 0, false);
    });
  });
});

// Helper function for anyValue matcher
function anyValue() {
  return true;
} 