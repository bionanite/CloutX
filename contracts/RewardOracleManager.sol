// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./CloutXToken.sol";
import "./StakingPool.sol";

/**
 * @title RewardOracleManager
 * @dev Manages social mining rewards based on Oracle-fed social API data
 * 
 * Features:
 * - Distributes rewards based on social media activity
 * - Supports TikTok, X (Twitter), and Threads integration
 * - Influencer verification and impact scoring
 * - Boosted reward logic based on activity tiers
 * - Oracle-based data validation
 * 
 * @author CloutX Team
 */
contract RewardOracleManager is 
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeMath for uint256;

    // ============ STRUCTS ============
    
    struct SocialProfile {
        string platform;         // Platform name (tiktok, x, threads)
        string username;         // Social media username
        uint256 followers;       // Follower count
        uint256 engagement;      // Engagement rate (basis points)
        uint256 lastActivity;    // Last activity timestamp
        bool isVerified;         // Whether profile is verified
        uint256 impactScore;     // Calculated impact score
    }

    struct RewardTier {
        uint256 minFollowers;    // Minimum followers for tier
        uint256 minEngagement;   // Minimum engagement rate
        uint256 rewardMultiplier; // Reward multiplier (basis points)
        bool isActive;           // Whether tier is active
    }

    struct OracleData {
        address oracle;          // Oracle address
        bool isActive;           // Whether oracle is active
        uint256 lastUpdate;      // Last update timestamp
        uint256 updateCount;     // Number of updates
    }

    struct RewardClaim {
        address user;            // User address
        uint256 amount;          // Reward amount
        uint256 timestamp;       // Claim timestamp
        string platform;         // Platform that generated reward
        uint256 impactScore;     // Impact score at time of claim
    }

    // ============ STATE VARIABLES ============
    
    CloutXToken public cloutXToken;
    StakingPool public stakingPool;
    address public governanceContract;
    
    mapping(address => SocialProfile[]) public userProfiles;
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public lastRewardClaim;
    mapping(address => uint256) public cloutScore;
    mapping(address => bool) public isInfluencer;
    mapping(string => OracleData) public oracles;
    mapping(string => RewardTier[]) public rewardTiers;
    
    RewardClaim[] public rewardClaims;
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_REWARD_MULTIPLIER = 5000; // 50% max multiplier
    uint256 public constant MIN_UPDATE_INTERVAL = 3600; // 1 hour minimum
    uint256 public constant MAX_IMPACT_SCORE = 10000;
    
    uint256 public totalRewardsDistributed;
    uint256 public dailyRewardPool;
    uint256 public lastDailyReset;
    uint256 public rewardPoolSize;
    
    // ============ EVENTS ============
    
    event SocialProfileAdded(
        address indexed user,
        string platform,
        string username,
        uint256 followers,
        uint256 engagement
    );
    
    event SocialProfileUpdated(
        address indexed user,
        string platform,
        uint256 followers,
        uint256 engagement,
        uint256 impactScore
    );
    
    event RewardTierAdded(
        string indexed platform,
        uint256 indexed tierIndex,
        uint256 minFollowers,
        uint256 minEngagement,
        uint256 rewardMultiplier
    );
    
    event RewardTierUpdated(
        string indexed platform,
        uint256 indexed tierIndex,
        uint256 minFollowers,
        uint256 minEngagement,
        uint256 rewardMultiplier,
        bool isActive
    );
    
    event OracleRegistered(
        string indexed platform,
        address indexed oracle,
        bool isActive
    );
    
    event OracleDataUpdated(
        string indexed platform,
        address indexed user,
        uint256 followers,
        uint256 engagement,
        uint256 impactScore
    );
    
    event RewardsDistributed(
        address indexed user,
        uint256 amount,
        string platform,
        uint256 impactScore
    );
    
    event RewardClaimed(
        address indexed user,
        uint256 amount,
        string platform,
        uint256 impactScore
    );
    
    event DailyRewardPoolUpdated(uint256 newPoolSize);
    event CloutScoreUpdated(address indexed user, uint256 score);
    event InfluencerStatusUpdated(address indexed user, bool isInfluencer);

    // ============ MODIFIERS ============
    
    modifier onlyGovernance() {
        require(
            msg.sender == governanceContract || msg.sender == owner(),
            "RewardOracleManager: Only governance or owner"
        );
        _;
    }
    
    modifier onlyOracle(string memory platform) {
        require(
            oracles[platform].oracle == msg.sender && oracles[platform].isActive,
            "RewardOracleManager: Only authorized oracle"
        );
        _;
    }
    
    modifier validPlatform(string memory platform) {
        require(
            keccak256(bytes(platform)) == keccak256(bytes("tiktok")) ||
            keccak256(bytes(platform)) == keccak256(bytes("x")) ||
            keccak256(bytes(platform)) == keccak256(bytes("threads")),
            "RewardOracleManager: Invalid platform"
        );
        _;
    }

    // ============ INITIALIZATION ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the reward oracle manager
     * @param _cloutXToken CLX token address
     * @param _stakingPool Staking pool address
     * @param _owner Contract owner
     */
    function initialize(
        address _cloutXToken,
        address _stakingPool,
        address _owner
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        _transferOwnership(_owner);

        cloutXToken = CloutXToken(_cloutXToken);
        stakingPool = StakingPool(_stakingPool);
        lastDailyReset = block.timestamp;
        dailyRewardPool = 100000 * 10**18; // 100k CLX daily pool
        rewardPoolSize = dailyRewardPool;

        // Initialize default reward tiers for each platform
        _initializeDefaultTiers();
    }

    // ============ CORE FUNCTIONS ============
    
    /**
     * @dev Add social media profile for user
     * @param platform Social media platform
     * @param username Social media username
     * @param followers Follower count
     * @param engagement Engagement rate (basis points)
     */
    function addSocialProfile(
        string memory platform,
        string memory username,
        uint256 followers,
        uint256 engagement
    ) external validPlatform(platform) {
        require(bytes(username).length > 0, "RewardOracleManager: Invalid username");
        require(engagement <= BASIS_POINTS, "RewardOracleManager: Invalid engagement rate");

        // Check if profile already exists
        for (uint256 i = 0; i < userProfiles[msg.sender].length; i++) {
            require(
                keccak256(bytes(userProfiles[msg.sender][i].platform)) != keccak256(bytes(platform)),
                "RewardOracleManager: Profile already exists"
            );
        }

        SocialProfile memory newProfile = SocialProfile({
            platform: platform,
            username: username,
            followers: followers,
            engagement: engagement,
            lastActivity: block.timestamp,
            isVerified: false,
            impactScore: _calculateImpactScore(followers, engagement)
        });

        userProfiles[msg.sender].push(newProfile);
        _updateCloutScore(msg.sender);

        emit SocialProfileAdded(msg.sender, platform, username, followers, engagement);
    }

    /**
     * @dev Update social profile data (oracle only)
     * @param user User address
     * @param platform Social media platform
     * @param followers New follower count
     * @param engagement New engagement rate
     * @param isVerified Whether profile is verified
     */
    function updateSocialProfile(
        address user,
        string memory platform,
        uint256 followers,
        uint256 engagement,
        bool isVerified
    ) external onlyOracle(platform) {
        require(engagement <= BASIS_POINTS, "RewardOracleManager: Invalid engagement rate");

        bool profileFound = false;
        for (uint256 i = 0; i < userProfiles[user].length; i++) {
            if (keccak256(bytes(userProfiles[user][i].platform)) == keccak256(bytes(platform))) {
                userProfiles[user][i].followers = followers;
                userProfiles[user][i].engagement = engagement;
                userProfiles[user][i].lastActivity = block.timestamp;
                userProfiles[user][i].isVerified = isVerified;
                userProfiles[user][i].impactScore = _calculateImpactScore(followers, engagement);

                profileFound = true;
                break;
            }
        }

        require(profileFound, "RewardOracleManager: Profile not found");

        // Update oracle data
        oracles[platform].lastUpdate = block.timestamp;
        oracles[platform].updateCount = oracles[platform].updateCount.add(1);

        _updateCloutScore(user);
        _distributeRewards(user, platform);

        emit OracleDataUpdated(platform, user, followers, engagement, _calculateImpactScore(followers, engagement));
    }

    /**
     * @dev Claim rewards for user
     */
    function claimRewards() external nonReentrant whenNotPaused {
        uint256 totalReward = 0;
        string memory topPlatform = "";

        // Calculate rewards for each platform
        for (uint256 i = 0; i < userProfiles[msg.sender].length; i++) {
            SocialProfile storage profile = userProfiles[msg.sender][i];
            uint256 reward = _calculateReward(msg.sender, profile.platform);
            
            if (reward > totalReward) {
                totalReward = reward;
                topPlatform = profile.platform;
            }
        }

        require(totalReward > 0, "RewardOracleManager: No rewards to claim");
        require(
            block.timestamp >= lastRewardClaim[msg.sender].add(MIN_UPDATE_INTERVAL),
            "RewardOracleManager: Claim too frequent"
        );

        // Update claim timestamp
        lastRewardClaim[msg.sender] = block.timestamp;

        // Transfer rewards
        cloutXToken.transfer(msg.sender, totalReward);
        totalRewardsEarned[msg.sender] = totalRewardsEarned[msg.sender].add(totalReward);
        totalRewardsDistributed = totalRewardsDistributed.add(totalReward);

        // Record claim
        rewardClaims.push(RewardClaim({
            user: msg.sender,
            amount: totalReward,
            timestamp: block.timestamp,
            platform: topPlatform,
            impactScore: cloutScore[msg.sender]
        }));

        emit RewardClaimed(msg.sender, totalReward, topPlatform, cloutScore[msg.sender]);
    }

    // ============ REWARD CALCULATION FUNCTIONS ============
    
    /**
     * @dev Calculate reward for user on specific platform
     * @param user User address
     * @param platform Social media platform
     */
    function _calculateReward(address user, string memory platform) internal view returns (uint256) {
        SocialProfile memory profile = _getUserProfile(user, platform);
        if (profile.followers == 0) return 0;

        // Find applicable reward tier
        uint256 tierMultiplier = _getRewardTierMultiplier(platform, profile.followers, profile.engagement);
        
        // Base reward calculation
        uint256 baseReward = _calculateBaseReward(profile.followers, profile.engagement);
        
        // Apply tier multiplier
        uint256 totalReward = baseReward.mul(tierMultiplier).div(BASIS_POINTS);
        
        // Apply CloutScore bonus
        uint256 cloutScoreBonus = totalReward.mul(cloutScore[user]).div(MAX_IMPACT_SCORE);
        totalReward = totalReward.add(cloutScoreBonus);

        return totalReward;
    }

    /**
     * @dev Calculate base reward based on followers and engagement
     * @param followers Follower count
     * @param engagement Engagement rate
     */
    function _calculateBaseReward(uint256 followers, uint256 engagement) internal view returns (uint256) {
        // Logarithmic scaling for followers to prevent whale dominance
        uint256 followerScore = _logScale(followers);
        uint256 engagementScore = engagement;
        
        // Base reward formula: (follower_score * engagement_score) / 1000
        uint256 baseReward = followerScore.mul(engagementScore).div(1000);
        
        // Cap at daily pool size
        return baseReward > dailyRewardPool ? dailyRewardPool : baseReward;
    }

    /**
     * @dev Calculate impact score based on followers and engagement
     * @param followers Follower count
     * @param engagement Engagement rate
     */
    function _calculateImpactScore(uint256 followers, uint256 engagement) internal pure returns (uint256) {
        uint256 followerScore = _logScale(followers);
        uint256 engagementScore = engagement;
        
        // Impact score: (follower_score * engagement_score) / 100
        uint256 impactScore = followerScore.mul(engagementScore).div(100);
        
        return impactScore > MAX_IMPACT_SCORE ? MAX_IMPACT_SCORE : impactScore;
    }

    /**
     * @dev Logarithmic scaling for follower counts
     * @param value Raw follower count
     */
    function _logScale(uint256 value) internal pure returns (uint256) {
        if (value == 0) return 0;
        if (value < 1000) return value;
        if (value < 10000) return 1000 + (value - 1000) / 10;
        if (value < 100000) return 1900 + (value - 10000) / 100;
        if (value < 1000000) return 2800 + (value - 100000) / 1000;
        return 3700 + (value - 1000000) / 10000;
    }

    /**
     * @dev Get reward tier multiplier for platform
     * @param platform Social media platform
     * @param followers Follower count
     * @param engagement Engagement rate
     */
    function _getRewardTierMultiplier(
        string memory platform,
        uint256 followers,
        uint256 engagement
    ) internal view returns (uint256) {
        RewardTier[] storage tiers = rewardTiers[platform];
        
        for (uint256 i = tiers.length; i > 0; i--) {
            RewardTier storage tier = tiers[i - 1];
            if (tier.isActive && 
                followers >= tier.minFollowers && 
                engagement >= tier.minEngagement) {
                return tier.rewardMultiplier;
            }
        }
        
        return BASIS_POINTS; // 1x multiplier for base tier
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Get user profile for specific platform
     * @param user User address
     * @param platform Social media platform
     */
    function _getUserProfile(
        address user,
        string memory platform
    ) internal view returns (SocialProfile memory) {
        for (uint256 i = 0; i < userProfiles[user].length; i++) {
            if (keccak256(bytes(userProfiles[user][i].platform)) == keccak256(bytes(platform))) {
                return userProfiles[user][i];
            }
        }
        return SocialProfile("", "", 0, 0, 0, false, 0);
    }

    /**
     * @dev Update user's CloutScore
     * @param user User address
     */
    function _updateCloutScore(address user) internal {
        uint256 totalScore = 0;
        uint256 profileCount = 0;

        for (uint256 i = 0; i < userProfiles[user].length; i++) {
            if (userProfiles[user][i].isVerified) {
                totalScore = totalScore.add(userProfiles[user][i].impactScore);
                profileCount = profileCount.add(1);
            }
        }

        if (profileCount > 0) {
            cloutScore[user] = totalScore.div(profileCount);
            isInfluencer[user] = cloutScore[user] >= 5000; // 50% threshold
            
            // Update staking pool
            stakingPool.updateCloutScore(user, cloutScore[user], true);
        }

        emit CloutScoreUpdated(user, cloutScore[user]);
        emit InfluencerStatusUpdated(user, isInfluencer[user]);
    }

    /**
     * @dev Distribute rewards to user
     * @param user User address
     * @param platform Social media platform
     */
    function _distributeRewards(address user, string memory platform) internal {
        uint256 reward = _calculateReward(user, platform);
        if (reward > 0) {
            emit RewardsDistributed(user, reward, platform, cloutScore[user]);
        }
    }

    /**
     * @dev Initialize default reward tiers
     */
    function _initializeDefaultTiers() internal {
        string[3] memory platforms = ["tiktok", "x", "threads"];
        
        for (uint256 p = 0; p < platforms.length; p++) {
            string memory platform = platforms[p];
            
            // Bronze tier
            rewardTiers[platform].push(RewardTier({
                minFollowers: 1000,
                minEngagement: 500, // 5%
                rewardMultiplier: 1200, // 1.2x
                isActive: true
            }));
            
            // Silver tier
            rewardTiers[platform].push(RewardTier({
                minFollowers: 10000,
                minEngagement: 800, // 8%
                rewardMultiplier: 1500, // 1.5x
                isActive: true
            }));
            
            // Gold tier
            rewardTiers[platform].push(RewardTier({
                minFollowers: 100000,
                minEngagement: 1000, // 10%
                rewardMultiplier: 2000, // 2x
                isActive: true
            }));
            
            // Diamond tier
            rewardTiers[platform].push(RewardTier({
                minFollowers: 1000000,
                minEngagement: 1200, // 12%
                rewardMultiplier: 3000, // 3x
                isActive: true
            }));
        }
    }

    // ============ GOVERNANCE FUNCTIONS ============
    
    /**
     * @dev Add reward tier (governance only)
     * @param platform Social media platform
     * @param minFollowers Minimum followers required
     * @param minEngagement Minimum engagement rate
     * @param rewardMultiplier Reward multiplier
     */
    function addRewardTier(
        string memory platform,
        uint256 minFollowers,
        uint256 minEngagement,
        uint256 rewardMultiplier
    ) external onlyGovernance validPlatform(platform) {
        require(minEngagement <= BASIS_POINTS, "RewardOracleManager: Invalid engagement rate");
        require(rewardMultiplier <= MAX_REWARD_MULTIPLIER, "RewardOracleManager: Multiplier too high");

        rewardTiers[platform].push(RewardTier({
            minFollowers: minFollowers,
            minEngagement: minEngagement,
            rewardMultiplier: rewardMultiplier,
            isActive: true
        }));

        emit RewardTierAdded(platform, rewardTiers[platform].length - 1, minFollowers, minEngagement, rewardMultiplier);
    }

    /**
     * @dev Update reward tier (governance only)
     * @param platform Social media platform
     * @param tierIndex Tier index to update
     * @param minFollowers New minimum followers
     * @param minEngagement New minimum engagement
     * @param rewardMultiplier New reward multiplier
     * @param isActive Whether tier is active
     */
    function updateRewardTier(
        string memory platform,
        uint256 tierIndex,
        uint256 minFollowers,
        uint256 minEngagement,
        uint256 rewardMultiplier,
        bool isActive
    ) external onlyGovernance validPlatform(platform) {
        require(tierIndex < rewardTiers[platform].length, "RewardOracleManager: Invalid tier");
        require(minEngagement <= BASIS_POINTS, "RewardOracleManager: Invalid engagement rate");
        require(rewardMultiplier <= MAX_REWARD_MULTIPLIER, "RewardOracleManager: Multiplier too high");

        rewardTiers[platform][tierIndex] = RewardTier({
            minFollowers: minFollowers,
            minEngagement: minEngagement,
            rewardMultiplier: rewardMultiplier,
            isActive: isActive
        });

        emit RewardTierUpdated(platform, tierIndex, minFollowers, minEngagement, rewardMultiplier, isActive);
    }

    /**
     * @dev Register oracle for platform (governance only)
     * @param platform Social media platform
     * @param oracle Oracle address
     * @param isActive Whether oracle is active
     */
    function registerOracle(
        string memory platform,
        address oracle,
        bool isActive
    ) external onlyGovernance validPlatform(platform) {
        require(oracle != address(0), "RewardOracleManager: Invalid oracle address");

        oracles[platform] = OracleData({
            oracle: oracle,
            isActive: isActive,
            lastUpdate: 0,
            updateCount: 0
        });

        emit OracleRegistered(platform, oracle, isActive);
    }

    /**
     * @dev Update daily reward pool (governance only)
     * @param newPoolSize New daily reward pool size
     */
    function updateDailyRewardPool(uint256 newPoolSize) external onlyGovernance {
        dailyRewardPool = newPoolSize;
        rewardPoolSize = newPoolSize;
        emit DailyRewardPoolUpdated(newPoolSize);
    }

    /**
     * @dev Update governance contract (owner only)
     * @param _governanceContract New governance contract address
     */
    function updateGovernanceContract(address _governanceContract) external onlyOwner {
        governanceContract = _governanceContract;
    }

    /**
     * @dev Manually update CloutScore (governance only, for testing)
     * @param user User address
     * @param score New CloutScore
     * @param verified Whether user is verified
     */
    function updateCloutScore(address user, uint256 score, bool verified) external onlyGovernance {
        require(score <= MAX_IMPACT_SCORE, "RewardOracleManager: Score too high");
        
        cloutScore[user] = score;
        isInfluencer[user] = score >= 5000;
        
        // Update staking pool
        stakingPool.updateCloutScore(user, score, verified);
        
        emit CloutScoreUpdated(user, score);
        emit InfluencerStatusUpdated(user, isInfluencer[user]);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get user's social profiles
     * @param user User address
     */
    function getUserProfiles(address user) external view returns (SocialProfile[] memory) {
        return userProfiles[user];
    }

    /**
     * @dev Get user's CloutScore
     * @param user User address
     */
    function getCloutScore(address user) external view returns (uint256) {
        return cloutScore[user];
    }

    /**
     * @dev Get user's influencer status
     * @param user User address
     */
    function getInfluencerStatus(address user) external view returns (bool) {
        return isInfluencer[user];
    }

    /**
     * @dev Calculate reward for user (view function for testing)
     * @param user User address
     * @param platform Social media platform
     */
    function calculateReward(address user, string memory platform) external view returns (uint256) {
        return _calculateReward(user, platform);
    }

    /**
     * @dev Get reward tiers for platform
     * @param platform Social media platform
     */
    function getRewardTiers(string memory platform) external view returns (RewardTier[] memory) {
        return rewardTiers[platform];
    }

    /**
     * @dev Get oracle data for platform
     * @param platform Social media platform
     */
    function getOracleData(string memory platform) external view returns (OracleData memory) {
        return oracles[platform];
    }

    /**
     * @dev Get recent reward claims
     * @param limit Number of claims to return
     */
    function getRecentRewardClaims(uint256 limit) external view returns (RewardClaim[] memory) {
        uint256 count = limit > rewardClaims.length ? rewardClaims.length : limit;
        RewardClaim[] memory recentClaims = new RewardClaim[](count);
        
        for (uint256 i = 0; i < count; i++) {
            recentClaims[i] = rewardClaims[rewardClaims.length - 1 - i];
        }
        
        return recentClaims;
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