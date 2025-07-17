import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { View, TokenAdditionResult } from '../types';
import { ShieldCheck, LineChart, Gift, Landmark, Plus, Check, X, Copy, AlertCircle } from 'lucide-react';
import { addTokenToMetaMask, CLOUTX_TOKEN_METADATA, CONTRACT_ADDRESSES } from '../src/config/web3';

interface HeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const NavItem: React.FC<{
  label: View;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ label, isActive, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
      isActive ? 'bg-clx-primary text-white' : 'text-clx-text-secondary hover:bg-clx-dark hover:text-white'
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const AddTokenButton: React.FC = () => {
  const { isConnected } = useAccount();
  const [isAdding, setIsAdding] = useState(false);
  const [result, setResult] = useState<TokenAdditionResult | null>(null);
  const [showManual, setShowManual] = useState(false);

  const handleAddToken = async () => {
    if (!isConnected) return;
    
    setIsAdding(true);
    setResult(null);
    setShowManual(false);
    
    try {
      const tokenResult = await addTokenToMetaMask();
      setResult(tokenResult);
      
      // If automatic addition failed, show manual option
      if (!tokenResult.success) {
        setShowManual(true);
      }
      
      // Clear result after 5 seconds
      setTimeout(() => {
        setResult(null);
        setShowManual(false);
      }, 5000);
    } catch (error) {
      console.error('Unexpected error:', error);
      setResult({
        success: false,
        message: 'Unexpected error occurred. Please try adding manually.'
      });
      setShowManual(true);
      
      setTimeout(() => {
        setResult(null);
        setShowManual(false);
      }, 5000);
    } finally {
      // Always reset loading state
      setIsAdding(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setResult({
        success: true,
        message: 'Address copied to clipboard!'
      });
      setTimeout(() => {
        setResult(null);
        setShowManual(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const showManualInstructions = () => {
    const instructions = `Manual Token Addition:
    
1. Open MetaMask
2. Go to Assets tab
3. Click "Import tokens"
4. Select "Custom Token"
5. Enter these details:
   • Address: ${CONTRACT_ADDRESSES.CloutXToken}
   • Symbol: ${CLOUTX_TOKEN_METADATA.symbol}
   • Decimals: ${CLOUTX_TOKEN_METADATA.decimals}
6. Click "Add Custom Token"
7. Click "Import Tokens"`;

    alert(instructions);
  };

  if (!isConnected) return null;

  return (
    <div className="relative">
      <button
        onClick={handleAddToken}
        disabled={isAdding}
        className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
          isAdding
            ? 'bg-clx-dark text-clx-text-secondary cursor-not-allowed opacity-70'
            : result?.success
            ? 'bg-green-600 text-white hover:bg-green-700'
            : result && !result.success
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-clx-primary text-white hover:bg-clx-primary/80'
        }`}
      >
        {isAdding ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="hidden sm:inline">Adding...</span>
          </>
        ) : result?.success ? (
          <>
            <Check size={16} />
            <span className="hidden sm:inline">Added!</span>
          </>
        ) : result && !result.success ? (
          <>
            <AlertCircle size={16} />
            <span className="hidden sm:inline">Failed</span>
          </>
        ) : (
          <>
            <Plus size={16} />
            <span className="hidden sm:inline">Add CLX</span>
          </>
        )}
      </button>
      
      {result && (
        <div className={`absolute top-full right-0 mt-2 p-3 rounded-lg shadow-lg z-50 min-w-[280px] ${
          result.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <div className="text-xs font-medium mb-2">{result.message}</div>
          
          {showManual && !result.success && (
            <div className="space-y-2 border-t border-white/20 pt-2">
              <div className="text-xs">Manual options:</div>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(CONTRACT_ADDRESSES.CloutXToken)}
                  className="flex items-center space-x-1 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
                >
                  <Copy size={12} />
                  <span>Copy Address</span>
                </button>
                <button
                  onClick={showManualInstructions}
                  className="px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
                >
                  Instructions
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  return (
    <header className="bg-clx-dark/90 backdrop-blur-md sticky top-0 z-50 border-b border-clx-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
             <div className="flex-shrink-0 flex items-center space-x-2">
                <ShieldCheck className="h-8 w-8 text-clx-primary" />
                <span className="text-xl font-bold gradient-text">CloutX</span>
            </div>
            <nav className="flex space-x-1 sm:space-x-2">
                <NavItem label={View.DASHBOARD} isActive={currentView === View.DASHBOARD} onClick={() => onViewChange(View.DASHBOARD)} icon={<LineChart size={18} />} />
                <NavItem label={View.STAKING} isActive={currentView === View.STAKING} onClick={() => onViewChange(View.STAKING)} icon={<ShieldCheck size={18} />} />
                <NavItem label={View.REWARDS} isActive={currentView === View.REWARDS} onClick={() => onViewChange(View.REWARDS)} icon={<Gift size={18} />} />
                <NavItem label={View.GOVERNANCE} isActive={currentView === View.GOVERNANCE} onClick={() => onViewChange(View.GOVERNANCE)} icon={<Landmark size={18} />} />
            </nav>
          </div>
          <div className="flex items-center space-x-3">
            <AddTokenButton />
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
