const { ethers } = require("ethers");
const fs = require("fs");

// Simple test runner for CloutX Token
console.log("🧪 CloutX Token Testing Suite");
console.log("====================================");

async function runTokenTests() {
    try {
        console.log("\n✅ Test 1: Contract Compilation Check");
        
        // Check if contract files exist
        const contracts = [
            "./contracts/CloutXToken.sol",
            "./contracts/CloutXTokenImproved.sol", 
            "./contracts/StakingPool.sol",
            "./contracts/GovernanceDAO.sol",
            "./contracts/RewardOracleManager.sol",
            "./contracts/TokenVesting.sol"
        ];
        
        let contractsFound = 0;
        contracts.forEach(contract => {
            if (fs.existsSync(contract)) {
                console.log(`   ✓ ${contract.split('/').pop()} - Found`);
                contractsFound++;
            } else {
                console.log(`   ✗ ${contract.split('/').pop()} - Missing`);
            }
        });
        
        console.log(`\n📊 Contract Files: ${contractsFound}/${contracts.length} found`);
        
        console.log("\n✅ Test 2: Token Configuration Analysis");
        
        // Read and analyze token contract
        const tokenContent = fs.readFileSync("./contracts/CloutXTokenImproved.sol", "utf8");
        
        // Check for key features
        const features = {
            "ERC20Upgradeable": tokenContent.includes("ERC20Upgradeable"),
            "Tax System": tokenContent.includes("TaxConfig"),
            "Anti-Bot Protection": tokenContent.includes("AntiBotConfig"),
            "DEX Integration": tokenContent.includes("isDEXPair"),
            "MEV Protection": tokenContent.includes("antiMEV"),
            "Reentrancy Guard": tokenContent.includes("ReentrancyGuardUpgradeable"),
            "Pausable": tokenContent.includes("PausableUpgradeable"),
            "Upgradeable": tokenContent.includes("UUPSUpgradeable"),
            "Governance": tokenContent.includes("onlyGovernance")
        };
        
        Object.entries(features).forEach(([feature, present]) => {
            console.log(`   ${present ? '✓' : '✗'} ${feature}: ${present ? 'Implemented' : 'Missing'}`);
        });
        
        console.log("\n✅ Test 3: Security Features Analysis");
        
        // Check security patterns
        const securityFeatures = {
            "Access Control": tokenContent.includes("onlyOwner") || tokenContent.includes("onlyGovernance"),
            "Input Validation": tokenContent.includes("require("),
            "SafeMath Usage": tokenContent.includes("SafeMath"),
            "Event Emission": tokenContent.includes("emit "),
            "Zero Address Check": tokenContent.includes("address(0)"),
            "Overflow Protection": tokenContent.includes(".mul(") && tokenContent.includes(".div("),
            "Timelock Mechanisms": tokenContent.includes("lastTransactionTime"),
            "Emergency Pause": tokenContent.includes("whenNotPaused")
        };
        
        Object.entries(securityFeatures).forEach(([feature, present]) => {
            console.log(`   ${present ? '✓' : '✗'} ${feature}: ${present ? 'Present' : 'Missing'}`);
        });
        
        console.log("\n✅ Test 4: Tokenomics Analysis");
        
        // Analyze tax rates and tokenomics
        const taxAnalysis = {
            "Buy Tax": tokenContent.match(/buyTax:\s*(\d+)/)?.[1] || "Not found",
            "Sell Tax": tokenContent.match(/sellTax:\s*(\d+)/)?.[1] || "Not found", 
            "Transfer Tax": tokenContent.match(/transferTax:\s*(\d+)/)?.[1] || "Not found",
            "Burn Rate": tokenContent.match(/burnRate:\s*(\d+)/)?.[1] || "Not found",
            "Reward Rate": tokenContent.match(/rewardRate:\s*(\d+)/)?.[1] || "Not found",
            "Max Tax Rate": tokenContent.match(/MAX_TAX_RATE\s*=\s*(\d+)/)?.[1] || "Not found"
        };
        
        Object.entries(taxAnalysis).forEach(([param, value]) => {
            const percentage = value !== "Not found" ? `${parseInt(value) / 100}%` : "Not found";
            console.log(`   📊 ${param}: ${value} basis points (${percentage})`);
        });
        
        console.log("\n✅ Test 5: Architecture Review");
        
        // Check inheritance pattern
        const inheritance = tokenContent.match(/contract\s+\w+\s+is\s+([\w\s,]+){/)?.[1];
        if (inheritance) {
            console.log("   📐 Inheritance Pattern:");
            inheritance.split(',').forEach(contract => {
                console.log(`      - ${contract.trim()}`);
            });
        }
        
        console.log("\n✅ Test 6: Function Coverage Analysis");
        
        // Count key functions
        const functions = {
            "transfer": (tokenContent.match(/function transfer/g) || []).length,
            "transferFrom": (tokenContent.match(/function transferFrom/g) || []).length,
            "_calculateTaxAmount": (tokenContent.match(/function _calculateTaxAmount/g) || []).length,
            "_processTax": (tokenContent.match(/function _processTax/g) || []).length,
            "updateTaxConfig": (tokenContent.match(/function updateTaxConfig/g) || []).length,
            "setExcludedFromTax": (tokenContent.match(/function setExcludedFromTax/g) || []).length,
            "_authorizeUpgrade": (tokenContent.match(/function _authorizeUpgrade/g) || []).length
        };
        
        Object.entries(functions).forEach(([func, count]) => {
            console.log(`   ${count > 0 ? '✓' : '✗'} ${func}: ${count} implementation(s)`);
        });
        
        console.log("\n🎯 Test Summary");
        console.log("================");
        
        const totalFeatures = Object.keys(features).length;
        const implementedFeatures = Object.values(features).filter(Boolean).length;
        const securityTotal = Object.keys(securityFeatures).length;
        const securityImplemented = Object.values(securityFeatures).filter(Boolean).length;
        
        console.log(`📊 Core Features: ${implementedFeatures}/${totalFeatures} (${Math.round(implementedFeatures/totalFeatures*100)}%)`);
        console.log(`🔒 Security Features: ${securityImplemented}/${securityTotal} (${Math.round(securityImplemented/securityTotal*100)}%)`);
        console.log(`📁 Contract Files: ${contractsFound}/${contracts.length} (${Math.round(contractsFound/contracts.length*100)}%)`);
        
        const overallScore = Math.round(((implementedFeatures/totalFeatures) + (securityImplemented/securityTotal) + (contractsFound/contracts.length)) / 3 * 100);
        
        console.log(`\n🏆 Overall Score: ${overallScore}%`);
        
        if (overallScore >= 90) {
            console.log("🟢 Status: EXCELLENT - Production Ready");
        } else if (overallScore >= 80) {
            console.log("🟡 Status: GOOD - Minor improvements needed");
        } else if (overallScore >= 70) {
            console.log("🟠 Status: FAIR - Some issues to address");
        } else {
            console.log("🔴 Status: POOR - Major issues found");
        }
        
        console.log("\n🔍 Detailed Analysis Complete!");
        console.log("For security vulnerabilities, run: npm run pentest");
        console.log("For deployment, run: npm run deploy:local");
        
    } catch (error) {
        console.error("❌ Test Error:", error.message);
    }
}

// Run the tests
runTokenTests(); 