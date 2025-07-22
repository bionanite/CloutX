/**
 * @title CloutX Test Coverage Configuration
 * @dev Comprehensive testing strategy for 95%+ coverage target
 */

module.exports = {
    // Coverage targets
    targets: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95
    },

    // Test categories and priorities
    testCategories: {
        unit: {
            priority: 1,
            description: "Individual function testing",
            coverage: 85
        },
        integration: {
            priority: 2,
            description: "Contract interaction testing", 
            coverage: 80
        },
        edge: {
            priority: 3,
            description: "Edge cases and error conditions",
            coverage: 90
        },
        fuzz: {
            priority: 4,
            description: "Property-based testing",
            coverage: 70
        },
        gas: {
            priority: 5,
            description: "Gas optimization verification",
            coverage: 60
        }
    },

    // Contract-specific test requirements
    contracts: {
        "CloutXTokenOptimized": {
            criticalFunctions: [
                "transfer",
                "transferFrom", 
                "_calculateTaxAmount",
                "_processTax",
                "_validateTransfer",
                "_authorizeUpgrade"
            ],
            securityTests: [
                "reentrancy",
                "overflow",
                "accessControl",
                "mevProtection",
                "antiBotProtection"
            ],
            edgeCases: [
                "zeroAmounts",
                "maxAmounts",
                "pausedState",
                "upgradeScenarios",
                "exclusionChanges"
            ]
        },
        "StakingPool": {
            criticalFunctions: [
                "stake",
                "unstake",
                "claimRewards",
                "calculateRewards"
            ],
            securityTests: [
                "stakingLimits",
                "rewardCalculation",
                "emergencyUnstake"
            ]
        },
        "GovernanceDAO": {
            criticalFunctions: [
                "propose",
                "vote",
                "execute",
                "queue"
            ],
            securityTests: [
                "proposalValidation",
                "votingPower",
                "timelock"
            ]
        }
    },

    // Test execution strategy
    execution: {
        parallel: true,
        timeout: 60000,
        retries: 2,
        bail: false
    },

    // Coverage exclusions
    exclusions: [
        "test/**/*.js",
        "scripts/**/*.js",
        "hardhat.config.js",
        "coverage/**/*"
    ],

    // Report generation
    reports: {
        formats: ["html", "json", "text"],
        directory: "./coverage",
        detailed: true
    }
}; 