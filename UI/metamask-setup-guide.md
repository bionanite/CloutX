# 🦊 MetaMask Setup Guide for CloutX Testing

## ⚠️ Common MetaMask Errors & Solutions

If you're seeing errors like:
- "Network name may not correctly match this chain ID"
- "Currency symbol does not match what we expect"
- "RPC URL value does not match a known provider"
- "Chain ID returned by custom network does not match"

**Follow these exact steps:**

## 🔧 Step 1: Reset MetaMask Network (If Needed)

If you already tried adding the network and got errors:

1. **Open MetaMask**
2. **Click Network Dropdown** (top of MetaMask)
3. **Find "Hardhat Local"** (if it exists)
4. **Click the "X"** to remove it
5. **Confirm removal**

## 🌐 Step 2: Add Hardhat Network (Correct Settings)

1. **Open MetaMask Extension**
2. **Click Network Dropdown** (top center)
3. **Click "Add Network"**
4. **Click "Add a network manually"** (bottom)

### 📋 Enter EXACT Values:

```
Network Name: Localhost 8545
RPC URL: http://127.0.0.1:8545
Chain ID: 1337
Currency Symbol: ETH
Block Explorer URL: (leave blank)
```

**⚠️ IMPORTANT:**
- Use `Localhost 8545` (not "Hardhat Local")
- Use `http://127.0.0.1:8545` (not localhost)
- Chain ID must be exactly `1337`
- Currency symbol must be `ETH` (not CLX)

5. **Click "Save"**
6. **Switch to the new network**

## 🔑 Step 3: Import Test Account

1. **Click Account Menu** (top right circle)
2. **Click "Import Account"**
3. **Select "Private Key"**
4. **Paste this private key:**

```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

5. **Click "Import"**
6. **Rename account to "CloutX Test"** (optional)

## ✅ Step 4: Verify Setup

After setup, you should see:
- **Network:** "Localhost 8545" 
- **Account Balance:** ~10,000 ETH
- **CLX Token Balance:** 1,000,000,000 CLX (after connecting to dashboard)

## 🚀 Step 5: Test Connection

1. **Visit:** `http://localhost:3001/`
2. **Click "Connect Wallet"** in the dashboard
3. **Select MetaMask**
4. **Approve connection**
5. **You should see your 1B CLX balance!**

## 🔄 Troubleshooting

### If you still get errors:

**Option A: Clear MetaMask Cache**
1. MetaMask → Settings → Advanced
2. Click "Reset Account" 
3. Confirm (this clears transaction history, not your accounts)
4. Re-add the network with exact settings above

**Option B: Use Different Network Name**
Try these alternative names:
- `Hardhat`
- `Local Testnet`
- `Development`

**Option C: Restart Everything**
1. Close MetaMask completely
2. Restart your browser
3. Re-add network with exact settings

### If Hardhat node is not responding:

Check if Hardhat is running:
```bash
# In CloutX directory
npx hardhat node
```

Should show:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

## 📱 Quick Test Commands

Test if everything is working:

```bash
# Test RPC connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://127.0.0.1:8545

# Should return: {"jsonrpc":"2.0","id":1,"result":"0x539"}
# (0x539 = 1337 in hex)
```

## 🎯 Final Checklist

- ✅ MetaMask connected to "Localhost 8545"
- ✅ Chain ID shows 1337
- ✅ Test account imported with ~10,000 ETH
- ✅ Dashboard loads at `http://localhost:3001/`
- ✅ "Connect Wallet" works
- ✅ CLX balance shows 1,000,000,000

## 🆘 Still Having Issues?

If you're still getting errors, the problem might be:

1. **Hardhat node not running** - Make sure `npx hardhat node` is active
2. **Port conflict** - Try restarting Hardhat node
3. **Browser cache** - Try incognito/private mode
4. **MetaMask version** - Update to latest version

The key is using the **exact network settings** above. MetaMask is very particular about custom networks!

# MetaMask Setup Guide for CloutX (CLX) Token

## Quick Setup

After connecting your wallet to the CloutX dashboard, you'll need to add the CLX token to see your balance in MetaMask.

### Automatic Method (Recommended)

1. **Connect your wallet** using the "Connect Wallet" button in the top-right corner
2. **Click "Add CLX"** button next to the Connect Wallet button
3. **Approve** the token addition in MetaMask when prompted
4. **Done!** CLX will now appear in your MetaMask assets

### Manual Method (If automatic fails)

If the automatic method doesn't work, you can add the token manually:

1. **Open MetaMask** and go to your wallet
2. **Click "Assets"** tab
3. **Click "Import tokens"** at the bottom
4. **Select "Custom Token"** tab
5. **Enter the following details:**
   - **Contract Address:** `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
   - **Symbol:** `CLX`
   - **Decimals:** `18`
6. **Click "Add Custom Token"**
7. **Click "Import Tokens"** to confirm

## Token Information

- **Name:** CloutX Token
- **Symbol:** CLX
- **Decimals:** 18
- **Contract Address:** `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **Network:** Hardhat Local (for testing)

## Network Configuration

Make sure you're connected to the correct network:

### For Local Testing (Hardhat)
- **Network Name:** Hardhat Local
- **RPC URL:** `http://localhost:8545`
- **Chain ID:** `31337`
- **Currency Symbol:** ETH

### For Polygon Mainnet (Production)
- **Network Name:** Polygon Mainnet
- **RPC URL:** `https://polygon-rpc.com`
- **Chain ID:** `137`
- **Currency Symbol:** MATIC

### For Base Mainnet (Production)
- **Network Name:** Base
- **RPC URL:** `https://mainnet.base.org`
- **Chain ID:** `8453`
- **Currency Symbol:** ETH

## Troubleshooting

### Token not showing after adding?
- Make sure you're on the correct network
- Check that the contract address is correct
- Try refreshing MetaMask or restarting the browser

### "Add CLX" button not working?
- Ensure MetaMask is installed and unlocked
- Make sure you're connected to the correct network
- Try the manual method instead

### Balance showing as 0?
- The token contract needs to be deployed and you need to have CLX tokens
- For testing, you can interact with the staking and rewards features to earn tokens

## Getting CLX Tokens

On the local testnet, you can:
1. **Stake ETH** to earn CLX rewards
2. **Participate in governance** to earn CLX
3. **Complete social media tasks** (when oracle is active)
4. **Use the faucet function** (if implemented by developers)

For production networks, CLX tokens can be acquired through:
- Decentralized exchanges (DEX)
- Liquidity provision
- Staking rewards
- Social media engagement rewards

## Security Notes

- Always verify the contract address before adding tokens
- Only add tokens from trusted sources
- Be cautious of scam tokens with similar names
- The official CLX contract address will be announced on official channels

## Need Help?

If you encounter any issues:
1. Check this guide first
2. Try the manual token addition method
3. Ensure you're on the correct network
4. Contact the CloutX team through official channels 