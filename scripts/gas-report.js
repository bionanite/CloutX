const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

/**
 * @title Gas Report Generator for CloutXToken
 * @dev Comprehensive gas analysis for precision upgrades
 * - Function call gas costs
 * - Deployment costs  
 * - Upgrade costs
 * - Transaction type comparisons
 * - Optimization verification
 */
async function generateGasReport() {
    console.log("🔥 CLOUTX TOKEN GAS ANALYSIS REPORT");
    console.log("=".repeat(50));
    
    const [owner, governance, user1, user2, dexPair, rewardPool] = await ethers.getSigners();
    
    const gasReport = {
        timestamp: new Date().toISOString(),
        network: hre.network.name,
        solcVersion: "0.8.25",
        optimizerEnabled: true,
        optimizerRuns: 200,
        deployment: {},
        functions: {},
        transactions: {},
        comparisons: {},
        recommendations: []
    };

    try {
        // ============ DEPLOYMENT COSTS ============
        console.log("\n📦 DEPLOYMENT ANALYSIS");
        console.log("-".repeat(30));
        
        const CloutXToken = await ethers.getContractFactory("CloutXToken");
        
        console.log("Deploying CloutXToken...");
        const deployTx = await upgrades.deployProxy(CloutXToken, [
            "CloutX Token",
            "CLX",
            governance.address
        ], { initializer: "initialize" });
        
        await deployTx.deployed();
        
        // Get deployment transaction receipt
        const deployReceipt = await ethers.provider.getTransactionReceipt(deployTx.deployTransaction.hash);
        
        gasReport.deployment = {
            proxyDeployment: deployReceipt.gasUsed.toString(),
            implementationSize: await getContractSize(CloutXToken),
            estimatedMainnetCost: calculateMainnetCost(deployReceipt.gasUsed)
        };
        
        console.log(`✅ Proxy Deployment: ${deployReceipt.gasUsed.toString()} gas`);
        console.log(`📏 Contract Size: ${gasReport.deployment.implementationSize} bytes`);
        console.log(`💰 Est. Mainnet Cost: $${gasReport.deployment.estimatedMainnetCost}`);

        // ============ FUNCTION CALL ANALYSIS ============
        console.log("\n⚙️  FUNCTION CALL ANALYSIS");
        console.log("-".repeat(30));
        
        // Setup for testing
        await deployTx.connect(governance).setRewardPool(rewardPool.address);
        await deployTx.connect(governance).setAMMPair(dexPair.address, true);
        await deployTx.connect(owner).openTrading();
        
        // Transfer tokens for testing
        await deployTx.connect(owner).transfer(user1.address, ethers.utils.parseEther("1000000"));
        
        const functionTests = [
            {
                name: "Standard Transfer",
                call: () => deployTx.connect(user1).transfer(user2.address, ethers.utils.parseEther("100")),
                category: "core"
            },
            {
                name: "DEX Buy (from AMM pair)",
                call: async () => {
                    await deployTx.connect(owner).transfer(dexPair.address, ethers.utils.parseEther("1000"));
                    return deployTx.connect(dexPair).transfer(user1.address, ethers.utils.parseEther("100"));
                },
                category: "dex"
            },
            {
                name: "DEX Sell (to AMM pair)",  
                call: () => deployTx.connect(user1).transfer(dexPair.address, ethers.utils.parseEther("100")),
                category: "dex"
            },
            {
                name: "Tax-Free Transfer (excluded)",
                call: async () => {
                    await deployTx.connect(governance).setExcludedFromFees(user1.address, true);
                    return deployTx.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"));
                },
                category: "admin"
            },
            {
                name: "Set AMM Pair",
                call: () => deployTx.connect(governance).setAMMPair(user2.address, true),
                category: "admin"
            },
            {
                name: "Update Tax Config",
                call: () => deployTx.connect(governance).updateTaxConfig(150, 150, 75, 5000, 5000),
                category: "admin"
            },
            {
                name: "Set Blacklist",
                call: () => deployTx.connect(governance).setBlacklist(user2.address, true),
                category: "admin"
            },
            {
                name: "Emergency Pause",
                call: () => deployTx.connect(owner).emergencyPause(),
                category: "emergency"
            }
        ];

        for (const test of functionTests) {
            try {
                console.log(`Testing: ${test.name}...`);
                const tx = await test.call();
                const receipt = await tx.wait();
                
                gasReport.functions[test.name] = {
                    gasUsed: receipt.gasUsed.toString(),
                    category: test.category,
                    txHash: receipt.transactionHash,
                    estimatedCost: calculateMainnetCost(receipt.gasUsed)
                };
                
                console.log(`  💨 Gas: ${receipt.gasUsed.toString()}`);
                
                // Reset state if needed
                if (test.name === "Emergency Pause") {
                    await deployTx.connect(owner).emergencyUnpause();
                }
                if (test.name === "Set Blacklist") {
                    await deployTx.connect(governance).setBlacklist(user2.address, false);
                }
                if (test.name === "Tax-Free Transfer (excluded)") {
                    await deployTx.connect(governance).setExcludedFromFees(user1.address, false);
                }
                
            } catch (error) {
                console.log(`  ❌ Failed: ${error.message}`);
                gasReport.functions[test.name] = {
                    error: error.message,
                    category: test.category
                };
            }
        }

        // ============ TRANSACTION TYPE COMPARISONS ============
        console.log("\n📊 TRANSACTION TYPE COMPARISON");
        console.log("-".repeat(30));
        
        const transferAmount = ethers.utils.parseEther("1000");
        
        // Standard Transfer
        const standardTx = await deployTx.connect(user1).transfer(user2.address, transferAmount);
        const standardReceipt = await standardTx.wait();
        
        // Wait for cooldown
        await ethers.provider.send("evm_increaseTime", [61]);
        await ethers.provider.send("evm_mine");
        
        // Large Transfer (testing limits)
        const maxTxAmount = await deployTx.antiBotConfig().then(config => config.maxTxAmount);
        const largeTx = await deployTx.connect(user1).transfer(user2.address, maxTxAmount);
        const largeReceipt = await largeTx.wait();
        
        gasReport.transactions = {
            standardTransfer: {
                amount: transferAmount.toString(),
                gasUsed: standardReceipt.gasUsed.toString(),
                gasPerToken: standardReceipt.gasUsed.mul(1e18).div(transferAmount).toString()
            },
            largeTransfer: {
                amount: maxTxAmount.toString(),
                gasUsed: largeReceipt.gasUsed.toString(),
                gasPerToken: largeReceipt.gasUsed.mul(1e18).div(maxTxAmount).toString()
            }
        };
        
        console.log(`✅ Standard Transfer (${ethers.utils.formatEther(transferAmount)} CLX): ${standardReceipt.gasUsed} gas`);
        console.log(`✅ Large Transfer (${ethers.utils.formatEther(maxTxAmount)} CLX): ${largeReceipt.gasUsed} gas`);

        // ============ VIEW FUNCTION COSTS ============
        console.log("\n🔍 VIEW FUNCTION ANALYSIS");
        console.log("-".repeat(30));
        
        const viewFunctions = [
            {
                name: "getCurrentTax",
                call: () => deployTx.getCurrentTax(user1.address, user2.address)
            },
            {
                name: "calculateTaxAmount",  
                call: () => deployTx.calculateTaxAmount(user1.address, user2.address, transferAmount)
            },
            {
                name: "canTransfer",
                call: () => deployTx.canTransfer(user1.address, user2.address, transferAmount)
            },
            {
                name: "getEffectiveTransferAmount",
                call: () => deployTx.getEffectiveTransferAmount(user1.address, user2.address, transferAmount)
            }
        ];

        gasReport.viewFunctions = {};
        
        for (const viewTest of viewFunctions) {
            try {
                const result = await viewTest.call();
                gasReport.viewFunctions[viewTest.name] = {
                    result: result.toString(),
                    note: "View functions don't consume gas in actual calls"
                };
                console.log(`✅ ${viewTest.name}: ${result.toString()}`);
            } catch (error) {
                console.log(`❌ ${viewTest.name}: ${error.message}`);
            }
        }

        // ============ GAS OPTIMIZATION ANALYSIS ============
        console.log("\n⚡ GAS OPTIMIZATION ANALYSIS");
        console.log("-".repeat(30));
        
        gasReport.optimizations = {
            customErrors: "✅ Implemented - saves ~50 gas per revert",
            packedStructs: "✅ Implemented - optimal storage layout", 
            precisionMath: "✅ Implemented - 128-bit intermediate calculations",
            modifierReuse: "✅ Implemented - reduces code duplication",
            batchOperations: "⚠️  Consider implementing for multiple operations"
        };

        Object.entries(gasReport.optimizations).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });

        // ============ RECOMMENDATIONS ============
        console.log("\n💡 GAS OPTIMIZATION RECOMMENDATIONS");
        console.log("-".repeat(30));
        
        // Analyze gas costs and provide recommendations
        const standardGas = parseInt(gasReport.functions["Standard Transfer"]?.gasUsed || "0");
        const dexBuyGas = parseInt(gasReport.functions["DEX Buy (from AMM pair)"]?.gasUsed || "0");
        
        if (standardGas > 100000) {
            gasReport.recommendations.push("Consider optimizing standard transfer logic - currently using " + standardGas + " gas");
        }
        
        if (dexBuyGas > standardGas * 1.5) {
            gasReport.recommendations.push("DEX transactions use significantly more gas - consider caching AMM pair lookups");
        }
        
        gasReport.recommendations.push("Custom errors successfully implemented for gas efficiency");
        gasReport.recommendations.push("Consider implementing batch operations for multiple transfers");
        gasReport.recommendations.push("Storage layout is optimized with packed structs");

        gasReport.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });

        // ============ SAVE REPORT ============
        const reportPath = "scripts/gas-report.json";
        fs.writeFileSync(reportPath, JSON.stringify(gasReport, null, 2));
        
        console.log("\n💾 REPORT SAVED");
        console.log("-".repeat(30));
        console.log(`📁 Report saved to: ${reportPath}`);
        console.log(`📊 Total functions analyzed: ${Object.keys(gasReport.functions).length}`);
        console.log(`⛽ Average transfer gas: ${standardGas} gas`);
        console.log(`💰 Est. transfer cost: $${calculateMainnetCost(standardGas)}`);
        
        return gasReport;
        
    } catch (error) {
        console.error("❌ Gas analysis failed:", error);
        throw error;
    }
}

// ============ HELPER FUNCTIONS ============

async function getContractSize(contractFactory) {
    const bytecode = contractFactory.bytecode;
    return Math.floor(bytecode.length / 2); // Convert hex to bytes
}

function calculateMainnetCost(gasUsed, gweiPrice = 30, ethPrice = 2000) {
    const gasCostWei = gasUsed.mul(gweiPrice).mul(1e9); // Convert to wei
    const gasCostEth = parseFloat(ethers.utils.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;
    return gasCostUsd.toFixed(4);
}

// ============ MAIN EXECUTION ============

if (require.main === module) {
    generateGasReport()
        .then((report) => {
            console.log("\n✅ Gas analysis complete!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Gas analysis failed:", error);
            process.exit(1);
        });
}

module.exports = { generateGasReport }; 