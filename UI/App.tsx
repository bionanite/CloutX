
import React, { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Staking from './components/Staking';
import Rewards from './components/Rewards';
import Governance from './components/Governance';
import { View } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard />;
      case View.STAKING:
        return <Staking />;
      case View.REWARDS:
        return <Rewards />;
      case View.GOVERNANCE:
        return <Governance />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-clx-darker text-clx-text-primary font-sans">
      <Header currentView={currentView} setCurrentView={setCurrentView} />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
