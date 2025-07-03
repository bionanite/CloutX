// Script to add Hardhat Local Network to MetaMask
// Run this in the browser console when connected to the CloutX app

async function addHardhatNetwork() {
  if (!window.ethereum) {
    alert('MetaMask is not installed!');
    return;
  }

  try {
    // Add Hardhat network to MetaMask
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
    
    console.log('Hardhat network added successfully!');
    alert('Hardhat network added to MetaMask successfully!');
  } catch (error) {
    console.error('Error adding Hardhat network:', error);
    
    if (error.code === 4902) {
      alert('Failed to add network. Please add it manually using the settings below.');
    } else if (error.code === -32002) {
      alert('Request pending. Please check MetaMask for a pending request.');
    } else {
      alert(`Error: ${error.message}`);
    }
  }
}

// Manual network configuration for reference
const HARDHAT_NETWORK_CONFIG = {
  'Network Name': 'Hardhat Local',
  'New RPC URL': 'http://localhost:8545',
  'Chain ID': '31337',
  'Currency Symbol': 'ETH',
  'Block Explorer URL': '(Leave blank)'
};

console.log('Hardhat Network Configuration:');
console.table(HARDHAT_NETWORK_CONFIG);
console.log('Run addHardhatNetwork() to add the network automatically');

// Export for use
window.addHardhatNetwork = addHardhatNetwork;
window.HARDHAT_CONFIG = HARDHAT_NETWORK_CONFIG; 