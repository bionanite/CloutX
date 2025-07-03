# CloutX Mobile App Setup Guide

## 🚀 React Native + Web3 Stack for CloutX

### Prerequisites
```bash
# Install Node.js (v18+)
# Install React Native CLI
npm install -g react-native-cli

# iOS (macOS only)
# Install Xcode from App Store
# Install CocoaPods
sudo gem install cocoapods

# Android
# Install Android Studio
# Setup Android SDK
```

### Project Initialization
```bash
# Create new React Native project
npx react-native@latest init CloutXMobile --template react-native-template-typescript

cd CloutXMobile

# Install essential dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @walletconnect/react-native-dapp
npm install ethers react-native-crypto react-native-randombytes
npm install @reduxjs/toolkit react-redux react-redux-toolkit-query
npm install native-base react-native-svg react-native-vector-icons
npm install react-native-chart-kit victory-native
npm install @react-native-async-storage/async-storage
npm install react-native-keychain
npm install @react-native-firebase/app @react-native-firebase/messaging

# iOS specific
cd ios && pod install && cd ..
```

### Project Structure
```
CloutXMobile/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   ├── Staking/
│   │   ├── Governance/
│   │   └── shared/
│   ├── hooks/
│   │   ├── useCloutXToken.ts
│   │   ├── useStaking.ts
│   │   └── useWallet.ts
│   ├── services/
│   │   ├── web3Service.ts
│   │   ├── notificationService.ts
│   │   └── storageService.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── store/
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── constants.ts
├── android/
├── ios/
└── package.json
```

### Web3 Configuration
```typescript
// src/services/web3Service.ts
import { ethers } from 'ethers';
import WalletConnect from '@walletconnect/client';

export const CONTRACT_ADDRESSES = {
  CloutXToken: '0xc5a5C42992dECbae36851359345FE25997F5C42d',
  StakingPool: '0x67d269191c92Caf3cD7723F116c85e6E9bf55933',
  // ... other contracts
};

export class Web3Service {
  private provider: ethers.providers.JsonRpcProvider;
  
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  }
  
  async getTokenBalance(address: string): Promise<string> {
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.CloutXToken,
      CLOUTX_TOKEN_ABI,
      this.provider
    );
    const balance = await contract.balanceOf(address);
    return ethers.utils.formatEther(balance);
  }
}
```

### Main App Component
```typescript
// App.tsx
import React from 'react';
import { NativeBaseProvider } from 'native-base';
import { Provider } from 'react-redux';
import { WalletConnectProvider } from '@walletconnect/react-native-dapp';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { store } from './src/store';
import { theme } from './src/theme';

const App: React.FC = () => {
  return (
    <WalletConnectProvider
      redirectUrl="cloutx://walletconnect"
      storageOptions={{
        asyncStorage: AsyncStorage,
      }}
    >
      <Provider store={store}>
        <NativeBaseProvider theme={theme}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </NativeBaseProvider>
      </Provider>
    </WalletConnectProvider>
  );
};

export default App;
```

### Navigation Setup
```typescript
// src/navigation/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../components/Dashboard/DashboardScreen';
import { StakingScreen } from '../components/Staking/StakingScreen';
import { GovernanceScreen } from '../components/Governance/GovernanceScreen';
import { RewardsScreen } from '../components/Rewards/RewardsScreen';

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: '#1a1a1a' },
        tabBarActiveTintColor: '#8A2BE2',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Staking" component={StakingScreen} />
      <Tab.Screen name="Governance" component={GovernanceScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
    </Tab.Navigator>
  );
};
```

### Running the App
```bash
# Start Metro bundler
npx react-native start

# Run on iOS simulator
npx react-native run-ios

# Run on Android emulator
npx react-native run-android

# For physical devices
npx react-native run-ios --device
npx react-native run-android --device
```

### Development Workflow
```bash
# 1. Start Hardhat node (in CloutX directory)
cd ../CloutX
npx hardhat node

# 2. Deploy contracts
npx hardhat run scripts/deploy-tax-fixed.js --network localhost

# 3. Start React Native app
cd ../CloutXMobile
npx react-native start

# 4. Open in simulator/device
npx react-native run-ios
```

### Key Features to Implement
1. **Wallet Connection**: WalletConnect + MetaMask Mobile
2. **Dashboard**: Balance, stats, price charts
3. **Staking**: Stake/unstake CLX tokens
4. **Governance**: View and vote on proposals
5. **Rewards**: Claim staking and social rewards
6. **Push Notifications**: Transaction updates
7. **Biometric Security**: Touch/Face ID for transactions
8. **Offline Mode**: Cache data for offline viewing

### Testing Strategy
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests with Detox
npm install -g detox-cli
detox build --configuration ios.sim.debug
detox test --configuration ios.sim.debug
```

### Deployment
```bash
# iOS
# 1. Configure signing in Xcode
# 2. Archive and upload to App Store Connect

# Android
# 1. Generate signed APK
cd android && ./gradlew assembleRelease

# 2. Upload to Google Play Console
```

## 🎯 Next Steps
1. Initialize React Native project
2. Set up Web3 integration
3. Create basic navigation
4. Implement wallet connection
5. Build dashboard with stats
6. Add staking functionality
7. Implement push notifications
8. Add biometric security
9. Test on devices
10. Deploy to app stores 