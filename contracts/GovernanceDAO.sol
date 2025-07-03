// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./CloutXToken.sol";
import "./StakingPool.sol";

/**
 * @title GovernanceDAO
 * @dev CloutX DAO Governance with proposal creation, voting, and execution
 * 
 * Features:
 * - Proposal creation and management
 * - Voting with staked CLX weight
 * - Quorum thresholds and voting periods
 * - Timelock for proposal execution
 * - Emergency proposal handling
 * 
 * @author CloutX Team
 */
contract GovernanceDAO is 
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeMath for uint256;

    // ============ ENUMS ============
    
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    enum VoteType {
        Against,
        For,
        Abstain
    }

    // ============ STRUCTS ============
    
    struct Proposal {
        uint256 id;                     // Unique proposal ID
        address proposer;               // Proposal creator
        address[] targets;              // Target contracts for execution
        uint256[] values;               // ETH values for calls
        string[] signatures;            // Function signatures
        bytes[] calldatas;              // Calldata for function calls
        string description;             // Proposal description
        uint256 startTime;              // Voting start time
        uint256 endTime;                // Voting end time
        uint256 forVotes;               // Votes in favor
        uint256 againstVotes;           // Votes against
        uint256 abstainVotes;           // Abstain votes
        bool canceled;                  // Whether proposal is canceled
        bool executed;                  // Whether proposal is executed
        uint256 eta;                    // Execution timestamp
        uint256 quorumVotes;            // Required quorum votes
        uint256 minVotingPower;         // Minimum voting power to propose
    }

    struct Receipt {
        bool hasVoted;                  // Whether user has voted
        VoteType support;               // Vote type
        uint256 votes;                  // Number of votes cast
        uint256 votingPower;            // Voting power at time of vote
    }

    struct GovernanceSettings {
        uint256 votingDelay;            // Delay before voting starts (blocks)
        uint256 votingPeriod;           // Voting period duration (blocks)
        uint256 proposalThreshold;      // Minimum staked tokens to propose
        uint256 quorumVotes;            // Required quorum votes
        uint256 timelockDelay;          // Timelock delay (seconds)
        uint256 emergencyVotingPeriod; // Emergency voting period (blocks)
        uint256 emergencyQuorum;        // Emergency quorum requirement
    }

    // ============ STATE VARIABLES ============
    
    CloutXToken public cloutXToken;
    StakingPool public stakingPool;
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Receipt)) public proposalReceipts;
    mapping(address => uint256) public userProposalCount;
    mapping(address => uint256) public lastVoteTime;
    
    GovernanceSettings public settings;
    
    uint256 public proposalCount;
    uint256 public constant MIN_VOTING_PERIOD = 1 days;
    uint256 public constant MAX_VOTING_PERIOD = 30 days;
    uint256 public constant MIN_TIMELOCK_DELAY = 1 hours;
    uint256 public constant MAX_TIMELOCK_DELAY = 7 days;
    
    // ============ EVENTS ============
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        string[] signatures,
        bytes[] calldatas,
        string description,
        uint256 startTime,
        uint256 endTime,
        uint256 quorumVotes
    );
    
    event ProposalCanceled(uint256 indexed proposalId);
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 votes,
        string reason
    );
    
    event ProposalExecuted(uint256 indexed proposalId);
    
    event ProposalQueued(uint256 indexed proposalId, uint256 eta);
    
    event GovernanceSettingsUpdated(
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumVotes,
        uint256 timelockDelay,
        uint256 emergencyVotingPeriod,
        uint256 emergencyQuorum
    );
    
    event EmergencyProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        uint256 endTime
    );

    // ============ MODIFIERS ============
    
    modifier onlyProposer(uint256 proposalId) {
        require(
            proposals[proposalId].proposer == msg.sender,
            "GovernanceDAO: Only proposer can cancel"
        );
        _;
    }
    
    modifier onlyExecutor() {
        require(
            msg.sender == owner() || msg.sender == address(this),
            "GovernanceDAO: Only executor"
        );
        _;
    }

    // ============ INITIALIZATION ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the governance DAO
     * @param _cloutXToken CLX token address
     * @param _stakingPool Staking pool address
     * @param _owner Contract owner
     */
    function initialize(
        address _cloutXToken,
        address _stakingPool,
        address _owner
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        _transferOwnership(_owner);

        cloutXToken = CloutXToken(_cloutXToken);
        stakingPool = StakingPool(_stakingPool);

        // Initialize default governance settings
        settings = GovernanceSettings({
            votingDelay: 1,                    // 1 block delay
            votingPeriod: 3 days,              // 3 days voting period
            proposalThreshold: 10000 * 10**18, // 10k CLX minimum to propose
            quorumVotes: 100000 * 10**18,      // 100k CLX quorum
            timelockDelay: 2 days,             // 2 days timelock
            emergencyVotingPeriod: 1 days,     // 1 day emergency voting
            emergencyQuorum: 50000 * 10**18    // 50k CLX emergency quorum
        });
    }

    // ============ CORE FUNCTIONS ============
    
    /**
     * @dev Create a new proposal
     * @param targets Target contract addresses
     * @param values ETH values for calls
     * @param signatures Function signatures
     * @param calldatas Calldata for function calls
     * @param description Proposal description
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) external whenNotPaused returns (uint256) {
        require(
            getVotingPower(msg.sender) >= settings.proposalThreshold,
            "GovernanceDAO: Insufficient voting power to propose"
        );
        require(
            targets.length == values.length &&
            targets.length == signatures.length &&
            targets.length == calldatas.length,
            "GovernanceDAO: Proposal function information arity mismatch"
        );
        require(targets.length > 0, "GovernanceDAO: Must provide actions");
        require(
            targets.length <= 10,
            "GovernanceDAO: Too many actions"
        );

        uint256 latestProposalId = proposalCount;
        uint256 startTime = block.timestamp.add(settings.votingDelay);
        uint256 endTime = startTime.add(settings.votingPeriod);

        proposalCount = proposalCount + 1;

        Proposal memory newProposal = Proposal({
            id: latestProposalId,
            proposer: msg.sender,
            targets: targets,
            values: values,
            signatures: signatures,
            calldatas: calldatas,
            description: description,
            startTime: startTime,
            endTime: endTime,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            canceled: false,
            executed: false,
            eta: 0,
            quorumVotes: settings.quorumVotes,
            minVotingPower: settings.proposalThreshold
        });

        proposals[latestProposalId] = newProposal;
        userProposalCount[msg.sender] = userProposalCount[msg.sender] + 1;

        emit ProposalCreated(
            latestProposalId,
            msg.sender,
            targets,
            values,
            signatures,
            calldatas,
            description,
            startTime,
            endTime,
            settings.quorumVotes
        );

        return latestProposalId;
    }

    /**
     * @dev Create an emergency proposal (shorter voting period)
     * @param targets Target contract addresses
     * @param values ETH values for calls
     * @param signatures Function signatures
     * @param calldatas Calldata for function calls
     * @param description Proposal description
     */
    function proposeEmergency(
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) external whenNotPaused returns (uint256) {
        require(
            getVotingPower(msg.sender) >= settings.proposalThreshold.mul(2),
            "GovernanceDAO: Insufficient voting power for emergency proposal"
        );
        require(
            targets.length == values.length &&
            targets.length == signatures.length &&
            targets.length == calldatas.length,
            "GovernanceDAO: Proposal function information arity mismatch"
        );
        require(targets.length > 0, "GovernanceDAO: Must provide actions");

        uint256 latestProposalId = proposalCount;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime.add(settings.emergencyVotingPeriod);

        proposalCount = proposalCount + 1;

        Proposal memory newProposal = Proposal({
            id: latestProposalId,
            proposer: msg.sender,
            targets: targets,
            values: values,
            signatures: signatures,
            calldatas: calldatas,
            description: description,
            startTime: startTime,
            endTime: endTime,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            canceled: false,
            executed: false,
            eta: 0,
            quorumVotes: settings.emergencyQuorum,
            minVotingPower: settings.proposalThreshold.mul(2)
        });

        proposals[latestProposalId] = newProposal;
        userProposalCount[msg.sender] = userProposalCount[msg.sender] + 1;

        emit EmergencyProposalCreated(
            latestProposalId,
            msg.sender,
            description,
            endTime
        );

        return latestProposalId;
    }

    /**
     * @dev Cast vote on proposal
     * @param proposalId Proposal ID to vote on
     * @param support Vote type (0=Against, 1=For, 2=Abstain)
     * @param reason Voting reason
     */
    function castVote(
        uint256 proposalId,
        uint8 support,
        string memory reason
    ) external whenNotPaused {
        require(
            support <= 2,
            "GovernanceDAO: Invalid value for enum VoteType"
        );
        require(
            state(proposalId) == ProposalState.Active,
            "GovernanceDAO: Voting is closed"
        );

        Proposal storage proposal = proposals[proposalId];
        Receipt storage receipt = proposalReceipts[proposalId][msg.sender];
        require(receipt.hasVoted == false, "GovernanceDAO: Already voted");

        uint256 votes = getVotingPower(msg.sender);
        require(votes > 0, "GovernanceDAO: No voting power");

        if (support == 0) {
            proposal.againstVotes = proposal.againstVotes.add(votes);
        } else if (support == 1) {
            proposal.forVotes = proposal.forVotes.add(votes);
        } else if (support == 2) {
            proposal.abstainVotes = proposal.abstainVotes.add(votes);
        }

        receipt.hasVoted = true;
        receipt.support = VoteType(support);
        receipt.votes = votes;
        receipt.votingPower = votes;

        lastVoteTime[msg.sender] = block.timestamp;

        emit VoteCast(msg.sender, proposalId, support, votes, reason);
    }

    /**
     * @dev Cancel a proposal (only proposer can cancel)
     * @param proposalId Proposal ID to cancel
     */
    function cancel(uint256 proposalId) external onlyProposer(proposalId) {
        ProposalState currentState = state(proposalId);
        require(
            currentState != ProposalState.Canceled &&
            currentState != ProposalState.Defeated &&
            currentState != ProposalState.Expired,
            "GovernanceDAO: Proposal cannot be canceled"
        );

        proposals[proposalId].canceled = true;

        emit ProposalCanceled(proposalId);
    }

    /**
     * @dev Queue a proposal for execution
     * @param proposalId Proposal ID to queue
     */
    function queue(uint256 proposalId) external {
        require(
            state(proposalId) == ProposalState.Succeeded,
            "GovernanceDAO: Proposal not successful"
        );

        uint256 eta = block.timestamp.add(settings.timelockDelay);
        proposals[proposalId].eta = eta;

        emit ProposalQueued(proposalId, eta);
    }

    /**
     * @dev Execute a queued proposal
     * @param proposalId Proposal ID to execute
     */
    function execute(uint256 proposalId) external payable whenNotPaused {
        require(
            state(proposalId) == ProposalState.Queued,
            "GovernanceDAO: Proposal not queued"
        );

        Proposal storage proposal = proposals[proposalId];
        proposal.executed = true;

        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(
                proposal.calldatas[i]
            );
            require(success, "GovernanceDAO: Transaction execution reverted");
        }

        emit ProposalExecuted(proposalId);
    }

    // ============ VOTING POWER FUNCTIONS ============
    
    /**
     * @dev Get voting power for address (staked CLX)
     * @param account Address to get voting power for
     */
    function getVotingPower(address account) public view returns (uint256) {
        return stakingPool.totalStaked(account);
    }

    /**
     * @dev Get total voting power (total staked CLX)
     */
    function getTotalVotingPower() external view returns (uint256) {
        return stakingPool.totalStakedAmount();
    }

    // ============ PROPOSAL STATE FUNCTIONS ============
    
    /**
     * @dev Get proposal state
     * @param proposalId Proposal ID
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        require(
            proposalCount > proposalId,
            "GovernanceDAO: Invalid proposal id"
        );

        Proposal storage proposal = proposals[proposalId];

        if (proposal.canceled) {
            return ProposalState.Canceled;
        }

        if (block.timestamp <= proposal.startTime) {
            return ProposalState.Pending;
        }

        if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        }

        if (proposal.forVotes <= proposal.againstVotes || 
            proposal.forVotes < proposal.quorumVotes) {
            return ProposalState.Defeated;
        }

        if (proposal.eta == 0) {
            return ProposalState.Succeeded;
        }

        if (proposal.executed) {
            return ProposalState.Executed;
        }

        if (block.timestamp >= proposal.eta.add(settings.timelockDelay)) {
            return ProposalState.Expired;
        }

        return ProposalState.Queued;
    }

    /**
     * @dev Get proposal actions
     * @param proposalId Proposal ID
     */
    function getActions(uint256 proposalId)
        external
        view
        returns (
            address[] memory targets,
            uint256[] memory values,
            string[] memory signatures,
            bytes[] memory calldatas
        )
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.targets,
            proposal.values,
            proposal.signatures,
            proposal.calldatas
        );
    }

    /**
     * @dev Get proposal receipt
     * @param proposalId Proposal ID
     * @param voter Voter address
     */
    function getReceipt(uint256 proposalId, address voter)
        external
        view
        returns (Receipt memory)
    {
        return proposalReceipts[proposalId][voter];
    }

    // ============ GOVERNANCE FUNCTIONS ============
    
    /**
     * @dev Update governance settings (owner only)
     * @param _votingDelay New voting delay
     * @param _votingPeriod New voting period
     * @param _proposalThreshold New proposal threshold
     * @param _quorumVotes New quorum votes
     * @param _timelockDelay New timelock delay
     * @param _emergencyVotingPeriod New emergency voting period
     * @param _emergencyQuorum New emergency quorum
     */
    function updateGovernanceSettings(
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumVotes,
        uint256 _timelockDelay,
        uint256 _emergencyVotingPeriod,
        uint256 _emergencyQuorum
    ) external onlyOwner {
        require(_votingPeriod >= MIN_VOTING_PERIOD, "GovernanceDAO: Voting period too short");
        require(_votingPeriod <= MAX_VOTING_PERIOD, "GovernanceDAO: Voting period too long");
        require(_timelockDelay >= MIN_TIMELOCK_DELAY, "GovernanceDAO: Timelock delay too short");
        require(_timelockDelay <= MAX_TIMELOCK_DELAY, "GovernanceDAO: Timelock delay too long");

        settings = GovernanceSettings({
            votingDelay: _votingDelay,
            votingPeriod: _votingPeriod,
            proposalThreshold: _proposalThreshold,
            quorumVotes: _quorumVotes,
            timelockDelay: _timelockDelay,
            emergencyVotingPeriod: _emergencyVotingPeriod,
            emergencyQuorum: _emergencyQuorum
        });

        emit GovernanceSettingsUpdated(
            _votingDelay,
            _votingPeriod,
            _proposalThreshold,
            _quorumVotes,
            _timelockDelay,
            _emergencyVotingPeriod,
            _emergencyQuorum
        );
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get proposal by ID
     * @param proposalId Proposal ID
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @dev Get recent proposals
     * @param limit Number of proposals to return
     */
    function getRecentProposals(uint256 limit) external view returns (Proposal[] memory) {
        uint256 count = limit > proposalCount ? proposalCount : limit;
        Proposal[] memory recentProposals = new Proposal[](count);
        
        for (uint256 i = 0; i < count; i++) {
            recentProposals[i] = proposals[proposalCount - 1 - i];
        }
        
        return recentProposals;
    }

    /**
     * @dev Get governance settings
     */
    function getGovernanceSettings() external view returns (GovernanceSettings memory) {
        return settings;
    }

    // ============ UPGRADE FUNCTIONS ============
    
    /**
     * @dev Required by UUPS pattern
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Get current implementation version
     */
    function version() public pure returns (string memory) {
        return "1.0.0";
    }
} 