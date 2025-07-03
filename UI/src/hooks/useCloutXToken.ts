import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/web3';
import { CLOUTX_TOKEN_ABI } from '../contracts/abis';

export const useCloutXToken = () => {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read contract data
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESSES.CloutXToken as `0x${string}`,
    abi: CLOUTX_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.CloutXToken as `0x${string}`,
    abi: CLOUTX_TOKEN_ABI,
    functionName: 'totalSupply',
  });

  const { data: burnedTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.CloutXToken as `0x${string}`,
    abi: CLOUTX_TOKEN_ABI,
    functionName: 'burnedTokens',
  });

  const { data: rewardPool } = useReadContract({
    address: CONTRACT_ADDRESSES.CloutXToken as `0x${string}`,
    abi: CLOUTX_TOKEN_ABI,
    functionName: 'rewardPool',
  });

  const { data: sellTax } = useReadContract({
    address: CONTRACT_ADDRESSES.CloutXToken as `0x${string}`,
    abi: CLOUTX_TOKEN_ABI,
    functionName: 'sellTax',
  });

  const { data: buyTax } = useReadContract({
    address: CONTRACT_ADDRESSES.CloutXToken as `0x${string}`,
    abi: CLOUTX_TOKEN_ABI,
    functionName: 'buyTax',
  });

  // Write functions
  const transfer = (to: string, amount: string) => {
    writeContract({
      address: CONTRACT_ADDRESSES.CloutXToken as `0x${string}`,
      abi: CLOUTX_TOKEN_ABI,
      functionName: 'transfer',
      args: [to as `0x${string}`, parseEther(amount)],
    });
  };

  const approve = (spender: string, amount: string) => {
    writeContract({
      address: CONTRACT_ADDRESSES.CloutXToken as `0x${string}`,
      abi: CLOUTX_TOKEN_ABI,
      functionName: 'approve',
      args: [spender as `0x${string}`, parseEther(amount)],
    });
  };

  return {
    // Data
    balance: balance ? formatEther(balance) : '0',
    totalSupply: totalSupply ? formatEther(totalSupply) : '0',
    burnedTokens: burnedTokens ? formatEther(burnedTokens) : '0',
    rewardPool: rewardPool ? formatEther(rewardPool) : '0',
    sellTax: sellTax ? Number(sellTax) / 100 : 0,
    buyTax: buyTax ? Number(buyTax) / 100 : 0,
    
    // Functions
    transfer,
    approve,
    
    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,
  };
}; 