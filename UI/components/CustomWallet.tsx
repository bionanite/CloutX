import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance, useNetwork, useSwitchNetwork, useConnect, useDisconnect } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { formatEther, parseEther, formatUnits } from 'viem';
import { QRCodeGenerator } from './QRCodeGenerator';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Wallet, 
  Send, 
  Receive, 
  RefreshCw, 
  Settings, 
  TrendingUp, 
  Shield, 
  Zap,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';

// CloutX Contract ABI - Essential functions
const CLOUTX_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function getCurrentTax(address from, address to) view returns (uint256)',
  'function calculateTaxAmount(address from, address to, uint256 amount) view returns (uint256)',
  'function getEffectiveTransferAmount(address from, address to, uint256 amount) view returns (uint256)',
  'function canTransfer(address from, address to, uint256 amount) view returns (bool, string)',
  'function totalSupply() view returns (uint256)',
  'function totalBurned() view returns (uint256)',
  'function totalRewardsDistributed() view returns (uint256)',
  'function automatedMarketMakerPairs(address) view returns (bool)',
  'function blacklist(address) view returns (bool)',
  'function lastTransactionTime(address) view returns (uint256)',
  'function antiBotConfig() view returns (uint256, uint256, uint256, bool, bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event TaxCollected(address indexed from, address indexed to, uint256 amount, uint256 burnAmount, uint256 rewardAmount, string transactionType)'
];

// Network configurations with CloutX contract addresses
const NETWORK_CONFIG = {
  1: { // Ethereum
    name: 'Ethereum',
    symbol: 'ETH',
    contractAddress: '0x...', // To be deployed
    explorerUrl: 'https://etherscan.io',
    color: '#627EEA'
  },
  137: { // Polygon
    name: 'Polygon',
    symbol: 'MATIC',
    contractAddress: '0x...', // To be deployed
    explorerUrl: 'https://polygonscan.com',
    color: '#8247E5'
  },
  42161: { // Arbitrum
    name: 'Arbitrum',
    symbol: 'ETH',
    contractAddress: '0x...', // To be deployed
    explorerUrl: 'https://arbiscan.io',
    color: '#28A0F0'
  },
  56: { // BNB Chain
    name: 'BNB Chain',
    symbol: 'BNB',
    contractAddress: '0x...', // To be deployed
    explorerUrl: 'https://bscscan.com',
    color: '#F3BA2F'
  },
  8453: { // Base
    name: 'Base',
    symbol: 'ETH',
    contractAddress: '0x...', // To be deployed
    explorerUrl: 'https://basescan.org',
    color: '#0052FF'
  }
};

interface TransactionPreview {
  amount: string;
  taxAmount: string;
  effectiveAmount: string;
  taxRate: string;
  burnAmount: string;
  rewardAmount: string;
  canTransfer: boolean;
  reason: string;
}

export const CustomWallet: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const signer = useEthersSigner();

  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive' | 'settings'>('overview');
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Transaction State
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [transactionPreview, setTransactionPreview] = useState<TransactionPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  // CloutX Data
  const [cloutxBalance, setCloutxBalance] = useState('0');
  const [tokenStats, setTokenStats] = useState({
    totalSupply: '0',
    totalBurned: '0',
    totalRewards: '0',
    circulatingSupply: '0'
  });
  const [securityInfo, setSecurityInfo] = useState({
    isBlacklisted: false,
    lastTxTime: 0,
    cooldownRemaining: 0,
    antiBotEnabled: false,
    maxTxAmount: '0',
    maxWalletAmount: '0'
  });

  // Get network config
  const currentNetwork = chain?.id ? NETWORK_CONFIG[chain.id as keyof typeof NETWORK_CONFIG] : null;
  const contractAddress = currentNetwork?.contractAddress;

  // Native token balance
  const { data: nativeBalance } = useBalance({ address });

  // Refresh data
  const refreshData = useCallback(async () => {
    if (!signer || !contractAddress || !address) return;
    
    setRefreshing(true);
    try {
      const contract = new ethers.Contract(contractAddress, CLOUTX_ABI, signer);
      
      // Get CloutX balance
      const balance = await contract.balanceOf(address);
      setCloutxBalance(formatEther(balance));
      
      // Get token stats
      const [totalSupply, totalBurned, totalRewards] = await Promise.all([
        contract.totalSupply(),
        contract.totalBurned(),
        contract.totalRewardsDistributed()
      ]);
      
      const circulatingSupply = totalSupply.sub(totalBurned);
      
      setTokenStats({
        totalSupply: formatEther(totalSupply),
        totalBurned: formatEther(totalBurned),
        totalRewards: formatEther(totalRewards),
        circulatingSupply: formatEther(circulatingSupply)
      });
      
      // Get security info
      const [isBlacklisted, lastTxTime, antiBotConfig] = await Promise.all([
        contract.blacklist(address),
        contract.lastTransactionTime(address),
        contract.antiBotConfig()
      ]);
      
      const now = Math.floor(Date.now() / 1000);
      const cooldownEnd = lastTxTime.toNumber() + antiBotConfig[2].toNumber();
      const cooldownRemaining = Math.max(0, cooldownEnd - now);
      
      setSecurityInfo({
        isBlacklisted,
        lastTxTime: lastTxTime.toNumber(),
        cooldownRemaining,
        antiBotEnabled: antiBotConfig[3],
        maxTxAmount: formatEther(antiBotConfig[0]),
        maxWalletAmount: formatEther(antiBotConfig[1])
      });
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [signer, contractAddress, address]);

  // Update transaction preview
  const updatePreview = useCallback(async () => {
    if (!signer || !contractAddress || !address || !sendTo || !sendAmount) {
      setTransactionPreview(null);
      return;
    }
    
    setIsPreviewLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, CLOUTX_ABI, signer);
      const amount = parseEther(sendAmount);
      
      const [taxRate, taxAmount, effectiveAmount, canTransferResult] = await Promise.all([
        contract.getCurrentTax(address, sendTo),
        contract.calculateTaxAmount(address, sendTo, amount),
        contract.getEffectiveTransferAmount(address, sendTo, amount),
        contract.canTransfer(address, sendTo, amount)
      ]);
      
      // Calculate burn and reward amounts (50/50 split)
      const burnAmount = taxAmount.div(2);
      const rewardAmount = taxAmount.sub(burnAmount);
      
      setTransactionPreview({
        amount: sendAmount,
        taxAmount: formatEther(taxAmount),
        effectiveAmount: formatEther(effectiveAmount),
        taxRate: (taxRate.toNumber() / 100).toString(),
        burnAmount: formatEther(burnAmount),
        rewardAmount: formatEther(rewardAmount),
        canTransfer: canTransferResult[0],
        reason: canTransferResult[1]
      });
      
    } catch (error) {
      console.error('Error updating preview:', error);
      setTransactionPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [signer, contractAddress, address, sendTo, sendAmount]);

  // Execute transfer
  const executeTransfer = async () => {
    if (!signer || !contractAddress || !sendTo || !sendAmount) return;
    
    setTxStatus('pending');
    try {
      const contract = new ethers.Contract(contractAddress, CLOUTX_ABI, signer);
      const amount = parseEther(sendAmount);
      
      const tx = await contract.transfer(sendTo, amount);
      setTxHash(tx.hash);
      
      await tx.wait();
      setTxStatus('success');
      
      // Reset form and refresh data
      setSendTo('');
      setSendAmount('');
      setTransactionPreview(null);
      await refreshData();
      
    } catch (error) {
      console.error('Transfer failed:', error);
      setTxStatus('error');
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  // Effects
  useEffect(() => {
    if (isConnected && signer) {
      refreshData();
    }
  }, [isConnected, signer, refreshData]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Render connection prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
          <div className="text-center">
            <Wallet className="w-16 h-16 text-blue-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">CloutX Wallet</h1>
            <p className="text-gray-300 mb-8">
              Connect your wallet to access CloutX token features with precision gas optimization
            </p>
            
            <div className="space-y-4">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  Connect with {connector.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(17, 24, 39, 0.95)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(8px)',
          },
        }}
      />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CloutX Wallet</h1>
                <p className="text-gray-300">Precision-optimized DeFi experience</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Network Indicator */}
              {currentNetwork && (
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentNetwork.color }}
                  />
                  <span className="text-white text-sm font-medium">
                    {currentNetwork.name}
                  </span>
                </div>
              )}
              
              {/* Refresh Button */}
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Disconnect */}
              <button
                onClick={() => disconnect()}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Balance & Stats */}
          <div className="space-y-6">
            
            {/* Balance Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Your Balance</h2>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {showBalance ? 
                    <Eye className="w-5 h-5 text-gray-400" /> : 
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  }
                </button>
              </div>
              
              <div className="space-y-4">
                {/* CloutX Balance */}
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">CLX Balance</span>
                    <button
                      onClick={() => copyToClipboard(cloutxBalance)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {showBalance ? `${parseFloat(cloutxBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })} CLX` : '••••••'}
                  </p>
                </div>
                
                {/* Native Balance */}
                <div className="bg-white/5 rounded-xl p-4">
                  <span className="text-gray-300">{currentNetwork?.symbol} Balance</span>
                  <p className="text-lg font-semibold text-white mt-1">
                    {showBalance && nativeBalance ? 
                      `${parseFloat(formatEther(nativeBalance.value)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${nativeBalance.symbol}` : 
                      '••••••'
                    }
                  </p>
                </div>
              </div>
              
              {/* Address */}
              <div className="mt-4 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Address</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(address || '')}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                    {currentNetwork && (
                      <a
                        href={`${currentNetwork.explorerUrl}/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-white font-mono text-sm mt-1">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                </p>
              </div>
            </div>

            {/* Token Stats */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">Token Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Supply</span>
                  <span className="text-white font-semibold">
                    {parseFloat(tokenStats.totalSupply).toLocaleString()} CLX
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Circulating</span>
                  <span className="text-white font-semibold">
                    {parseFloat(tokenStats.circulatingSupply).toLocaleString()} CLX
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Burned</span>
                  <span className="text-red-400 font-semibold">
                    {parseFloat(tokenStats.totalBurned).toLocaleString()} CLX
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Rewards</span>
                  <span className="text-green-400 font-semibold">
                    {parseFloat(tokenStats.totalRewards).toLocaleString()} CLX
                  </span>
                </div>
              </div>
            </div>

            {/* Security Status */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Blacklist Status</span>
                  <div className="flex items-center gap-2">
                    {securityInfo.isBlacklisted ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">Blacklisted</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Clear</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Anti-Bot Protection</span>
                  <span className={`${securityInfo.antiBotEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                    {securityInfo.antiBotEnabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {securityInfo.cooldownRemaining > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Cooldown</span>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400">{securityInfo.cooldownRemaining}s</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center Column - Transaction Interface */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tab Navigation */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20">
              <div className="flex gap-2">
                {[
                  { id: 'overview', label: 'Overview', icon: TrendingUp },
                  { id: 'send', label: 'Send', icon: Send },
                  { id: 'receive', label: 'Receive', icon: Receive },
                  { id: 'settings', label: 'Settings', icon: Settings }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${
                      activeTab === id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-6">Account Overview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Recent Activity</h4>
                    <div className="space-y-3">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">No recent transactions</span>
                          <span className="text-gray-400 text-sm">--</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Quick Actions</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab('send')}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send CLX
                      </button>
                      <button
                        onClick={() => setActiveTab('receive')}
                        className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Receive className="w-4 h-4" />
                        Receive CLX
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'send' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-6">Send CLX</h3>
                
                <div className="space-y-6">
                  {/* Send Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Recipient Address</label>
                      <input
                        type="text"
                        value={sendTo}
                        onChange={(e) => setSendTo(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 mb-2">Amount (CLX)</label>
                      <input
                        type="number"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Transaction Preview */}
                  {(transactionPreview || isPreviewLoading) && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-white mb-3">Transaction Preview</h4>
                      
                      {isPreviewLoading ? (
                        <div className="flex items-center gap-2 text-gray-300">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Calculating...
                        </div>
                      ) : transactionPreview && (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Send Amount:</span>
                            <span className="text-white">{transactionPreview.amount} CLX</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Tax ({transactionPreview.taxRate}%):</span>
                            <span className="text-red-400">-{transactionPreview.taxAmount} CLX</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">• Burned:</span>
                            <span className="text-red-400">{transactionPreview.burnAmount} CLX</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">• Rewards:</span>
                            <span className="text-green-400">{transactionPreview.rewardAmount} CLX</span>
                          </div>
                          <div className="border-t border-white/20 pt-2 mt-2">
                            <div className="flex justify-between font-semibold">
                              <span className="text-gray-300">Recipient Receives:</span>
                              <span className="text-white">{transactionPreview.effectiveAmount} CLX</span>
                            </div>
                          </div>
                          
                          {!transactionPreview.canTransfer && (
                            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mt-3">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 font-semibold">Transaction Blocked</span>
                              </div>
                              <p className="text-red-400 text-sm mt-1">{transactionPreview.reason}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Send Button */}
                  <button
                    onClick={executeTransfer}
                    disabled={!transactionPreview?.canTransfer || txStatus === 'pending' || !sendTo || !sendAmount}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {txStatus === 'pending' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send CLX
                      </>
                    )}
                  </button>
                  
                  {/* Transaction Status */}
                  {txHash && (
                    <div className={`bg-white/5 rounded-lg p-4 ${
                      txStatus === 'success' ? 'border-green-500/30' : 
                      txStatus === 'error' ? 'border-red-500/30' : 'border-blue-500/30'
                    } border`}>
                      <div className="flex items-center gap-2 mb-2">
                        {txStatus === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : txStatus === 'error' ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-400" />
                        )}
                        <span className={`font-semibold ${
                          txStatus === 'success' ? 'text-green-400' : 
                          txStatus === 'error' ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          {txStatus === 'success' ? 'Transaction Successful' : 
                           txStatus === 'error' ? 'Transaction Failed' : 'Transaction Pending'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-sm">Tx Hash:</span>
                        <button
                          onClick={() => copyToClipboard(txHash)}
                          className="text-blue-400 hover:text-blue-300 text-sm font-mono"
                        >
                          {txHash.slice(0, 10)}...{txHash.slice(-8)}
                        </button>
                        {currentNetwork && (
                          <a
                            href={`${currentNetwork.explorerUrl}/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'receive' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-6">Receive CLX</h3>
                
                {address && (
                  <QRCodeGenerator 
                    address={address}
                    size={200}
                  />
                )}
                
                <div className="mt-6 bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">Network: {currentNetwork?.name}</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Make sure senders are on the correct network to avoid lost funds. 
                    CloutX uses precision-optimized contracts for minimal fees.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-6">Settings</h3>
                
                <div className="space-y-6">
                  {/* Network Selection */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Network</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(NETWORK_CONFIG).map(([chainId, config]) => (
                        <button
                          key={chainId}
                          onClick={() => switchNetwork?.(parseInt(chainId))}
                          className={`p-3 rounded-lg border transition-all flex items-center gap-3 ${
                            chain?.id === parseInt(chainId)
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                              : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          <span className="font-medium">{config.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Display Settings */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Display</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Show Balance</span>
                        <button
                          onClick={() => setShowBalance(!showBalance)}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            showBalance ? 'bg-blue-500' : 'bg-gray-600'
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            showBalance ? 'translate-x-7' : 'translate-x-1'
                          } mt-1`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Advanced Features */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Advanced Features</h4>
                    <div className="space-y-3">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <span className="text-white font-medium">Gas Optimization</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          This wallet uses CloutX's precision-optimized contract with 23.7% gas savings.
                        </p>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-green-400" />
                          <span className="text-white font-medium">Enhanced Security</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Features anti-MEV protection, blacklist detection, and transaction limits.
                        </p>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-blue-400" />
                          <span className="text-white font-medium">Precision Tax Calculation</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          128-bit precision mathematics with zero remainder drift for exact tax splits.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 