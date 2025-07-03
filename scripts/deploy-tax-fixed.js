const { ethers } = require("hardhat");
const fs = require('fs');
const { upgrades } = require("hardhat");

/**
 * Deploy CloutX contracts with TAX CALCULATION FIX
 * This fixes the MEDIUM severity vulnerability found in penetration testing
 */
async function main() {
  console.log("🔧 Deploying CloutX contracts with TAX CALCULATION FIX...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy CloutXTokenImproved first (with tax fix)
  console.log("\n📦 Deploying CloutXTokenImproved (TAX FIXED)...");
  const CloutXTokenImproved = await ethers.getContractFactory("CloutXTokenImproved");
  const cloutXToken = await upgrades.deployProxy(CloutXTokenImproved, [
    "CloutX",
    "CLX",
    1000000000 * 10**18, // 1 billion tokens
    deployer.address, // owner
    deployer.address  // reward pool (temporary)
  ], { kind: 'uups' });
  await cloutXToken.deployed();
  console.log("CloutXTokenImproved (TAX FIXED) deployed to:", cloutXToken.address);

  // Deploy TokenVesting with token address
  console.log("\n📦 Deploying TokenVesting...");
  const TokenVesting = await ethers.getContractFactory("TokenVesting");
  const tokenVesting = await TokenVesting.deploy(cloutXToken.address);
  await tokenVesting.deployed();
  console.log("TokenVesting deployed to:", tokenVesting.address);

  // Deploy StakingPool
  console.log("\n📦 Deploying StakingPool...");
  const StakingPool = await ethers.getContractFactory("StakingPool");
  const stakingPool = await StakingPool.deploy(cloutXToken.address);
  await stakingPool.deployed();
  console.log("StakingPool deployed to:", stakingPool.address);

  // Deploy RewardOracleManager
  console.log("\n📦 Deploying RewardOracleManager...");
  const RewardOracleManager = await ethers.getContractFactory("RewardOracleManager");
  const rewardOracleManager = await RewardOracleManager.deploy(cloutXToken.address);
  await rewardOracleManager.deployed();
  console.log("RewardOracleManager deployed to:", rewardOracleManager.address);

  // Deploy GovernanceDAO
  console.log("\n📦 Deploying GovernanceDAO...");
  const GovernanceDAO = await ethers.getContractFactory("GovernanceDAO");
  const governanceDAO = await GovernanceDAO.deploy(cloutXToken.address);
  await governanceDAO.deployed();
  console.log("GovernanceDAO deployed to:", governanceDAO.address);

  // Configure contracts
  console.log("\n🔧 Configuring contracts...");
  
  // Update governance contract in token
  await cloutXToken.updateGovernanceContract(governanceDAO.address);
  console.log("✅ Governance contract updated in token");

  // Update staking contract in token
  await cloutXToken.updateStakingContract(stakingPool.address);
  console.log("✅ Staking contract updated in token");

  // Update reward pool in token
  await cloutXToken.updateRewardPool(rewardOracleManager.address);
  console.log("✅ Reward pool updated in token");

  // Set up token distribution
  console.log("\n💰 Setting up token distribution...");
  
  const totalSupply = await cloutXToken.totalSupply();
  const founderAmount = totalSupply.mul(15).div(100); // 15% for founder
  const communityAmount = totalSupply.mul(30).div(100); // 30% for community
  const liquidityAmount = totalSupply.mul(25).div(100); // 25% for liquidity
  const stakingAmount = totalSupply.mul(20).div(100); // 20% for staking
  const teamAmount = totalSupply.mul(5).div(100); // 5% for team
  const ecosystemAmount = totalSupply.mul(5).div(100); // 5% for ecosystem

  // Transfer tokens to vesting contract for founder and team
  await cloutXToken.transfer(tokenVesting.address, founderAmount.add(teamAmount));
  console.log("✅ Founder and team tokens transferred to vesting");

  // Transfer community tokens to deployer (for distribution)
  await cloutXToken.transfer(deployer.address, communityAmount);
  console.log("✅ Community tokens transferred to deployer");

  // Transfer staking tokens to staking pool
  await cloutXToken.transfer(stakingPool.address, stakingAmount);
  console.log("✅ Staking tokens transferred to staking pool");

  // Transfer ecosystem tokens to governance
  await cloutXToken.transfer(governanceDAO.address, ecosystemAmount);
  console.log("✅ Ecosystem tokens transferred to governance");

  // Liquidity tokens remain with deployer for DEX listing

  // Set up vesting schedules
  console.log("\n⏰ Setting up vesting schedules...");
  
  // Founder vesting: 180 days cliff, 730 days total
  await tokenVesting.createVestingSchedule(
    deployer.address, // founder
    founderAmount,
    "founder" // role
  );
  console.log("✅ Founder vesting schedule created");

  // Team vesting: 90 days cliff, 365 days total
  await tokenVesting.createVestingSchedule(
    deployer.address, // team (same as founder for demo)
    teamAmount,
    "team" // role
  );
  console.log("✅ Team vesting schedule created");

  // Save deployment info
  const deploymentInfo = {
    network: "localhost",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      cloutXToken: cloutXToken.address,
      stakingPool: stakingPool.address,
      rewardOracleManager: rewardOracleManager.address,
      governanceDAO: governanceDAO.address,
      tokenVesting: tokenVesting.address
    },
    tokenDistribution: {
      founder: ethers.utils.formatEther(founderAmount),
      community: ethers.utils.formatEther(communityAmount),
      liquidity: ethers.utils.formatEther(liquidityAmount),
      staking: ethers.utils.formatEther(stakingAmount),
      team: ethers.utils.formatEther(teamAmount),
      ecosystem: ethers.utils.formatEther(ecosystemAmount)
    },
    securityFixes: {
      taxCalculationFixed: true,
      transferFromTaxApplied: true,
      overflowProtection: true,
      edgeCaseHandling: true
    }
  };

  fs.writeFileSync(
    'deployment-tax-fixed-localhost.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n🎯 DEPLOYMENT COMPLETE - TAX CALCULATION FIXED!");
  console.log("=".repeat(60));
  console.log("📋 Contract Addresses:");
  console.log(`   CloutX Token (TAX FIXED): ${cloutXToken.address}`);
  console.log(`   Staking Pool: ${stakingPool.address}`);
  console.log(`   Reward Oracle: ${rewardOracleManager.address}`);
  console.log(`   Governance DAO: ${governanceDAO.address}`);
  console.log(`   Token Vesting: ${tokenVesting.address}`);
  
  console.log("\n💰 Token Distribution:");
  console.log(`   Founder: ${ethers.utils.formatEther(founderAmount)} CLX (15%)`);
  console.log(`   Community: ${ethers.utils.formatEther(communityAmount)} CLX (30%)`);
  console.log(`   Liquidity: ${ethers.utils.formatEther(liquidityAmount)} CLX (25%)`);
  console.log(`   Staking: ${ethers.utils.formatEther(stakingAmount)} CLX (20%)`);
  console.log(`   Team: ${ethers.utils.formatEther(teamAmount)} CLX (5%)`);
  console.log(`   Ecosystem: ${ethers.utils.formatEther(ecosystemAmount)} CLX (5%)`);

  console.log("\n🔧 Security Fixes Applied:");
  console.log("   ✅ transferFrom function with tax calculation");
  console.log("   ✅ Enhanced tax calculation with edge case handling");
  console.log("   ✅ Overflow protection in tax calculations");
  console.log("   ✅ Zero amount transfer protection");

  console.log("\n📄 Deployment info saved to: deployment-tax-fixed-localhost.json");
  console.log("\n🧪 Ready for penetration testing!");
  console.log("💡 Run: npx hardhat run PENtest/pentest-cloutx.js --network localhost");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 