import React, { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Card from './shared/Card';
import Stat from './shared/Stat';
import Button from './shared/Button';
import { 
  ArrowDown, 
  ArrowUp, 
  Zap, 
  CircleDollarSign, 
  Flame, 
  Award, 
  Wallet, 
  Copy, 
  ExternalLink, 
  Plus,
  TrendingUp,
  Shield,
  Gift,
  Vote,
  RefreshCw,
  Send,
  ArrowRight,
  Check,
  X,
  Network,
  AlertTriangle
} from 'lucide-react';
import { useCloutXToken } from '../src/hooks/useCloutXToken';
import { useStaking } from '../src/hooks/useStaking';
import { CONTRACT_ADDRESSES, CLOUTX_TOKEN_METADATA, addTokenToMetaMask } from '../src/config/web3';
import { View } from '../types';

// Mock price data for chart
const priceData = [
  { name: '7d', price: 0.012, volume: 45000 },
  { name: '6d', price: 0.015, volume: 52000 },
  { name: '5d', price: 0.014, volume: 38000 },
  { name: '4d', price: 0.018, volume: 67000 },
  { name: '3d', price: 0.022, volume: 89000 },
  { name: '2d', price: 0.021, volume: 76000 },
  { name: '1d', price: 0.025, volume: 94000 },
  { name: 'Now', price: 0.028, volume: 112000 },
];

interface DashboardProps {
  onNavigate?: (view: View) => void;
}

// Quick Actions Component
const QuickActions: React.FC<{ onNavigate?: (view: View) => void }> = ({ onNavigate }) => {
  const { isConnected } = useAccount();
  const { balance, isPending } = useCloutXToken();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setIsRefreshing(false), 1500);
  }, []);

  const handleStake = useCallback(() => {
    onNavigate?.(View.STAKING);
  }, [onNavigate]);

  const handleRewards = useCallback(() => {
    onNavigate?.(View.REWARDS);
  }, [onNavigate]);

  const handleGovernance = useCallback(() => {
    onNavigate?.(View.GOVERNANCE);
  }, [onNavigate]);

  if (!isConnected) return null;

  return (
    <Card className="bg-gradient-to-r from-clx-primary/5 to-clx-secondary/5 border-clx-primary/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-clx-text-primary flex items-center">
          <Zap size={20} className="mr-2 text-clx-primary" />
          Quick Actions
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 text-clx-text-secondary hover:text-clx-primary transition-colors"
          title="Refresh data"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Button
          onClick={handleStake}
          variant="primary"
          className="flex items-center justify-center space-x-2 py-3"
          disabled={isPending}
        >
          <Shield size={16} />
          <span>Stake CLX</span>
        </Button>
        
        <Button
          onClick={handleRewards}
          variant="secondary"
          className="flex items-center justify-center space-x-2 py-3"
        >
          <Gift size={16} />
          <span>Claim Rewards</span>
        </Button>
        
        <Button
          onClick={handleGovernance}
          variant="secondary"
          className="flex items-center justify-center space-x-2 py-3"
        >
          <Vote size={16} />
          <span>Vote</span>
        </Button>
        
        <Button
          variant="secondary"
          className="flex items-center justify-center space-x-2 py-3"
          disabled
          title="Coming soon"
        >
          <Send size={16} />
          <span>Transfer</span>
        </Button>
      </div>
      
      <div className="mt-4 p-3 bg-clx-darker/30 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-clx-text-secondary">Your CLX Balance</span>
          <span className="font-mono text-lg font-semibold text-clx-primary">
            {parseFloat(balance).toFixed(2)} CLX
          </span>
        </div>
      </div>
    </Card>
  );
};

// Price Chart Component
const PriceChart: React.FC = () => {
  const currentPrice = priceData[priceData.length - 1].price;
  const previousPrice = priceData[priceData.length - 2].price;
  const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
  const isPositive = priceChange > 0;

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-clx-text-primary">CLX Price</h3>
          <div className="flex items-center space-x-3 mt-1">
            <span className="text-2xl font-bold text-white">
              ${currentPrice.toFixed(3)}
            </span>
            <span className={`flex items-center text-sm font-medium ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              {Math.abs(priceChange).toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-clx-text-secondary">24h Volume</div>
          <div className="text-lg font-semibold text-clx-primary">
            ${(priceData[priceData.length - 1].volume * currentPrice).toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={priceData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8A2BE2" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8A2BE2" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis 
              dataKey="name" 
              stroke="#8B949E" 
              fontSize={12}
              tick={{ fill: '#8B949E' }}
            />
            <YAxis 
              stroke="#8B949E" 
              fontSize={12}
              tick={{ fill: '#8B949E' }}
              domain={['dataMin - 0.002', 'dataMax + 0.002']}
              tickFormatter={(value) => `$${Number(value).toFixed(3)}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#161B22', 
                border: '1px solid #30363D',
                borderRadius: '8px',
                color: '#F0F6FC'
              }}
              formatter={(value: any) => [`$${Number(value).toFixed(3)}`, 'Price']}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#8A2BE2" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#priceGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// Transaction Simulator Component
const TransactionSimulator: React.FC = () => {
  const [type, setType] = useState<'buy' | 'sell' | 'transfer'>('buy');
  const [amount, setAmount] = useState(1000);
  const { sellTax, buyTax } = useCloutXToken();

  const tax = type === 'sell' ? sellTax : (type === 'buy' ? buyTax : 0.002);
  const fee = amount * tax;
  const burn = type === 'sell' ? fee / 2 : 0;
  const rewardPool = type === 'sell' ? fee / 2 : fee;
  const received = type === 'buy' ? amount : amount - fee;

  const getExplanation = () => {
    if (type === 'sell') return `Sell tax: ${(sellTax * 100).toFixed(1)}% (${(sellTax * 50).toFixed(1)}% burned, ${(sellTax * 50).toFixed(1)}% to rewards)`;
    if (type === 'buy') return `Buy tax: ${(buyTax * 100).toFixed(1)}% (supports ecosystem growth)`;
    return "Transfer tax: 0.2% (minimal network fee)";
  };
  
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-clx-text-primary flex items-center">
          <TrendingUp size={20} className="mr-2 text-clx-primary" />
          Transaction Simulator
        </h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex space-x-2">
          {(['buy', 'sell', 'transfer'] as const).map((transactionType) => (
            <Button
              key={transactionType}
              onClick={() => setType(transactionType)}
              variant={type === transactionType ? 'primary' : 'secondary'}
              className="flex-1 capitalize"
            >
              {transactionType}
            </Button>
          ))}
        </div>
        
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-clx-text-secondary mb-2">
            Amount (CLX)
          </label>
          <input 
            type="number" 
            id="amount" 
            value={amount} 
            onChange={(e) => setAmount(Number(e.target.value))}
            min="0"
            step="0.01"
            className="w-full bg-clx-darker border border-clx-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-clx-primary focus:border-transparent transition-all"
            placeholder="Enter amount..."
          />
        </div>
        
        <div className="bg-clx-darker/50 rounded-lg p-4 space-y-3">
          <p className="text-sm text-clx-text-secondary">{getExplanation()}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-clx-text-secondary">Total Fee ({(tax*100).toFixed(1)}%):</span>
              <span className="font-mono text-orange-400">{fee.toFixed(2)} CLX</span>
            </div>
            
            {type === 'sell' && (
              <>
                <div className="flex justify-between">
                  <span className="text-clx-text-secondary">Amount Burned:</span>
                  <span className="font-mono text-red-400">-{burn.toFixed(2)} CLX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-clx-text-secondary">To Rewards Pool:</span>
                  <span className="font-mono text-green-400">+{rewardPool.toFixed(2)} CLX</span>
                </div>
              </>
            )}
            
            {type !== 'sell' && rewardPool > 0 && (
              <div className="flex justify-between">
                <span className="text-clx-text-secondary">To Rewards Pool:</span>
                <span className="font-mono text-green-400">+{rewardPool.toFixed(2)} CLX</span>
              </div>
            )}
          </div>
          
          <div className="border-t border-clx-border pt-3">
            <div className="flex justify-between items-center">
              <span className="text-clx-text-primary font-semibold">
                {type === 'buy' ? 'You Get:' : 'You Receive:'}
              </span>
              <span className="font-mono text-xl font-bold text-white">
                {received.toFixed(2)} CLX
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Token Info Card Component
const TokenInfoCard: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, []);

  const handleAddToken = useCallback(async () => {
    setIsAdding(true);
    setResult(null);
    
    try {
      const tokenResult = await addTokenToMetaMask();
      setResult(tokenResult);
      
      // Clear result after 4 seconds
      setTimeout(() => {
        setResult(null);
      }, 4000);
    } catch (error) {
      console.error('Error adding token:', error);
      setResult({
        success: false,
        message: 'Failed to add token. Please try adding manually.'
      });
      setTimeout(() => {
        setResult(null);
      }, 4000);
    } finally {
      // Always reset loading state
      setIsAdding(false);
    }
  }, []);

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

  return (
    <Card className="bg-gradient-to-br from-clx-primary/10 to-clx-secondary/10 border-clx-primary/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-clx-text-primary flex items-center">
          <Wallet size={20} className="mr-2" />
          CLX Token Info
        </h3>
        <div className="flex space-x-2">
          {result && !result.success && (
            <Button
              onClick={showManualInstructions}
              variant="secondary"
              className="flex items-center space-x-2 text-xs"
            >
              <ArrowRight size={12} />
              <span>Manual</span>
            </Button>
          )}
          <Button
            onClick={handleAddToken}
            disabled={isAdding}
            variant={result?.success ? "secondary" : "primary"}
            className={`flex items-center space-x-2 text-sm ${
              result?.success ? 'bg-green-600 hover:bg-green-700' : ''
            } ${result && !result.success ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            {isAdding ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Adding...</span>
              </>
            ) : result?.success ? (
              <>
                <Check size={14} />
                <span>Added!</span>
              </>
            ) : result && !result.success ? (
              <>
                <X size={14} />
                <span>Failed</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Add to Wallet</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      {result && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          result.success 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {result.message}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-clx-text-secondary">Contract Address</label>
          <div className="flex items-center space-x-2 mt-2">
            <code className="flex-1 px-3 py-2 bg-clx-darker rounded-lg text-sm font-mono text-clx-text-primary border border-clx-border">
              {CONTRACT_ADDRESSES.CloutXToken}
            </code>
            <Button
              onClick={() => copyToClipboard(CONTRACT_ADDRESSES.CloutXToken)}
              variant="secondary"
              className="p-2"
              title="Copy address"
            >
              <Copy size={16} />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-clx-text-secondary">Symbol</label>
            <div className="mt-2 px-3 py-2 bg-clx-darker rounded-lg text-sm font-semibold text-clx-primary">
              {CLOUTX_TOKEN_METADATA.symbol}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-clx-text-secondary">Decimals</label>
            <div className="mt-2 px-3 py-2 bg-clx-darker rounded-lg text-sm font-semibold text-clx-primary">
              {CLOUTX_TOKEN_METADATA.decimals}
            </div>
          </div>
        </div>
        
        {copied && (
          <div className="text-sm text-green-400 flex items-center">
            <ArrowRight size={14} className="mr-1" />
            Address copied to clipboard!
          </div>
        )}
      </div>
    </Card>
  );
};

// Add Hardhat Network function
const addHardhatNetwork = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: '0x7A69', // 31337 in hexadecimal
          chainName: 'Hardhat Local',
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['http://localhost:8545'],
          blockExplorerUrls: null,
        },
      ],
    });
    return { success: true, message: 'Hardhat network added successfully!' };
  } catch (error: any) {
    if (error.code === 4902) {
      return { success: false, message: 'Failed to add network. Please add manually.' };
    } else if (error.code === -32002) {
      return { success: false, message: 'Request pending in MetaMask.' };
    }
    return { success: false, message: error.message || 'Failed to add network' };
  }
};

// Network Status Component
const NetworkStatus: React.FC = () => {
  const [currentNetwork, setCurrentNetwork] = useState<string>('Unknown');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const chainIdDecimal = parseInt(chainId, 16);
          
          if (chainIdDecimal === 31337) {
            setCurrentNetwork('Hardhat Local');
            setIsCorrectNetwork(true);
          } else {
            setCurrentNetwork(`Chain ${chainIdDecimal}`);
            setIsCorrectNetwork(false);
          }
        } catch (error) {
          console.error('Error checking network:', error);
        }
      }
    };

    checkNetwork();
    
    // Listen for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkNetwork);
      return () => window.ethereum.removeListener('chainChanged', checkNetwork);
    }
  }, []);

  const handleAddNetwork = async () => {
    setIsAddingNetwork(true);
    try {
      const result = await addHardhatNetwork();
      if (result.success) {
        setTimeout(() => {
          window.location.reload(); // Refresh to update network status
        }, 1000);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to add network. Please add manually.');
    } finally {
      setIsAddingNetwork(false);
    }
  };

  return (
    <Card className={`${isCorrectNetwork ? 'border-green-500/30 bg-green-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Network size={20} className={isCorrectNetwork ? 'text-green-400' : 'text-orange-400'} />
          <div>
            <h3 className="text-sm font-semibold text-clx-text-primary">Network Status</h3>
            <p className={`text-sm ${isCorrectNetwork ? 'text-green-400' : 'text-orange-400'}`}>
              {currentNetwork}
            </p>
          </div>
        </div>
        
        {!isCorrectNetwork && (
          <Button
            onClick={handleAddNetwork}
            disabled={isAddingNetwork}
            variant="primary"
            className="flex items-center space-x-2 text-sm"
          >
            {isAddingNetwork ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            <span>{isAddingNetwork ? 'Adding...' : 'Add Hardhat'}</span>
          </Button>
        )}
        
        {isCorrectNetwork && (
          <div className="flex items-center space-x-2 text-green-400">
            <Check size={16} />
            <span className="text-sm">Connected</span>
          </div>
        )}
      </div>
      
      {!isCorrectNetwork && (
        <div className="mt-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <div className="flex items-start space-x-2">
            <AlertTriangle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-200">
              <p className="font-medium mb-1">Wrong Network Detected</p>
              <p>Please switch to Hardhat Local network to use CLX features.</p>
              <div className="mt-2 text-xs text-orange-300">
                <strong>Manual Setup:</strong> Network Name: "Hardhat Local" | RPC: "http://localhost:8545" | Chain ID: "31337"
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// Main Dashboard Component
const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { isConnected } = useAccount();
  const { balance, totalSupply, burnedTokens, rewardPool, isConfirming } = useCloutXToken();
  const { totalStaked } = useStaking();

  // Format large numbers for display
  const formatNumber = useCallback((value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(2);
  }, []);

  // Calculate market metrics
  const currentPrice = 0.028;
  const marketCap = parseFloat(totalSupply) * currentPrice;
  const totalValueLocked = parseFloat(totalStaked) * currentPrice;

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <Wallet size={48} className="mx-auto text-clx-primary mb-4" />
            <h2 className="text-xl font-semibold text-clx-text-primary mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-clx-text-secondary">
              Connect your wallet to view your CLX balance and start earning rewards through staking and social engagement.
            </p>
          </div>
          <div className="space-y-3">
            <Button variant="primary" className="w-full">
              Connect Wallet
            </Button>
            <p className="text-xs text-clx-text-secondary">
              Supports MetaMask, WalletConnect, and other Web3 wallets
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold gradient-text mb-2">CloutX Dashboard</h1>
        <p className="text-clx-text-secondary text-lg">Your gateway to social-fi rewards and DeFi yield</p>
      </div>

      {/* Quick Actions */}
      <QuickActions onNavigate={onNavigate} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat 
          icon={<CircleDollarSign size={24} className="text-green-400" />} 
          label="Market Cap" 
          value={`$${formatNumber(marketCap)}`}
          trend={{ value: 12.5, isPositive: true }}
        />
        <Stat 
          icon={<Zap size={24} className="text-blue-400" />} 
          label="Total Supply" 
          value={`${formatNumber(totalSupply)} CLX`}
          trend={{ value: 0, isPositive: true }}
        />
        <Stat 
          icon={<Flame size={24} className="text-red-400" />} 
          label="Burned Tokens" 
          value={`${formatNumber(burnedTokens)} CLX`}
          trend={{ value: 8.3, isPositive: true }}
        />
        <Stat 
          icon={<Award size={24} className="text-purple-400" />} 
          label="Rewards Pool" 
          value={`${formatNumber(rewardPool)} CLX`}
          trend={{ value: 15.7, isPositive: true }}
        />
      </div>

      {/* Charts and Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriceChart />
        </div>
        <div>
          <TokenInfoCard />
        </div>
      </div>

      {/* Transaction Simulator */}
      <TransactionSimulator />

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <Shield size={32} className="mx-auto text-clx-primary mb-3" />
          <h3 className="font-semibold text-clx-text-primary mb-1">Total Value Locked</h3>
          <p className="text-2xl font-bold text-white">${formatNumber(totalValueLocked)}</p>
          <p className="text-sm text-clx-text-secondary mt-1">In staking pools</p>
        </Card>
        
        <Card className="text-center">
          <Gift size={32} className="mx-auto text-green-400 mb-3" />
          <h3 className="font-semibold text-clx-text-primary mb-1">Daily Rewards</h3>
          <p className="text-2xl font-bold text-white">100K CLX</p>
          <p className="text-sm text-clx-text-secondary mt-1">Available to claim</p>
        </Card>
        
        <Card className="text-center">
          <Vote size={32} className="mx-auto text-blue-400 mb-3" />
          <h3 className="font-semibold text-clx-text-primary mb-1">Active Proposals</h3>
          <p className="text-2xl font-bold text-white">3</p>
          <p className="text-sm text-clx-text-secondary mt-1">Awaiting votes</p>
        </Card>
      </div>

      {/* Network Status */}
      <NetworkStatus />

      {/* Loading indicator */}
      {isConfirming && (
        <div className="fixed bottom-4 right-4 bg-clx-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <RefreshCw size={16} className="animate-spin" />
          <span>Transaction confirming...</span>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
