import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useAccount, useBalance, useNetwork } from 'wagmi';
import { formatEther } from 'viem';
import { 
  Wallet, 
  Send, 
  Receive, 
  TrendingUp,
  Menu,
  X,
  ArrowLeft,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react';

interface MobileWalletProps {
  onDesktopModeToggle?: () => void;
}

export const MobileWallet: React.FC<MobileWalletProps> = ({ onDesktopModeToggle }) => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { data: nativeBalance } = useBalance({ address });
  
  const [activeScreen, setActiveScreen] = useState<'home' | 'send' | 'receive' | 'menu'>('home');
  const [showBalance, setShowBalance] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cloutxBalance, setCloutxBalance] = useState('0');

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mock CloutX balance (replace with actual contract call)
  useEffect(() => {
    setCloutxBalance('12,345.67');
  }, []);

  // Handle swipe gestures
  const handleSwipe = (event: MouseEvent | TouchEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      // Horizontal swipe
      if (offset.x > 100 && velocity.x > 500) {
        // Swipe right - go back
        if (activeScreen !== 'home') {
          setActiveScreen('home');
        }
      } else if (offset.x < -100 && velocity.x < -500) {
        // Swipe left - open menu
        setMenuOpen(true);
      }
    }
  };

  if (!isMobile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Mobile View</h2>
          <p className="text-gray-500 mb-4">
            This component is optimized for mobile devices. 
            Please resize your browser or use a mobile device.
          </p>
          <button
            onClick={onDesktopModeToggle}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Switch to Desktop View
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">CloutX Mobile</h1>
          <p className="text-gray-300 mb-8">
            Connect your wallet to get started
          </p>
          <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold">
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 relative overflow-hidden">
      
      {/* Main Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleSwipe}
        className="h-full"
      >
        <AnimatePresence mode="wait">
          {activeScreen === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="p-4 h-full"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8 mt-4">
                <div>
                  <h1 className="text-xl font-bold text-white">CloutX Wallet</h1>
                  <p className="text-gray-300 text-sm">
                    {chain?.name || 'Unknown Network'}
                  </p>
                </div>
                <button
                  onClick={() => setMenuOpen(true)}
                  className="p-2 bg-white/10 rounded-lg"
                >
                  <Menu className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Balance Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-300">Total Balance</span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    {showBalance ? 
                      <Eye className="w-5 h-5 text-gray-400" /> : 
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    }
                  </button>
                </div>
                
                <div className="mb-4">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {showBalance ? `${cloutxBalance} CLX` : '••••••'}
                  </h2>
                  <p className="text-gray-300">
                    ≈ ${showBalance ? '8,765.43' : '••••••'} USD
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <span className="text-gray-400 text-sm">24h Change</span>
                    <p className="text-green-400 font-semibold">+12.5%</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <span className="text-gray-400 text-sm">{chain?.nativeCurrency?.symbol}</span>
                    <p className="text-white font-semibold">
                      {showBalance && nativeBalance ? 
                        `${parseFloat(formatEther(nativeBalance.value)).toFixed(4)}` : 
                        '••••'
                      }
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveScreen('send')}
                  className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20"
                >
                  <Send className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <span className="text-white text-sm font-medium">Send</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveScreen('receive')}
                  className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20"
                >
                  <Receive className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <span className="text-white text-sm font-medium">Receive</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20"
                >
                  <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <span className="text-white text-sm font-medium">Trade</span>
                </motion.button>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <Send className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Sent CLX</p>
                          <p className="text-gray-400 text-sm">2 hours ago</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">-1,000 CLX</p>
                        <p className="text-gray-400 text-sm">$723.45</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Swipe Hint */}
              <div className="flex items-center justify-center mt-6">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                  <span>Swipe left for menu</span>
                </div>
              </div>
            </motion.div>
          )}

          {activeScreen === 'send' && (
            <motion.div
              key="send"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="p-4 h-full"
            >
              {/* Header */}
              <div className="flex items-center mb-8 mt-4">
                <button
                  onClick={() => setActiveScreen('home')}
                  className="p-2 bg-white/10 rounded-lg mr-4"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-xl font-bold text-white">Send CLX</h1>
              </div>

              {/* Send Form */}
              <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Recipient</label>
                      <input
                        type="text"
                        placeholder="0x... or ENS name"
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 mb-2">Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-4 pr-16 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-4 top-4 text-gray-400">CLX</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Available:</span>
                      <span className="text-white">{cloutxBalance} CLX</span>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold"
                >
                  Review Transaction
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeScreen === 'receive' && (
            <motion.div
              key="receive"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="p-4 h-full"
            >
              {/* Header */}
              <div className="flex items-center mb-8 mt-4">
                <button
                  onClick={() => setActiveScreen('home')}
                  className="p-2 bg-white/10 rounded-lg mr-4"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-xl font-bold text-white">Receive CLX</h1>
              </div>

              {/* QR Code */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
                <div className="bg-white p-4 rounded-xl mx-auto mb-6 w-fit">
                  <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">QR Code</span>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-300 mb-2">Your Address</p>
                  <p className="text-white font-mono text-sm break-all">
                    {address}
                  </p>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg mt-4"
                >
                  Copy Address
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Side Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 w-80 h-full bg-gray-900/95 backdrop-blur-lg border-l border-white/20 z-50 p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white">Menu</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 bg-white/10 rounded-lg"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <button className="w-full text-left bg-white/10 hover:bg-white/20 rounded-lg p-4 text-white transition-colors">
                  Settings
                </button>
                <button className="w-full text-left bg-white/10 hover:bg-white/20 rounded-lg p-4 text-white transition-colors">
                  Security
                </button>
                <button className="w-full text-left bg-white/10 hover:bg-white/20 rounded-lg p-4 text-white transition-colors">
                  Support
                </button>
                {onDesktopModeToggle && (
                  <button 
                    onClick={onDesktopModeToggle}
                    className="w-full text-left bg-white/10 hover:bg-white/20 rounded-lg p-4 text-white transition-colors"
                  >
                    Desktop Mode
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}; 