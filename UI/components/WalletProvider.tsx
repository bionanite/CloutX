import React from 'react';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { mainnet, polygon, arbitrum, bsc, base, optimism, avalanche } from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { RainbowKitProvider, getDefaultWallets, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, walletConnectWallet, coinbaseWallet, trustWallet } from '@rainbow-me/rainbowkit/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@rainbow-me/rainbowkit/styles.css';

// Configure chains for CloutX multi-chain deployment
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    mainnet,
    arbitrum,    // Best overall network for CloutX
    polygon,     // Mass adoption network
    bsc,         // Cost-effective alternative
    base,        // Future innovation
    optimism,    // L2 alternative
    avalanche,   // High-speed alternative
  ],
  [
    // Use Alchemy for better reliability where available
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'demo' }),
    
    // JSON RPC providers for specific networks
    jsonRpcProvider({
      rpc: (chain) => {
        // Custom RPC endpoints for better performance
        switch (chain.id) {
          case bsc.id:
            return { http: 'https://bsc-dataseed1.binance.org' };
          case base.id:
            return { http: 'https://mainnet.base.org' };
          case avalanche.id:
            return { http: 'https://api.avax.network/ext/bc/C/rpc' };
          default:
            return null;
        }
      },
    }),
    
    // Fallback to public providers
    publicProvider(),
  ]
);

// Configure wallet connectors with CloutX branding
const { wallets } = getDefaultWallets({
  appName: 'CloutX Wallet',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains,
});

// Add additional wallet connectors
const connectors = connectorsForWallets([
  ...wallets,
  {
    groupName: 'Popular',
    wallets: [
      metaMaskWallet({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo', chains }),
      coinbaseWallet({ appName: 'CloutX Wallet', chains }),
      walletConnectWallet({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo', chains }),
      trustWallet({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo', chains }),
    ],
  },
]);

// Create wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

// Create query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      staleTime: 30000, // 30 seconds
    },
  },
});

// CloutX theme for RainbowKit
const cloutxTheme = {
  blurs: {
    modalOverlay: 'blur(8px)',
  },
  colors: {
    accentColor: '#3b82f6', // Blue primary
    accentColorForeground: '#ffffff',
    actionButtonBorder: 'rgba(255, 255, 255, 0.1)',
    actionButtonBorderMobile: 'rgba(255, 255, 255, 0.1)',
    actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.1)',
    closeButton: '#9ca3af',
    closeButtonBackground: 'rgba(255, 255, 255, 0.1)',
    connectButtonBackground: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    connectButtonBackgroundError: '#ef4444',
    connectButtonInnerBackground: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    connectButtonText: '#ffffff',
    connectButtonTextError: '#ffffff',
    connectionIndicator: '#10b981',
    downloadBottomCardBackground: 'rgba(17, 24, 39, 0.95)',
    downloadTopCardBackground: 'rgba(17, 24, 39, 0.95)',
    error: '#ef4444',
    generalBorder: 'rgba(255, 255, 255, 0.1)',
    generalBorderDim: 'rgba(255, 255, 255, 0.05)',
    menuItemBackground: 'rgba(255, 255, 255, 0.05)',
    modalBackdrop: 'rgba(0, 0, 0, 0.8)',
    modalBackground: 'rgba(17, 24, 39, 0.95)',
    modalBorder: 'rgba(255, 255, 255, 0.1)',
    modalText: '#ffffff',
    modalTextDim: '#9ca3af',
    modalTextSecondary: '#d1d5db',
    profileAction: 'rgba(255, 255, 255, 0.1)',
    profileActionHover: 'rgba(255, 255, 255, 0.2)',
    profileForeground: 'rgba(17, 24, 39, 0.95)',
    selectedOptionBorder: '#3b82f6',
    standby: '#fbbf24',
  },
  fonts: {
    body: 'Inter, system-ui, sans-serif',
  },
  radii: {
    actionButton: '12px',
    connectButton: '12px',
    menuButton: '12px',
    modal: '16px',
    modalMobile: '16px',
  },
  shadows: {
    connectButton: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    dialog: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    profileDetailsAction: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    selectedOption: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    selectedWallet: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    walletLogo: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
};

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider 
          chains={chains} 
          theme={cloutxTheme}
          appInfo={{
            appName: 'CloutX Wallet',
            disclaimer: ({ Text, Link }) => (
              <Text>
                CloutX Wallet - Precision-optimized DeFi experience with advanced gas optimization and multi-chain support. 
                By connecting your wallet, you agree to our{' '}
                <Link href="/terms">Terms of Service</Link> and acknowledge you have read our{' '}
                <Link href="/privacy">Privacy Policy</Link>.
              </Text>
            ),
          }}
          modalSize="compact"
          coolMode={true}
        >
          {children}
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}; 