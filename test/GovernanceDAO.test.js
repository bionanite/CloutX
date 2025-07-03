const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("GovernanceDAO", function () {
  let CloutXToken, cloutXToken;
  let StakingPool, stakingPool;
  let GovernanceDAO, governanceDAO;
  let owner, user1, user2, user3, user4, user5;
  let initialSupply = ethers.utils.parseEther("1000000000"); // 1 billion CLX

  beforeEach(async function () {
    [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
    
    // Deploy CLX token using upgrades proxy
    CloutXToken = await ethers.getContractFactory("CloutXToken");
    cloutXToken = await upgrades.deployProxy(CloutXToken, [
      "CloutX", "CLX", initialSupply, owner.address, owner.address
    ], { kind: 'uups' });
    await cloutXToken.deployed();
    
    // Deploy staking pool using upgrades proxy
    StakingPool = await ethers.getContractFactory("StakingPool");
    stakingPool = await upgrades.deployProxy(StakingPool, [
      cloutXToken.address, owner.address
    ], { kind: 'uups' });
    await stakingPool.deployed();
    
    // Deploy governance DAO using upgrades proxy
    GovernanceDAO = await ethers.getContractFactory("GovernanceDAO");
    governanceDAO = await upgrades.deployProxy(GovernanceDAO, [
      cloutXToken.address, stakingPool.address, owner.address
    ], { kind: 'uups' });
    await governanceDAO.deployed();
    
    // Link contracts
    await cloutXToken.updateStakingContract(stakingPool.address);
    await cloutXToken.updateGovernanceContract(governanceDAO.address);
    await stakingPool.updateGovernanceContract(governanceDAO.address);
    
    // Transfer tokens to users for testing
    await cloutXToken.transfer(user1.address, ethers.utils.parseEther("1000000"));
    await cloutXToken.transfer(user2.address, ethers.utils.parseEther("1000000"));
    await cloutXToken.transfer(user3.address, ethers.utils.parseEther("1000000"));
    await cloutXToken.transfer(user4.address, ethers.utils.parseEther("1000000"));
    await cloutXToken.transfer(user5.address, ethers.utils.parseEther("1000000"));
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await governanceDAO.cloutXToken()).to.equal(cloutXToken.address);
      expect(await governanceDAO.stakingPool()).to.equal(stakingPool.address);
      expect(await governanceDAO.proposalCount()).to.equal(0);
    });

    it("Should set initial governance settings", async function () {
      const settings = await governanceDAO.getGovernanceSettings();
      expect(settings.votingDelay).to.equal(1);
      expect(settings.votingPeriod).to.equal(3 * 24 * 3600); // 3 days
      expect(settings.proposalThreshold).to.equal(ethers.utils.parseEther("10000"));
      expect(settings.quorumVotes).to.equal(ethers.utils.parseEther("100000"));
      expect(settings.timelockDelay).to.equal(2 * 24 * 3600); // 2 days
      expect(settings.emergencyVotingPeriod).to.equal(24 * 3600); // 1 day
      expect(settings.emergencyQuorum).to.equal(ethers.utils.parseEther("50000"));
    });
  });

  describe("Voting Power", function () {
    beforeEach(async function () {
      // Approve and stake tokens for users
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await cloutXToken.connect(user2).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await cloutXToken.connect(user3).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("50000"), 0, false);
      await stakingPool.connect(user2).stake(ethers.utils.parseEther("30000"), 0, false);
      await stakingPool.connect(user3).stake(ethers.utils.parseEther("20000"), 0, false);
    });

    it("Should calculate voting power based on staked tokens", async function () {
      expect(await governanceDAO.getVotingPower(user1.address)).to.equal(ethers.utils.parseEther("50000"));
      expect(await governanceDAO.getVotingPower(user2.address)).to.equal(ethers.utils.parseEther("30000"));
      expect(await governanceDAO.getVotingPower(user3.address)).to.equal(ethers.utils.parseEther("20000"));
    });

    it("Should calculate total voting power", async function () {
      expect(await governanceDAO.getTotalVotingPower()).to.equal(ethers.utils.parseEther("100000"));
    });
  });

  describe("Proposal Creation", function () {
    beforeEach(async function () {
      // Stake tokens to meet proposal threshold
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("15000"), 0, false);
    });

    it("Should allow users with sufficient voting power to create proposals", async function () {
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["updateTaxConfig(uint256,uint256,uint256,uint256,uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [200, 200, 100, 5000, 5000]
      )];
      const description = "Update tax configuration";

      await expect(
        governanceDAO.connect(user1).propose(targets, values, signatures, calldatas, description)
      ).to.emit(governanceDAO, "ProposalCreated")
        .withArgs(0, user1.address, targets, values, signatures, calldatas, description, anyValue, anyValue, anyValue);

      expect(await governanceDAO.proposalCount()).to.equal(1);
    });

    it("Should prevent users with insufficient voting power from creating proposals", async function () {
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["updateTaxConfig(uint256,uint256,uint256,uint256,uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [200, 200, 100, 5000, 5000]
      )];
      const description = "Update tax configuration";

      await expect(
        governanceDAO.connect(user2).propose(targets, values, signatures, calldatas, description)
      ).to.be.revertedWith("GovernanceDAO: Insufficient voting power to propose");
    });

    it("Should validate proposal parameters", async function () {
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["updateTaxConfig(uint256,uint256,uint256,uint256,uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [200, 200, 100, 5000, 5000]
      )];
      const description = "Update tax configuration";

      // Test mismatched arrays
      await expect(
        governanceDAO.connect(user1).propose(
          [cloutXToken.address, cloutXToken.address], // Extra target
          values,
          signatures,
          calldatas,
          description
        )
      ).to.be.revertedWith("GovernanceDAO: Proposal function information arity mismatch");

      // Test empty actions
      await expect(
        governanceDAO.connect(user1).propose([], [], [], [], description)
      ).to.be.revertedWith("GovernanceDAO: Must provide actions");

      // Test too many actions
      const manyTargets = Array(11).fill(cloutXToken.address);
      const manyValues = Array(11).fill(0);
      const manySignatures = Array(11).fill("updateTaxConfig(uint256,uint256,uint256,uint256,uint256)");
      const manyCalldatas = Array(11).fill(calldatas[0]);

      await expect(
        governanceDAO.connect(user1).propose(manyTargets, manyValues, manySignatures, manyCalldatas, description)
      ).to.be.revertedWith("GovernanceDAO: Too many actions");
    });
  });

  describe("Emergency Proposals", function () {
    beforeEach(async function () {
      // Stake more tokens to meet emergency proposal threshold (2x normal)
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("25000"), 0, false);
    });

    it("Should allow emergency proposals with higher threshold", async function () {
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["setPaused(bool)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(["bool"], [true])];
      const description = "Emergency pause";

      await expect(
        governanceDAO.connect(user1).proposeEmergency(targets, values, signatures, calldatas, description)
      ).to.emit(governanceDAO, "EmergencyProposalCreated")
        .withArgs(0, user1.address, description, anyValue);
    });

    it("Should require higher voting power for emergency proposals", async function () {
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["setPaused(bool)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(["bool"], [true])];
      const description = "Emergency pause";

      // User with only 15k staked (below 2x threshold)
      await expect(
        governanceDAO.connect(user2).proposeEmergency(targets, values, signatures, calldatas, description)
      ).to.be.revertedWith("GovernanceDAO: Insufficient voting power for emergency proposal");
    });
  });

  describe("Voting", function () {
    let proposalId;

    beforeEach(async function () {
      // Create a proposal
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("15000"), 0, false);
      
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["updateTaxConfig(uint256,uint256,uint256,uint256,uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [200, 200, 100, 5000, 5000]
      )];
      const description = "Update tax configuration";

      await governanceDAO.connect(user1).propose(targets, values, signatures, calldatas, description);
      proposalId = 0;
    });

    it("Should allow voting on active proposals", async function () {
      // Stake tokens for voting
      await cloutXToken.connect(user2).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user2).stake(ethers.utils.parseEther("20000"), 0, false);

      await expect(
        governanceDAO.connect(user2).castVote(proposalId, 1, "I support this proposal")
      ).to.emit(governanceDAO, "VoteCast")
        .withArgs(user2.address, proposalId, 1, anyValue, "I support this proposal");

      const receipt = await governanceDAO.getReceipt(proposalId, user2.address);
      expect(receipt.hasVoted).to.be.true;
      expect(receipt.support).to.equal(1); // For
      expect(receipt.votes).to.equal(ethers.utils.parseEther("20000"));
    });

    it("Should prevent voting on inactive proposals", async function () {
      // Fast forward past voting period
      const proposal = await governanceDAO.getProposal(proposalId);
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.endTime + 1]); await ethers.provider.send("evm_mine");

      await expect(
        governanceDAO.connect(user2).castVote(proposalId, 1, "Vote")
      ).to.be.revertedWith("GovernanceDAO: Voting is closed");
    });

    it("Should prevent double voting", async function () {
      await cloutXToken.connect(user2).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user2).stake(ethers.utils.parseEther("20000"), 0, false);

      await governanceDAO.connect(user2).castVote(proposalId, 1, "First vote");

      await expect(
        governanceDAO.connect(user2).castVote(proposalId, 0, "Second vote")
      ).to.be.revertedWith("GovernanceDAO: Already voted");
    });

    it("Should prevent voting without voting power", async function () {
      await expect(
        governanceDAO.connect(user2).castVote(proposalId, 1, "Vote")
      ).to.be.revertedWith("GovernanceDAO: No voting power");
    });

    it("Should validate vote support values", async function () {
      await cloutXToken.connect(user2).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user2).stake(ethers.utils.parseEther("20000"), 0, false);

      await expect(
        governanceDAO.connect(user2).castVote(proposalId, 3, "Invalid vote")
      ).to.be.revertedWith("GovernanceDAO: Invalid value for enum VoteType");
    });

    it("Should track vote counts correctly", async function () {
      // Stake tokens for multiple voters
      await cloutXToken.connect(user2).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await cloutXToken.connect(user3).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await cloutXToken.connect(user4).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      
      await stakingPool.connect(user2).stake(ethers.utils.parseEther("20000"), 0, false);
      await stakingPool.connect(user3).stake(ethers.utils.parseEther("15000"), 0, false);
      await stakingPool.connect(user4).stake(ethers.utils.parseEther("10000"), 0, false);

      // Vote For
      await governanceDAO.connect(user2).castVote(proposalId, 1, "For");
      
      // Vote Against
      await governanceDAO.connect(user3).castVote(proposalId, 0, "Against");
      
      // Vote Abstain
      await governanceDAO.connect(user4).castVote(proposalId, 2, "Abstain");

      const proposal = await governanceDAO.getProposal(proposalId);
      expect(proposal.forVotes).to.equal(ethers.utils.parseEther("20000"));
      expect(proposal.againstVotes).to.equal(ethers.utils.parseEther("15000"));
      expect(proposal.abstainVotes).to.equal(ethers.utils.parseEther("10000"));
    });
  });

  describe("Proposal States", function () {
    let proposalId;

    beforeEach(async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("15000"), 0, false);
      
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["updateTaxConfig(uint256,uint256,uint256,uint256,uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [200, 200, 100, 5000, 5000]
      )];
      const description = "Update tax configuration";

      await governanceDAO.connect(user1).propose(targets, values, signatures, calldatas, description);
      proposalId = 0;
    });

    it("Should start in Pending state", async function () {
      expect(await governanceDAO.state(proposalId)).to.equal(0); // Pending
    });

    it("Should transition to Active state after voting delay", async function () {
      const proposal = await governanceDAO.getProposal(proposalId);
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.startTime + 1]); await ethers.provider.send("evm_mine");
      
      expect(await governanceDAO.state(proposalId)).to.equal(1); // Active
    });

    it("Should transition to Succeeded state with sufficient votes", async function () {
      const proposal = await governanceDAO.getProposal(proposalId);
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.startTime + 1]); await ethers.provider.send("evm_mine");
      
      // Vote with enough power to meet quorum
      await cloutXToken.connect(user2).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user2).stake(ethers.utils.parseEther("100000"), 0, false);
      await governanceDAO.connect(user2).castVote(proposalId, 1, "For");
      
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.endTime + 1]); await ethers.provider.send("evm_mine");
      
      expect(await governanceDAO.state(proposalId)).to.equal(4); // Succeeded
    });

    it("Should transition to Defeated state without sufficient votes", async function () {
      const proposal = await governanceDAO.getProposal(proposalId);
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.endTime + 1]); await ethers.provider.send("evm_mine");
      
      expect(await governanceDAO.state(proposalId)).to.equal(3); // Defeated
    });

    it("Should allow cancellation by proposer", async function () {
      await governanceDAO.connect(user1).cancel(proposalId);
      
      expect(await governanceDAO.state(proposalId)).to.equal(2); // Canceled
    });

    it("Should prevent cancellation by non-proposer", async function () {
      await expect(
        governanceDAO.connect(user2).cancel(proposalId)
      ).to.be.revertedWith("GovernanceDAO: Only proposer can cancel");
    });
  });

  describe("Proposal Execution", function () {
    let proposalId;

    beforeEach(async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("15000"), 0, false);
      
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["updateTaxConfig(uint256,uint256,uint256,uint256,uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [200, 200, 100, 5000, 5000]
      )];
      const description = "Update tax configuration";

      await governanceDAO.connect(user1).propose(targets, values, signatures, calldatas, description);
      proposalId = 0;
    });

    it("Should allow queuing successful proposals", async function () {
      // Make proposal succeed
      const proposal = await governanceDAO.getProposal(proposalId);
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.startTime + 1]); await ethers.provider.send("evm_mine");
      
      await cloutXToken.connect(user2).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user2).stake(ethers.utils.parseEther("100000"), 0, false);
      await governanceDAO.connect(user2).castVote(proposalId, 1, "For");
      
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.endTime + 1]); await ethers.provider.send("evm_mine");
      
      await expect(
        governanceDAO.connect(user1).queue(proposalId)
      ).to.emit(governanceDAO, "ProposalQueued")
        .withArgs(proposalId, anyValue);
    });

    it("Should prevent queuing unsuccessful proposals", async function () {
      await expect(
        governanceDAO.connect(user1).queue(proposalId)
      ).to.be.revertedWith("GovernanceDAO: Proposal not successful");
    });

    it("Should allow execution after timelock", async function () {
      // Make proposal succeed and queue it
      const proposal = await governanceDAO.getProposal(proposalId);
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.startTime + 1]); await ethers.provider.send("evm_mine");
      
      await cloutXToken.connect(user2).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user2).stake(ethers.utils.parseEther("100000"), 0, false);
      await governanceDAO.connect(user2).castVote(proposalId, 1, "For");
      
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.endTime + 1]); await ethers.provider.send("evm_mine");
      await governanceDAO.connect(user1).queue(proposalId);
      
      // Wait for timelock
      const settings = await governanceDAO.getGovernanceSettings();
      await ethers.provider.send("evm_increaseTime", [settings.timelockDelay + 1]); await ethers.provider.send("evm_mine");
      
      await expect(
        governanceDAO.connect(user1).execute(proposalId)
      ).to.emit(governanceDAO, "ProposalExecuted")
        .withArgs(proposalId);
    });

    it("Should prevent execution before timelock", async function () {
      // Make proposal succeed and queue it
      const proposal = await governanceDAO.getProposal(proposalId);
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.startTime + 1]); await ethers.provider.send("evm_mine");
      
      await cloutXToken.connect(user2).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user2).stake(ethers.utils.parseEther("100000"), 0, false);
      await governanceDAO.connect(user2).castVote(proposalId, 1, "For");
      
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.endTime + 1]); await ethers.provider.send("evm_mine");
      await governanceDAO.connect(user1).queue(proposalId);
      
      await expect(
        governanceDAO.connect(user1).execute(proposalId)
      ).to.be.revertedWith("GovernanceDAO: Proposal not queued");
    });
  });

  describe("Governance Settings", function () {
    it("Should allow owner to update governance settings", async function () {
      const newVotingDelay = 2;
      const newVotingPeriod = 5 * 24 * 3600; // 5 days
      const newProposalThreshold = ethers.utils.parseEther("20000");
      const newQuorumVotes = ethers.utils.parseEther("200000");
      const newTimelockDelay = 3 * 24 * 3600; // 3 days
      const newEmergencyVotingPeriod = 2 * 24 * 3600; // 2 days
      const newEmergencyQuorum = ethers.utils.parseEther("100000");

      await governanceDAO.updateGovernanceSettings(
        newVotingDelay,
        newVotingPeriod,
        newProposalThreshold,
        newQuorumVotes,
        newTimelockDelay,
        newEmergencyVotingPeriod,
        newEmergencyQuorum
      );

      const settings = await governanceDAO.getGovernanceSettings();
      expect(settings.votingDelay).to.equal(newVotingDelay);
      expect(settings.votingPeriod).to.equal(newVotingPeriod);
      expect(settings.proposalThreshold).to.equal(newProposalThreshold);
      expect(settings.quorumVotes).to.equal(newQuorumVotes);
      expect(settings.timelockDelay).to.equal(newTimelockDelay);
      expect(settings.emergencyVotingPeriod).to.equal(newEmergencyVotingPeriod);
      expect(settings.emergencyQuorum).to.equal(newEmergencyQuorum);
    });

    it("Should enforce voting period limits", async function () {
      await expect(
        governanceDAO.updateGovernanceSettings(
          1,
          12 * 3600, // 12 hours < 1 day minimum
          10000,
          100000,
          172800,
          86400,
          50000
        )
      ).to.be.revertedWith("GovernanceDAO: Voting period too short");

      await expect(
        governanceDAO.updateGovernanceSettings(
          1,
          40 * 24 * 3600, // 40 days > 30 days maximum
          10000,
          100000,
          172800,
          86400,
          50000
        )
      ).to.be.revertedWith("GovernanceDAO: Voting period too long");
    });

    it("Should enforce timelock delay limits", async function () {
      await expect(
        governanceDAO.updateGovernanceSettings(
          1,
          259200,
          10000,
          100000,
          1800, // 30 minutes < 1 hour minimum
          86400,
          50000
        )
      ).to.be.revertedWith("GovernanceDAO: Timelock delay too short");

      await expect(
        governanceDAO.updateGovernanceSettings(
          1,
          259200,
          10000,
          100000,
          10 * 24 * 3600, // 10 days > 7 days maximum
          86400,
          50000
        )
      ).to.be.revertedWith("GovernanceDAO: Timelock delay too long");
    });
  });

  describe("Events", function () {
    it("Should emit ProposalCreated event", async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("15000"), 0, false);
      
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["updateTaxConfig(uint256,uint256,uint256,uint256,uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [200, 200, 100, 5000, 5000]
      )];
      const description = "Update tax configuration";

      await expect(
        governanceDAO.connect(user1).propose(targets, values, signatures, calldatas, description)
      ).to.emit(governanceDAO, "ProposalCreated")
        .withArgs(0, user1.address, targets, values, signatures, calldatas, description, anyValue, anyValue, anyValue);
    });

    it("Should emit VoteCast event", async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("15000"), 0, false);
      
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["updateTaxConfig(uint256,uint256,uint256,uint256,uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [200, 200, 100, 5000, 5000]
      )];
      const description = "Update tax configuration";

      await governanceDAO.connect(user1).propose(targets, values, signatures, calldatas, description);
      
      const proposal = await governanceDAO.getProposal(0);
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.startTime + 1]); await ethers.provider.send("evm_mine");
      
      await expect(
        governanceDAO.connect(user1).castVote(0, 1, "Support")
      ).to.emit(governanceDAO, "VoteCast")
        .withArgs(user1.address, 0, 1, anyValue, "Support");
    });

    it("Should emit ProposalCanceled event", async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("15000"), 0, false);
      
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["updateTaxConfig(uint256,uint256,uint256,uint256,uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [200, 200, 100, 5000, 5000]
      )];
      const description = "Update tax configuration";

      await governanceDAO.connect(user1).propose(targets, values, signatures, calldatas, description);
      
      await expect(
        governanceDAO.connect(user1).cancel(0)
      ).to.emit(governanceDAO, "ProposalCanceled")
        .withArgs(0);
    });
  });

  describe("Error Handling", function () {
    it("Should revert on invalid proposal ID", async function () {
      await expect(
        governanceDAO.state(999)
      ).to.be.revertedWith("GovernanceDAO: Invalid proposal id");
    });

    it("Should revert on invalid vote support", async function () {
      await cloutXToken.connect(user1).approve(stakingPool.address, ethers.utils.parseEther("1000000"));
      await stakingPool.connect(user1).stake(ethers.utils.parseEther("15000"), 0, false);
      
      const targets = [cloutXToken.address];
      const values = [0];
      const signatures = ["updateTaxConfig(uint256,uint256,uint256,uint256,uint256)"];
      const calldatas = [ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [200, 200, 100, 5000, 5000]
      )];
      const description = "Update tax configuration";

      await governanceDAO.connect(user1).propose(targets, values, signatures, calldatas, description);
      
      const proposal = await governanceDAO.getProposal(0);
      await ethers.provider.send("evm_setNextBlockTimestamp", [proposal.startTime + 1]); await ethers.provider.send("evm_mine");
      
      await expect(
        governanceDAO.connect(user1).castVote(0, 3, "Invalid")
      ).to.be.revertedWith("GovernanceDAO: Invalid value for enum VoteType");
    });
  });
});

// Helper function for anyValue matcher
function anyValue() {
  return true;
} 