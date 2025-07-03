#!/usr/bin/env node

/**
 * Check CloutX Token Details
 * Verifies the actual token name, symbol, and other details from the deployed contract
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Contract ABI (minimal for token info)
const CLX_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)"
];

async function checkTokenDetails() {
    console.log('🔍 CHECKING CLOUTX TOKEN DETAILS');
    console.log('='.repeat(50));

    try {
        // Connect to local Hardhat network
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        
        // Test connection
        const network = await provider.getNetwork();
        console.log(`📡 Connected to network: Chain ID ${network.chainId}`);
        
        // Read deployment info
        const deploymentFile = path.join(__dirname, '..', 'deployment-localhost.json');
        if (!fs.existsSync(deploymentFile)) {
            throw new Error('Deployment file not found. Run deployment first.');
        }
        
        const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        const tokenAddress = deployment.contracts.cloutXToken;
        
        console.log(`📍 Token Address: ${tokenAddress}`);
        
        // Create contract instance
        const contract = new ethers.Contract(tokenAddress, CLX_ABI, provider);
        
        // Get token details
        console.log('\n📊 TOKEN DETAILS:');
        console.log('-'.repeat(30));
        
        const [name, symbol, decimals, totalSupply] = await Promise.all([
            contract.name(),
            contract.symbol(),
            contract.decimals(),
            contract.totalSupply()
        ]);
        
        console.log(`Name: ${name}`);
        console.log(`Symbol: ${symbol}`);
        console.log(`Decimals: ${decimals}`);
        console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} ${symbol}`);
        
        // Get deployer balance
        const deployerAddress = deployment.deployer;
        const deployerBalance = await contract.balanceOf(deployerAddress);
        
        console.log('\n👤 DEPLOYER ACCOUNT:');
        console.log('-'.repeat(30));
        console.log(`Address: ${deployerAddress}`);
        console.log(`Balance: ${ethers.utils.formatEther(deployerBalance)} ${symbol}`);
        
        // Check if there's any confusion with symbols
        console.log('\n🔍 SYMBOL ANALYSIS:');
        console.log('-'.repeat(30));
        console.log(`Official Symbol: "${symbol}"`);
        console.log(`Symbol Length: ${symbol.length} characters`);
        console.log(`Symbol Bytes: ${Buffer.from(symbol).toString('hex')}`);
        
        if (symbol !== 'CLX') {
            console.log(`⚠️  WARNING: Expected "CLX" but got "${symbol}"`);
        } else {
            console.log(`✅ Symbol is correct: "${symbol}"`);
        }
        
        // Check what you might be seeing as "rtoken"
        console.log('\n❓ ABOUT "RTOKEN" CONFUSION:');
        console.log('-'.repeat(30));
        console.log('If you\'re seeing "rtoken" somewhere, it could be:');
        console.log('1. MetaMask display bug/cache issue');
        console.log('2. Browser extension interference');
        console.log('3. Another token with similar address');
        console.log('4. UI displaying wrong token info');
        console.log('');
        console.log('The OFFICIAL CloutX token details are:');
        console.log(`• Name: "${name}"`);
        console.log(`• Symbol: "${symbol}"`);
        console.log(`• This is your CLX token for social mining!`);
        
        console.log('\n✅ TOKEN VERIFICATION COMPLETE');
        
    } catch (error) {
        console.error('❌ Error checking token details:', error.message);
        
        if (error.message.includes('network')) {
            console.log('\n🔧 TROUBLESHOOTING:');
            console.log('1. Make sure Hardhat node is running: npx hardhat node');
            console.log('2. Check if contracts are deployed');
            console.log('3. Verify network connection');
        }
    }
}

// Run the check
checkTokenDetails(); 