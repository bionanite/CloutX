// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title CloutXToken
 * @dev CloutX (CLX) - Viral Deflationary Social-Fi Token with Proof of Virality
 * 
 * Features:
 * - Deflationary by design (1% burn on sell, 1% to rewards pool)
 * - Configurable transfer taxes per transaction type
 * - Anti-bot and anti-whale protection
 * - Dynamic fee adjustment via governance
 * - UUPS upgradeable pattern for future scalability
 * 
 * @author CloutX Team
 * @notice Designed for 1M+ daily micro-transactions with viral growth potential
 */
contract CloutXToken is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeMath for uint256;

    // ============ STRUCTS ============
    
    struct TaxConfig {
        uint256 buyTax;      // Tax on buy transactions (basis points)
        uint256 sellTax;     // Tax on sell transactions (basis points)
        uint256 transferTax; // Tax on regular transfers (basis points)
        uint256 burnRate;    // Percentage of tax that gets burned (basis points)
        uint256 rewardRate;  // Percentage of tax that goes to rewards (basis points)
    }

    struct AntiBotConfig {
        uint256 maxTxAmount;     // Maximum transaction amount
        uint256 maxWalletAmount; // Maximum wallet balance
        uint256 cooldownPeriod;  // Cooldown between transactions (seconds)
        bool antiBotEnabled;     // Whether anti-bot protection is active
    }

    // ============ STATE VARIABLES ============
    
    TaxConfig public taxConfig;
    AntiBotConfig public antiBotConfig;
    
    address public rewardPool;
    address public governanceContract;
    address public stakingContract;
    
    mapping(address => bool) public isExcludedFromTax;
    mapping(address => bool) public isExcludedFromLimits;
    mapping(address => uint256) public lastTransactionTime;
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_TAX_RATE = 1000; // 10% max tax
    uint256 public constant MIN_COOLDOWN = 30;   // 30 seconds minimum
    
    uint256 public totalBurned;
    uint256 public totalRewardsDistributed;
    
    // ============ EVENTS ============
    
    event TaxConfigUpdated(
        uint256 buyTax,
        uint256 sellTax,
        uint256 transferTax,
        uint256 burnRate,
        uint256 rewardRate
    );
    
    event AntiBotConfigUpdated(
        uint256 maxTxAmount,
        uint256 maxWalletAmount,
        uint256 cooldownPeriod,
        bool antiBotEnabled
    );
    
    event TaxCollected(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 burnAmount,
        uint256 rewardAmount,
        string transactionType
    );
    
    event ExcludedFromTax(address indexed account, bool excluded);
    event ExcludedFromLimits(address indexed account, bool excluded);
    event RewardPoolUpdated(address indexed oldPool, address indexed newPool);
    event GovernanceContractUpdated(address indexed oldGov, address indexed newGov);
    event StakingContractUpdated(address indexed oldStaking, address indexed newStaking);

    // ============ MODIFIERS ============
    
    modifier onlyGovernance() {
        require(
            msg.sender == governanceContract || msg.sender == owner(),
            "CloutX: Only governance or owner"
        );
        _;
    }
    
    modifier onlyStakingContract() {
        require(msg.sender == stakingContract, "CloutX: Only staking contract");
        _;
    }

    // ============ INITIALIZATION ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the CloutX token contract
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _initialSupply Initial token supply
     * @param _owner Contract owner
     * @param _rewardPool Initial reward pool address
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _owner,
        address _rewardPool
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        _transferOwnership(_owner);

        // Set initial tax configuration (1% burn, 1% rewards)
        taxConfig = TaxConfig({
            buyTax: 200,      // 2% buy tax
            sellTax: 200,     // 2% sell tax
            transferTax: 100, // 1% transfer tax
            burnRate: 5000,   // 50% of tax burned
            rewardRate: 5000  // 50% of tax to rewards
        });

        // Set initial anti-bot configuration
        antiBotConfig = AntiBotConfig({
            maxTxAmount: _initialSupply / 100,     // 1% of supply
            maxWalletAmount: _initialSupply / 50,  // 2% of supply
            cooldownPeriod: 60,                    // 60 seconds
            antiBotEnabled: true
        });

        rewardPool = _rewardPool;
        
        // Exclude owner and reward pool from taxes and limits
        isExcludedFromTax[_owner] = true;
        isExcludedFromTax[_rewardPool] = true;
        isExcludedFromLimits[_owner] = true;
        isExcludedFromLimits[_rewardPool] = true;
        
        // Mint initial supply to owner
        _mint(_owner, _initialSupply);
        
        emit TaxConfigUpdated(
            taxConfig.buyTax,
            taxConfig.sellTax,
            taxConfig.transferTax,
            taxConfig.burnRate,
            taxConfig.rewardRate
        );
    }

    // ============ CORE FUNCTIONS ============
    
    /**
     * @dev Override transfer function to implement tax logic
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) 
        public 
        virtual 
        override 
        whenNotPaused 
        nonReentrant 
        returns (bool) 
    {
        _validateTransfer(msg.sender, to, amount);
        uint256 taxAmount = _calculateTaxAmount(msg.sender, to, amount);
        
        if (taxAmount > 0) {
            _processTax(msg.sender, to, taxAmount, "transfer");
            uint256 netAmount = amount.sub(taxAmount);
            return super.transfer(to, netAmount);
        } else {
            return super.transfer(to, amount);
        }
    }

    /**
     * @dev Override transferFrom function to implement tax logic
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        virtual 
        override 
        whenNotPaused 
        nonReentrant 
        returns (bool) 
    {
        _validateTransfer(from, to, amount);
        uint256 taxAmount = _calculateTaxAmount(from, to, amount);
        
        if (taxAmount > 0) {
            _processTax(from, to, taxAmount, "transferFrom");
            uint256 netAmount = amount.sub(taxAmount);
            return super.transferFrom(from, to, netAmount);
        } else {
            return super.transferFrom(from, to, amount);
        }
    }

    /**
     * @dev Calculate tax amount for a transfer
     * @param from Sender address
     * @param to Recipient address
     * @param amount Transfer amount
     */
    function _calculateTaxAmount(
        address from,
        address to,
        uint256 amount
    ) internal view returns (uint256) {
        // Skip tax logic for excluded addresses
        if (isExcludedFromTax[from] || isExcludedFromTax[to]) {
            return 0;
        }

        if (amount == 0) {
            return 0;
        }

        uint256 taxRate = 0;

        // Determine tax rate based on transaction type
        if (isBuyTransaction(from, to)) {
            taxRate = taxConfig.buyTax;
        } else if (isSellTransaction(from, to)) {
            taxRate = taxConfig.sellTax;
        } else {
            taxRate = taxConfig.transferTax;
        }

        uint256 taxAmount = amount.mul(taxRate).div(BASIS_POINTS);
        
        // Ensure tax doesn't exceed the transfer amount
        if (taxAmount > amount) {
            taxAmount = amount;
        }
        
        return taxAmount;
    }

    /**
     * @dev Process tax by burning and sending to reward pool
     * @param from Sender address
     * @param to Recipient address
     * @param taxAmount Tax amount to process
     * @param txType Transaction type for logging
     */
    function _processTax(
        address from,
        address to,
        uint256 taxAmount,
        string memory txType
    ) internal {
        uint256 burnAmount = taxAmount.mul(taxConfig.burnRate).div(BASIS_POINTS);
        uint256 rewardAmount = taxAmount.mul(taxConfig.rewardRate).div(BASIS_POINTS);

        // First, transfer the full tax amount from sender to contract
        // This ensures we only deduct the tax amount once
        super._transfer(from, address(this), taxAmount);

        // Burn tokens from contract
        if (burnAmount > 0) {
            _burn(address(this), burnAmount);
            totalBurned = totalBurned.add(burnAmount);
        }

        // Send rewards to reward pool from contract
        if (rewardAmount > 0 && rewardPool != address(0)) {
            super._transfer(address(this), rewardPool, rewardAmount);
            totalRewardsDistributed = totalRewardsDistributed.add(rewardAmount);
        }

        emit TaxCollected(from, to, taxAmount, burnAmount, rewardAmount, txType);
    }

    /**
     * @dev Internal function to validate transfers (anti-bot protection)
     * @param from Sender address
     * @param to Recipient address
     * @param amount Transfer amount
     */
    function _validateTransfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "CloutX: Transfer from zero address");
        require(to != address(0), "CloutX: Transfer to zero address");
        require(amount > 0, "CloutX: Transfer amount must be greater than 0");

        if (antiBotConfig.antiBotEnabled) {
            // Check transaction amount limits
            if (!isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
                require(
                    amount <= antiBotConfig.maxTxAmount,
                    "CloutX: Transaction amount exceeds maximum"
                );
            }

            // Check wallet balance limits
            if (!isExcludedFromLimits[to]) {
                require(
                    balanceOf(to).add(amount) <= antiBotConfig.maxWalletAmount,
                    "CloutX: Wallet balance would exceed maximum"
                );
            }

            // Check cooldown period
            if (!isExcludedFromLimits[from]) {
                require(
                    block.timestamp >= lastTransactionTime[from].add(antiBotConfig.cooldownPeriod),
                    "CloutX: Cooldown period not met"
                );
                lastTransactionTime[from] = block.timestamp;
            }
        }
    }

    /**
     * @dev Determine if transaction is a buy (from DEX/router)
     * @param from Sender address
     * @param to Recipient address
     */
    function isBuyTransaction(address from, address to) internal pure returns (bool) {
        // This would be enhanced with actual DEX router addresses
        // For now, return false to use transfer tax for all transactions
        return false;
    }

    /**
     * @dev Determine if transaction is a sell (to DEX/router)
     * @param from Sender address
     * @param to Recipient address
     */
    function isSellTransaction(address from, address to) internal pure returns (bool) {
        // This would be enhanced with actual DEX router addresses
        // For now, return false to use transfer tax for all transactions
        return false;
    }

    // ============ GOVERNANCE FUNCTIONS ============
    
    /**
     * @dev Update tax configuration (governance only)
     * @param _buyTax Buy tax rate in basis points
     * @param _sellTax Sell tax rate in basis points
     * @param _transferTax Transfer tax rate in basis points
     * @param _burnRate Burn rate in basis points
     * @param _rewardRate Reward rate in basis points
     */
    function updateTaxConfig(
        uint256 _buyTax,
        uint256 _sellTax,
        uint256 _transferTax,
        uint256 _burnRate,
        uint256 _rewardRate
    ) external onlyGovernance {
        require(_buyTax <= MAX_TAX_RATE, "CloutX: Buy tax too high");
        require(_sellTax <= MAX_TAX_RATE, "CloutX: Sell tax too high");
        require(_transferTax <= MAX_TAX_RATE, "CloutX: Transfer tax too high");
        require(_burnRate.add(_rewardRate) <= BASIS_POINTS, "CloutX: Invalid burn/reward split");

        taxConfig = TaxConfig({
            buyTax: _buyTax,
            sellTax: _sellTax,
            transferTax: _transferTax,
            burnRate: _burnRate,
            rewardRate: _rewardRate
        });

        emit TaxConfigUpdated(_buyTax, _sellTax, _transferTax, _burnRate, _rewardRate);
    }

    /**
     * @dev Update anti-bot configuration (governance only)
     * @param _maxTxAmount Maximum transaction amount
     * @param _maxWalletAmount Maximum wallet balance
     * @param _cooldownPeriod Cooldown period in seconds
     * @param _antiBotEnabled Whether anti-bot protection is active
     */
    function updateAntiBotConfig(
        uint256 _maxTxAmount,
        uint256 _maxWalletAmount,
        uint256 _cooldownPeriod,
        bool _antiBotEnabled
    ) external onlyGovernance {
        require(_cooldownPeriod >= MIN_COOLDOWN, "CloutX: Cooldown too short");

        antiBotConfig = AntiBotConfig({
            maxTxAmount: _maxTxAmount,
            maxWalletAmount: _maxWalletAmount,
            cooldownPeriod: _cooldownPeriod,
            antiBotEnabled: _antiBotEnabled
        });

        emit AntiBotConfigUpdated(_maxTxAmount, _maxWalletAmount, _cooldownPeriod, _antiBotEnabled);
    }

    /**
     * @dev Update reward pool address (governance only)
     * @param _rewardPool New reward pool address
     */
    function updateRewardPool(address _rewardPool) external onlyGovernance {
        require(_rewardPool != address(0), "CloutX: Invalid reward pool address");
        
        address oldPool = rewardPool;
        rewardPool = _rewardPool;
        
        // Update exclusions
        isExcludedFromTax[oldPool] = false;
        isExcludedFromLimits[oldPool] = false;
        isExcludedFromTax[_rewardPool] = true;
        isExcludedFromLimits[_rewardPool] = true;
        
        emit RewardPoolUpdated(oldPool, _rewardPool);
    }

    /**
     * @dev Update governance contract address (owner only)
     * @param _governanceContract New governance contract address
     */
    function updateGovernanceContract(address _governanceContract) external onlyOwner {
        address oldGov = governanceContract;
        governanceContract = _governanceContract;
        emit GovernanceContractUpdated(oldGov, _governanceContract);
    }

    /**
     * @dev Update staking contract address (governance only)
     * @param _stakingContract New staking contract address
     */
    function updateStakingContract(address _stakingContract) external onlyGovernance {
        address oldStaking = stakingContract;
        stakingContract = _stakingContract;
        emit StakingContractUpdated(oldStaking, _stakingContract);
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Exclude/include address from tax (governance only)
     * @param account Address to update
     * @param excluded Whether to exclude from tax
     */
    function setExcludedFromTax(address account, bool excluded) external onlyGovernance {
        isExcludedFromTax[account] = excluded;
        emit ExcludedFromTax(account, excluded);
    }

    /**
     * @dev Exclude/include address from limits (governance only)
     * @param account Address to update
     * @param excluded Whether to exclude from limits
     */
    function setExcludedFromLimits(address account, bool excluded) external onlyGovernance {
        isExcludedFromLimits[account] = excluded;
        emit ExcludedFromLimits(account, excluded);
    }

    /**
     * @dev Pause/unpause contract (governance only)
     * @param paused Whether to pause the contract
     */
    function setPaused(bool paused) external onlyGovernance {
        if (paused) {
            _pause();
        } else {
            _unpause();
        }
    }

    /**
     * @dev Mint tokens (staking contract only)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyStakingContract {
        _mint(to, amount);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get current tax configuration
     */
    function getTaxConfig() external view returns (TaxConfig memory) {
        return taxConfig;
    }

    /**
     * @dev Get current anti-bot configuration
     */
    function getAntiBotConfig() external view returns (AntiBotConfig memory) {
        return antiBotConfig;
    }

    /**
     * @dev Calculate tax amount for a given transaction
     * @param amount Transaction amount
     * @param isBuy Whether this is a buy transaction
     * @param isSell Whether this is a sell transaction
     */
    function calculateTax(
        uint256 amount,
        bool isBuy,
        bool isSell
    ) external view returns (uint256 taxAmount, uint256 burnAmount, uint256 rewardAmount) {
        uint256 taxRate;
        
        if (isBuy) {
            taxRate = taxConfig.buyTax;
        } else if (isSell) {
            taxRate = taxConfig.sellTax;
        } else {
            taxRate = taxConfig.transferTax;
        }
        
        taxAmount = amount.mul(taxRate).div(BASIS_POINTS);
        
        // Ensure tax doesn't exceed the transfer amount
        if (taxAmount > amount) {
            taxAmount = amount;
        }
        
        burnAmount = taxAmount.mul(taxConfig.burnRate).div(BASIS_POINTS);
        rewardAmount = taxAmount.mul(taxConfig.rewardRate).div(BASIS_POINTS);
    }

    // ============ UPGRADE FUNCTIONS ============
    
    /**
     * @dev Required by UUPS pattern
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Get current implementation version
     */
    function version() public pure returns (string memory) {
        return "1.0.0";
    }
} 