import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, base, hardhat } from 'wagmi/chains';

// Contract addresses - these will be populated after deployment
export const CONTRACT_ADDRESSES = {
  CloutXToken: '0xc5a5C42992dECbae36851359345FE25997F5C42d',
  StakingPool: '0x67d269191c92Caf3cD7723F116c85e6E9bf55933',
  RewardOracleManager: '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E',
  GovernanceDAO: '0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690',
};

// Token metadata for MetaMask
export const CLOUTX_TOKEN_METADATA = {
  address: CONTRACT_ADDRESSES.CloutXToken,
  symbol: 'CLX',
  decimals: 18,
  image: 'https://raw.githubusercontent.com/cloutx/assets/main/logo.png', // You can replace with actual logo URL
};

// Function to add CloutX token to MetaMask with timeout and better error handling
export const addTokenToMetaMask = async () => {
  try {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to add the token.');
    }

    // Check if user is connected to the correct network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainId, 16);
    
    // Hardhat local network chain ID is 31337
    if (currentChainId !== 31337) {
      return {
        success: false,
        message: `Please switch to Hardhat Local network (Chain ID: 31337). Currently on chain ${currentChainId}.`
      };
    }

    // Create a promise with timeout to prevent infinite loading
    const addTokenPromise = window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: CLOUTX_TOKEN_METADATA.address,
          symbol: CLOUTX_TOKEN_METADATA.symbol,
          decimals: CLOUTX_TOKEN_METADATA.decimals,
          image: CLOUTX_TOKEN_METADATA.image,
        },
      },
    });

    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 second timeout
    });

    const wasAdded = await Promise.race([addTokenPromise, timeoutPromise]);

    if (wasAdded) {
      console.log('CloutX token added to MetaMask successfully!');
      return { success: true, message: 'CLX token added to MetaMask!' };
    } else {
      console.log('CloutX token was not added to MetaMask');
      return { success: false, message: 'Token addition was cancelled by user' };
    }
  } catch (error) {
    console.error('Error adding token to MetaMask:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        return { 
          success: false, 
          message: 'Request timed out. Please try again or add the token manually.' 
        };
      }
      if (error.message.includes('User rejected')) {
        return { 
          success: false, 
          message: 'Token addition was cancelled by user' 
        };
      }
      return { 
        success: false, 
        message: error.message 
      };
    }
    
    return { 
      success: false, 
      message: 'Failed to add token to MetaMask. Please try adding manually.' 
    };
  }
};

export const config = getDefaultConfig({
  appName: 'CloutX Token Dashboard',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Replace with your WalletConnect project ID
  chains: [polygon, base, hardhat],
  ssr: false,
});

export const SUPPORTED_CHAINS = [polygon, base, hardhat]; 