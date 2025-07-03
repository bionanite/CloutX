// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MaliciousContract
 * @dev Simple malicious contract for penetration testing
 * This contract is used to test security vulnerabilities
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract MaliciousContract {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Attempts to drain tokens from a target contract
     * This function is used for testing token security
     */
    function drainTokens(address tokenAddress) external {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(tokenAddress);
        
        // Try to steal tokens (this should fail on secure contracts)
        try token.transfer(address(this), balance) {
            // Attack succeeded
        } catch {
            // Attack failed (expected behavior)
        }
    }
    
    /**
     * @dev Attempts to manipulate token allowances
     */
    function manipulateAllowance(address tokenAddress, address victim) external {
        IERC20 token = IERC20(tokenAddress);
        
        try token.transferFrom(victim, address(this), type(uint256).max) {
            // Attack succeeded
        } catch {
            // Attack failed (expected behavior)
        }
    }
    
    /**
     * @dev Emergency function to recover any accidentally sent tokens
     */
    function recoverTokens(address tokenAddress) external {
        require(msg.sender == owner, "Not owner");
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        token.transfer(owner, balance);
    }
    
    // Fallback function to receive Ether
    receive() external payable {}
} 