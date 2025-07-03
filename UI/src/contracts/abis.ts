// CloutX Token ABI (key functions)
export const CLOUTX_TOKEN_ABI = [
  // ERC20 Standard
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function transferFrom(address, address, uint256) returns (bool)",
  
  // CloutX Specific
  "function burnedTokens() view returns (uint256)",
  "function rewardPool() view returns (uint256)",
  "function isExcludedFromFees(address) view returns (bool)",
  "function sellTax() view returns (uint256)",
  "function buyTax() view returns (uint256)",
  "function transferTax() view returns (uint256)",
  "function maxTransactionAmount() view returns (uint256)",
  "function maxWalletAmount() view returns (uint256)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event TokensBurned(uint256 amount)",
  "event RewardPoolUpdated(uint256 amount)"
] as const;

// Staking Pool ABI
export const STAKING_POOL_ABI = [
  "function stake(uint256 amount, uint256 tierId) external",
  "function unstake(uint256 stakeId) external",
  "function emergencyUnstake(uint256 stakeId) external",
  "function claimRewards(uint256 stakeId) external",
  "function getStakeInfo(uint256 stakeId) view returns (tuple(uint256 amount, uint256 tierId, uint256 startTime, uint256 rewards, bool active))",
  "function getUserStakes(address user) view returns (uint256[])",
  "function getTierInfo(uint256 tierId) view returns (tuple(uint256 duration, uint256 baseAPY, uint256 loyaltyMultiplier))",
  "function calculateRewards(uint256 stakeId) view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function userStakeCount(address) view returns (uint256)",
  
  "event Staked(address indexed user, uint256 stakeId, uint256 amount, uint256 tierId)",
  "event Unstaked(address indexed user, uint256 stakeId, uint256 amount, uint256 rewards)",
  "event RewardsClaimed(address indexed user, uint256 stakeId, uint256 rewards)"
] as const;

// Reward Oracle Manager ABI
export const REWARD_ORACLE_MANAGER_ABI = [
  "function getUserCloutScore(address user) view returns (uint256)",
  "function getPendingRewards(address user) view returns (uint256)",
  "function claimSocialRewards() external",
  "function getTotalRewardsDistributed() view returns (uint256)",
  "function getRewardTier(uint256 cloutScore) view returns (uint256)",
  
  "event SocialRewardsClaimed(address indexed user, uint256 amount, uint256 cloutScore)",
  "event CloutScoreUpdated(address indexed user, uint256 newScore)"
] as const;

// Governance DAO ABI
export const GOVERNANCE_DAO_ABI = [
  "function createProposal(string memory title, string memory description, address[] memory targets, uint256[] memory values, bytes[] memory calldatas) external returns (uint256)",
  "function vote(uint256 proposalId, bool support) external",
  "function executeProposal(uint256 proposalId) external",
  "function getProposal(uint256 proposalId) view returns (tuple(string title, string description, uint256 votesFor, uint256 votesAgainst, uint256 endTime, bool executed, address proposer))",
  "function getProposalCount() view returns (uint256)",
  "function hasVoted(uint256 proposalId, address voter) view returns (bool)",
  "function getVotingPower(address voter) view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function quorumPercentage() view returns (uint256)",
  
  "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title)",
  "event VoteCast(address indexed voter, uint256 indexed proposalId, bool support, uint256 votes)",
  "event ProposalExecuted(uint256 indexed proposalId)"
] as const; 