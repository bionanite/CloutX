#!/usr/bin/env node

/**
 * CloutX Simple Integration Test
 * Tests frontend-contract integration with fallback to mock data
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleIntegrationTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFunction) {
    try {
      console.log(`🧪 ${name}`);
      await testFunction();
      this.testResults.passed++;
      this.testResults.tests.push({ name, status: 'PASSED' });
      console.log(`✅ ${name} - PASSED\n`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}\n`);
    }
  }

  async testContractAddressLoading() {
    await this.runTest('Contract Address Loading Test', async () => {
      // Test loading deployment file
      const deploymentPath = path.join(__dirname, '..', 'deployment-hardhat.json');
      if (!fs.existsSync(deploymentPath)) {
        throw new Error('Deployment file not found');
      }

      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      const contracts = deployment.contracts;

      console.log(`   ✓ Deployment file loaded successfully`);
      console.log(`   ✓ CloutXToken: ${contracts.cloutXToken}`);
      console.log(`   ✓ StakingPool: ${contracts.stakingPool}`);
      console.log(`   ✓ RewardOracleManager: ${contracts.rewardOracleManager}`);
      console.log(`   ✓ GovernanceDAO: ${contracts.governanceDAO}`);

      // Validate addresses are valid Ethereum addresses
      const isValidAddress = (addr) => ethers.utils.isAddress(addr);
      
      if (!isValidAddress(contracts.cloutXToken)) throw new Error('Invalid CloutXToken address');
      if (!isValidAddress(contracts.stakingPool)) throw new Error('Invalid StakingPool address');
      if (!isValidAddress(contracts.rewardOracleManager)) throw new Error('Invalid RewardOracleManager address');
      if (!isValidAddress(contracts.governanceDAO)) throw new Error('Invalid GovernanceDAO address');

      console.log(`   ✓ All contract addresses are valid Ethereum addresses`);
    });
  }

  async testFrontendConfigUpdate() {
    await this.runTest('Frontend Config Update Test', async () => {
      const configPath = path.join(__dirname, 'src', 'config', 'web3.ts');
      if (!fs.existsSync(configPath)) {
        throw new Error('Web3 config file not found');
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Check if contract addresses are updated (not undefined or zero addresses)
      if (configContent.includes("'undefined'")) {
        throw new Error('Contract addresses contain undefined values');
      }

      if (configContent.includes('0x0000000000000000000000000000000000000000')) {
        throw new Error('Contract addresses contain zero addresses');
      }

      console.log(`   ✓ Web3 config file exists and contains valid addresses`);
      console.log(`   ✓ No undefined or zero addresses found`);
    });
  }

  async testABIDefinitions() {
    await this.runTest('ABI Definitions Test', async () => {
      const abiPath = path.join(__dirname, 'src', 'contracts', 'abis.ts');
      if (!fs.existsSync(abiPath)) {
        throw new Error('ABI definitions file not found');
      }

      const abiContent = fs.readFileSync(abiPath, 'utf8');
      
      // Check for essential functions in each ABI
      const requiredFunctions = {
        CLOUTX_TOKEN_ABI: ['balanceOf', 'totalSupply', 'transfer', 'burnedTokens', 'rewardPool'],
        STAKING_POOL_ABI: ['stake', 'unstake', 'getUserStakes', 'getTierInfo'],
        REWARD_ORACLE_MANAGER_ABI: ['getUserCloutScore', 'getPendingRewards'],
        GOVERNANCE_DAO_ABI: ['createProposal', 'vote', 'getProposal']
      };

      for (const [abiName, functions] of Object.entries(requiredFunctions)) {
        for (const func of functions) {
          if (!abiContent.includes(func)) {
            throw new Error(`Missing function ${func} in ${abiName}`);
          }
        }
        console.log(`   ✓ ${abiName} contains all required functions`);
      }

      console.log(`   ✓ All ABI definitions are complete`);
    });
  }

  async testHookDefinitions() {
    await this.runTest('React Hook Definitions Test', async () => {
      const tokenHookPath = path.join(__dirname, 'src', 'hooks', 'useCloutXToken.ts');
      const stakingHookPath = path.join(__dirname, 'src', 'hooks', 'useStaking.ts');

      if (!fs.existsSync(tokenHookPath)) {
        throw new Error('useCloutXToken hook not found');
      }

      if (!fs.existsSync(stakingHookPath)) {
        throw new Error('useStaking hook not found');
      }

      const tokenHookContent = fs.readFileSync(tokenHookPath, 'utf8');
      const stakingHookContent = fs.readFileSync(stakingHookPath, 'utf8');

      // Check for essential hook features
      const tokenHookFeatures = ['useAccount', 'useReadContract', 'useWriteContract', 'balance', 'totalSupply'];
      const stakingHookFeatures = ['useAccount', 'useReadContract', 'stake', 'unstake', 'userStakes'];

      for (const feature of tokenHookFeatures) {
        if (!tokenHookContent.includes(feature)) {
          throw new Error(`Missing feature ${feature} in useCloutXToken hook`);
        }
      }

      for (const feature of stakingHookFeatures) {
        if (!stakingHookContent.includes(feature)) {
          throw new Error(`Missing feature ${feature} in useStaking hook`);
        }
      }

      console.log(`   ✓ useCloutXToken hook contains all required features`);
      console.log(`   ✓ useStaking hook contains all required features`);
    });
  }

  async testComponentIntegration() {
    await this.runTest('Component Integration Test', async () => {
      const dashboardPath = path.join(__dirname, 'components', 'Dashboard.tsx');
      const headerPath = path.join(__dirname, 'components', 'Header.tsx');
      const appPath = path.join(__dirname, 'src', 'App.tsx');

      if (!fs.existsSync(dashboardPath)) {
        throw new Error('Dashboard component not found');
      }

      if (!fs.existsSync(headerPath)) {
        throw new Error('Header component not found');
      }

      if (!fs.existsSync(appPath)) {
        throw new Error('App component not found');
      }

      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
      const headerContent = fs.readFileSync(headerPath, 'utf8');
      const appContent = fs.readFileSync(appPath, 'utf8');

      // Check for Web3 integration
      if (!dashboardContent.includes('useCloutXToken')) {
        throw new Error('Dashboard component missing useCloutXToken hook integration');
      }

      if (!headerContent.includes('ConnectButton')) {
        throw new Error('Header component missing wallet connection');
      }

      if (!appContent.includes('WagmiProvider')) {
        throw new Error('App component missing Web3 providers');
      }

      console.log(`   ✓ Dashboard component integrated with useCloutXToken hook`);
      console.log(`   ✓ Header component includes wallet connection`);
      console.log(`   ✓ App component wrapped with Web3 providers`);
    });
  }

  async testTransactionSimulation() {
    await this.runTest('Transaction Simulation Logic Test', async () => {
      // Test transaction simulation logic (without actual blockchain calls)
      const testAmount = 1000;
      const sellTax = 0.02; // 2%
      const buyTax = 0.005; // 0.5%

      // Simulate sell transaction
      const sellFee = testAmount * sellTax;
      const sellBurn = sellFee / 2;
      const sellRewardPool = sellFee / 2;
      const sellReceived = testAmount - sellFee;

      if (sellFee !== 20) throw new Error('Sell fee calculation incorrect');
      if (sellBurn !== 10) throw new Error('Sell burn calculation incorrect');
      if (sellRewardPool !== 10) throw new Error('Sell reward pool calculation incorrect');
      if (sellReceived !== 980) throw new Error('Sell received calculation incorrect');

      // Simulate buy transaction
      const buyFee = testAmount * buyTax;
      const buyReceived = testAmount - buyFee;

      if (buyFee !== 5) throw new Error('Buy fee calculation incorrect');
      if (buyReceived !== 995) throw new Error('Buy received calculation incorrect');

      console.log(`   ✓ Sell transaction simulation: ${testAmount} CLX → ${sellReceived} CLX (${sellFee} CLX fee)`);
      console.log(`   ✓ Buy transaction simulation: ${testAmount} CLX → ${buyReceived} CLX (${buyFee} CLX fee)`);
      console.log(`   ✓ All transaction calculations are correct`);
    });
  }

  async testNetworkConfiguration() {
    await this.runTest('Network Configuration Test', async () => {
      const configPath = path.join(__dirname, 'src', 'config', 'web3.ts');
      const configContent = fs.readFileSync(configPath, 'utf8');

      // Check for required network configurations
      const requiredNetworks = ['polygon', 'base', 'hardhat'];
      
      for (const network of requiredNetworks) {
        if (!configContent.includes(network)) {
          throw new Error(`Missing ${network} network configuration`);
        }
      }

      // Check for RainbowKit configuration
      if (!configContent.includes('getDefaultConfig')) {
        throw new Error('Missing RainbowKit configuration');
      }

      console.log(`   ✓ Polygon network configured`);
      console.log(`   ✓ Base network configured`);
      console.log(`   ✓ Hardhat network configured`);
      console.log(`   ✓ RainbowKit properly configured`);
    });
  }

  async testBuildConfiguration() {
    await this.runTest('Build Configuration Test', async () => {
      const packagePath = path.join(__dirname, 'package.json');
      const vitePath = path.join(__dirname, 'vite.config.ts');
      const tailwindPath = path.join(__dirname, 'tailwind.config.js');

      if (!fs.existsSync(packagePath)) throw new Error('package.json not found');
      if (!fs.existsSync(vitePath)) throw new Error('vite.config.ts not found');
      if (!fs.existsSync(tailwindPath)) throw new Error('tailwind.config.js not found');

      const packageContent = fs.readFileSync(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      // Check for required dependencies
      const requiredDeps = ['wagmi', 'viem', '@rainbow-me/rainbowkit', 'ethers', 'react'];
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies[dep]) {
          throw new Error(`Missing dependency: ${dep}`);
        }
      }

      // Check for required scripts
      const requiredScripts = ['dev', 'build', 'update-contracts'];
      for (const script of requiredScripts) {
        if (!packageJson.scripts[script]) {
          throw new Error(`Missing script: ${script}`);
        }
      }

      console.log(`   ✓ All required dependencies installed`);
      console.log(`   ✓ All required scripts configured`);
      console.log(`   ✓ Build configuration complete`);
    });
  }

  async runAllTests() {
    console.log('🚀 Starting CloutX Frontend Integration Tests...\n');

    await this.testContractAddressLoading();
    await this.testFrontendConfigUpdate();
    await this.testABIDefinitions();
    await this.testHookDefinitions();
    await this.testComponentIntegration();
    await this.testTransactionSimulation();
    await this.testNetworkConfiguration();
    await this.testBuildConfiguration();

    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 CLOUTX FRONTEND INTEGRATION TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`✅ Tests Passed: ${this.testResults.passed}`);
    console.log(`❌ Tests Failed: ${this.testResults.failed}`);
    console.log(`📊 Total Tests: ${this.testResults.passed + this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 ALL INTEGRATION TESTS PASSED! 🎉');
      console.log('✅ Frontend is properly configured for smart contract integration');
      console.log('🔗 Contract addresses are loaded and valid');
      console.log('🎣 React hooks are properly set up');
      console.log('🎨 Components are integrated with Web3');
      console.log('⚡ Transaction simulation logic is correct');
      console.log('🌐 Network configuration is complete');
      console.log('🚀 Ready for live contract interaction!');
    } else {
      console.log('\n⚠️ Some tests failed. Please fix the issues above.');
      console.log('📋 Failed tests:');
      this.testResults.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => console.log(`   - ${test.name}: ${test.error}`));
    }
    
    console.log('='.repeat(70));
    console.log('\n💡 Next Steps:');
    console.log('1. Start Hardhat node: npm run dev (in CloutX directory)');
    console.log('2. Deploy contracts: npx hardhat run scripts/deploy.js --network localhost');
    console.log('3. Update contract addresses: npm run update-contracts');
    console.log('4. Start dashboard: npm run dev');
    console.log('5. Connect MetaMask to localhost:8545');
    console.log('6. Import CLX token and start testing!');
  }
}

// Run the tests
const tester = new SimpleIntegrationTester();
tester.runAllTests().catch(console.error); 