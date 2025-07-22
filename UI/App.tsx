
import React from 'react';
import { WalletProvider } from './components/WalletProvider';
import { CustomWallet } from './components/CustomWallet';
import './index.css';

function App() {
  return (
    <WalletProvider>
      <div className="App">
        <CustomWallet />
      </div>
    </WalletProvider>
  );
}

export default App;
