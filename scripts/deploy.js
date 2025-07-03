const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy CLX Token
  console.log("\n1. Deploying CloutX Token...");
  const CloutXToken = await ethers.getContractFactory("CloutXToken");
  const cloutXToken = await upgrades.deployProxy(CloutXToken, [
    "CloutX",
    "CLX",
    ethers.utils.parseEther("1000000000"), // 1 billion CLX
    deployer.address,
    deployer.address // Initial reward pool (will be updated)
  ]);
  await cloutXToken.deployed();
  console.log("CloutX Token deployed to:", cloutXToken.address);

  // Deploy Staking Pool
  console.log("\n2. Deploying Staking Pool...");
  const StakingPool = await ethers.getContractFactory("StakingPool");
  const stakingPool = await upgrades.deployProxy(StakingPool, [
    cloutXToken.address,
    deployer.address
  ]);
  await stakingPool.deployed();
  console.log("Staking Pool deployed to:", stakingPool.address);

  // Deploy Reward Oracle Manager
  console.log("\n3. Deploying Reward Oracle Manager...");
  const RewardOracleManager = await ethers.getContractFactory("RewardOracleManager");
  const rewardOracleManager = await upgrades.deployProxy(RewardOracleManager, [
    cloutXToken.address,
    stakingPool.address,
    deployer.address
  ]);
  await rewardOracleManager.deployed();
  console.log("Reward Oracle Manager deployed to:", rewardOracleManager.address);

  // Deploy Governance DAO
  console.log("\n4. Deploying Governance DAO...");
  const GovernanceDAO = await ethers.getContractFactory("GovernanceDAO");
  const governanceDAO = await upgrades.deployProxy(GovernanceDAO, [
    cloutXToken.address,
    stakingPool.address,
    deployer.address
  ]);
  await governanceDAO.deployed();
  console.log("Governance DAO deployed to:", governanceDAO.address);

  // Link contracts
  console.log("\n5. Linking contracts...");
  
  // Update CLX token with staking contract
  await cloutXToken.updateStakingContract(stakingPool.address);
  console.log("✓ CLX Token linked to Staking Pool");

  // Update CLX token with governance contract
  await cloutXToken.updateGovernanceContract(governanceDAO.address);
  console.log("✓ CLX Token linked to Governance DAO");

  // Update staking pool with reward oracle manager
  await stakingPool.updateRewardOracleManager(rewardOracleManager.address);
  console.log("✓ Staking Pool linked to Reward Oracle Manager");

  // Update staking pool with governance contract
  await stakingPool.updateGovernanceContract(governanceDAO.address);
  console.log("✓ Staking Pool linked to Governance DAO");

  // Update reward oracle manager with governance contract
  await rewardOracleManager.updateGovernanceContract(governanceDAO.address);
  console.log("✓ Reward Oracle Manager linked to Governance DAO");

  // Update CLX token reward pool to reward oracle manager
  await cloutXToken.updateRewardPool(rewardOracleManager.address);
  console.log("✓ CLX Token reward pool updated to Reward Oracle Manager");

  // Register default oracles (for testing)
  console.log("\n6. Registering default oracles...");
  await rewardOracleManager.registerOracle("tiktok", deployer.address, true);
  await rewardOracleManager.registerOracle("x", deployer.address, true);
  await rewardOracleManager.registerOracle("threads", deployer.address, true);
  console.log("✓ Default oracles registered");

  // Verify initial configuration
  console.log("\n7. Verifying initial configuration...");
  
  const tokenName = await cloutXToken.name();
  const tokenSymbol = await cloutXToken.symbol();
  const totalSupply = await cloutXToken.totalSupply();
  
  console.log(`✓ Token: ${tokenName} (${tokenSymbol})`);
  console.log(`✓ Total Supply: ${ethers.utils.formatEther(totalSupply)} CLX`);
  console.log(`✓ Owner: ${deployer.address}`);

  const stakingTiers = await stakingPool.getAllStakingTiers();
  console.log(`✓ Staking Tiers: ${stakingTiers.length} tiers configured`);

  const rewardTiers = await rewardOracleManager.getRewardTiers("tiktok");
  console.log(`✓ Reward Tiers: ${rewardTiers.length} tiers per platform`);

  const governanceSettings = await governanceDAO.getGovernanceSettings();
  console.log(`✓ Governance: ${ethers.utils.formatEther(governanceSettings.proposalThreshold)} CLX proposal threshold`);

  // Print deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 CLoutX Ecosystem Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log(`CloutX Token:     ${cloutXToken.address}`);
  console.log(`Staking Pool:     ${stakingPool.address}`);
  console.log(`Reward Oracle:    ${rewardOracleManager.address}`);
  console.log(`Governance DAO:   ${governanceDAO.address}`);
  console.log("\nNext Steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Set up real oracle addresses");
  console.log("3. Configure governance parameters");
  console.log("4. Launch social mining rewards");
  console.log("5. Begin staking operations");
  console.log("\n" + "=".repeat(60));

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      cloutXToken: cloutXToken.address,
      stakingPool: stakingPool.address,
      rewardOracleManager: rewardOracleManager.address,
      governanceDAO: governanceDAO.address
    },
    timestamp: new Date().toISOString()
  };

  const fs = require('fs');
  fs.writeFileSync(
    `deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\nDeployment info saved to: deployment-${hre.network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 