import React, { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './config/web3';
import { Header } from '../components/Header';
import { Dashboard } from '../components/Dashboard';
import { Staking } from '../components/Staking';
import { Governance } from '../components/Governance';
import { Rewards } from '../components/Rewards';

import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

const queryClient = new QueryClient();

export type View = 'dashboard' | 'staking' | 'governance' | 'rewards';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'staking':
        return <Staking />;
      case 'governance':
        return <Governance />;
      case 'rewards':
        return <Rewards />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Header currentView={currentView} onViewChange={setCurrentView} />
            <main className="container mx-auto px-4 py-8">
              {renderCurrentView()}
            </main>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App; 