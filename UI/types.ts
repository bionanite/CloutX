export enum View {
  DASHBOARD = 'Dashboard',
  STAKING = 'Staking',
  REWARDS = 'Rewards',
  GOVERNANCE = 'Governance',
}

export interface StakingTier {
  id: string;
  days: number;
  apy: number;
  loyaltyMultiplier: number;
}

export interface ActiveStake {
  id: string;
  tierId: string;
  amount: number;
  stakedDate: Date;
  rewards: number;
}

export enum ProposalStatus {
  ACTIVE = 'Active',
  PASSED = 'Passed',
  FAILED = 'Failed',
}

export interface Proposal {
  id: number;
  title: string;
  description: string;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  endDate: Date;
}

export interface SocialPost {
  id: number;
  platform: 'TikTok' | 'X' | 'Threads';
  content: string;
  engagement: number;
  reward: number;
}

// MetaMask window type declarations
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] | Record<string, any> }) => Promise<any>;
      isMetaMask?: boolean;
      selectedAddress?: string;
    };
  }
}

// Token addition result type
export interface TokenAdditionResult {
  success: boolean;
  message: string;
}
