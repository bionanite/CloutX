#!/usr/bin/env node

/**
 * CloutX Wallet Test Setup Script
 * Helps configure MetaMask for testing CloutX tokens
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 CLOUTX WALLET TEST SETUP');
console.log('='.repeat(60));

// Read deployment info
const deploymentFile = path.join(__dirname, '..', 'deployment-localhost.json');
let contractAddresses = {};

if (fs.existsSync(deploymentFile)) {
    try {
        contractAddresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        console.log('✅ Found contract deployment info');
    } catch (error) {
        console.log('❌ Error reading deployment file:', error.message);
    }
} else {
    console.log('⚠️  Deployment file not found. Run deployment first.');
}

console.log('\n📋 CONTRACT ADDRESSES:');
console.log('-'.repeat(40));
if (contractAddresses.clxToken) {
    console.log(`CLX Token:     ${contractAddresses.clxToken}`);
    console.log(`Staking Pool:  ${contractAddresses.stakingPool}`);
    console.log(`Reward Oracle: ${contractAddresses.rewardOracle}`);
    console.log(`Governance:    ${contractAddresses.governanceDAO}`);
} else {
    console.log('No contract addresses found.');
}

console.log('\n🦊 METAMASK SETUP INSTRUCTIONS:');
console.log('-'.repeat(40));
console.log('1. Open MetaMask extension');
console.log('2. Click on network dropdown (top)');
console.log('3. Click "Add Network" → "Add a network manually"');
console.log('4. Enter the following details:');
console.log('   Network Name: Hardhat Local');
console.log('   RPC URL: http://127.0.0.1:8545');
console.log('   Chain ID: 1337');
console.log('   Currency Symbol: ETH');
console.log('5. Click "Save"');

console.log('\n🔑 IMPORT TEST ACCOUNTS:');
console.log('-'.repeat(40));
console.log('Import these private keys into MetaMask:');
console.log('');

// Hardhat default accounts
const testAccounts = [
    {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        role: 'Deployer (Has 1B CLX tokens)'
    },
    {
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        role: 'Test Account 1'
    },
    {
        address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
        role: 'Test Account 2'
    }
];

testAccounts.forEach((account, index) => {
    console.log(`Account ${index + 1} (${account.role}):`);
    console.log(`  Address: ${account.address}`);
    console.log(`  Private Key: ${account.privateKey}`);
    console.log('');
});

console.log('⚠️  WARNING: These are test keys only! Never use on mainnet!');

console.log('\n🌐 WALLET TEST INTERFACE:');
console.log('-'.repeat(40));
console.log('Open the wallet test interface:');
console.log(`file://${path.join(__dirname, 'wallet-test.html')}`);
console.log('');
console.log('Or run a local server:');
console.log('cd UI && python3 -m http.server 8080');
console.log('Then visit: http://localhost:8080/wallet-test.html');

console.log('\n✅ TESTING CHECKLIST:');
console.log('-'.repeat(40));
console.log('□ Hardhat node running (npx hardhat node)');
console.log('□ Contracts deployed (npm run deploy:localhost)');
console.log('□ MetaMask connected to localhost:8545');
console.log('□ Test account imported to MetaMask');
console.log('□ Wallet test interface opened');

console.log('\n🧪 WHAT YOU CAN TEST:');
console.log('-'.repeat(40));
console.log('• 💰 Check CLX token balance (should be 1B for deployer)');
console.log('• 💸 Transfer CLX tokens between accounts');
console.log('• 🔒 Stake CLX tokens (30/60/90/180 day tiers)');
console.log('• 🔓 Unstake tokens and claim rewards');
console.log('• 📱 Add social media profiles (TikTok/X/Threads)');
console.log('• 🎁 Claim social mining rewards');
console.log('• 🗳️  Create governance proposals');
console.log('• 📊 View real-time balances and stats');

console.log('\n🚀 ADVANCED TESTING:');
console.log('-'.repeat(40));
console.log('• Test tax system (2% on transfers)');
console.log('• Test deflationary burns (1% burned on sells)');
console.log('• Test anti-whale protection');
console.log('• Test staking reward calculations');
console.log('• Test governance voting power');
console.log('• Test oracle reward distribution');

console.log('\n💡 TROUBLESHOOTING:');
console.log('-'.repeat(40));
console.log('• If transactions fail: Check gas limit (try 500,000)');
console.log('• If balance shows 0: Refresh or switch accounts');
console.log('• If network errors: Restart Hardhat node');
console.log('• If MetaMask issues: Reset account in settings');

console.log('\n' + '='.repeat(60));
console.log('🎉 Ready to test CloutX! Happy testing!');
console.log('='.repeat(60)); 