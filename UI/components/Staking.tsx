
import React, { useState } from 'react';
import Card from './shared/Card';
import Button from './shared/Button';
import { STAKING_TIERS } from '../constants';
import { StakingTier } from '../types';
import { Lock, Clock, Percent, Zap } from 'lucide-react';

const StakingTierCard: React.FC<{ tier: StakingTier }> = ({ tier }) => {
  const [amount, setAmount] = useState('');
  
  return (
    <Card className="flex flex-col">
      <div className="flex-grow">
        <h3 className="text-xl font-bold text-white">{tier.days} Days Lock</h3>
        <p className="text-4xl font-bold my-4 text-clx-primary">{tier.apy}% <span className="text-xl font-normal text-clx-text-secondary">APY</span></p>
        <div className="space-y-2 text-sm">
          <p className="flex items-center"><Clock size={14} className="mr-2 text-clx-text-secondary"/> Lock period: {tier.days} days</p>
          <p className="flex items-center"><Zap size={14} className="mr-2 text-clx-text-secondary"/> Loyalty Multiplier: {tier.loyaltyMultiplier}x</p>
        </div>
      </div>
      <div className="mt-6">
        <input 
          type="number" 
          placeholder="Amount to stake" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-clx-dark border border-clx-border rounded-md p-2 mb-2 focus:ring-clx-primary focus:border-clx-primary"
        />
        <Button className="w-full">Stake CLX</Button>
      </div>
    </Card>
  );
};

const Staking: React.FC = () => {
  const [autoCompound, setAutoCompound] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">CLX Staking</h2>
        <p className="mt-2 text-clx-text-secondary">Stake your CLX to earn rewards and increase your governance power.</p>
      </div>

      <Card>
        <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="space-y-1">
                <p className="text-clx-text-secondary">Total Staked Balance</p>
                <p className="text-2xl font-bold text-white">85,000.00 CLX</p>
            </div>
            <div className="space-y-1">
                <p className="text-clx-text-secondary">Total Staking Rewards</p>
                <p className="text-2xl font-bold text-green-400">+1,250.75 CLX</p>
            </div>
            <div className="flex items-center space-x-3">
                <span className="text-clx-text-secondary">Auto-compounding</span>
                 <button onClick={() => setAutoCompound(!autoCompound)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoCompound ? 'bg-clx-primary' : 'bg-clx-light-gray'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoCompound ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            <Button variant="secondary">Emergency Unstake</Button>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STAKING_TIERS.map(tier => <StakingTierCard key={tier.id} tier={tier} />)}
      </div>

      <div>
        <h3 className="text-2xl font-bold text-white mb-4">Your Active Stakes</h3>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-clx-border">
                  <th className="p-3 text-sm font-semibold text-clx-text-secondary">Amount</th>
                  <th className="p-3 text-sm font-semibold text-clx-text-secondary">Tier</th>
                  <th className="p-3 text-sm font-semibold text-clx-text-secondary">Rewards Earned</th>
                  <th className="p-3 text-sm font-semibold text-clx-text-secondary">Unlocks In</th>
                   <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-clx-border hover:bg-clx-light-gray/50">
                  <td className="p-3 font-mono">50,000 CLX</td>
                  <td className="p-3">180 Days</td>
                  <td className="p-3 text-green-400 font-mono">+980.25 CLX</td>
                  <td className="p-3">152 days</td>
                  <td className="p-3 text-right"><Button variant="secondary" size="sm">Unstake</Button></td>
                </tr>
                <tr className="hover:bg-clx-light-gray/50">
                  <td className="p-3 font-mono">35,000 CLX</td>
                  <td className="p-3">60 Days</td>
                  <td className="p-3 text-green-400 font-mono">+270.50 CLX</td>
                  <td className="p-3">25 days</td>
                  <td className="p-3 text-right"><Button variant="secondary" size="sm">Unstake</Button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </div>
  );
};

export default Staking;
