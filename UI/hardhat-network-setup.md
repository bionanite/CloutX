# 🔧 Hardhat Network Setup Guide for CloutX

## Quick Setup (Automatic)

1. **Start Hardhat Node** (if not already running):
   ```bash
   cd CloutX
   npx hardhat node
   ```

2. **Deploy Contracts** (if not already deployed):
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Open CloutX Dashboard**:
   ```bash
   cd UI
   npm run dev
   ```
   Visit: http://localhost:3004

4. **Add Network via Dashboard**:
   - Look for the "Network Status" card in the dashboard
   - Click "Add Hardhat" button
   - Approve in MetaMask

## Manual Setup

If the automatic setup doesn't work, add the network manually in MetaMask:

### MetaMask Network Configuration:
- **Network Name**: `Hardhat Local`
- **New RPC URL**: `http://localhost:8545`
- **Chain ID**: `31337`
- **Currency Symbol**: `ETH`
- **Block Explorer URL**: *(Leave blank)*

### Step-by-Step Manual Setup:
1. Open MetaMask
2. Click network dropdown (top of MetaMask)
3. Click "Add network"
4. Click "Add a network manually"
5. Fill in the configuration above
6. Click "Save"

## Import Test Account (Optional)

To test with pre-funded accounts, import one of these private keys:

**Account #0** (Pre-funded with 10,000 ETH):
```
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Account #1** (Pre-funded with 10,000 ETH):
```
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

### How to Import:
1. Open MetaMask
2. Click account circle (top right)
3. Select "Import Account"
4. Paste private key
5. Click "Import"

## Troubleshooting

### Error: "Chain ID returned by the custom network does not match"
- **Solution**: Make sure Hardhat node is running on port 8545
- Check: `http://localhost:8545` should respond

### Error: "Currency symbol doesn't match"
- **Solution**: Use `ETH` as currency symbol (not CLX)
- Hardhat uses ETH for gas fees

### Error: "RPC URL doesn't match known provider"
- **Solution**: Use `http://localhost:8545` (not `http://127.0.0.1:8545`)
- MetaMask prefers localhost format

### Network Not Connecting
1. Stop Hardhat node: `Ctrl+C`
2. Restart: `npx hardhat node`
3. Redeploy contracts: `npx hardhat run scripts/deploy.js --network localhost`
4. Refresh browser

## Contract Addresses (Current Deployment)

```json
{
  "CloutX Token": "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
  "Staking Pool": "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
  "Reward Oracle": "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
  "Governance DAO": "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d"
}
```

## Verification

Once connected, you should see:
- ✅ Network Status: "Hardhat Local" (green)
- ✅ CLX Token balance and data loading
- ✅ Staking, Rewards, and Governance features active

## Next Steps

1. **Connect Wallet**: Click "Connect Wallet" in the dashboard
2. **Get CLX Tokens**: Use the faucet or transfer from deployed contract
3. **Test Features**: Try staking, governance voting, and social rewards
4. **Monitor Transactions**: Check Hardhat console for transaction logs

---

**Need Help?** Check the Hardhat console output for detailed transaction logs and error messages. 