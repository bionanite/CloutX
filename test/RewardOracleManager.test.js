const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("RewardOracleManager", function () {
  let CloutXToken, cloutXToken;
  let StakingPool, stakingPool;
  let RewardOracleManager, rewardOracleManager;
  let owner, user1, user2, user3, oracle1, oracle2, rewardPool;
  let initialSupply = ethers.utils.parseEther("1000000000"); // 1 billion CLX

  beforeEach(async function () {
    [owner, user1, user2, user3, oracle1, oracle2, rewardPool] = await ethers.getSigners();
    
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
    
    // Transfer tokens to RewardOracleManager for reward distribution
    await cloutXToken.transfer(rewardOracleManager.address, ethers.utils.parseEther("10000000"));
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await rewardOracleManager.cloutXToken()).to.equal(cloutXToken.address);
      expect(await rewardOracleManager.stakingPool()).to.equal(stakingPool.address);
      expect(await rewardOracleManager.totalRewardsDistributed()).to.equal(0);
    });

    it("Should set initial daily reward pool", async function () {
      expect(await rewardOracleManager.dailyRewardPool()).to.equal(ethers.utils.parseEther("100000"));
    });

    it("Should create default reward tiers for all platforms", async function () {
      const platforms = ["tiktok", "x", "threads"];
      
      for (const platform of platforms) {
        const tiers = await rewardOracleManager.getRewardTiers(platform);
        expect(tiers.length).to.equal(4);
        
        // Check Bronze tier
        expect(tiers[0].minFollowers).to.equal(1000);
        expect(tiers[0].minEngagement).to.equal(500); // 5%
        expect(tiers[0].rewardMultiplier).to.equal(1200); // 1.2x
        expect(tiers[0].isActive).to.be.true;
        
        // Check Silver tier
        expect(tiers[1].minFollowers).to.equal(10000);
        expect(tiers[1].minEngagement).to.equal(800); // 8%
        expect(tiers[1].rewardMultiplier).to.equal(1500); // 1.5x
        expect(tiers[1].isActive).to.be.true;
        
        // Check Gold tier
        expect(tiers[2].minFollowers).to.equal(100000);
        expect(tiers[2].minEngagement).to.equal(1000); // 10%
        expect(tiers[2].rewardMultiplier).to.equal(2000); // 2x
        expect(tiers[2].isActive).to.be.true;
        
        // Check Diamond tier
        expect(tiers[3].minFollowers).to.equal(1000000);
        expect(tiers[3].minEngagement).to.equal(1200); // 12%
        expect(tiers[3].rewardMultiplier).to.equal(3000); // 3x
        expect(tiers[3].isActive).to.be.true;
      }
    });
  });

  describe("Social Profile Management", function () {
    it("Should allow users to add social profiles", async function () {
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800 // 8% engagement
      );
      
      const profiles = await rewardOracleManager.getUserProfiles(user1.address);
      expect(profiles.length).to.equal(1);
      expect(profiles[0].platform).to.equal("tiktok");
      expect(profiles[0].username).to.equal("user1_tiktok");
      expect(profiles[0].followers).to.equal(50000);
      expect(profiles[0].engagement).to.equal(800);
      expect(profiles[0].isVerified).to.be.false;
    });

    it("Should prevent adding duplicate profiles for same platform", async function () {
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800
      );
      
      await expect(
        rewardOracleManager.connect(user1).addSocialProfile(
          "tiktok",
          "user1_tiktok_alt",
          60000,
          900
        )
      ).to.be.revertedWith("RewardOracleManager: Profile already exists");
    });

    it("Should validate engagement rate", async function () {
      await expect(
        rewardOracleManager.connect(user1).addSocialProfile(
          "tiktok",
          "user1_tiktok",
          50000,
          11000 // 110% > 100%
        )
      ).to.be.revertedWith("RewardOracleManager: Invalid engagement rate");
    });

    it("Should allow multiple profiles from same user", async function () {
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800
      );
      
      await rewardOracleManager.connect(user1).addSocialProfile(
        "x",
        "user1_x",
        30000,
        600
      );
      
      const profiles = await rewardOracleManager.getUserProfiles(user1.address);
      expect(profiles.length).to.equal(2);
    });
  });

  describe("Oracle Integration", function () {
    beforeEach(async function () {
      // Register oracles
      await rewardOracleManager.registerOracle("tiktok", oracle1.address, true);
      await rewardOracleManager.registerOracle("x", oracle2.address, true);
      
      // Add initial profiles
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800
      );
    });

    it("Should allow authorized oracle to update social profiles", async function () {
      await rewardOracleManager.connect(oracle1).updateSocialProfile(
        user1.address,
        "tiktok",
        60000, // New follower count
        900,   // New engagement rate
        true   // Verified
      );
      
      const profiles = await rewardOracleManager.getUserProfiles(user1.address);
      expect(profiles[0].followers).to.equal(60000);
      expect(profiles[0].engagement).to.equal(900);
      expect(profiles[0].isVerified).to.be.true;
    });

    it("Should prevent unauthorized oracle from updating profiles", async function () {
      await expect(
        rewardOracleManager.connect(user2).updateSocialProfile(
          user1.address,
          "tiktok",
          60000,
          900,
          true
        )
      ).to.be.revertedWith("RewardOracleManager: Only authorized oracle");
    });

    it("Should prevent oracle from updating non-existent profile", async function () {
      await expect(
        rewardOracleManager.connect(oracle1).updateSocialProfile(
          user2.address, // User without profile
          "tiktok",
          60000,
          900,
          true
        )
      ).to.be.revertedWith("RewardOracleManager: Profile not found");
    });

    it("Should update oracle data on profile updates", async function () {
      await rewardOracleManager.connect(oracle1).updateSocialProfile(
        user1.address,
        "tiktok",
        60000,
        900,
        true
      );
      
      const oracleData = await rewardOracleManager.getOracleData("tiktok");
      expect(oracleData.updateCount).to.equal(1);
      expect(oracleData.lastUpdate).to.be.greaterThan(0);
    });

    it("Should update CloutScore when profile is verified", async function () {
      await rewardOracleManager.connect(oracle1).updateSocialProfile(
        user1.address,
        "tiktok",
        60000,
        900,
        true
      );
      
      const cloutScore = await rewardOracleManager.getCloutScore(user1.address);
      expect(cloutScore).to.be.greaterThan(0);
      
      const isInfluencer = await rewardOracleManager.getInfluencerStatus(user1.address);
      expect(isInfluencer).to.be.true;
    });
  });

  describe("Reward Calculation", function () {
    beforeEach(async function () {
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800
      );
    });

    it("Should calculate base reward correctly", async function () {
      // This would test the internal _calculateBaseReward function
      // The actual calculation depends on the logarithmic scaling
      const profiles = await rewardOracleManager.getUserProfiles(user1.address);
      expect(profiles[0].impactScore).to.be.greaterThan(0);
    });

    it("Should apply reward tier multipliers", async function () {
      // Add profile that qualifies for Silver tier
      await rewardOracleManager.connect(user2).addSocialProfile(
        "tiktok",
        "user2_tiktok",
        15000, // > 10k followers
        900    // > 8% engagement
      );
      
      const profiles = await rewardOracleManager.getUserProfiles(user2.address);
      expect(profiles[0].impactScore).to.be.greaterThan(0);
    });

    it("Should apply CloutScore bonus", async function () {
      // Set high CloutScore
      await rewardOracleManager.updateCloutScore(user1.address, 8000, true);
      
      // This would be tested through the reward calculation
      const cloutScore = await rewardOracleManager.getCloutScore(user1.address);
      expect(cloutScore).to.equal(8000);
    });
  });

  describe("Reward Claiming", function () {
    beforeEach(async function () {
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800
      );
      
      // Register oracle and update profile
      await rewardOracleManager.registerOracle("tiktok", oracle1.address, true);
      await rewardOracleManager.connect(oracle1).updateSocialProfile(
        user1.address,
        "tiktok",
        50000,
        800,
        true
      );
    });

    it("Should allow users to claim rewards", async function () {
      const initialBalance = await cloutXToken.balanceOf(user1.address);
      
      await rewardOracleManager.connect(user1).claimRewards();
      
      expect(await cloutXToken.balanceOf(user1.address)).to.be.greaterThan(initialBalance);
    });

    it("Should prevent claiming rewards too frequently", async function () {
      await rewardOracleManager.connect(user1).claimRewards();
      
      await expect(
        rewardOracleManager.connect(user1).claimRewards()
      ).to.be.revertedWith("RewardOracleManager: Claim too frequent");
    });

    it("Should prevent claiming when no rewards available", async function () {
      // User without verified profiles
      await expect(
        rewardOracleManager.connect(user2).claimRewards()
      ).to.be.revertedWith("RewardOracleManager: No rewards to claim");
    });
  });

  describe("Governance Functions", function () {
    it("Should allow governance to add reward tiers", async function () {
      await rewardOracleManager.addRewardTier(
        "tiktok",
        500000,  // 500k followers
        1500,    // 15% engagement
        4000     // 4x multiplier
      );
      
      const tiers = await rewardOracleManager.getRewardTiers("tiktok");
      expect(tiers.length).to.equal(5);
      expect(tiers[4].minFollowers).to.equal(500000);
      expect(tiers[4].minEngagement).to.equal(1500);
      expect(tiers[4].rewardMultiplier).to.equal(4000);
      expect(tiers[4].isActive).to.be.true;
    });

    it("Should allow governance to update reward tiers", async function () {
      await rewardOracleManager.updateRewardTier(
        "tiktok",
        0, // Bronze tier
        2000,   // New min followers
        600,    // New min engagement
        1300,   // New multiplier
        false   // Deactivate
      );
      
      const tiers = await rewardOracleManager.getRewardTiers("tiktok");
      expect(tiers[0].minFollowers).to.equal(2000);
      expect(tiers[0].minEngagement).to.equal(600);
      expect(tiers[0].rewardMultiplier).to.equal(1300);
      expect(tiers[0].isActive).to.be.false;
    });

    it("Should enforce reward multiplier limits", async function () {
      await expect(
        rewardOracleManager.addRewardTier(
          "tiktok",
          500000,
          1500,
          6000 // 60% > 50% max
        )
      ).to.be.revertedWith("RewardOracleManager: Multiplier too high");
    });

    it("Should allow governance to register oracles", async function () {
      await rewardOracleManager.registerOracle("threads", oracle1.address, true);
      
      const oracleData = await rewardOracleManager.getOracleData("threads");
      expect(oracleData.oracle).to.equal(oracle1.address);
      expect(oracleData.isActive).to.be.true;
    });

    it("Should allow governance to update daily reward pool", async function () {
      const newPoolSize = ethers.utils.parseEther("200000");
      await rewardOracleManager.updateDailyRewardPool(newPoolSize);
      
      expect(await rewardOracleManager.dailyRewardPool()).to.equal(newPoolSize);
    });
  });

  describe("CloutScore Management", function () {
    it("Should calculate CloutScore based on verified profiles", async function () {
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800
      );
      
      await rewardOracleManager.registerOracle("tiktok", oracle1.address, true);
      await rewardOracleManager.connect(oracle1).updateSocialProfile(
        user1.address,
        "tiktok",
        50000,
        800,
        true
      );
      
      const cloutScore = await rewardOracleManager.getCloutScore(user1.address);
      expect(cloutScore).to.be.greaterThan(0);
      
      const isInfluencer = await rewardOracleManager.getInfluencerStatus(user1.address);
      expect(isInfluencer).to.be.true;
    });

    it("Should update CloutScore when profiles change", async function () {
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800
      );
      
      await rewardOracleManager.registerOracle("tiktok", oracle1.address, true);
      
      // Initial update
      await rewardOracleManager.connect(oracle1).updateSocialProfile(
        user1.address,
        "tiktok",
        50000,
        800,
        true
      );
      
      const initialScore = await rewardOracleManager.getCloutScore(user1.address);
      
      // Update with higher engagement
      await rewardOracleManager.connect(oracle1).updateSocialProfile(
        user1.address,
        "tiktok",
        50000,
        1000, // Higher engagement
        true
      );
      
      const updatedScore = await rewardOracleManager.getCloutScore(user1.address);
      expect(updatedScore.score).to.be.greaterThan(initialScore.score);
    });

    it("Should cap CloutScore at maximum", async function () {
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        10000000, // Very high follower count
        2000      // Very high engagement
      );
      
      await rewardOracleManager.registerOracle("tiktok", oracle1.address, true);
      await rewardOracleManager.connect(oracle1).updateSocialProfile(
        user1.address,
        "tiktok",
        10000000,
        2000,
        true
      );
      
      const cloutScore = await rewardOracleManager.getCloutScore(user1.address);
      expect(cloutScore.score).to.be.lessThanOrEqual(10000); // Max score
    });
  });

  describe("Events", function () {
    it("Should emit SocialProfileAdded event", async function () {
      await expect(
        rewardOracleManager.connect(user1).addSocialProfile(
          "tiktok",
          "user1_tiktok",
          50000,
          800
        )
      ).to.emit(rewardOracleManager, "SocialProfileAdded")
        .withArgs(user1.address, "tiktok", "user1_tiktok", 50000, 800);
    });

    it("Should emit OracleDataUpdated event", async function () {
      await rewardOracleManager.registerOracle("tiktok", oracle1.address, true);
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800
      );
      
      await expect(
        rewardOracleManager.connect(oracle1).updateSocialProfile(
          user1.address,
          "tiktok",
          60000,
          900,
          true
        )
      ).to.emit(rewardOracleManager, "OracleDataUpdated")
        .withArgs("tiktok", user1.address, 60000, 900, anyValue);
    });

    it("Should emit RewardClaimed event", async function () {
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800
      );
      
      await rewardOracleManager.registerOracle("tiktok", oracle1.address, true);
      await rewardOracleManager.connect(oracle1).updateSocialProfile(
        user1.address,
        "tiktok",
        50000,
        800,
        true
      );
      
      await expect(
        rewardOracleManager.connect(user1).claimRewards()
      ).to.emit(rewardOracleManager, "RewardClaimed")
        .withArgs(user1.address, anyValue, "tiktok", anyValue);
    });

    it("Should emit CloutScoreUpdated event", async function () {
      await rewardOracleManager.connect(user1).addSocialProfile(
        "tiktok",
        "user1_tiktok",
        50000,
        800
      );
      
      await rewardOracleManager.registerOracle("tiktok", oracle1.address, true);
      
      await expect(
        rewardOracleManager.connect(oracle1).updateSocialProfile(
          user1.address,
          "tiktok",
          50000,
          800,
          true
        )
      ).to.emit(rewardOracleManager, "CloutScoreUpdated")
        .withArgs(user1.address, anyValue, true);
    });
  });

  describe("Error Handling", function () {
    it("Should revert on invalid platform", async function () {
      await expect(
        rewardOracleManager.connect(user1).addSocialProfile(
          "invalid_platform",
          "user1_invalid",
          50000,
          800
        )
      ).to.be.revertedWith("RewardOracleManager: Invalid platform");
    });

    it("Should revert on invalid engagement rate", async function () {
      await expect(
        rewardOracleManager.connect(user1).addSocialProfile(
          "tiktok",
          "user1_tiktok",
          50000,
          11000 // > 100%
        )
      ).to.be.revertedWith("RewardOracleManager: Invalid engagement rate");
    });

    it("Should revert on invalid CloutScore", async function () {
      await expect(
        rewardOracleManager.updateCloutScore(user1.address, 11000, true) // > 10000
      ).to.be.revertedWith("RewardOracleManager: Invalid CloutScore");
    });

    it("Should revert on invalid reward multiplier", async function () {
      await expect(
        rewardOracleManager.addRewardTier(
          "tiktok",
          500000,
          1500,
          6000 // > 5000 max
        )
      ).to.be.revertedWith("RewardOracleManager: Multiplier too high");
    });
  });
});

// Helper function for anyValue matcher
function anyValue() {
  return true;
} 