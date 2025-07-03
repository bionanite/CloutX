// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./CloutXToken.sol";

/**
 * @title StakingPool
 * @dev CloutX Staking Pool with tiered staking, loyalty multipliers, and auto-compounding
 * 
 * Features:
 * - Tiered staking periods (30/60/90/180 days) with variable APY
 * - Loyalty multipliers based on wallet age and CloutScore
 * - Auto-compounding optional mode
 * - Emergency unstake with penalties
 * - Governance integration for parameter updates
 * 
 * @author CloutX Team
 */
contract StakingPool is 
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeMath for uint256;

    // ============ STRUCTS ============
    
    struct StakingTier {
        uint256 lockPeriod;      // Lock period in seconds
        uint256 baseAPY;         // Base APY in basis points (10000 = 100%)
        uint256 maxStakeAmount;  // Maximum stake amount for this tier
        bool isActive;           // Whether tier is active
    }

    struct Stake {
        uint256 amount;          // Staked amount
        uint256 startTime;       // Stake start time
        uint256 lockEndTime;     // Lock end time
        uint256 tierIndex;       // Staking tier index
        uint256 loyaltyMultiplier; // Loyalty multiplier in basis points
        bool autoCompound;       // Whether auto-compound is enabled
        uint256 lastClaimTime;   // Last claim time for rewards
        uint256 accumulatedRewards; // Accumulated rewards
    }

    struct CloutScore {
        uint256 score;           // CloutScore (0-10000)
        uint256 lastUpdateTime;  // Last update time
        bool isVerified;         // Whether score is verified
    }

    // ============ STATE VARIABLES ============
    
    CloutXToken public cloutXToken;
    address public rewardOracleManager;
    address public governanceContract;
    
    StakingTier[] public stakingTiers;
    mapping(address => Stake[]) public userStakes;
    mapping(address => CloutScore) public cloutScores;
    mapping(address => uint256) public walletAge;
    mapping(address => uint256) public totalStaked;
    mapping(address => uint256) public totalRewardsEarned;
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_APY = 5000; // 50% max APY
    uint256 public constant MIN_LOCK_PERIOD = 30 days;
    uint256 public constant MAX_LOCK_PERIOD = 365 days;
    uint256 public constant EMERGENCY_PENALTY = 2500; // 25% penalty
    uint256 public constant LOYALTY_MULTIPLIER_CAP = 2000; // 20% max bonus
    
    uint256 public totalStakedAmount;
    uint256 public totalRewardsDistributed;
    uint256 public stakingStartTime;
    
    // ============ EVENTS ============
    
    event StakingTierAdded(
        uint256 indexed tierIndex,
        uint256 lockPeriod,
        uint256 baseAPY,
        uint256 maxStakeAmount
    );
    
    event StakingTierUpdated(
        uint256 indexed tierIndex,
        uint256 lockPeriod,
        uint256 baseAPY,
        uint256 maxStakeAmount,
        bool isActive
    );
    
    event Staked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 tierIndex,
        uint256 lockEndTime,
        bool autoCompound
    );
    
    event Unstaked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 rewards,
        bool isEmergency
    );
    
    event RewardsClaimed(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount
    );
    
    event AutoCompoundToggled(
        address indexed user,
        uint256 indexed stakeId,
        bool enabled
    );
    
    event CloutScoreUpdated(
        address indexed user,
        uint256 score,
        bool isVerified
    );
    
    event WalletAgeUpdated(address indexed user, uint256 age);

    // ============ MODIFIERS ============
    
    modifier onlyGovernance() {
        require(
            msg.sender == governanceContract || msg.sender == owner(),
            "StakingPool: Only governance or owner"
        );
        _;
    }
    
    modifier onlyRewardOracle() {
        require(
            msg.sender == rewardOracleManager,
            "StakingPool: Only reward oracle manager"
        );
        _;
    }
    
    modifier validTier(uint256 tierIndex) {
        require(tierIndex < stakingTiers.length, "StakingPool: Invalid tier");
        require(stakingTiers[tierIndex].isActive, "StakingPool: Tier inactive");
        _;
    }

    // ============ INITIALIZATION ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the staking pool
     * @param _cloutXToken CLX token address
     * @param _owner Contract owner
     */
    function initialize(
        address _cloutXToken,
        address _owner
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        _transferOwnership(_owner);

        cloutXToken = CloutXToken(_cloutXToken);
        stakingStartTime = block.timestamp;

        // Initialize default staking tiers
        _addStakingTier(30 days, 800, 1000000 * 10**18);   // 8% APY, 1M tokens max
        _addStakingTier(60 days, 1200, 2000000 * 10**18);  // 12% APY, 2M tokens max
        _addStakingTier(90 days, 1600, 5000000 * 10**18);  // 16% APY, 5M tokens max
        _addStakingTier(180 days, 2400, 10000000 * 10**18); // 24% APY, 10M tokens max
    }

    // ============ CORE STAKING FUNCTIONS ============
    
    /**
     * @dev Stake CLX tokens
     * @param amount Amount to stake
     * @param tierIndex Staking tier index
     * @param autoCompound Whether to enable auto-compounding
     */
    function stake(
        uint256 amount,
        uint256 tierIndex,
        bool autoCompound
    ) external nonReentrant whenNotPaused validTier(tierIndex) {
        require(amount > 0, "StakingPool: Amount must be greater than 0");
        require(
            amount <= stakingTiers[tierIndex].maxStakeAmount,
            "StakingPool: Amount exceeds tier maximum"
        );

        // Transfer tokens from user
        cloutXToken.transferFrom(msg.sender, address(this), amount);

        // Calculate lock end time
        uint256 lockEndTime = block.timestamp.add(stakingTiers[tierIndex].lockPeriod);
        
        // Calculate loyalty multiplier
        uint256 loyaltyMultiplier = _calculateLoyaltyMultiplier(msg.sender);

        // Create stake
        Stake memory newStake = Stake({
            amount: amount,
            startTime: block.timestamp,
            lockEndTime: lockEndTime,
            tierIndex: tierIndex,
            loyaltyMultiplier: loyaltyMultiplier,
            autoCompound: autoCompound,
            lastClaimTime: block.timestamp,
            accumulatedRewards: 0
        });

        userStakes[msg.sender].push(newStake);
        uint256 stakeId = userStakes[msg.sender].length - 1;

        // Update totals
        totalStaked[msg.sender] = totalStaked[msg.sender].add(amount);
        totalStakedAmount = totalStakedAmount.add(amount);

        emit Staked(
            msg.sender,
            stakeId,
            amount,
            tierIndex,
            lockEndTime,
            autoCompound
        );
    }

    /**
     * @dev Unstake tokens after lock period
     * @param stakeId Stake ID to unstake
     */
    function unstake(uint256 stakeId) external nonReentrant whenNotPaused {
        require(stakeId < userStakes[msg.sender].length, "StakingPool: Invalid stake ID");
        
        Stake storage userStake = userStakes[msg.sender][stakeId];
        require(userStake.amount > 0, "StakingPool: Already unstaked");
        require(
            block.timestamp >= userStake.lockEndTime,
            "StakingPool: Lock period not ended"
        );

        uint256 amount = userStake.amount;
        uint256 rewards = _calculateRewards(msg.sender, stakeId);
        uint256 totalAmount = amount.add(rewards);

        // Clear stake
        userStake.amount = 0;
        userStake.accumulatedRewards = 0;

        // Update totals
        totalStaked[msg.sender] = totalStaked[msg.sender].sub(amount);
        totalStakedAmount = totalStakedAmount.sub(amount);
        totalRewardsEarned[msg.sender] = totalRewardsEarned[msg.sender].add(rewards);
        totalRewardsDistributed = totalRewardsDistributed.add(rewards);

        // Transfer tokens back to user
        cloutXToken.transfer(msg.sender, totalAmount);

        emit Unstaked(msg.sender, stakeId, amount, rewards, false);
    }

    /**
     * @dev Emergency unstake with penalty
     * @param stakeId Stake ID to emergency unstake
     */
    function emergencyUnstake(uint256 stakeId) external nonReentrant whenNotPaused {
        require(stakeId < userStakes[msg.sender].length, "StakingPool: Invalid stake ID");
        
        Stake storage userStake = userStakes[msg.sender][stakeId];
        require(userStake.amount > 0, "StakingPool: Already unstaked");
        require(
            block.timestamp < userStake.lockEndTime,
            "StakingPool: Use regular unstake"
        );

        uint256 amount = userStake.amount;
        uint256 penalty = amount.mul(EMERGENCY_PENALTY).div(BASIS_POINTS);
        uint256 returnAmount = amount.sub(penalty);

        // Clear stake
        userStake.amount = 0;
        userStake.accumulatedRewards = 0;

        // Update totals
        totalStaked[msg.sender] = totalStaked[msg.sender].sub(amount);
        totalStakedAmount = totalStakedAmount.sub(amount);

        // Transfer tokens back to user (minus penalty)
        cloutXToken.transfer(msg.sender, returnAmount);

        emit Unstaked(msg.sender, stakeId, returnAmount, penalty, true);
    }

    /**
     * @dev Claim rewards for a specific stake
     * @param stakeId Stake ID to claim rewards for
     */
    function claimRewards(uint256 stakeId) external nonReentrant whenNotPaused {
        require(stakeId < userStakes[msg.sender].length, "StakingPool: Invalid stake ID");
        
        Stake storage userStake = userStakes[msg.sender][stakeId];
        require(userStake.amount > 0, "StakingPool: Stake not active");

        uint256 rewards = _calculateRewards(msg.sender, stakeId);
        require(rewards > 0, "StakingPool: No rewards to claim");

        // Update last claim time
        userStake.lastClaimTime = block.timestamp;
        userStake.accumulatedRewards = 0;

        // Update totals
        totalRewardsEarned[msg.sender] = totalRewardsEarned[msg.sender].add(rewards);
        totalRewardsDistributed = totalRewardsDistributed.add(rewards);

        // Transfer rewards
        cloutXToken.transfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, stakeId, rewards);
    }

    /**
     * @dev Toggle auto-compound for a stake
     * @param stakeId Stake ID to toggle auto-compound
     */
    function toggleAutoCompound(uint256 stakeId) external whenNotPaused {
        require(stakeId < userStakes[msg.sender].length, "StakingPool: Invalid stake ID");
        
        Stake storage userStake = userStakes[msg.sender][stakeId];
        require(userStake.amount > 0, "StakingPool: Stake not active");

        userStake.autoCompound = !userStake.autoCompound;
        
        emit AutoCompoundToggled(msg.sender, stakeId, userStake.autoCompound);
    }

    // ============ REWARD CALCULATION FUNCTIONS ============
    
    /**
     * @dev Calculate rewards for a specific stake
     * @param user User address
     * @param stakeId Stake ID
     */
    function _calculateRewards(address user, uint256 stakeId) internal view returns (uint256) {
        Stake storage userStake = userStakes[user][stakeId];
        if (userStake.amount == 0) return 0;

        uint256 timeStaked = block.timestamp.sub(userStake.lastClaimTime);
        if (timeStaked == 0) return 0;

        // Get tier APY
        uint256 baseAPY = stakingTiers[userStake.tierIndex].baseAPY;
        
        // Apply loyalty multiplier
        uint256 effectiveAPY = baseAPY.add(
            baseAPY.mul(userStake.loyaltyMultiplier).div(BASIS_POINTS)
        );

        // Calculate rewards
        uint256 rewards = userStake.amount
            .mul(effectiveAPY)
            .mul(timeStaked)
            .div(BASIS_POINTS)
            .div(365 days);

        return rewards;
    }

    /**
     * @dev Calculate loyalty multiplier based on wallet age and CloutScore
     * @param user User address
     */
    function _calculateLoyaltyMultiplier(address user) internal view returns (uint256) {
        uint256 walletAgeMultiplier = _calculateWalletAgeMultiplier(user);
        uint256 cloutScoreMultiplier = _calculateCloutScoreMultiplier(user);
        
        // Combine multipliers (capped at LOYALTY_MULTIPLIER_CAP)
        uint256 totalMultiplier = walletAgeMultiplier.add(cloutScoreMultiplier);
        return totalMultiplier > LOYALTY_MULTIPLIER_CAP ? LOYALTY_MULTIPLIER_CAP : totalMultiplier;
    }

    /**
     * @dev Calculate wallet age multiplier
     * @param user User address
     */
    function _calculateWalletAgeMultiplier(address user) internal view returns (uint256) {
        uint256 age = walletAge[user];
        if (age < 30 days) return 0;
        if (age < 90 days) return 200;  // 2%
        if (age < 180 days) return 500; // 5%
        if (age < 365 days) return 800; // 8%
        return 1000; // 10%
    }

    /**
     * @dev Calculate CloutScore multiplier
     * @param user User address
     */
    function _calculateCloutScoreMultiplier(address user) internal view returns (uint256) {
        CloutScore storage score = cloutScores[user];
        if (!score.isVerified) return 0;
        
        // CloutScore ranges from 0-10000, convert to 0-10% multiplier
        return score.score.div(1000); // 1000 basis points = 10%
    }

    // ============ ORACLE INTEGRATION FUNCTIONS ============
    
    /**
     * @dev Update CloutScore (reward oracle only)
     * @param user User address
     * @param score New CloutScore
     * @param isVerified Whether score is verified
     */
    function updateCloutScore(
        address user,
        uint256 score,
        bool isVerified
    ) external onlyRewardOracle {
        require(score <= 10000, "StakingPool: Invalid CloutScore");
        
        cloutScores[user] = CloutScore({
            score: score,
            lastUpdateTime: block.timestamp,
            isVerified: isVerified
        });

        emit CloutScoreUpdated(user, score, isVerified);
    }

    /**
     * @dev Update wallet age (reward oracle only)
     * @param user User address
     * @param age Wallet age in seconds
     */
    function updateWalletAge(address user, uint256 age) external onlyRewardOracle {
        walletAge[user] = age;
        emit WalletAgeUpdated(user, age);
    }

    // ============ GOVERNANCE FUNCTIONS ============
    
    /**
     * @dev Add new staking tier (governance only)
     * @param lockPeriod Lock period in seconds
     * @param baseAPY Base APY in basis points
     * @param maxStakeAmount Maximum stake amount
     */
    function addStakingTier(
        uint256 lockPeriod,
        uint256 baseAPY,
        uint256 maxStakeAmount
    ) external onlyGovernance {
        require(lockPeriod >= MIN_LOCK_PERIOD, "StakingPool: Lock period too short");
        require(lockPeriod <= MAX_LOCK_PERIOD, "StakingPool: Lock period too long");
        require(baseAPY <= MAX_APY, "StakingPool: APY too high");
        require(maxStakeAmount > 0, "StakingPool: Invalid max stake amount");

        _addStakingTier(lockPeriod, baseAPY, maxStakeAmount);
    }

    /**
     * @dev Update existing staking tier (governance only)
     * @param tierIndex Tier index to update
     * @param lockPeriod New lock period
     * @param baseAPY New base APY
     * @param maxStakeAmount New max stake amount
     * @param isActive Whether tier is active
     */
    function updateStakingTier(
        uint256 tierIndex,
        uint256 lockPeriod,
        uint256 baseAPY,
        uint256 maxStakeAmount,
        bool isActive
    ) external onlyGovernance {
        require(tierIndex < stakingTiers.length, "StakingPool: Invalid tier");
        require(lockPeriod >= MIN_LOCK_PERIOD, "StakingPool: Lock period too short");
        require(lockPeriod <= MAX_LOCK_PERIOD, "StakingPool: Lock period too long");
        require(baseAPY <= MAX_APY, "StakingPool: APY too high");

        stakingTiers[tierIndex] = StakingTier({
            lockPeriod: lockPeriod,
            baseAPY: baseAPY,
            maxStakeAmount: maxStakeAmount,
            isActive: isActive
        });

        emit StakingTierUpdated(tierIndex, lockPeriod, baseAPY, maxStakeAmount, isActive);
    }

    /**
     * @dev Update reward oracle manager (governance only)
     * @param _rewardOracleManager New oracle manager address
     */
    function updateRewardOracleManager(address _rewardOracleManager) external onlyGovernance {
        require(_rewardOracleManager != address(0), "StakingPool: Invalid oracle address");
        rewardOracleManager = _rewardOracleManager;
    }

    /**
     * @dev Update governance contract (owner only)
     * @param _governanceContract New governance contract address
     */
    function updateGovernanceContract(address _governanceContract) external onlyOwner {
        governanceContract = _governanceContract;
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Add staking tier internally
     */
    function _addStakingTier(
        uint256 lockPeriod,
        uint256 baseAPY,
        uint256 maxStakeAmount
    ) internal {
        stakingTiers.push(StakingTier({
            lockPeriod: lockPeriod,
            baseAPY: baseAPY,
            maxStakeAmount: maxStakeAmount,
            isActive: true
        }));

        emit StakingTierAdded(stakingTiers.length - 1, lockPeriod, baseAPY, maxStakeAmount);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get user's stakes
     * @param user User address
     */
    function getUserStakes(address user) external view returns (Stake[] memory) {
        return userStakes[user];
    }

    /**
     * @dev Get user's total rewards
     * @param user User address
     */
    function getUserTotalRewards(address user) external view returns (uint256) {
        uint256 totalRewards = 0;
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            if (userStakes[user][i].amount > 0) {
                totalRewards = totalRewards.add(_calculateRewards(user, i));
            }
        }
        return totalRewards;
    }

    /**
     * @dev Get all staking tiers
     */
    function getAllStakingTiers() external view returns (StakingTier[] memory) {
        return stakingTiers;
    }

    /**
     * @dev Get user's CloutScore
     * @param user User address
     */
    function getCloutScore(address user) external view returns (CloutScore memory) {
        return cloutScores[user];
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