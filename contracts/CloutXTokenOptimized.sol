// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title CloutXTokenOptimized
 * @author CloutX Security Team
 * @notice PRODUCTION-READY CloutX (CLX) - Viral Deflationary Social-Fi Token
 * @dev Security-enhanced and gas-optimized version with comprehensive protections
 * 
 * Key Features:
 * - Deflationary tokenomics with configurable burn/reward rates
 * - Multi-tier tax system (buy/sell/transfer)
 * - Anti-bot and anti-MEV protection mechanisms
 * - DEX integration for accurate transaction type detection
 * - UUPS upgradeable with governance-controlled upgrades
 * - Gas-optimized with custom errors and storage packing
 * 
 * Security Improvements:
 * ✅ Custom errors for gas efficiency
 * ✅ Storage layout optimization
 * ✅ Enhanced input validation
 * ✅ Zero amount transfer protection
 * ✅ Enum-based transaction types
 * ✅ Comprehensive NatSpec documentation
 */
contract CloutXTokenOptimized is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ============ CUSTOM ERRORS (Gas Optimized) ============
    
    error TransferFromZeroAddress();
    error TransferToZeroAddress();
    error TransferZeroAmount();
    error InsufficientBalance();
    error TransferAmountExceedsMaximum();
    error WalletBalanceExceedsMaximum();
    error CooldownPeriodNotMet();
    error OnlyGovernanceOrOwner();
    error OnlyGovernance();
    error MEVProtectionActive();
    error InvalidAddress();
    error InvalidAmount();
    error TaxRateTooHigh();
    error InvalidBurnRewardSplit();
    error CooldownTooShort();
    error DEXAddressAlreadySet();
    error NotAuthorizedToUpgrade();

    // ============ ENUMS ============
    
    /// @dev Transaction types for gas-efficient event emission
    enum TransactionType {
        TRANSFER,
        BUY,
        SELL,
        TRANSFER_FROM
    }

    // ============ STRUCTS (Storage Optimized) ============
    
    /// @dev Tax configuration structure
    /// @param buyTax Tax rate for buy transactions (basis points)
    /// @param sellTax Tax rate for sell transactions (basis points)
    /// @param transferTax Tax rate for regular transfers (basis points)
    /// @param burnRate Percentage of tax burned (basis points)
    /// @param rewardRate Percentage of tax sent to rewards (basis points)
    struct TaxConfig {
        uint256 buyTax;
        uint256 sellTax;
        uint256 transferTax;
        uint256 burnRate;
        uint256 rewardRate;
    }

    /// @dev Anti-bot protection configuration
    /// @param maxTxAmount Maximum transaction amount allowed
    /// @param maxWalletAmount Maximum wallet balance allowed
    /// @param cooldownPeriod Minimum time between transactions (seconds)
    /// @param antiBotEnabled Whether anti-bot protection is active
    struct AntiBotConfig {
        uint256 maxTxAmount;
        uint256 maxWalletAmount;
        uint64 cooldownPeriod;
        bool antiBotEnabled;
    }

    /// @dev Packed address flags for gas optimization
    /// @param isDEXPair Whether address is a DEX pair
    /// @param isDEXRouter Whether address is a DEX router
    /// @param isExcludedFromTax Whether address is excluded from taxes
    /// @param isExcludedFromLimits Whether address is excluded from limits
    struct AddressFlags {
        bool isDEXPair;
        bool isDEXRouter;
        bool isExcludedFromTax;
        bool isExcludedFromLimits;
    }

    // ============ STATE VARIABLES (Optimized Layout) ============
    
    /// @dev Tax configuration
    TaxConfig public taxConfig;
    
    /// @dev Anti-bot configuration
    AntiBotConfig public antiBotConfig;
    
    /// @dev Contract addresses
    address public rewardPool;
    address public governanceContract;
    address public stakingContract;
    
    /// @dev Packed address flags for gas efficiency
    mapping(address => AddressFlags) public addressFlags;
    
    /// @dev Anti-bot tracking
    mapping(address => uint256) public lastTransactionTime;
    mapping(address => uint256) public lastBlockNumber;
    
    /// @dev Constants (immutable for gas savings)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_TAX_RATE = 1000; // 10% max
    uint64 public constant MIN_COOLDOWN = 30; // 30 seconds
    uint8 public constant MEV_PROTECTION_BLOCKS = 2;
    
    /// @dev Metrics tracking
    uint256 public totalBurned;
    uint256 public totalRewardsDistributed;

    // ============ EVENTS (Optimized) ============
    
    /// @dev Emitted when tax configuration is updated
    /// @param buyTax New buy tax rate
    /// @param sellTax New sell tax rate
    /// @param transferTax New transfer tax rate
    /// @param burnRate New burn rate
    /// @param rewardRate New reward rate
    event TaxConfigUpdated(
        uint256 buyTax,
        uint256 sellTax,
        uint256 transferTax,
        uint256 burnRate,
        uint256 rewardRate
    );
    
    /// @dev Emitted when anti-bot configuration is updated
    event AntiBotConfigUpdated(
        uint256 maxTxAmount,
        uint256 maxWalletAmount,
        uint64 cooldownPeriod,
        bool antiBotEnabled
    );
    
    /// @dev Emitted when tax is collected (gas-optimized with enum)
    /// @param from Sender address
    /// @param to Recipient address
    /// @param amount Original transfer amount
    /// @param burnAmount Amount burned
    /// @param rewardAmount Amount sent to rewards
    /// @param txType Transaction type enum
    event TaxCollected(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 burnAmount,
        uint256 rewardAmount,
        TransactionType txType
    );
    
    /// @dev Emitted when DEX pair status is updated
    event DEXPairUpdated(address indexed pair, bool isDEX);
    
    /// @dev Emitted when DEX router status is updated
    event DEXRouterUpdated(address indexed router, bool isDEX);
    
    /// @dev Emitted when MEV protection is triggered
    event MEVProtectionTriggered(address indexed account, uint256 blockNumber);

    // ============ MODIFIERS ============
    
    /// @dev Restricts access to governance contract or owner
    modifier onlyGovernance() {
        if (msg.sender != governanceContract && msg.sender != owner()) {
            revert OnlyGovernanceOrOwner();
        }
        _;
    }

    /// @dev Anti-MEV protection with gas-optimized checks
    modifier antiMEV() {
        if (!addressFlags[msg.sender].isExcludedFromLimits) {
            uint256 lastBlock = lastBlockNumber[msg.sender];
            if (lastBlock != 0 && block.number <= lastBlock + MEV_PROTECTION_BLOCKS) {
                revert MEVProtectionActive();
            }
            lastBlockNumber[msg.sender] = block.number;
            emit MEVProtectionTriggered(msg.sender, block.number);
        }
        _;
    }

    // ============ INITIALIZATION ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @dev Initializes the CloutX token contract
    /// @param _name Token name
    /// @param _symbol Token symbol
    /// @param _initialSupply Initial token supply (can be 0 for controlled minting)
    /// @param _owner Contract owner address
    /// @param _rewardPool Reward pool address
    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _owner,
        address _rewardPool
    ) external initializer {
        if (_owner == address(0) || _rewardPool == address(0)) {
            revert InvalidAddress();
        }

        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        _transferOwnership(_owner);

        // Initialize tax configuration
        taxConfig = TaxConfig({
            buyTax: 200,      // 2%
            sellTax: 200,     // 2%
            transferTax: 100, // 1%
            burnRate: 5000,   // 50%
            rewardRate: 5000  // 50%
        });

        // Initialize anti-bot configuration
        antiBotConfig = AntiBotConfig({
            maxTxAmount: _initialSupply > 0 ? _initialSupply / 100 : 10_000_000 * 10**18,
            maxWalletAmount: _initialSupply > 0 ? _initialSupply / 50 : 20_000_000 * 10**18,
            cooldownPeriod: 60,
            antiBotEnabled: true
        });

        rewardPool = _rewardPool;
        
        // Set exclusions for owner and reward pool
        addressFlags[_owner] = AddressFlags({
            isDEXPair: false,
            isDEXRouter: false,
            isExcludedFromTax: true,
            isExcludedFromLimits: true
        });
        
        addressFlags[_rewardPool] = AddressFlags({
            isDEXPair: false,
            isDEXRouter: false,
            isExcludedFromTax: true,
            isExcludedFromLimits: true
        });
        
        // Mint initial supply if specified
        if (_initialSupply > 0) {
            _mint(_owner, _initialSupply);
        }

        emit TaxConfigUpdated(
            taxConfig.buyTax,
            taxConfig.sellTax,
            taxConfig.transferTax,
            taxConfig.burnRate,
            taxConfig.rewardRate
        );
    }

    // ============ CORE TRANSFER FUNCTIONS (Security Fixed) ============
    
    /// @dev Enhanced transfer function with comprehensive protection
    /// @param to Recipient address
    /// @param amount Transfer amount
    /// @return success Whether the transfer succeeded
    function transfer(
        address to, 
        uint256 amount
    ) 
        public 
        virtual 
        override 
        whenNotPaused 
        nonReentrant 
        antiMEV
        returns (bool success) 
    {
        _validateTransfer(msg.sender, to, amount);
        
        uint256 taxAmount = _calculateTaxAmount(msg.sender, to, amount);
        
        if (taxAmount > 0) {
            TransactionType txType = _getTransactionType(msg.sender, to);
            _processTax(msg.sender, to, taxAmount, txType);
            
            unchecked {
                uint256 netAmount = amount - taxAmount;
                return super.transfer(to, netAmount);
            }
        } else {
            return super.transfer(to, amount);
        }
    }

    /// @dev Enhanced transferFrom function with comprehensive protection
    /// @param from Sender address
    /// @param to Recipient address
    /// @param amount Transfer amount
    /// @return success Whether the transfer succeeded
    function transferFrom(
        address from,
        address to,
        uint256 amount
    )
        public
        virtual
        override
        whenNotPaused
        nonReentrant
        antiMEV
        returns (bool success)
    {
        _validateTransfer(from, to, amount);
        
        uint256 taxAmount = _calculateTaxAmount(from, to, amount);
        
        if (taxAmount > 0) {
            _processTax(from, to, taxAmount, TransactionType.TRANSFER_FROM);
            
            unchecked {
                uint256 netAmount = amount - taxAmount;
                return super.transferFrom(from, to, netAmount);
            }
        } else {
            return super.transferFrom(from, to, amount);
        }
    }

    // ============ INTERNAL FUNCTIONS (Optimized) ============
    
    /// @dev Validates transfer parameters and anti-bot restrictions
    /// @param from Sender address
    /// @param to Recipient address
    /// @param amount Transfer amount
    function _validateTransfer(
        address from, 
        address to, 
        uint256 amount
    ) internal view {
        if (from == address(0)) revert TransferFromZeroAddress();
        if (to == address(0)) revert TransferToZeroAddress();
        if (amount == 0) revert TransferZeroAmount();

        // Anti-bot protection checks
        if (antiBotConfig.antiBotEnabled) {
            AddressFlags memory fromFlags = addressFlags[from];
            AddressFlags memory toFlags = addressFlags[to];
            
            if (!fromFlags.isExcludedFromLimits && !toFlags.isExcludedFromLimits) {
                if (amount > antiBotConfig.maxTxAmount) {
                    revert TransferAmountExceedsMaximum();
                }
            }

            if (!toFlags.isExcludedFromLimits) {
                unchecked {
                    if (balanceOf(to) + amount > antiBotConfig.maxWalletAmount) {
                        revert WalletBalanceExceedsMaximum();
                    }
                }
            }

            if (!fromFlags.isExcludedFromLimits) {
                unchecked {
                    if (block.timestamp < lastTransactionTime[from] + antiBotConfig.cooldownPeriod) {
                        revert CooldownPeriodNotMet();
                    }
                }
                lastTransactionTime[from] = block.timestamp;
            }
        }
    }

    /// @dev Calculates tax amount based on transaction type
    /// @param from Sender address
    /// @param to Recipient address
    /// @param amount Transfer amount
    /// @return taxAmount Calculated tax amount
    function _calculateTaxAmount(
        address from,
        address to,
        uint256 amount
    ) internal view returns (uint256 taxAmount) {
        AddressFlags memory fromFlags = addressFlags[from];
        AddressFlags memory toFlags = addressFlags[to];
        
        // Skip tax for excluded addresses
        if (fromFlags.isExcludedFromTax || toFlags.isExcludedFromTax) {
            return 0;
        }

        uint256 taxRate;
        
        // Determine tax rate based on transaction type
        if (fromFlags.isDEXPair || fromFlags.isDEXRouter) {
            taxRate = taxConfig.buyTax; // Buy transaction
        } else if (toFlags.isDEXPair || toFlags.isDEXRouter) {
            taxRate = taxConfig.sellTax; // Sell transaction
        } else {
            taxRate = taxConfig.transferTax; // Regular transfer
        }
        
        unchecked {
            taxAmount = (amount * taxRate) / BASIS_POINTS;
        }
    }

    /// @dev Determines transaction type for event emission
    /// @param from Sender address
    /// @param to Recipient address
    /// @return txType Transaction type enum
    function _getTransactionType(
        address from,
        address to
    ) internal view returns (TransactionType txType) {
        AddressFlags memory fromFlags = addressFlags[from];
        AddressFlags memory toFlags = addressFlags[to];
        
        if (fromFlags.isDEXPair || fromFlags.isDEXRouter) {
            return TransactionType.BUY;
        } else if (toFlags.isDEXPair || toFlags.isDEXRouter) {
            return TransactionType.SELL;
        } else {
            return TransactionType.TRANSFER;
        }
    }

    /// @dev Processes tax by burning and distributing to reward pool
    /// @param from Sender address
    /// @param to Recipient address
    /// @param taxAmount Tax amount to process
    /// @param txType Transaction type for event emission
    function _processTax(
        address from,
        address to,
        uint256 taxAmount,
        TransactionType txType
    ) internal {
        uint256 burnAmount;
        uint256 rewardAmount;
        
        unchecked {
            burnAmount = (taxAmount * taxConfig.burnRate) / BASIS_POINTS;
            rewardAmount = (taxAmount * taxConfig.rewardRate) / BASIS_POINTS;
        }

        // Transfer tax amount to contract first
        super._transfer(from, address(this), taxAmount);

        // Burn tokens
        if (burnAmount > 0) {
            _burn(address(this), burnAmount);
            totalBurned += burnAmount;
        }

        // Send rewards to pool
        if (rewardAmount > 0 && rewardPool != address(0)) {
            super._transfer(address(this), rewardPool, rewardAmount);
            totalRewardsDistributed += rewardAmount;
        }

        emit TaxCollected(from, to, taxAmount, burnAmount, rewardAmount, txType);
    }

    // ============ GOVERNANCE FUNCTIONS ============
    
    /// @dev Updates DEX pair status
    /// @param pair DEX pair address
    /// @param isDEX Whether address is a DEX pair
    function setDEXPair(address pair, bool isDEX) external onlyGovernance {
        if (pair == address(0)) revert InvalidAddress();
        if (addressFlags[pair].isDEXPair == isDEX) revert DEXAddressAlreadySet();
        
        addressFlags[pair].isDEXPair = isDEX;
        emit DEXPairUpdated(pair, isDEX);
    }

    /// @dev Updates DEX router status
    /// @param router DEX router address
    /// @param isDEX Whether address is a DEX router
    function setDEXRouter(address router, bool isDEX) external onlyGovernance {
        if (router == address(0)) revert InvalidAddress();
        if (addressFlags[router].isDEXRouter == isDEX) revert DEXAddressAlreadySet();
        
        addressFlags[router].isDEXRouter = isDEX;
        emit DEXRouterUpdated(router, isDEX);
    }

    /// @dev Updates tax configuration
    /// @param _buyTax Buy tax rate in basis points
    /// @param _sellTax Sell tax rate in basis points
    /// @param _transferTax Transfer tax rate in basis points
    /// @param _burnRate Burn rate in basis points
    /// @param _rewardRate Reward rate in basis points
    function updateTaxConfig(
        uint256 _buyTax,
        uint256 _sellTax,
        uint256 _transferTax,
        uint256 _burnRate,
        uint256 _rewardRate
    ) external onlyGovernance {
        if (_buyTax > MAX_TAX_RATE || _sellTax > MAX_TAX_RATE || _transferTax > MAX_TAX_RATE) {
            revert TaxRateTooHigh();
        }
        if (_burnRate + _rewardRate != BASIS_POINTS) {
            revert InvalidBurnRewardSplit();
        }
        
        taxConfig = TaxConfig({
            buyTax: _buyTax,
            sellTax: _sellTax,
            transferTax: _transferTax,
            burnRate: _burnRate,
            rewardRate: _rewardRate
        });
        
        emit TaxConfigUpdated(_buyTax, _sellTax, _transferTax, _burnRate, _rewardRate);
    }

    /// @dev Updates anti-bot configuration
    /// @param _maxTxAmount Maximum transaction amount
    /// @param _maxWalletAmount Maximum wallet amount
    /// @param _cooldownPeriod Cooldown period in seconds
    /// @param _antiBotEnabled Whether anti-bot protection is active
    function updateAntiBotConfig(
        uint256 _maxTxAmount,
        uint256 _maxWalletAmount,
        uint64 _cooldownPeriod,
        bool _antiBotEnabled
    ) external onlyGovernance {
        if (_cooldownPeriod < MIN_COOLDOWN) revert CooldownTooShort();
        if (_maxTxAmount == 0 || _maxWalletAmount == 0) revert InvalidAmount();
        
        antiBotConfig = AntiBotConfig({
            maxTxAmount: _maxTxAmount,
            maxWalletAmount: _maxWalletAmount,
            cooldownPeriod: _cooldownPeriod,
            antiBotEnabled: _antiBotEnabled
        });
        
        emit AntiBotConfigUpdated(_maxTxAmount, _maxWalletAmount, _cooldownPeriod, _antiBotEnabled);
    }

    /// @dev Sets tax exclusion status for an address
    /// @param account Address to update
    /// @param excluded Whether to exclude from tax
    function setExcludedFromTax(address account, bool excluded) external onlyGovernance {
        if (account == address(0)) revert InvalidAddress();
        addressFlags[account].isExcludedFromTax = excluded;
    }

    /// @dev Sets limit exclusion status for an address
    /// @param account Address to update
    /// @param excluded Whether to exclude from limits
    function setExcludedFromLimits(address account, bool excluded) external onlyGovernance {
        if (account == address(0)) revert InvalidAddress();
        addressFlags[account].isExcludedFromLimits = excluded;
    }

    /// @dev Updates governance contract address
    /// @param _governanceContract New governance contract address
    function updateGovernanceContract(address _governanceContract) external onlyOwner {
        governanceContract = _governanceContract;
    }

    /// @dev Updates staking contract address
    /// @param _stakingContract New staking contract address
    function updateStakingContract(address _stakingContract) external onlyGovernance {
        stakingContract = _stakingContract;
    }

    /// @dev Updates reward pool address
    /// @param _rewardPool New reward pool address
    function updateRewardPool(address _rewardPool) external onlyGovernance {
        if (_rewardPool == address(0)) revert InvalidAddress();
        rewardPool = _rewardPool;
    }

    /// @dev Mints tokens (owner only for controlled distribution)
    /// @param to Recipient address
    /// @param amount Amount to mint
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        _mint(to, amount);
    }

    /// @dev Pauses all token transfers
    function pause() external onlyGovernance {
        _pause();
    }

    /// @dev Unpauses token transfers
    function unpause() external onlyGovernance {
        _unpause();
    }

    // ============ VIEW FUNCTIONS ============
    
    /// @dev Returns current tax configuration
    /// @return Tax configuration struct
    function getTaxConfig() external view returns (TaxConfig memory) {
        return taxConfig;
    }

    /// @dev Returns current anti-bot configuration
    /// @return Anti-bot configuration struct
    function getAntiBotConfig() external view returns (AntiBotConfig memory) {
        return antiBotConfig;
    }

    /// @dev Returns address flags for an address
    /// @param account Address to query
    /// @return Address flags struct
    function getAddressFlags(address account) external view returns (AddressFlags memory) {
        return addressFlags[account];
    }

    /// @dev Calculates tax amounts for a given transfer
    /// @param amount Transfer amount
    /// @param isBuy Whether this is a buy transaction
    /// @param isSell Whether this is a sell transaction
    /// @return taxAmount Total tax amount
    /// @return burnAmount Amount to be burned
    /// @return rewardAmount Amount to be sent to rewards
    function calculateTax(
        uint256 amount,
        bool isBuy,
        bool isSell
    ) external view returns (
        uint256 taxAmount, 
        uint256 burnAmount, 
        uint256 rewardAmount
    ) {
        uint256 taxRate;
        
        if (isBuy) {
            taxRate = taxConfig.buyTax;
        } else if (isSell) {
            taxRate = taxConfig.sellTax;
        } else {
            taxRate = taxConfig.transferTax;
        }
        
        unchecked {
            taxAmount = (amount * taxRate) / BASIS_POINTS;
            burnAmount = (taxAmount * taxConfig.burnRate) / BASIS_POINTS;
            rewardAmount = (taxAmount * taxConfig.rewardRate) / BASIS_POINTS;
        }
    }

    /// @dev Checks if an address is a DEX address (pair or router)
    /// @param addr Address to check
    /// @return isDEX Whether the address is a DEX address
    function isDEXAddress(address addr) external view returns (bool isDEX) {
        AddressFlags memory flags = addressFlags[addr];
        return flags.isDEXPair || flags.isDEXRouter;
    }

    // ============ UPGRADE FUNCTIONS ============
    
    /// @dev Authorizes contract upgrades (governance controlled)
    /// @param newImplementation New implementation address
    function _authorizeUpgrade(address newImplementation) internal override {
        if (msg.sender != governanceContract && 
           (msg.sender != owner() || governanceContract != address(0))) {
            revert NotAuthorizedToUpgrade();
        }
    }

    /// @dev Returns the current contract version
    /// @return version Version string
    function version() external pure returns (string memory) {
        return "3.0.0-Optimized";
    }
} 