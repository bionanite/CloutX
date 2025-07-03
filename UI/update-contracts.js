import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the deployment file
const deploymentPath = path.join(__dirname, '..', 'deployment-improved-localhost.json');
const configPath = path.join(__dirname, 'src', 'config', 'web3.ts');

try {
  // Check if deployment file exists
  if (!fs.existsSync(deploymentPath)) {
    console.log('Deployment file not found. Please deploy contracts first.');
    console.log('Looking for:', deploymentPath);
    process.exit(1);
  }

  // Read deployment addresses
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const contracts = deploymentData.contracts;
  
  // Read current config file
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Update contract addresses (handle both 'undefined' strings and actual addresses)
  configContent = configContent.replace(
    /CloutXToken: '[^']*'/,
    `CloutXToken: '${contracts.cloutXToken}'`
  );
  
  configContent = configContent.replace(
    /StakingPool: '[^']*'/,
    `StakingPool: '${contracts.stakingPool}'`
  );
  
  configContent = configContent.replace(
    /RewardOracleManager: '[^']*'/,
    `RewardOracleManager: '${contracts.rewardOracleManager}'`
  );
  
  configContent = configContent.replace(
    /GovernanceDAO: '[^']*'/,
    `GovernanceDAO: '${contracts.governanceDAO}'`
  );
  
  // Write updated config
  fs.writeFileSync(configPath, configContent);
  
  console.log('✅ Contract addresses updated successfully!');
  console.log('📋 Updated addresses:');
  console.log(`   CloutXToken: ${contracts.cloutXToken}`);
  console.log(`   StakingPool: ${contracts.stakingPool}`);
  console.log(`   RewardOracleManager: ${contracts.rewardOracleManager}`);
  console.log(`   GovernanceDAO: ${contracts.governanceDAO}`);
  
} catch (error) {
  console.error('❌ Error updating contract addresses:', error.message);
  process.exit(1);
} 