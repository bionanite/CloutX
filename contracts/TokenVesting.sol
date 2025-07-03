// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title TokenVesting
 * @dev CloutX Token Vesting Contract for Founder and Team Allocations
 * 
 * SECURITY FEATURES:
 * ✅ Linear vesting over time periods
 * ✅ Cliff periods before any tokens can be claimed
 * ✅ Multiple beneficiaries support
 * ✅ Emergency pause functionality
 * ✅ Non-revocable vesting schedules
 * 
 * @notice Eliminates founder centralization risk through time-locked releases
 */
contract TokenVesting is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // ============ STRUCTS ============
    
    struct VestingSchedule {
        address beneficiary;      // Who receives the tokens
        uint256 totalAmount;      // Total tokens to be vested
        uint256 cliffDuration;    // Cliff period in seconds
        uint256 vestingDuration;  // Total vesting period in seconds
        uint256 startTime;        // When vesting starts
        uint256 releasedAmount;   // Amount already released
        bool revoked;             // Whether vesting is revoked
        string role;              // Beneficiary role (founder, team, advisor)
    }

    // ============ STATE VARIABLES ============
    
    IERC20 public immutable token;
    
    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(string => uint256) public roleAllocations;
    
    address[] public beneficiaries;
    uint256 public totalVestedAmount;
    uint256 public totalReleasedAmount;
    
    bool public paused = false;
    
    // ============ CONSTANTS ============
    
    uint256 public constant FOUNDER_CLIFF = 180 days;      // 6 months cliff
    uint256 public constant FOUNDER_VESTING = 730 days;    // 2 years total
    uint256 public constant TEAM_CLIFF = 90 days;          // 3 months cliff  
    uint256 public constant TEAM_VESTING = 365 days;       // 1 year total
    uint256 public constant ADVISOR_CLIFF = 30 days;       // 1 month cliff
    uint256 public constant ADVISOR_VESTING = 180 days;    // 6 months total

    // ============ EVENTS ============
    
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        string role
    );
    
    event TokensReleased(
        address indexed beneficiary,
        uint256 amount,
        uint256 totalReleased
    );
    
    event VestingRevoked(address indexed beneficiary, uint256 revokedAmount);
    event VestingPaused(bool paused);

    // ============ MODIFIERS ============
    
    modifier whenNotPaused() {
        require(!paused, "Vesting: Contract is paused");
        _;
    }
    
    modifier hasVestingSchedule(address beneficiary) {
        require(
            vestingSchedules[beneficiary].totalAmount > 0,
            "Vesting: No vesting schedule for beneficiary"
        );
        _;
    }

    // ============ CONSTRUCTOR ============
    
    constructor(address _token) {
        require(_token != address(0), "Vesting: Invalid token address");
        token = IERC20(_token);
    }

    // ============ VESTING FUNCTIONS ============
    
    /**
     * @dev Create vesting schedule for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @param totalAmount Total amount of tokens to vest
     * @param role Role of the beneficiary (founder, team, advisor)
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        string memory role
    ) external onlyOwner {
        require(beneficiary != address(0), "Vesting: Invalid beneficiary");
        require(totalAmount > 0, "Vesting: Amount must be greater than 0");
        require(
            vestingSchedules[beneficiary].totalAmount == 0,
            "Vesting: Schedule already exists"
        );

        uint256 cliffDuration;
        uint256 vestingDuration;

        // Set vesting parameters based on role
        if (keccak256(bytes(role)) == keccak256(bytes("founder"))) {
            cliffDuration = FOUNDER_CLIFF;
            vestingDuration = FOUNDER_VESTING;
        } else if (keccak256(bytes(role)) == keccak256(bytes("team"))) {
            cliffDuration = TEAM_CLIFF;
            vestingDuration = TEAM_VESTING;
        } else if (keccak256(bytes(role)) == keccak256(bytes("advisor"))) {
            cliffDuration = ADVISOR_CLIFF;
            vestingDuration = ADVISOR_VESTING;
        } else {
            revert("Vesting: Invalid role");
        }

        // Create vesting schedule
        vestingSchedules[beneficiary] = VestingSchedule({
            beneficiary: beneficiary,
            totalAmount: totalAmount,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            startTime: block.timestamp,
            releasedAmount: 0,
            revoked: false,
            role: role
        });

        beneficiaries.push(beneficiary);
        totalVestedAmount = totalVestedAmount.add(totalAmount);
        roleAllocations[role] = roleAllocations[role].add(totalAmount);

        emit VestingScheduleCreated(
            beneficiary,
            totalAmount,
            cliffDuration,
            vestingDuration,
            role
        );
    }

    /**
     * @dev Release vested tokens for a beneficiary
     * @param beneficiary Address of the beneficiary
     */
    function releaseTokens(address beneficiary) 
        external 
        nonReentrant 
        whenNotPaused 
        hasVestingSchedule(beneficiary) 
    {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        require(!schedule.revoked, "Vesting: Schedule is revoked");
        
        uint256 releasableAmount = getReleasableAmount(beneficiary);
        require(releasableAmount > 0, "Vesting: No tokens to release");

        schedule.releasedAmount = schedule.releasedAmount.add(releasableAmount);
        totalReleasedAmount = totalReleasedAmount.add(releasableAmount);

        require(
            token.transfer(beneficiary, releasableAmount),
            "Vesting: Token transfer failed"
        );

        emit TokensReleased(beneficiary, releasableAmount, schedule.releasedAmount);
    }

    /**
     * @dev Batch release tokens for multiple beneficiaries
     * @param beneficiaryList List of beneficiary addresses
     */
    function batchReleaseTokens(address[] calldata beneficiaryList) external {
        for (uint256 i = 0; i < beneficiaryList.length; i++) {
            if (getReleasableAmount(beneficiaryList[i]) > 0) {
                this.releaseTokens(beneficiaryList[i]);
            }
        }
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Calculate the amount of tokens that can be released for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @return Amount of tokens that can be released
     */
    function getReleasableAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        
        if (schedule.totalAmount == 0 || schedule.revoked) {
            return 0;
        }

        uint256 vestedAmount = getVestedAmount(beneficiary);
        return vestedAmount.sub(schedule.releasedAmount);
    }

    /**
     * @dev Calculate the total amount of tokens vested for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @return Total amount of tokens vested
     */
    function getVestedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        
        if (schedule.totalAmount == 0) {
            return 0;
        }

        uint256 currentTime = block.timestamp;
        uint256 cliffEnd = schedule.startTime.add(schedule.cliffDuration);
        uint256 vestingEnd = schedule.startTime.add(schedule.vestingDuration);

        // Before cliff period
        if (currentTime < cliffEnd) {
            return 0;
        }

        // After vesting period (fully vested)
        if (currentTime >= vestingEnd) {
            return schedule.totalAmount;
        }

        // During vesting period (linear vesting)
        uint256 vestingPeriod = schedule.vestingDuration.sub(schedule.cliffDuration);
        uint256 timeVested = currentTime.sub(cliffEnd);
        
        return schedule.totalAmount.mul(timeVested).div(vestingPeriod);
    }

    /**
     * @dev Get vesting schedule details for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @return Vesting schedule details
     */
    function getVestingSchedule(address beneficiary) 
        external 
        view 
        returns (VestingSchedule memory) 
    {
        return vestingSchedules[beneficiary];
    }

    /**
     * @dev Get all beneficiaries
     * @return Array of beneficiary addresses
     */
    function getBeneficiaries() external view returns (address[] memory) {
        return beneficiaries;
    }

    /**
     * @dev Get vesting summary for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @return totalAmount Total amount to be vested
     * @return vestedAmount Amount currently vested
     * @return releasedAmount Amount already released
     * @return releasableAmount Amount that can be released now
     */
    function getVestingSummary(address beneficiary) 
        external 
        view 
        returns (
            uint256 totalAmount,
            uint256 vestedAmount,
            uint256 releasedAmount,
            uint256 releasableAmount
        ) 
    {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        
        totalAmount = schedule.totalAmount;
        vestedAmount = getVestedAmount(beneficiary);
        releasedAmount = schedule.releasedAmount;
        releasableAmount = getReleasableAmount(beneficiary);
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Pause or unpause the vesting contract
     * @param _paused Whether to pause the contract
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit VestingPaused(_paused);
    }

    /**
     * @dev Emergency function to recover tokens (only unreleased amounts)
     * @param amount Amount of tokens to recover
     */
    function emergencyRecoverTokens(uint256 amount) external onlyOwner {
        uint256 contractBalance = token.balanceOf(address(this));
        uint256 totalUnreleased = totalVestedAmount.sub(totalReleasedAmount);
        uint256 recoverable = contractBalance.sub(totalUnreleased);
        
        require(amount <= recoverable, "Vesting: Cannot recover vested tokens");
        require(token.transfer(owner(), amount), "Vesting: Token transfer failed");
    }

    /**
     * @dev Get contract statistics
     * @return totalVested Total amount of tokens under vesting
     * @return totalReleased Total amount of tokens released
     * @return contractBalance Current token balance of the contract
     * @return beneficiaryCount Number of beneficiaries
     */
    function getContractStats() 
        external 
        view 
        returns (
            uint256 totalVested,
            uint256 totalReleased,
            uint256 contractBalance,
            uint256 beneficiaryCount
        ) 
    {
        totalVested = totalVestedAmount;
        totalReleased = totalReleasedAmount;
        contractBalance = token.balanceOf(address(this));
        beneficiaryCount = beneficiaries.length;
    }

    /**
     * @dev Get role allocation summary
     * @param role Role to query (founder, team, advisor)
     * @return allocation Total tokens allocated to the role
     */
    function getRoleAllocation(string memory role) external view returns (uint256 allocation) {
        allocation = roleAllocations[role];
    }
} 