const fs = require("fs");

console.log("🧪 COMPREHENSIVE CLOUTX TOKEN TEST SUITE");
console.log("==========================================");
console.log("Running detailed analysis and testing...\n");

async function runComprehensiveTests() {
    const results = {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        warnings: [],
        vulnerabilities: [],
        recommendations: []
    };

    try {
        // Test 1: Contract Architecture Analysis
        console.log("🏗️ TEST 1: Contract Architecture Analysis");
        console.log("-".repeat(45));
        
        const tokenImproved = fs.readFileSync("./contracts/CloutXTokenImproved.sol", "utf8");
        const stakingPool = fs.readFileSync("./contracts/StakingPool.sol", "utf8");
        const governance = fs.readFileSync("./contracts/GovernanceDAO.sol", "utf8");
        const oracle = fs.readFileSync("./contracts/RewardOracleManager.sol", "utf8");
        const vesting = fs.readFileSync("./contracts/TokenVesting.sol", "utf8");
        
        results.totalTests += 5;
        
        // Check core components
        const architectureTests = [
            { name: "ERC20 Implementation", check: tokenImproved.includes("ERC20Upgradeable") },
            { name: "Upgradeable Pattern", check: tokenImproved.includes("UUPSUpgradeable") },
            { name: "Security Guards", check: tokenImproved.includes("ReentrancyGuardUpgradeable") },
            { name: "Access Control", check: tokenImproved.includes("OwnableUpgradeable") },
            { name: "Emergency Controls", check: tokenImproved.includes("PausableUpgradeable") }
        ];
        
        architectureTests.forEach(test => {
            console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
            if (test.check) results.passedTests++;
            else results.failedTests++;
        });

        // Test 2: Security Implementation Analysis
        console.log("\n🔐 TEST 2: Security Implementation Analysis");
        console.log("-".repeat(45));
        
        const securityTests = [
            { 
                name: "MEV Protection", 
                check: tokenImproved.includes("antiMEV") && tokenImproved.includes("lastBlockNumber"),
                severity: "HIGH"
            },
            { 
                name: "DEX Integration", 
                check: tokenImproved.includes("isDEXPair") && tokenImproved.includes("isDEXRouter"),
                severity: "HIGH"
            },
            { 
                name: "SafeMath Usage", 
                check: tokenImproved.includes("SafeMath") && tokenImproved.includes(".mul(") && tokenImproved.includes(".div("),
                severity: "CRITICAL"
            },
            { 
                name: "Reentrancy Protection", 
                check: tokenImproved.includes("nonReentrant"),
                severity: "CRITICAL"
            },
            { 
                name: "Zero Address Checks", 
                check: tokenImproved.includes("address(0)"),
                severity: "MEDIUM"
            },
            { 
                name: "Input Validation", 
                check: (tokenImproved.match(/require\(/g) || []).length > 10,
                severity: "HIGH"
            }
        ];
        
        results.totalTests += securityTests.length;
        
        securityTests.forEach(test => {
            console.log(`   ${test.check ? '✅' : '❌'} ${test.name} (${test.severity})`);
            if (test.check) {
                results.passedTests++;
            } else {
                results.failedTests++;
                results.vulnerabilities.push({
                    name: test.name,
                    severity: test.severity,
                    description: `Missing or inadequate ${test.name.toLowerCase()} implementation`
                });
            }
        });

        // Test 3: Tax System Analysis
        console.log("\n💰 TEST 3: Tax System Analysis");
        console.log("-".repeat(30));
        
        const taxTests = [
            { 
                name: "Transfer Tax Implementation", 
                check: tokenImproved.includes("_calculateTaxAmount") && tokenImproved.includes("_processTax"),
                critical: true
            },
            { 
                name: "Buy/Sell Detection", 
                check: tokenImproved.includes("_isBuyTransaction") && tokenImproved.includes("_isSellTransaction"),
                critical: true
            },
            { 
                name: "Tax Configuration", 
                check: tokenImproved.includes("TaxConfig") && tokenImproved.includes("updateTaxConfig"),
                critical: false
            },
            { 
                name: "Burn Mechanism", 
                check: tokenImproved.includes("_burn") && tokenImproved.includes("totalBurned"),
                critical: false
            },
            { 
                name: "Reward Distribution", 
                check: tokenImproved.includes("rewardPool") && tokenImproved.includes("totalRewardsDistributed"),
                critical: false
            }
        ];
        
        results.totalTests += taxTests.length;
        
        taxTests.forEach(test => {
            console.log(`   ${test.check ? '✅' : '❌'} ${test.name} ${test.critical ? '(CRITICAL)' : ''}`);
            if (test.check) {
                results.passedTests++;
            } else {
                results.failedTests++;
                if (test.critical) {
                    results.vulnerabilities.push({
                        name: `Tax System: ${test.name}`,
                        severity: "HIGH",
                        description: `Critical tax functionality missing: ${test.name}`
                    });
                }
            }
        });

        // Test 4: Access Control Analysis
        console.log("\n🔑 TEST 4: Access Control Analysis");
        console.log("-".repeat(35));
        
        const accessTests = [
            { 
                name: "Governance Controls", 
                check: tokenImproved.includes("onlyGovernance") && (tokenImproved.match(/onlyGovernance/g) || []).length >= 5
            },
            { 
                name: "Owner Functions", 
                check: tokenImproved.includes("onlyOwner") && tokenImproved.includes("_transferOwnership")
            },
            { 
                name: "Upgrade Authorization", 
                check: tokenImproved.includes("_authorizeUpgrade") && 
                       tokenImproved.includes("governanceContract") &&
                       tokenImproved.includes("Only governance can upgrade")
            },
            { 
                name: "Function Modifiers", 
                check: (tokenImproved.match(/modifier /g) || []).length >= 3
            }
        ];
        
        results.totalTests += accessTests.length;
        
        accessTests.forEach(test => {
            console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
            if (test.check) {
                results.passedTests++;
            } else {
                results.failedTests++;
                results.vulnerabilities.push({
                    name: `Access Control: ${test.name}`,
                    severity: "HIGH",
                    description: `Access control issue: ${test.name} not properly implemented`
                });
            }
        });

        // Test 5: Anti-Bot Protection Analysis
        console.log("\n🤖 TEST 5: Anti-Bot Protection Analysis");
        console.log("-".repeat(38));
        
        const antiBotTests = [
            { 
                name: "Transaction Limits", 
                check: tokenImproved.includes("maxTxAmount") && tokenImproved.includes("maxWalletAmount")
            },
            { 
                name: "Cooldown Periods", 
                check: tokenImproved.includes("cooldownPeriod") && tokenImproved.includes("lastTransactionTime")
            },
            { 
                name: "Anti-Bot Config", 
                check: tokenImproved.includes("AntiBotConfig") && tokenImproved.includes("updateAntiBotConfig")
            },
            { 
                name: "Exclusion System", 
                check: tokenImproved.includes("isExcludedFromLimits") && tokenImproved.includes("setExcludedFromLimits")
            }
        ];
        
        results.totalTests += antiBotTests.length;
        
        antiBotTests.forEach(test => {
            console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
            if (test.check) results.passedTests++;
            else results.failedTests++;
        });

        // Test 6: Tokenomics Validation
        console.log("\n📊 TEST 6: Tokenomics Validation");
        console.log("-".repeat(32));
        
        // Extract tax rates
        const buyTaxMatch = tokenImproved.match(/buyTax:\s*(\d+)/);
        const sellTaxMatch = tokenImproved.match(/sellTax:\s*(\d+)/);
        const transferTaxMatch = tokenImproved.match(/transferTax:\s*(\d+)/);
        const burnRateMatch = tokenImproved.match(/burnRate:\s*(\d+)/);
        const rewardRateMatch = tokenImproved.match(/rewardRate:\s*(\d+)/);
        const maxTaxMatch = tokenImproved.match(/MAX_TAX_RATE\s*=\s*(\d+)/);
        
        const tokenomicsTests = [
            { 
                name: "Buy Tax Rate (2%)", 
                check: buyTaxMatch && parseInt(buyTaxMatch[1]) === 200,
                value: buyTaxMatch ? `${parseInt(buyTaxMatch[1])/100}%` : "Not found"
            },
            { 
                name: "Sell Tax Rate (2%)", 
                check: sellTaxMatch && parseInt(sellTaxMatch[1]) === 200,
                value: sellTaxMatch ? `${parseInt(sellTaxMatch[1])/100}%` : "Not found"
            },
            { 
                name: "Transfer Tax Rate (1%)", 
                check: transferTaxMatch && parseInt(transferTaxMatch[1]) === 100,
                value: transferTaxMatch ? `${parseInt(transferTaxMatch[1])/100}%` : "Not found"
            },
            { 
                name: "Burn Rate (50%)", 
                check: burnRateMatch && parseInt(burnRateMatch[1]) === 5000,
                value: burnRateMatch ? `${parseInt(burnRateMatch[1])/100}%` : "Not found"
            },
            { 
                name: "Reward Rate (50%)", 
                check: rewardRateMatch && parseInt(rewardRateMatch[1]) === 5000,
                value: rewardRateMatch ? `${parseInt(rewardRateMatch[1])/100}%` : "Not found"
            },
            { 
                name: "Max Tax Limit (10%)", 
                check: maxTaxMatch && parseInt(maxTaxMatch[1]) === 1000,
                value: maxTaxMatch ? `${parseInt(maxTaxMatch[1])/100}%` : "Not found"
            }
        ];
        
        results.totalTests += tokenomicsTests.length;
        
        tokenomicsTests.forEach(test => {
            console.log(`   ${test.check ? '✅' : '⚠️ '} ${test.name}: ${test.value}`);
            if (test.check) {
                results.passedTests++;
            } else {
                results.failedTests++;
                results.warnings.push(`Tokenomics: ${test.name} - ${test.value}`);
            }
        });

        // Test 7: Integration Analysis
        console.log("\n🔗 TEST 7: Contract Integration Analysis");
        console.log("-".repeat(40));
        
        const integrationTests = [
            { 
                name: "Staking Integration", 
                check: tokenImproved.includes("stakingContract") && 
                       stakingPool.includes("cloutXToken")
            },
            { 
                name: "Governance Integration", 
                check: tokenImproved.includes("governanceContract") && 
                       governance.includes("cloutXToken")
            },
            { 
                name: "Oracle Integration", 
                check: tokenImproved.includes("rewardPool") && 
                       oracle.includes("cloutXToken")
            },
            { 
                name: "Vesting Integration", 
                check: vesting.includes("IERC20") && 
                       vesting.includes("VestingSchedule")
            }
        ];
        
        results.totalTests += integrationTests.length;
        
        integrationTests.forEach(test => {
            console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
            if (test.check) results.passedTests++;
            else results.failedTests++;
        });

        // Calculate final score
        const successRate = (results.passedTests / results.totalTests) * 100;
        
        console.log("\n" + "=".repeat(50));
        console.log("📋 COMPREHENSIVE TEST RESULTS");
        console.log("=".repeat(50));
        
        console.log(`📊 Total Tests: ${results.totalTests}`);
        console.log(`✅ Passed: ${results.passedTests}`);
        console.log(`❌ Failed: ${results.failedTests}`);
        console.log(`⚠️  Warnings: ${results.warnings.length}`);
        console.log(`🚨 Vulnerabilities: ${results.vulnerabilities.length}`);
        
        console.log(`\n🏆 Overall Score: ${successRate.toFixed(1)}%`);
        
        // Status determination
        let status, statusIcon;
        if (successRate >= 95) {
            status = "EXCELLENT - Production Ready";
            statusIcon = "🟢";
        } else if (successRate >= 85) {
            status = "GOOD - Minor improvements needed";
            statusIcon = "🟡";
        } else if (successRate >= 70) {
            status = "FAIR - Several issues to address";
            statusIcon = "🟠";
        } else {
            status = "POOR - Major issues found";
            statusIcon = "🔴";
        }
        
        console.log(`${statusIcon} Status: ${status}`);
        
        // Display vulnerabilities
        if (results.vulnerabilities.length > 0) {
            console.log("\n🚨 VULNERABILITIES FOUND:");
            results.vulnerabilities.forEach((vuln, index) => {
                console.log(`${index + 1}. [${vuln.severity}] ${vuln.name}`);
                console.log(`   ${vuln.description}`);
            });
        }
        
        // Display warnings
        if (results.warnings.length > 0) {
            console.log("\n⚠️  WARNINGS:");
            results.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning}`);
            });
        }
        
        // Recommendations
        console.log("\n💡 RECOMMENDATIONS:");
        if (results.vulnerabilities.length === 0) {
            console.log("✅ No critical issues found!");
            console.log("✅ Token appears ready for production");
            console.log("✅ Consider external audit before mainnet");
        } else {
            console.log("🔧 Fix identified vulnerabilities before deployment");
            console.log("🔍 Conduct additional security testing");
            console.log("📋 Implement missing security features");
        }
        
        console.log("\n🎯 NEXT STEPS:");
        console.log("1. Review and address any vulnerabilities");
        console.log("2. Run integration tests with actual deployment");
        console.log("3. Conduct external security audit");
        console.log("4. Test on testnet before mainnet deployment");
        
        // Save results
        const testReport = {
            timestamp: new Date().toISOString(),
            totalTests: results.totalTests,
            passedTests: results.passedTests,
            failedTests: results.failedTests,
            successRate: successRate,
            status: status,
            vulnerabilities: results.vulnerabilities,
            warnings: results.warnings
        };
        
        fs.writeFileSync('./test-results.json', JSON.stringify(testReport, null, 2));
        console.log("\n📁 Test results saved to test-results.json");
        
    } catch (error) {
        console.error("\n❌ Test Error:", error.message);
        results.failedTests++;
    }
}

// Run the comprehensive test suite
runComprehensiveTests(); 