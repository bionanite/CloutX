
import React from 'react';
import Card from './shared/Card';
import Button from './shared/Button';
import { MOCK_SOCIAL_POSTS } from '../constants';
import { SocialPost } from '../types';
import { Award, UserCheck, Star, Rss } from 'lucide-react';

const SocialPostCard: React.FC<{ post: SocialPost }> = ({ post }) => {
  const PlatformIcon = ({ platform }: { platform: string }) => {
    // In a real app, you'd use actual icons
    if (platform === 'TikTok') return <span className="text-xl">🕺</span>;
    if (platform === 'X') return <span className="text-xl">🐦</span>;
    if (platform === 'Threads') return <span className="text-xl">@</span>;
    return null;
  };
    
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
                <PlatformIcon platform={post.platform} />
                <span className="font-bold">{post.platform}</span>
            </div>
            <p className="text-lg font-bold text-green-400">+{post.reward} CLX</p>
        </div>
        <p className="my-3 text-clx-text-secondary">{post.content}</p>
      </div>
      <p className="text-sm flex items-center"><Star size={14} className="mr-2 text-yellow-400"/> {post.engagement.toLocaleString()} Engagement</p>
    </Card>
  )
};

const Rewards: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Social Mining Rewards</h2>
        <p className="mt-2 text-clx-text-secondary">Earn CLX by proving your influence. Connect your socials and get rewarded for viral content.</p>
      </div>
      
      <Card>
        <div className="flex flex-wrap justify-between items-center gap-6">
          <div className="space-y-1">
              <p className="text-clx-text-secondary flex items-center"><Award size={16} className="mr-2"/> Total Claimable Rewards</p>
              <p className="text-2xl font-bold text-green-400">2,200 CLX</p>
          </div>
          <div className="space-y-1">
              <p className="text-clx-text-secondary flex items-center"><UserCheck size={16} className="mr-2"/> Your CloutScore</p>
              <p className="text-2xl font-bold text-white">850</p>
          </div>
          <Button>Claim All Rewards</Button>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center"><Rss size={20} className="mr-2"/>Connect Socials</h3>
          <p className="text-clx-text-secondary mb-6">Connect your accounts to allow the Reward Oracle to track your influence.</p>
          <div className="space-y-3">
            <Button className="w-full" variant="secondary">Connect X (Twitter)</Button>
            <Button className="w-full" variant="secondary">Connect TikTok</Button>
            <Button className="w-full" variant="secondary">Connect Threads</Button>
          </div>
        </Card>
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-2xl font-bold text-white">Your Rewarded Content</h3>
          <div className="space-y-4">
            {MOCK_SOCIAL_POSTS.map(post => <SocialPostCard key={post.id} post={post} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rewards;
