
import React from 'react';
import Card from './shared/Card';
import Button from './shared/Button';
import { MOCK_PROPOSALS } from '../constants';
import { Proposal, ProposalStatus } from '../types';
import { Landmark, Scale, FileText } from 'lucide-react';

const ProposalCard: React.FC<{ proposal: Proposal }> = ({ proposal }) => {
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0;
  
  const getStatusChip = (status: ProposalStatus) => {
    switch(status) {
      case ProposalStatus.ACTIVE:
        return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-300">Active</span>;
      case ProposalStatus.PASSED:
        return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-900 text-green-300">Passed</span>;
      case ProposalStatus.FAILED:
        return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-900 text-red-300">Failed</span>;
    }
  }

  return (
    <Card>
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-bold text-white pr-4">{proposal.title}</h3>
        {getStatusChip(proposal.status)}
      </div>
      <p className="text-sm text-clx-text-secondary mt-2 mb-4">{proposal.description}</p>
      
      <div>
        <div className="flex justify-between text-sm mb-1 text-clx-text-secondary">
          <span>For ({forPercentage.toFixed(1)}%)</span>
          <span>Against ({againstPercentage.toFixed(1)}%)</span>
        </div>
        <div className="w-full bg-clx-light-gray rounded-full h-2.5">
          <div className="bg-green-500 h-2.5 rounded-l-full" style={{ width: `${forPercentage}%` }}></div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        {proposal.status === ProposalStatus.ACTIVE ? (
          <div className="flex space-x-2">
            <Button>Vote For</Button>
            <Button variant="secondary">Vote Against</Button>
          </div>
        ) : <div/>}
        <p className="text-xs text-clx-text-secondary">
          {proposal.status === ProposalStatus.ACTIVE ? 'Ends' : 'Ended'} {proposal.endDate.toLocaleDateString()}
        </p>
      </div>
    </Card>
  )
};


const Governance: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Governance DAO</h2>
        <p className="mt-2 text-clx-text-secondary">Use your staked CLX to vote on proposals and shape the future of CloutX.</p>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
            <h3 className="text-clx-text-secondary flex items-center mb-1"><Scale size={16} className="mr-2"/> Your Voting Power</h3>
            <p className="text-2xl font-bold text-white">85,000 Votes</p>
        </Card>
        <Card>
            <h3 className="text-clx-text-secondary flex items-center mb-1"><Landmark size={16} className="mr-2"/> Quorum Threshold</h3>
            <p className="text-2xl font-bold text-white">5,000,000 Votes</p>
        </Card>
        <Card className="flex items-center justify-center">
             <Button className="w-full h-full" variant="primary"><FileText size={16} className="mr-2"/> Create New Proposal</Button>
        </Card>
      </div>

      <div className="space-y-4">
        {MOCK_PROPOSALS.map(prop => <ProposalCard key={prop.id} proposal={prop} />)}
      </div>
    </div>
  );
};

export default Governance;
