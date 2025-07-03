import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/web3';
import { STAKING_POOL_ABI } from '../contracts/abis';

export const useStaking = () => {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read contract data
  const { data: userStakes } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingPool as `0x${string}`,
    abi: STAKING_POOL_ABI,
    functionName: 'getUserStakes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { data: totalStaked } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingPool as `0x${string}`,
    abi: STAKING_POOL_ABI,
    functionName: 'totalStaked',
  });

  // Get tier information for all tiers (0-3)
  const { data: tier0 } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingPool as `0x${string}`,
    abi: STAKING_POOL_ABI,
    functionName: 'getTierInfo',
    args: [0n],
  });

  const { data: tier1 } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingPool as `0x${string}`,
    abi: STAKING_POOL_ABI,
    functionName: 'getTierInfo',
    args: [1n],
  });

  const { data: tier2 } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingPool as `0x${string}`,
    abi: STAKING_POOL_ABI,
    functionName: 'getTierInfo',
    args: [2n],
  });

  const { data: tier3 } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingPool as `0x${string}`,
    abi: STAKING_POOL_ABI,
    functionName: 'getTierInfo',
    args: [3n],
  });

  // Write functions
  const stake = (amount: string, tierId: number) => {
    writeContract({
      address: CONTRACT_ADDRESSES.StakingPool as `0x${string}`,
      abi: STAKING_POOL_ABI,
      functionName: 'stake',
      args: [parseEther(amount), BigInt(tierId)],
    });
  };

  const unstake = (stakeId: number) => {
    writeContract({
      address: CONTRACT_ADDRESSES.StakingPool as `0x${string}`,
      abi: STAKING_POOL_ABI,
      functionName: 'unstake',
      args: [BigInt(stakeId)],
    });
  };

  const claimRewards = (stakeId: number) => {
    writeContract({
      address: CONTRACT_ADDRESSES.StakingPool as `0x${string}`,
      abi: STAKING_POOL_ABI,
      functionName: 'claimRewards',
      args: [BigInt(stakeId)],
    });
  };

  const emergencyUnstake = (stakeId: number) => {
    writeContract({
      address: CONTRACT_ADDRESSES.StakingPool as `0x${string}`,
      abi: STAKING_POOL_ABI,
      functionName: 'emergencyUnstake',
      args: [BigInt(stakeId)],
    });
  };

  // Format tier data
  const formatTierData = (tierData: any, id: number) => {
    if (!tierData) return null;
    return {
      id,
      duration: Number(tierData[0]) / 86400, // Convert seconds to days
      baseAPY: Number(tierData[1]) / 100, // Convert basis points to percentage
      loyaltyMultiplier: Number(tierData[2]) / 100, // Convert basis points to decimal
    };
  };

  const stakingTiers = [
    formatTierData(tier0, 0),
    formatTierData(tier1, 1),
    formatTierData(tier2, 2),
    formatTierData(tier3, 3),
  ].filter(Boolean);

  return {
    // Data
    userStakes: userStakes || [],
    totalStaked: totalStaked ? formatEther(totalStaked) : '0',
    stakingTiers,
    
    // Functions
    stake,
    unstake,
    claimRewards,
    emergencyUnstake,
    
    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,
  };
}; 