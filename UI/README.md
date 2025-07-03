# CloutX Token Dashboard

A modern, Web3-enabled dashboard for the CloutX (CLX) token ecosystem - the viral, deflationary social-Fi crypto token with "Proof of Virality" features.

![CloutX Dashboard](https://img.shields.io/badge/CloutX-Dashboard-8A2BE2?style=for-the-badge&logo=ethereum)

## 🚀 Features

### 📊 Dashboard
- Real-time CLX token price and market data
- Interactive price charts with historical data
- Live token metrics (market cap, total supply, burned tokens, rewards pool)
- Transaction simulator showing fees, burns, and rewards
- Wallet integration showing balance and CloutScore

### 🔒 Staking
- Multi-tier staking system (30/60/90/180 days)
- Variable APY based on staking duration
- Loyalty multipliers for long-term stakers
- Real-time rewards calculation
- Emergency unstaking with penalties

### 🎁 Rewards
- Social mining rewards from TikTok, X (Twitter), and Threads
- CloutScore-based reward tiers
- Proof of Virality reward system
- Oracle-fed social media engagement data

### 🏛️ Governance
- DAO governance with proposal creation and voting
- Quorum-based decision making
- Timelock execution for security
- Community-driven protocol upgrades

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom CloutX theme
- **Web3**: Wagmi + Viem + RainbowKit for wallet integration
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **State Management**: TanStack Query

## 🔧 Smart Contracts Integration

The dashboard connects to our deployed CloutX smart contracts:

- **CloutXToken**: ERC-20 with deflationary mechanics
- **StakingPool**: Multi-tier staking with loyalty rewards
- **RewardOracleManager**: Social mining and CloutScore management
- **GovernanceDAO**: Decentralized governance system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask or compatible Web3 wallet

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Update contract addresses (after deployment):**
   ```bash
   npm run update-contracts
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

### 🔗 Wallet Setup

1. Connect your MetaMask wallet
2. Add Polygon or Base network (or Hardhat for local development)
3. Import CLX token using contract address: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

## 📱 Usage Guide

### Getting Started
1. **Connect Wallet**: Click "Connect Wallet" in the top right
2. **View Dashboard**: See your CLX balance, market data, and ecosystem stats
3. **Simulate Transactions**: Use the transaction simulator to understand fees

### Staking CLX
1. Navigate to the **Staking** tab
2. Choose your staking tier (30-180 days)
3. Enter amount and confirm transaction
4. Track rewards in real-time

### Claiming Rewards
1. Visit the **Rewards** tab
2. View your CloutScore and pending social rewards
3. Claim accumulated rewards from staking and social mining

### Participating in Governance
1. Go to the **Governance** tab
2. View active proposals
3. Cast your votes using CLX voting power
4. Create new proposals (requires minimum CLX balance)

## 🎨 Customization

### Theme Colors
The dashboard uses a custom CloutX color palette:
- Primary: `#8A2BE2` (BlueViolet)
- Secondary: `#9D4EDD` (Medium Slate Blue)
- Accent: `#C77DFF` (Light Purple)
- Dark backgrounds for optimal UX

### Adding New Features
1. Create components in `src/components/`
2. Add contract hooks in `src/hooks/`
3. Update navigation in `Header.tsx`

## 🔧 Configuration

### Web3 Config
Update `src/config/web3.ts` to:
- Add new networks
- Configure WalletConnect Project ID
- Update contract addresses

### Environment Variables
Create `.env.local` for:
```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_NETWORK=polygon
```

## 📜 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run update-contracts` - Update contract addresses from deployment

## 🌐 Supported Networks

- **Polygon Mainnet** (Recommended for production)
- **Base Mainnet** (L2 scaling solution)
- **Hardhat Local** (Development and testing)

## 🔐 Security

- All contract interactions are validated
- RainbowKit provides secure wallet connections
- No private keys stored in frontend
- Contract addresses verified on-chain

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Report bugs on GitHub Issues
- **Community**: Join our Discord/Telegram
- **Email**: support@cloutx.io

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Cross-chain bridge integration
- [ ] NFT marketplace integration
- [ ] Enhanced social mining features

---

**Built with ❤️ for the CloutX Community**

*Experience the future of Social-Fi with CloutX - where your social influence becomes your financial power.*
