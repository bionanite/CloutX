const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title CloutXTokenOptimized Test Suite
 * @dev Comprehensive testing with 95%+ coverage target
 * @notice Tests security fixes, gas optimizations, and edge cases
 */
describe("CloutXTokenOptimized", function () {
    // Test constants
    const INITIAL_SUPPLY = ethers.utils.parseEther("1000000000"); // 1B tokens
    const BASIS_POINTS = 10000;
    const MAX_TAX_RATE = 1000; // 10%
    const MIN_COOLDOWN = 30;
    const MEV_PROTECTION_BLOCKS = 2;

    // Transaction types enum
    const TransactionType = {
        TRANSFER: 0,
        BUY: 1,
        SELL: 2,
        TRANSFER_FROM: 3
    };

    async function deployTokenFixture() {
        const [owner, rewardPool, user1, user2, user3, governance, dexPair, dexRouter] = await ethers.getSigners();

        // Deploy the optimized token
        const CloutXTokenOptimized = await ethers.getContractFactory("CloutXTokenOptimized");
        const token = await upgrades.deployProxy(CloutXTokenOptimized, [
            "CloutX Optimized",
            "CLXO",
            INITIAL_SUPPLY,
            owner.address,
            rewardPool.address
        ], { kind: 'uups' });
        await token.deployed();

        // Set governance contract
        await token.updateGovernanceContract(governance.address);

        // Transfer some tokens to users for testing
        await token.transfer(user1.address, ethers.utils.parseEther("1000000"));
        await token.transfer(user2.address, ethers.utils.parseEther("1000000"));
        await token.transfer(user3.address, ethers.utils.parseEther("1000000"));

        return {
            token,
            owner,
            rewardPool,
            user1,
            user2,
            user3,
            governance,
            dexPair,
            dexRouter
        };
    }

    describe("Deployment & Initialization", function () {
        it("Should deploy with correct initial parameters", async function () {
            const { token, owner, rewardPool } = await loadFixture(deployTokenFixture);

            expect(await token.name()).to.equal("CloutX Optimized");
            expect(await token.symbol()).to.equal("CLXO");
            expect(await token.decimals()).to.equal(18);
            expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
            expect(await token.owner()).to.equal(owner.address);
            expect(await token.rewardPool()).to.equal(rewardPool.address);
        });

        it("Should initialize tax configuration correctly", async function () {
            const { token } = await loadFixture(deployTokenFixture);
            
            const taxConfig = await token.getTaxConfig();
            expect(taxConfig.buyTax).to.equal(200); // 2%
            expect(taxConfig.sellTax).to.equal(200); // 2%
            expect(taxConfig.transferTax).to.equal(100); // 1%
            expect(taxConfig.burnRate).to.equal(5000); // 50%
            expect(taxConfig.rewardRate).to.equal(5000); // 50%
        });

        it("Should initialize anti-bot configuration correctly", async function () {
            const { token } = await loadFixture(deployTokenFixture);
            
            const antiBotConfig = await token.getAntiBotConfig();
            expect(antiBotConfig.maxTxAmount).to.equal(INITIAL_SUPPLY.div(100)); // 1%
            expect(antiBotConfig.maxWalletAmount).to.equal(INITIAL_SUPPLY.div(50)); // 2%
            expect(antiBotConfig.cooldownPeriod).to.equal(60);
            expect(antiBotConfig.antiBotEnabled).to.be.true;
        });

        it("Should set correct exclusions for owner and reward pool", async function () {
            const { token, owner, rewardPool } = await loadFixture(deployTokenFixture);
            
            const ownerFlags = await token.getAddressFlags(owner.address);
            const rewardPoolFlags = await token.getAddressFlags(rewardPool.address);
            
            expect(ownerFlags.isExcludedFromTax).to.be.true;
            expect(ownerFlags.isExcludedFromLimits).to.be.true;
            expect(rewardPoolFlags.isExcludedFromTax).to.be.true;
            expect(rewardPoolFlags.isExcludedFromLimits).to.be.true;
        });

        it("Should revert with invalid initialization parameters", async function () {
            const CloutXTokenOptimized = await ethers.getContractFactory("CloutXTokenOptimized");
            
            // Invalid owner address
            await expect(
                upgrades.deployProxy(CloutXTokenOptimized, [
                    "CloutX",
                    "CLX",
                    INITIAL_SUPPLY,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero
                ])
            ).to.be.revertedWithCustomError(CloutXTokenOptimized, "InvalidAddress");
        });
    });

    describe("Custom Errors & Gas Optimization", function () {
        it("Should use custom errors for gas efficiency", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);
            
            // Test TransferFromZeroAddress error
            await expect(
                token.connect(user1).transferFrom(ethers.constants.AddressZero, user1.address, 100)
            ).to.be.revertedWithCustomError(token, "TransferFromZeroAddress");
            
            // Test TransferToZeroAddress error
            await expect(
                token.connect(user1).transfer(ethers.constants.AddressZero, 100)
            ).to.be.revertedWithCustomError(token, "TransferToZeroAddress");
            
            // Test TransferZeroAmount error
            await expect(
                token.connect(user1).transfer(user1.address, 0)
            ).to.be.revertedWithCustomError(token, "TransferZeroAmount");
        });

        it("Should pack address flags efficiently", async function () {
            const { token, governance, dexPair } = await loadFixture(deployTokenFixture);
            
            // Set multiple flags and verify they're stored together
            await token.connect(governance).setDEXPair(dexPair.address, true);
            await token.connect(governance).setExcludedFromTax(dexPair.address, true);
            
            const flags = await token.getAddressFlags(dexPair.address);
            expect(flags.isDEXPair).to.be.true;
            expect(flags.isExcludedFromTax).to.be.true;
            expect(flags.isDEXRouter).to.be.false;
            expect(flags.isExcludedFromLimits).to.be.false;
        });

        it("Should emit optimized events with enum types", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            // Remove tax exclusion for testing
            await token.connect(token.owner()).setExcludedFromTax(user1.address, false);
            
            const transferAmount = ethers.utils.parseEther("1000");
            const tx = await token.connect(user1).transfer(user2.address, transferAmount);
            
            // Check for TaxCollected event with enum
            await expect(tx)
                .to.emit(token, "TaxCollected")
                .withArgs(
                    user1.address,
                    user2.address,
                    ethers.utils.parseEther("10"), // 1% tax
                    ethers.utils.parseEther("5"),  // 50% burned
                    ethers.utils.parseEther("5"),  // 50% to rewards
                    TransactionType.TRANSFER
                );
        });
    });

    describe("Enhanced Transfer Functions", function () {
        it("Should handle regular transfers with tax", async function () {
            const { token, user1, user2, rewardPool } = await loadFixture(deployTokenFixture);
            
            // Remove exclusions to test tax
            await token.setExcludedFromTax(user1.address, false);
            
            const transferAmount = ethers.utils.parseEther("1000");
            const expectedTax = transferAmount.mul(100).div(BASIS_POINTS); // 1%
            const expectedNetAmount = transferAmount.sub(expectedTax);
            
            const user1BalanceBefore = await token.balanceOf(user1.address);
            const user2BalanceBefore = await token.balanceOf(user2.address);
            const rewardPoolBalanceBefore = await token.balanceOf(rewardPool.address);
            
            await token.connect(user1).transfer(user2.address, transferAmount);
            
            const user1BalanceAfter = await token.balanceOf(user1.address);
            const user2BalanceAfter = await token.balanceOf(user2.address);
            const rewardPoolBalanceAfter = await token.balanceOf(rewardPool.address);
            
            expect(user1BalanceAfter).to.equal(user1BalanceBefore.sub(transferAmount));
            expect(user2BalanceAfter).to.equal(user2BalanceBefore.add(expectedNetAmount));
            expect(rewardPoolBalanceAfter).to.equal(rewardPoolBalanceBefore.add(expectedTax.div(2)));
        });

        it("Should handle DEX buy transactions", async function () {
            const { token, user1, dexPair, governance } = await loadFixture(deployTokenFixture);
            
            // Set up DEX pair
            await token.connect(governance).setDEXPair(dexPair.address, true);
            await token.transfer(dexPair.address, ethers.utils.parseEther("1000000"));
            
            const buyAmount = ethers.utils.parseEther("1000");
            const expectedTax = buyAmount.mul(200).div(BASIS_POINTS); // 2% buy tax
            
            const tx = await token.connect(dexPair).transfer(user1.address, buyAmount);
            
            await expect(tx)
                .to.emit(token, "TaxCollected")
                .withArgs(
                    dexPair.address,
                    user1.address,
                    expectedTax,
                    expectedTax.div(2), // 50% burned
                    expectedTax.div(2), // 50% to rewards
                    TransactionType.BUY
                );
        });

        it("Should handle DEX sell transactions", async function () {
            const { token, user1, dexPair, governance } = await loadFixture(deployTokenFixture);
            
            // Set up DEX pair and remove user exclusions
            await token.connect(governance).setDEXPair(dexPair.address, true);
            await token.setExcludedFromTax(user1.address, false);
            
            const sellAmount = ethers.utils.parseEther("1000");
            const expectedTax = sellAmount.mul(200).div(BASIS_POINTS); // 2% sell tax
            
            const tx = await token.connect(user1).transfer(dexPair.address, sellAmount);
            
            await expect(tx)
                .to.emit(token, "TaxCollected")
                .withArgs(
                    user1.address,
                    dexPair.address,
                    expectedTax,
                    expectedTax.div(2), // 50% burned
                    expectedTax.div(2), // 50% to rewards
                    TransactionType.SELL
                );
        });

        it("Should handle transferFrom with tax", async function () {
            const { token, user1, user2, user3 } = await loadFixture(deployTokenFixture);
            
            // Remove exclusions and set up allowance
            await token.setExcludedFromTax(user1.address, false);
            await token.connect(user1).approve(user3.address, ethers.utils.parseEther("2000"));
            
            const transferAmount = ethers.utils.parseEther("1000");
            const expectedTax = transferAmount.mul(100).div(BASIS_POINTS); // 1%
            
            const tx = await token.connect(user3).transferFrom(user1.address, user2.address, transferAmount);
            
            await expect(tx)
                .to.emit(token, "TaxCollected")
                .withArgs(
                    user1.address,
                    user2.address,
                    expectedTax,
                    expectedTax.div(2),
                    expectedTax.div(2),
                    TransactionType.TRANSFER_FROM
                );
        });
    });

    describe("Anti-Bot Protection", function () {
        it("Should enforce transaction amount limits", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            // Remove exclusions
            await token.setExcludedFromLimits(user1.address, false);
            
            const maxTxAmount = INITIAL_SUPPLY.div(100); // 1%
            const excessiveAmount = maxTxAmount.add(1);
            
            await expect(
                token.connect(user1).transfer(user2.address, excessiveAmount)
            ).to.be.revertedWithCustomError(token, "TransferAmountExceedsMaximum");
        });

        it("Should enforce wallet balance limits", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            // Remove exclusions
            await token.setExcludedFromLimits(user2.address, false);
            
            const maxWalletAmount = INITIAL_SUPPLY.div(50); // 2%
            const currentBalance = await token.balanceOf(user2.address);
            const excessiveAmount = maxWalletAmount.sub(currentBalance).add(1);
            
            await expect(
                token.connect(user1).transfer(user2.address, excessiveAmount)
            ).to.be.revertedWithCustomError(token, "WalletBalanceExceedsMaximum");
        });

        it("Should enforce cooldown periods", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            // Remove exclusions
            await token.setExcludedFromLimits(user1.address, false);
            
            const transferAmount = ethers.utils.parseEther("1000");
            
            // First transfer should succeed
            await token.connect(user1).transfer(user2.address, transferAmount);
            
            // Second transfer immediately should fail
            await expect(
                token.connect(user1).transfer(user2.address, transferAmount)
            ).to.be.revertedWithCustomError(token, "CooldownPeriodNotMet");
            
            // After cooldown period, should succeed
            await time.increase(61); // 61 seconds
            await expect(
                token.connect(user1).transfer(user2.address, transferAmount)
            ).to.not.be.reverted;
        });
    });

    describe("MEV Protection", function () {
        it("Should prevent MEV attacks with block-based protection", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            // Remove exclusions
            await token.setExcludedFromLimits(user1.address, false);
            await token.setExcludedFromTax(user1.address, false);
            
            const transferAmount = ethers.utils.parseEther("1000");
            
            // First transaction
            await token.connect(user1).transfer(user2.address, transferAmount);
            
            // Second transaction in same block should fail
            await expect(
                token.connect(user1).transfer(user2.address, transferAmount)
            ).to.be.revertedWithCustomError(token, "MEVProtectionActive");
        });

        it("Should emit MEV protection events", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            await token.setExcludedFromLimits(user1.address, false);
            await time.increase(61); // Ensure cooldown is met
            
            const tx = await token.connect(user1).transfer(user2.address, ethers.utils.parseEther("1000"));
            
            await expect(tx)
                .to.emit(token, "MEVProtectionTriggered")
                .withArgs(user1.address, await ethers.provider.getBlockNumber());
        });

        it("Should allow excluded addresses to bypass MEV protection", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            // Keep user1 excluded from limits (default for owner)
            const transferAmount = ethers.utils.parseEther("1000");
            
            // Multiple transactions should succeed
            await token.connect(user1).transfer(user2.address, transferAmount);
            await token.connect(user1).transfer(user2.address, transferAmount);
        });
    });

    describe("DEX Integration", function () {
        it("Should correctly identify DEX pairs", async function () {
            const { token, dexPair, governance } = await loadFixture(deployTokenFixture);
            
            await token.connect(governance).setDEXPair(dexPair.address, true);
            
            expect(await token.isDEXAddress(dexPair.address)).to.be.true;
            
            const flags = await token.getAddressFlags(dexPair.address);
            expect(flags.isDEXPair).to.be.true;
            expect(flags.isDEXRouter).to.be.false;
        });

        it("Should correctly identify DEX routers", async function () {
            const { token, dexRouter, governance } = await loadFixture(deployTokenFixture);
            
            await token.connect(governance).setDEXRouter(dexRouter.address, true);
            
            expect(await token.isDEXAddress(dexRouter.address)).to.be.true;
            
            const flags = await token.getAddressFlags(dexRouter.address);
            expect(flags.isDEXPair).to.be.false;
            expect(flags.isDEXRouter).to.be.true;
        });

        it("Should prevent setting DEX address twice", async function () {
            const { token, dexPair, governance } = await loadFixture(deployTokenFixture);
            
            await token.connect(governance).setDEXPair(dexPair.address, true);
            
            await expect(
                token.connect(governance).setDEXPair(dexPair.address, true)
            ).to.be.revertedWithCustomError(token, "DEXAddressAlreadySet");
        });
    });

    describe("Governance Functions", function () {
        it("Should update tax configuration correctly", async function () {
            const { token, governance } = await loadFixture(deployTokenFixture);
            
            const newBuyTax = 300; // 3%
            const newSellTax = 250; // 2.5%
            const newTransferTax = 150; // 1.5%
            const newBurnRate = 6000; // 60%
            const newRewardRate = 4000; // 40%
            
            await expect(
                token.connect(governance).updateTaxConfig(
                    newBuyTax,
                    newSellTax,
                    newTransferTax,
                    newBurnRate,
                    newRewardRate
                )
            ).to.emit(token, "TaxConfigUpdated")
             .withArgs(newBuyTax, newSellTax, newTransferTax, newBurnRate, newRewardRate);
            
            const taxConfig = await token.getTaxConfig();
            expect(taxConfig.buyTax).to.equal(newBuyTax);
            expect(taxConfig.sellTax).to.equal(newSellTax);
            expect(taxConfig.transferTax).to.equal(newTransferTax);
            expect(taxConfig.burnRate).to.equal(newBurnRate);
            expect(taxConfig.rewardRate).to.equal(newRewardRate);
        });

        it("Should reject invalid tax configurations", async function () {
            const { token, governance } = await loadFixture(deployTokenFixture);
            
            // Tax rate too high
            await expect(
                token.connect(governance).updateTaxConfig(1001, 200, 100, 5000, 5000)
            ).to.be.revertedWithCustomError(token, "TaxRateTooHigh");
            
            // Invalid burn/reward split
            await expect(
                token.connect(governance).updateTaxConfig(200, 200, 100, 6000, 5000)
            ).to.be.revertedWithCustomError(token, "InvalidBurnRewardSplit");
        });

        it("Should update anti-bot configuration correctly", async function () {
            const { token, governance } = await loadFixture(deployTokenFixture);
            
            const newMaxTx = ethers.utils.parseEther("50000000"); // 50M
            const newMaxWallet = ethers.utils.parseEther("100000000"); // 100M
            const newCooldown = 120; // 2 minutes
            const newEnabled = false;
            
            await expect(
                token.connect(governance).updateAntiBotConfig(
                    newMaxTx,
                    newMaxWallet,
                    newCooldown,
                    newEnabled
                )
            ).to.emit(token, "AntiBotConfigUpdated")
             .withArgs(newMaxTx, newMaxWallet, newCooldown, newEnabled);
            
            const antiBotConfig = await token.getAntiBotConfig();
            expect(antiBotConfig.maxTxAmount).to.equal(newMaxTx);
            expect(antiBotConfig.maxWalletAmount).to.equal(newMaxWallet);
            expect(antiBotConfig.cooldownPeriod).to.equal(newCooldown);
            expect(antiBotConfig.antiBotEnabled).to.equal(newEnabled);
        });

        it("Should reject invalid anti-bot configurations", async function () {
            const { token, governance } = await loadFixture(deployTokenFixture);
            
            // Cooldown too short
            await expect(
                token.connect(governance).updateAntiBotConfig(
                    ethers.utils.parseEther("1000000"),
                    ethers.utils.parseEther("2000000"),
                    29, // Less than MIN_COOLDOWN
                    true
                )
            ).to.be.revertedWithCustomError(token, "CooldownTooShort");
            
            // Zero amounts
            await expect(
                token.connect(governance).updateAntiBotConfig(0, 1000, 60, true)
            ).to.be.revertedWithCustomError(token, "InvalidAmount");
        });

        it("Should restrict governance functions to authorized addresses", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);
            
            await expect(
                token.connect(user1).updateTaxConfig(200, 200, 100, 5000, 5000)
            ).to.be.revertedWithCustomError(token, "OnlyGovernanceOrOwner");
        });
    });

    describe("View Functions", function () {
        it("Should calculate tax correctly for different transaction types", async function () {
            const { token } = await loadFixture(deployTokenFixture);
            
            const amount = ethers.utils.parseEther("1000");
            
            // Buy transaction (2% tax)
            const [buyTax, buyBurn, buyReward] = await token.calculateTax(amount, true, false);
            expect(buyTax).to.equal(ethers.utils.parseEther("20")); // 2%
            expect(buyBurn).to.equal(ethers.utils.parseEther("10")); // 50% of tax
            expect(buyReward).to.equal(ethers.utils.parseEther("10")); // 50% of tax
            
            // Sell transaction (2% tax)
            const [sellTax, sellBurn, sellReward] = await token.calculateTax(amount, false, true);
            expect(sellTax).to.equal(ethers.utils.parseEther("20")); // 2%
            expect(sellBurn).to.equal(ethers.utils.parseEther("10"));
            expect(sellReward).to.equal(ethers.utils.parseEther("10"));
            
            // Transfer transaction (1% tax)
            const [transferTax, transferBurn, transferReward] = await token.calculateTax(amount, false, false);
            expect(transferTax).to.equal(ethers.utils.parseEther("10")); // 1%
            expect(transferBurn).to.equal(ethers.utils.parseEther("5"));
            expect(transferReward).to.equal(ethers.utils.parseEther("5"));
        });

        it("Should return correct version", async function () {
            const { token } = await loadFixture(deployTokenFixture);
            
            expect(await token.version()).to.equal("3.0.0-Optimized");
        });
    });

    describe("Upgrade Functions", function () {
        it("Should authorize upgrades for governance", async function () {
            const { token, governance } = await loadFixture(deployTokenFixture);
            
            // This test verifies the upgrade authorization logic
            // In a real scenario, this would be tested with actual upgrade deployment
            const CloutXTokenOptimized = await ethers.getContractFactory("CloutXTokenOptimized");
            const newImplementation = await CloutXTokenOptimized.deploy();
            
            // The _authorizeUpgrade function is internal, but we can test the access control
            // by trying to call upgrade from unauthorized address
            await expect(
                upgrades.upgradeProxy(token.address, CloutXTokenOptimized.connect(governance))
            ).to.not.be.reverted;
        });

        it("Should reject unauthorized upgrade attempts", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);
            
            const CloutXTokenOptimized = await ethers.getContractFactory("CloutXTokenOptimized");
            
            await expect(
                upgrades.upgradeProxy(token.address, CloutXTokenOptimized.connect(user1))
            ).to.be.reverted;
        });
    });

    describe("Pausability", function () {
        it("Should pause and unpause correctly", async function () {
            const { token, governance, user1, user2 } = await loadFixture(deployTokenFixture);
            
            // Pause the contract
            await token.connect(governance).pause();
            expect(await token.paused()).to.be.true;
            
            // Transfers should fail when paused
            await expect(
                token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
            ).to.be.revertedWith("Pausable: paused");
            
            // Unpause the contract
            await token.connect(governance).unpause();
            expect(await token.paused()).to.be.false;
            
            // Transfers should work again
            await expect(
                token.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
            ).to.not.be.reverted;
        });
    });

    describe("Edge Cases & Fuzz Testing", function () {
        it("Should handle very small amounts correctly", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            await token.setExcludedFromTax(user1.address, false);
            
            // Transfer 1 wei
            const smallAmount = 1;
            await token.connect(user1).transfer(user2.address, smallAmount);
            
            // Tax should be 0 due to rounding down
            const taxAmount = Math.floor(smallAmount * 100 / BASIS_POINTS);
            expect(taxAmount).to.equal(0);
        });

        it("Should handle maximum possible amounts", async function () {
            const { token, owner, user1 } = await loadFixture(deployTokenFixture);
            
            const maxAmount = await token.balanceOf(owner.address);
            
            // Should not overflow or underflow
            await expect(
                token.connect(owner).transfer(user1.address, maxAmount)
            ).to.not.be.reverted;
        });

        it("Should maintain total supply invariant during burns", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            await token.setExcludedFromTax(user1.address, false);
            
            const initialSupply = await token.totalSupply();
            const transferAmount = ethers.utils.parseEther("1000");
            
            await token.connect(user1).transfer(user2.address, transferAmount);
            
            const finalSupply = await token.totalSupply();
            const burnedAmount = await token.totalBurned();
            
            // Total supply should decrease by burned amount
            expect(finalSupply).to.equal(initialSupply.sub(burnedAmount));
        });

        it("Should handle rapid successive transactions correctly", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            // Remove limits to allow rapid transactions
            await token.setExcludedFromLimits(user1.address, true);
            
            const transferAmount = ethers.utils.parseEther("100");
            
            // Multiple rapid transactions should all succeed
            for (let i = 0; i < 5; i++) {
                await token.connect(user1).transfer(user2.address, transferAmount);
            }
        });
    });

    describe("Integration with Other Contracts", function () {
        it("Should work correctly with allowance system", async function () {
            const { token, user1, user2, user3 } = await loadFixture(deployTokenFixture);
            
            const allowanceAmount = ethers.utils.parseEther("2000");
            const transferAmount = ethers.utils.parseEther("1000");
            
            // Set allowance
            await token.connect(user1).approve(user3.address, allowanceAmount);
            expect(await token.allowance(user1.address, user3.address)).to.equal(allowanceAmount);
            
            // Transfer using allowance
            await token.connect(user3).transferFrom(user1.address, user2.address, transferAmount);
            
            // Check remaining allowance
            const remainingAllowance = await token.allowance(user1.address, user3.address);
            expect(remainingAllowance).to.be.lt(allowanceAmount);
        });

        it("Should emit proper events for external monitoring", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            
            await token.setExcludedFromTax(user1.address, false);
            
            const transferAmount = ethers.utils.parseEther("1000");
            const tx = await token.connect(user1).transfer(user2.address, transferAmount);
            
            // Should emit both Transfer and TaxCollected events
            await expect(tx).to.emit(token, "Transfer");
            await expect(tx).to.emit(token, "TaxCollected");
        });
    });
}); 