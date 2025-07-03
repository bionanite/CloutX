
import { StakingTier, Proposal, ProposalStatus, SocialPost } from './types';

export const STAKING_TIERS: StakingTier[] = [
  { id: 'tier-1', days: 30, apy: 8, loyaltyMultiplier: 1.1 },
  { id: 'tier-2', days: 60, apy: 12, loyaltyMultiplier: 1.2 },
  { id: 'tier-3', days: 90, apy: 18, loyaltyMultiplier: 1.3 },
  { id: 'tier-4', days: 180, apy: 25, loyaltyMultiplier: 1.5 },
];

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 1,
    title: 'Q3 2024 Marketing Budget Increase',
    description: 'Proposal to increase the marketing budget by 20% to fund a new influencer campaign on TikTok and X to boost viral adoption.',
    status: ProposalStatus.ACTIVE,
    votesFor: 4500000,
    votesAgainst: 1200000,
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 2,
    title: 'Adjust Sell Tax to 1.5% Burn',
    description: 'Dynamically adjust the sell tax to increase the burn rate from 1% to 1.5% to accelerate deflationary pressure during high volatility periods.',
    status: ProposalStatus.PASSED,
    votesFor: 8900000,
    votesAgainst: 500000,
    endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: 3,
    title: 'Integrate with Base Network',
    description: 'Allocate development resources to deploy the CloutX ecosystem on the Base network to leverage lower fees and wider user reach.',
    status: ProposalStatus.FAILED,
    votesFor: 2100000,
    votesAgainst: 3300000,
    endDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
];

export const MOCK_SOCIAL_POSTS: SocialPost[] = [
    { id: 1, platform: 'X', content: 'Just discovered #CloutX, the future of SocialFi! Rewarding creators for real influence. $CLX to the moon! 🚀', engagement: 15200, reward: 250 },
    { id: 2, platform: 'TikTok', content: 'My latest viral dance challenge is powered by @CloutXOfficial! #ProofOfVirality', engagement: 1200000, reward: 1800 },
    { id: 3, platform: 'Threads', content: 'The tokenomics of CloutX are genius. Deflationary, rewarding, and community-governed. A deep dive...', engagement: 8400, reward: 150 },
];
