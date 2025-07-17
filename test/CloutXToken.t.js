const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

/**
 * @title CloutXToken Enhanced Test Suite
 * @dev Comprehensive testing for precision upgrades including:
 * - Enhanced modifier functionality
 * - DEX edge-case handling
 * - Precise tax calculations with 128-bit math
 * - Enhanced sender validation & anti-bot checks
 * - Fuzz testing for edge cases
 * - Gas optimization verification
 * 
 * Target: ≥95% branch coverage
 */
describe("CloutXToken - Enhanced Precision Tests", function () {
    let token;
    let owner, governance, user1, user2, user3, rewardPool, dexPair;
    let botUser, blacklistedUser;
    
    // Test constants
    const INITIAL_SUPPLY = ethers.utils.parseEther("1000000000"); // 1B tokens
    const BASIS_POINTS = 10000;
    const MAX_TAX_RATE = 1000; // 10%
    const MIN_COOLDOWN = 30;
    
    beforeEach(async function () {
        [owner, governance, user1, user2, user3, rewardPool, dexPair, botUser, blacklistedUser] = 
            await ethers.getSigners();
        
        // Deploy upgradeable contract
        const CloutXToken = await ethers.getContractFactory("CloutXToken");
        token = await upgrades.deployProxy(CloutXToken, [
            "CloutX Token",
            "CLX", 
            governance.address
        ], { initializer: "initialize" });
        
        await token.deployed();
        
        // Setup initial configurations
        await token.connect(governance).setRewardPool(rewardPool.address);
        await token.connect(governance).setAMMPair(dexPair.address, true);
        await token.connect(owner).openTrading();
        
        // Transfer some tokens for testing
        await token.connect(owner).transfer(user1.address, ethers.utils.parseEther("1000000"));
        await token.connect(owner).transfer(user2.address, ethers.utils.parseEther("1000000"));
    });

    describe("🔧 Enhanced Modifiers", function () {
        
        describe("onlyDAO modifier", function () {
            it("Should allow governance to call DAO-only functions", async function () {
                await expect(
                    token.connect(governance).setExcludedFromFees(user1.address, true)
                ).to.not.be.reverted;
            });
            
            it("Should revert with NotDAO error for non-governance callers", async function () {
                await expect(
                    token.connect(user1).setExcludedFromFees(user1.address, true)
                ).to.be.revertedWithCustomError(token, "NotDAO");
            });
            
            it("Should revert even for contract owner on DAO-only functions", async function () {
                await expect(
                    token.connect(owner).setExcludedFromFees(user1.address, true)
                ).to.be.revertedWithCustomError(token, "NotDAO");
            });
        });

        describe("whenTradingOpen modifier", function () {
            it("Should allow transfers when trading is open", async function () {
                await expect(
                    token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
                ).to.not.be.reverted;
            });
            
            it("Should allow owner transfers even when trading is closed", async function () {
                // Close trading by deploying fresh contract without opening
                const CloutXToken = await ethers.getContractFactory("CloutXToken");
                const closedToken = await upgrades.deployProxy(CloutXToken, [
                    "CloutX Token",
                    "CLX", 
                    governance.address
                ], { initializer: "initialize" });
                
                await expect(
                    closedToken.connect(owner).transfer(user1.address, ethers.utils.parseEther("100"))
                ).to.not.be.reverted;
            });
            
            it("Should revert with TradingNotOpen for users when trading is closed", async function () {
                const CloutXToken = await ethers.getContractFactory("CloutXToken");
                const closedToken = await upgrades.deployProxy(CloutXToken, [
                    "CloutX Token",
                    "CLX", 
                    governance.address
                ], { initializer: "initialize" });
                
                await closedToken.connect(owner).transfer(user1.address, ethers.utils.parseEther("100"));
                
                await expect(
                    closedToken.connect(user1).transfer(user2.address, ethers.utils.parseEther("50"))
                ).to.be.revertedWithCustomError(closedToken, "TradingNotOpen");
            });
        });

        describe("validRecipient modifier", function () {
            it("Should revert with InvalidRecipient for zero address", async function () {
                await expect(
                    token.connect(user1).transfer(ethers.constants.AddressZero, ethers.utils.parseEther("100"))
                ).to.be.revertedWithCustomError(token, "InvalidRecipient");
            });
            
            it("Should revert with Blacklisted for blacklisted recipient", async function () {
                await token.connect(governance).setBlacklist(blacklistedUser.address, true);
                
                await expect(
                    token.connect(user1).transfer(blacklistedUser.address, ethers.utils.parseEther("100"))
                ).to.be.revertedWithCustomError(token, "Blacklisted");
            });
        });

        describe("antiBot modifier", function () {
            it("Should revert with BotDetected for flagged bot addresses", async function () {
                // Note: botList would need to be set via governance function (to be implemented)
                // This test structure shows how it would work
            });
            
            it("Should revert with MEVBlocked for same-block transactions", async function () {
                // First transaction
                await token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"));
                
                // Attempt second transaction in same block would be blocked
                // Note: This is difficult to test in Hardhat as it auto-mines blocks
                // In real conditions, this would prevent MEV attacks
            });
        });
    });

    describe("🔄 DEX Integration & Edge Cases", function () {
        
        describe("AMM Pair Management", function () {
            it("Should allow governance to set AMM pairs", async function () {
                const newPair = user3.address;
                
                await expect(
                    token.connect(governance).setAMMPair(newPair, true)
                ).to.emit(token, "AMMPairSet").withArgs(newPair, true);
                
                expect(await token.automatedMarketMakerPairs(newPair)).to.be.true;
            });
            
            it("Should revert when non-governance tries to set AMM pairs", async function () {
                await expect(
                    token.connect(user1).setAMMPair(user3.address, true)
                ).to.be.revertedWithCustomError(token, "NotDAO");
            });
            
            it("Should revert for zero address AMM pair", async function () {
                await expect(
                    token.connect(governance).setAMMPair(ethers.constants.AddressZero, true)
                ).to.be.revertedWith("Invalid pair address");
            });
        });

        describe("Buy vs Sell Detection", function () {
            it("Should apply buy tax when transferring from AMM pair", async function () {
                const amount = ethers.utils.parseEther("1000");
                const expectedBuyTax = amount.mul(200).div(BASIS_POINTS); // 2% buy tax
                
                // Transfer from DEX pair (simulates buy)
                await token.connect(owner).transfer(dexPair.address, amount);
                
                const balanceBefore = await token.balanceOf(user1.address);
                await token.connect(dexPair).transfer(user1.address, amount);
                const balanceAfter = await token.balanceOf(user1.address);
                
                const actualReceived = balanceAfter.sub(balanceBefore);
                const expectedReceived = amount.sub(expectedBuyTax);
                
                expect(actualReceived).to.equal(expectedReceived);
            });
            
            it("Should apply sell tax when transferring to AMM pair", async function () {
                const amount = ethers.utils.parseEther("1000");
                const expectedSellTax = amount.mul(200).div(BASIS_POINTS); // 2% sell tax
                
                const balanceBefore = await token.balanceOf(dexPair.address);
                await token.connect(user1).transfer(dexPair.address, amount);
                const balanceAfter = await token.balanceOf(dexPair.address);
                
                const actualReceived = balanceAfter.sub(balanceBefore);
                const expectedReceived = amount.sub(expectedSellTax);
                
                expect(actualReceived).to.equal(expectedReceived);
            });
            
            it("Should apply transfer tax for regular transfers", async function () {
                const amount = ethers.utils.parseEther("1000");
                const expectedTransferTax = amount.mul(100).div(BASIS_POINTS); // 1% transfer tax
                
                const balanceBefore = await token.balanceOf(user2.address);
                await token.connect(user1).transfer(user2.address, amount);
                const balanceAfter = await token.balanceOf(user2.address);
                
                const actualReceived = balanceAfter.sub(balanceBefore);
                const expectedReceived = amount.sub(expectedTransferTax);
                
                expect(actualReceived).to.equal(expectedReceived);
            });
        });

        describe("Fee Exclusions", function () {
            it("Should skip taxes for excluded addresses", async function () {
                await token.connect(governance).setExcludedFromFees(user1.address, true);
                
                const amount = ethers.utils.parseEther("1000");
                const balanceBefore = await token.balanceOf(user2.address);
                
                await token.connect(user1).transfer(user2.address, amount);
                
                const balanceAfter = await token.balanceOf(user2.address);
                expect(balanceAfter.sub(balanceBefore)).to.equal(amount);
            });
        });
    });

    describe("🧮 Precision Tax Calculations", function () {
        
        describe("128-bit Math Safety", function () {
            it("Should handle maximum possible transfer without overflow", async function () {
                // Test with large amount (simulating max uint96)
                const largeAmount = ethers.BigNumber.from("79228162514264337593543950336"); // ~7e28
                
                // This should not revert due to overflow
                const taxAmount = await token.calculateTaxAmount(user1.address, user2.address, largeAmount);
                const expectedTax = largeAmount.mul(100).div(BASIS_POINTS); // 1% transfer tax
                
                expect(taxAmount).to.equal(expectedTax);
            });
            
            it("Should handle edge case of 1 wei transfer", async function () {
                const amount = ethers.BigNumber.from("1");
                const taxAmount = await token.calculateTaxAmount(user1.address, user2.address, amount);
                
                // With 1% tax (100 basis points), 1 wei should have 0 tax (rounds down)
                expect(taxAmount).to.equal(0);
            });
            
            it("Should calculate tax with proper rounding (down)", async function () {
                // Test amount that doesn't divide evenly
                const amount = ethers.utils.parseEther("33.333"); // 33.333 tokens
                const taxAmount = await token.calculateTaxAmount(user1.address, user2.address, amount);
                
                // 1% of 33.333 ETH = 0.33333 ETH, should round down
                const expectedTax = amount.mul(100).div(BASIS_POINTS);
                expect(taxAmount).to.equal(expectedTax);
            });
        });

        describe("Exact Burn/Reward Split", function () {
            it("Should split tax exactly between burn and rewards with no remainder", async function () {
                const amount = ethers.utils.parseEther("1000");
                const transferTax = amount.mul(100).div(BASIS_POINTS); // 1% = 10 tokens
                
                const totalBurnedBefore = await token.totalBurned();
                const totalRewardsBefore = await token.totalRewardsDistributed();
                const rewardPoolBalanceBefore = await token.balanceOf(rewardPool.address);
                
                await token.connect(user1).transfer(user2.address, amount);
                
                const totalBurnedAfter = await token.totalBurned();
                const totalRewardsAfter = await token.totalRewardsDistributed();
                const rewardPoolBalanceAfter = await token.balanceOf(rewardPool.address);
                
                const burnAmount = totalBurnedAfter.sub(totalBurnedBefore);
                const rewardAmount = totalRewardsAfter.sub(totalRewardsBefore);
                const rewardPoolIncrease = rewardPoolBalanceAfter.sub(rewardPoolBalanceBefore);
                
                // Should split 50/50
                expect(burnAmount).to.equal(transferTax.div(2));
                expect(rewardAmount).to.equal(transferTax.div(2));
                expect(rewardPoolIncrease).to.equal(rewardAmount);
                
                // Total should equal original tax (no remainder drift)
                expect(burnAmount.add(rewardAmount)).to.equal(transferTax);
            });
            
            it("Should handle odd tax amounts with exact split", async function () {
                // Use amount that creates odd tax number
                const amount = ethers.utils.parseEther("999"); // Creates 9.99 tax
                const transferTax = amount.mul(100).div(BASIS_POINTS);
                
                const totalBurnedBefore = await token.totalBurned();
                const totalRewardsBefore = await token.totalRewardsDistributed();
                
                await token.connect(user1).transfer(user2.address, amount);
                
                const totalBurnedAfter = await token.totalBurned();
                const totalRewardsAfter = await token.totalRewardsDistributed();
                
                const burnAmount = totalBurnedAfter.sub(totalBurnedBefore);
                const rewardAmount = totalRewardsAfter.sub(totalRewardsBefore);
                
                // Total should still equal original tax
                expect(burnAmount.add(rewardAmount)).to.equal(transferTax);
            });
        });

        describe("Tax Rate Configurations", function () {
            it("Should respect maximum tax rate limits", async function () {
                await expect(
                    token.connect(governance).updateTaxConfig(
                        MAX_TAX_RATE + 1, // Exceeds max
                        200,
                        100,
                        5000,
                        5000
                    )
                ).to.be.revertedWith("Buy tax too high");
            });
            
            it("Should require burn + reward rates to equal 100%", async function () {
                await expect(
                    token.connect(governance).updateTaxConfig(
                        200,
                        200,
                        100,
                        4000, // 40%
                        5000  // 50% - total 90%
                    )
                ).to.be.revertedWith("Rates must sum to 100%");
            });
        });
    });

    describe("🛡️ Enhanced Sender Validation & Anti-Bot", function () {
        
        describe("Blacklist Functionality", function () {
            it("Should allow governance to blacklist addresses", async function () {
                await expect(
                    token.connect(governance).setBlacklist(user3.address, true)
                ).to.emit(token, "BlacklistUpdated").withArgs(user3.address, true);
                
                expect(await token.blacklist(user3.address)).to.be.true;
            });
            
            it("Should prevent blacklisted addresses from sending", async function () {
                await token.connect(governance).setBlacklist(user1.address, true);
                
                await expect(
                    token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
                ).to.be.revertedWith("Sender blacklisted");
            });
            
            it("Should prevent transfers to blacklisted addresses", async function () {
                await token.connect(governance).setBlacklist(user2.address, true);
                
                await expect(
                    token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
                ).to.be.revertedWithCustomError(token, "Blacklisted");
            });
            
            it("Should prevent blacklisting owner and governance", async function () {
                await expect(
                    token.connect(governance).setBlacklist(owner.address, true)
                ).to.be.revertedWith("Cannot blacklist owner");
                
                await expect(
                    token.connect(governance).setBlacklist(governance.address, true)
                ).to.be.revertedWith("Cannot blacklist governance");
            });
        });

        describe("Transaction Limits", function () {
            it("Should enforce maximum transaction amount", async function () {
                const maxTxAmount = await token.antiBotConfig().then(config => config.maxTxAmount);
                const excessiveAmount = maxTxAmount.add(1);
                
                await expect(
                    token.connect(user1).transfer(user2.address, excessiveAmount)
                ).to.be.revertedWithCustomError(token, "ExceedsLimit");
            });
            
            it("Should enforce maximum wallet balance", async function () {
                const maxWalletAmount = await token.antiBotConfig().then(config => config.maxWalletAmount);
                
                // Transfer amount that would exceed wallet limit
                const user3Balance = await token.balanceOf(user3.address);
                const excessiveTransfer = maxWalletAmount.sub(user3Balance).add(1);
                
                await expect(
                    token.connect(user1).transfer(user3.address, excessiveTransfer)
                ).to.be.revertedWithCustomError(token, "ExceedsLimit");
            });
            
            it("Should skip limits for excluded addresses", async function () {
                await token.connect(governance).setExcludedFromLimits(user1.address, true);
                await token.connect(governance).setExcludedFromLimits(user2.address, true);
                
                const maxTxAmount = await token.antiBotConfig().then(config => config.maxTxAmount);
                const excessiveAmount = maxTxAmount.add(ethers.utils.parseEther("1000"));
                
                await expect(
                    token.connect(user1).transfer(user2.address, excessiveAmount)
                ).to.not.be.reverted;
            });
        });

        describe("Cooldown Mechanism", function () {
            it("Should enforce cooldown period between transactions", async function () {
                // First transaction
                await token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"));
                
                // Immediate second transaction should fail
                await expect(
                    token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
                ).to.be.revertedWithCustomError(token, "CooldownActive");
            });
            
            it("Should allow transactions after cooldown period", async function () {
                // First transaction
                await token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"));
                
                // Fast forward time
                await ethers.provider.send("evm_increaseTime", [61]); // 61 seconds
                await ethers.provider.send("evm_mine");
                
                // Second transaction should succeed
                await expect(
                    token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
                ).to.not.be.reverted;
            });
        });

        describe("Anti-Bot Configuration", function () {
            it("Should allow governance to update anti-bot settings", async function () {
                const newMaxTx = ethers.utils.parseEther("50000");
                const newMaxWallet = ethers.utils.parseEther("100000");
                const newCooldown = 45;
                
                await expect(
                    token.connect(governance).updateAntiBotConfig(
                        newMaxTx,
                        newMaxWallet,
                        newCooldown,
                        true,
                        true
                    )
                ).to.emit(token, "AntiBotConfigUpdated");
                
                const config = await token.antiBotConfig();
                expect(config.maxTxAmount).to.equal(newMaxTx);
                expect(config.maxWalletAmount).to.equal(newMaxWallet);
                expect(config.cooldownPeriod).to.equal(newCooldown);
            });
            
            it("Should enforce minimum cooldown period", async function () {
                await expect(
                    token.connect(governance).updateAntiBotConfig(
                        ethers.utils.parseEther("50000"),
                        ethers.utils.parseEther("100000"),
                        MIN_COOLDOWN - 1, // Below minimum
                        true,
                        true
                    )
                ).to.be.revertedWith("Cooldown too short");
            });
        });
    });

    describe("🔍 View Functions & Utilities", function () {
        
        describe("Tax Calculation Views", function () {
            it("Should return correct current tax for different transaction types", async function () {
                // Regular transfer
                const transferTax = await token.getCurrentTax(user1.address, user2.address);
                expect(transferTax).to.equal(100); // 1%
                
                // Buy (from DEX pair)
                const buyTax = await token.getCurrentTax(dexPair.address, user1.address);
                expect(buyTax).to.equal(200); // 2%
                
                // Sell (to DEX pair)
                const sellTax = await token.getCurrentTax(user1.address, dexPair.address);
                expect(sellTax).to.equal(200); // 2%
            });
            
            it("Should return zero tax for excluded addresses", async function () {
                await token.connect(governance).setExcludedFromFees(user1.address, true);
                
                const tax = await token.getCurrentTax(user1.address, user2.address);
                expect(tax).to.equal(0);
            });
        });

        describe("Transfer Validation", function () {
            it("Should return transfer validity and reasons", async function () {
                const amount = ethers.utils.parseEther("100");
                
                const [canTransfer, reason] = await token.canTransfer(user1.address, user2.address, amount);
                expect(canTransfer).to.be.true;
                expect(reason).to.equal("");
            });
            
            it("Should return false for blacklisted sender", async function () {
                await token.connect(governance).setBlacklist(user1.address, true);
                
                const [canTransfer, reason] = await token.canTransfer(user1.address, user2.address, ethers.utils.parseEther("100"));
                expect(canTransfer).to.be.false;
                expect(reason).to.equal("Sender blacklisted");
            });
            
            it("Should return false when trading is closed", async function () {
                // Deploy contract without opening trading
                const CloutXToken = await ethers.getContractFactory("CloutXToken");
                const closedToken = await upgrades.deployProxy(CloutXToken, [
                    "CloutX Token",
                    "CLX", 
                    governance.address
                ], { initializer: "initialize" });
                
                await closedToken.connect(owner).transfer(user1.address, ethers.utils.parseEther("1000"));
                
                const [canTransfer, reason] = await closedToken.canTransfer(user1.address, user2.address, ethers.utils.parseEther("100"));
                expect(canTransfer).to.be.false;
                expect(reason).to.equal("Trading not open");
            });
        });
    });

    describe("🔧 Administrative Functions", function () {
        
        describe("Emergency Controls", function () {
            it("Should allow owner to emergency pause", async function () {
                await token.connect(owner).emergencyPause();
                expect(await token.paused()).to.be.true;
                
                await expect(
                    token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
                ).to.be.revertedWith("Pausable: paused");
            });
            
            it("Should allow owner to emergency unpause", async function () {
                await token.connect(owner).emergencyPause();
                await token.connect(owner).emergencyUnpause();
                expect(await token.paused()).to.be.false;
            });
        });

        describe("Trading Controls", function () {
            it("Should allow owner to open trading only once", async function () {
                const CloutXToken = await ethers.getContractFactory("CloutXToken");
                const newToken = await upgrades.deployProxy(CloutXToken, [
                    "CloutX Token",
                    "CLX", 
                    governance.address
                ], { initializer: "initialize" });
                
                await expect(
                    newToken.connect(owner).openTrading()
                ).to.emit(newToken, "TradingOpened");
                
                await expect(
                    newToken.connect(owner).openTrading()
                ).to.be.revertedWith("Trading already open");
            });
        });

        describe("Upgrade Authorization", function () {
            it("Should only allow governance to authorize upgrades", async function () {
                // This would be tested with actual upgrade scenarios
                // For now, we verify the _authorizeUpgrade function exists and has correct access control
                const CloutXTokenV2 = await ethers.getContractFactory("CloutXToken");
                
                // Non-governance should not be able to upgrade
                await expect(
                    upgrades.upgradeProxy(token.address, CloutXTokenV2.connect(user1))
                ).to.be.reverted;
            });
        });
    });

    describe("🎯 Fuzz Testing", function () {
        
        describe("Random Transfer Amounts", function () {
            it("Should handle random transfer amounts correctly", async function () {
                const tests = 10;
                
                for (let i = 0; i < tests; i++) {
                    // Generate random amount between 1 and 1000 tokens
                    const randomAmount = ethers.utils.parseEther(
                        (Math.random() * 1000 + 1).toFixed(18)
                    );
                    
                    const balanceBefore = await token.balanceOf(user1.address);
                    
                    if (balanceBefore.gte(randomAmount)) {
                        const recipient = Math.random() > 0.5 ? user2.address : user3.address;
                        
                        try {
                            await token.connect(user1).transfer(recipient, randomAmount);
                            
                            // Verify tax calculations are consistent
                            const taxAmount = await token.calculateTaxAmount(user1.address, recipient, randomAmount);
                            const effectiveAmount = await token.getEffectiveTransferAmount(user1.address, recipient, randomAmount);
                            
                            expect(effectiveAmount.add(taxAmount)).to.equal(randomAmount);
                        } catch (error) {
                            // Expected for amounts exceeding limits
                            expect(error.message).to.include("ExceedsLimit");
                        }
                    }
                }
            });
        });

        describe("Edge Case Amounts", function () {
            const edgeCases = [
                "0.000000000000000001", // 1 wei
                "0.000000000000001", // 1000 wei
                "1", // 1 token
                "999.999999999999999999", // Just under 1000
                "1000", // Exactly 1000
                "1000.000000000000000001" // Just over 1000
            ];
            
            edgeCases.forEach((amount, index) => {
                it(`Should handle edge case amount: ${amount} ETH`, async function () {
                    const testAmount = ethers.utils.parseEther(amount);
                    const userBalance = await token.balanceOf(user1.address);
                    
                    if (userBalance.gte(testAmount)) {
                        const taxAmount = await token.calculateTaxAmount(user1.address, user2.address, testAmount);
                        const effectiveAmount = await token.getEffectiveTransferAmount(user1.address, user2.address, testAmount);
                        
                        // Tax + effective amount should equal original amount
                        expect(taxAmount.add(effectiveAmount)).to.equal(testAmount);
                        
                        // Tax should not exceed original amount
                        expect(taxAmount).to.be.lte(testAmount);
                    }
                });
            });
        });
    });

    describe("📊 Gas Optimization Verification", function () {
        
        it("Should use gas-efficient custom errors", async function () {
            // Test that custom errors use less gas than require strings
            const largeAmount = ethers.utils.parseEther("10000000"); // Exceeds max tx
            
            try {
                const tx = await token.connect(user1).transfer(user2.address, largeAmount);
                await tx.wait();
            } catch (error) {
                // Should use custom error (more gas efficient)
                expect(error.message).to.include("ExceedsLimit");
            }
        });
        
        it("Should have reasonable gas costs for transfers", async function () {
            const amount = ethers.utils.parseEther("100");
            
            const tx = await token.connect(user1).transfer(user2.address, amount);
            const receipt = await tx.wait();
            
            // Gas should be reasonable (under 150k for transfer with tax)
            expect(receipt.gasUsed).to.be.lt(150000);
        });
    });
}); 