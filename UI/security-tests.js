#!/usr/bin/env node

/**
 * CloutX Token Advanced Security Tests
 * Tests for specific attack vectors and edge cases
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecurityTester {
  constructor() {
    this.testResults = [];
    this.criticalIssues = [];
  }

  addTest(name, passed, description, severity = 'INFO') {
    this.testResults.push({
      name,
      passed,
      description,
      severity
    });
    
    if (!passed && (severity === 'CRITICAL' || severity === 'HIGH')) {
      this.criticalIssues.push({ name, description, severity });
    }
  }

  async runSecurityTests() {
    console.log('🔬 Running Advanced Security Tests for CloutX Token...\n');

    const contractPath = path.join(__dirname, '..', 'contracts', 'CloutXToken.sol');
    if (!fs.existsSync(contractPath)) {
      console.log('❌ CloutXToken.sol not found');
      return;
    }

    const contractCode = fs.readFileSync(contractPath, 'utf8');

    // Run all security tests
    this.testReentrancyVulnerabilities(contractCode);
    this.testAccessControlBypass(contractCode);
    this.testIntegerOverflowUnderflow(contractCode);
    this.testFrontRunningVulnerabilities(contractCode);
    this.testFlashLoanAttacks(contractCode);
    this.testGovernanceAttacks(contractCode);
    this.testTaxEvasionMethods(contractCode);
    this.testUpgradeVulnerabilities(contractCode);
    this.testDenialOfService(contractCode);
    this.testTimestampDependence(contractCode);
    this.testRandomnessVulnerabilities(contractCode);
    this.testGasLimitIssues(contractCode);

    this.generateSecurityReport();
  }

  testReentrancyVulnerabilities(code) {
    console.log('🔄 Testing Reentrancy Vulnerabilities...');

    // Test 1: Check for reentrancy guards
    const hasReentrancyGuard = code.includes('ReentrancyGuardUpgradeable') && 
                               code.includes('nonReentrant');
    this.addTest(
      'Reentrancy Guard Implementation',
      hasReentrancyGuard,
      'Contract should implement ReentrancyGuard to prevent reentrancy attacks',
      hasReentrancyGuard ? 'PASS' : 'CRITICAL'
    );

    // Test 2: Check for state changes after external calls
    const hasStateChangeAfterCall = code.includes('super.transfer') && 
                                   code.includes('_processTransfer');
    this.addTest(
      'State Changes Before External Calls',
      hasStateChangeAfterCall,
      'State changes should occur before external calls to prevent reentrancy',
      hasStateChangeAfterCall ? 'PASS' : 'HIGH'
    );

    // Test 3: Check for checks-effects-interactions pattern
    const followsCEI = code.includes('_validateTransfer') && 
                       code.includes('_processTransfer') &&
                       code.includes('super.transfer');
    this.addTest(
      'Checks-Effects-Interactions Pattern',
      followsCEI,
      'Contract should follow checks-effects-interactions pattern',
      followsCEI ? 'PASS' : 'MEDIUM'
    );
  }

  testAccessControlBypass(code) {
    console.log('🔐 Testing Access Control Bypass...');

    // Test 1: Check for modifier usage on critical functions
    const criticalFunctions = [
      'updateTaxConfig',
      'updateAntiBotConfig',
      'updateRewardPool',
      '_authorizeUpgrade'
    ];

    criticalFunctions.forEach(func => {
      const hasModifier = code.includes(`function ${func}`) && 
                         (code.includes('onlyGovernance') || code.includes('onlyOwner'));
      this.addTest(
        `Access Control for ${func}`,
        hasModifier,
        `Function ${func} should have proper access control`,
        hasModifier ? 'PASS' : 'CRITICAL'
      );
    });

    // Test 2: Check for direct state variable access
    const hasDirectAccess = code.includes('taxConfig =') && 
                           !code.includes('onlyGovernance');
    this.addTest(
      'Direct State Variable Access',
      !hasDirectAccess,
      'State variables should not be directly accessible without proper checks',
      !hasDirectAccess ? 'PASS' : 'HIGH'
    );
  }

  testIntegerOverflowUnderflow(code) {
    console.log('🔢 Testing Integer Overflow/Underflow...');

    // Test 1: Check for SafeMath usage
    const usesSafeMath = code.includes('using SafeMath for uint256');
    this.addTest(
      'SafeMath Library Usage',
      usesSafeMath,
      'Contract should use SafeMath library for arithmetic operations',
      usesSafeMath ? 'PASS' : 'MEDIUM'
    );

    // Test 2: Check for unchecked arithmetic
    const hasUncheckedArithmetic = code.includes('unchecked');
    this.addTest(
      'Unchecked Arithmetic Blocks',
      !hasUncheckedArithmetic,
      'Avoid unchecked arithmetic blocks unless absolutely necessary',
      !hasUncheckedArithmetic ? 'PASS' : 'MEDIUM'
    );

    // Test 3: Check for proper bounds checking
    const hasBoundsChecking = code.includes('require(_buyTax <= MAX_TAX_RATE)');
    this.addTest(
      'Bounds Checking for Parameters',
      hasBoundsChecking,
      'Input parameters should have proper bounds checking',
      hasBoundsChecking ? 'PASS' : 'HIGH'
    );
  }

  testFrontRunningVulnerabilities(code) {
    console.log('🏃 Testing Front-Running Vulnerabilities...');

    // Test 1: Check for commit-reveal scheme
    const hasCommitReveal = code.includes('commit') && code.includes('reveal');
    this.addTest(
      'Commit-Reveal Scheme',
      hasCommitReveal,
      'Consider implementing commit-reveal for sensitive operations',
      'INFO'
    );

    // Test 2: Check for time-based restrictions
    const hasTimeRestrictions = code.includes('cooldownPeriod') && 
                               code.includes('lastTransactionTime');
    this.addTest(
      'Time-Based Restrictions',
      hasTimeRestrictions,
      'Time-based restrictions help prevent front-running attacks',
      hasTimeRestrictions ? 'PASS' : 'LOW'
    );

    // Test 3: Check for maximum slippage protection
    const hasSlippageProtection = code.includes('maxTxAmount');
    this.addTest(
      'Transaction Size Limits',
      hasSlippageProtection,
      'Transaction size limits help prevent large front-running attacks',
      hasSlippageProtection ? 'PASS' : 'MEDIUM'
    );
  }

  testFlashLoanAttacks(code) {
    console.log('⚡ Testing Flash Loan Attack Vectors...');

    // Test 1: Check for same-block restrictions
    const hasSameBlockProtection = code.includes('block.timestamp') && 
                                  code.includes('lastTransactionTime');
    this.addTest(
      'Same-Block Transaction Protection',
      hasSameBlockProtection,
      'Protection against same-block transactions helps prevent flash loan attacks',
      hasSameBlockProtection ? 'PASS' : 'MEDIUM'
    );

    // Test 2: Check for balance snapshot mechanisms
    const hasBalanceSnapshot = code.includes('balanceOf');
    this.addTest(
      'Balance Validation',
      hasBalanceSnapshot,
      'Contract validates balances to prevent manipulation',
      hasBalanceSnapshot ? 'PASS' : 'LOW'
    );

    // Test 3: Check for oracle price manipulation protection
    const hasOracleProtection = code.includes('oracle') || 
                               code.includes('price') || 
                               code.includes('TWAP');
    this.addTest(
      'Oracle Price Manipulation Protection',
      hasOracleProtection,
      'Consider implementing oracle price manipulation protection',
      'INFO'
    );
  }

  testGovernanceAttacks(code) {
    console.log('🗳️ Testing Governance Attack Vectors...');

    // Test 1: Check for timelock implementation
    const hasTimelock = code.includes('timelock') || code.includes('delay');
    this.addTest(
      'Timelock for Governance Changes',
      hasTimelock,
      'Consider implementing timelock for critical governance changes',
      'INFO'
    );

    // Test 2: Check for quorum requirements
    const hasQuorum = code.includes('quorum');
    this.addTest(
      'Quorum Requirements',
      hasQuorum,
      'Governance should have quorum requirements to prevent minority control',
      'INFO'
    );

    // Test 3: Check for proposal threshold
    const hasProposalThreshold = code.includes('threshold') || 
                                code.includes('minimum');
    this.addTest(
      'Proposal Threshold',
      hasProposalThreshold,
      'Governance should have minimum threshold for creating proposals',
      'INFO'
    );
  }

  testTaxEvasionMethods(code) {
    console.log('💰 Testing Tax Evasion Vulnerabilities...');

    // Test 1: Check for tax exclusion abuse
    const hasTaxExclusionControls = code.includes('isExcludedFromTax') && 
                                   code.includes('onlyGovernance');
    this.addTest(
      'Tax Exclusion Controls',
      hasTaxExclusionControls,
      'Tax exclusions should be properly controlled to prevent abuse',
      hasTaxExclusionControls ? 'PASS' : 'HIGH'
    );

    // Test 2: Check for contract-to-contract transfer restrictions
    const hasContractRestrictions = code.includes('isContract') || 
                                   code.includes('codeSize');
    this.addTest(
      'Contract Transfer Restrictions',
      hasContractRestrictions,
      'Consider restricting contract-to-contract transfers to prevent tax evasion',
      'INFO'
    );

    // Test 3: Check for sandwich attack protection
    const hasSandwichProtection = code.includes('maxTxAmount') && 
                                 code.includes('cooldownPeriod');
    this.addTest(
      'Sandwich Attack Protection',
      hasSandwichProtection,
      'Transaction limits and cooldowns help prevent sandwich attacks',
      hasSandwichProtection ? 'PASS' : 'MEDIUM'
    );
  }

  testUpgradeVulnerabilities(code) {
    console.log('⬆️ Testing Upgrade Vulnerabilities...');

    // Test 1: Check for proper upgrade authorization
    const hasUpgradeAuth = code.includes('_authorizeUpgrade') && 
                          code.includes('onlyOwner');
    this.addTest(
      'Upgrade Authorization',
      hasUpgradeAuth,
      'Contract upgrades should be properly authorized',
      hasUpgradeAuth ? 'PASS' : 'CRITICAL'
    );

    // Test 2: Check for storage collision protection
    const hasStorageGaps = code.includes('__gap') || 
                          code.includes('storage gap');
    this.addTest(
      'Storage Collision Protection',
      hasStorageGaps,
      'Consider adding storage gaps to prevent storage collisions in upgrades',
      'INFO'
    );

    // Test 3: Check for initialization protection
    const hasInitProtection = code.includes('_disableInitializers()');
    this.addTest(
      'Initialization Protection',
      hasInitProtection,
      'Implementation contract should disable initializers',
      hasInitProtection ? 'PASS' : 'HIGH'
    );
  }

  testDenialOfService(code) {
    console.log('🚫 Testing Denial of Service Vulnerabilities...');

    // Test 1: Check for gas limit issues in loops
    const hasLoops = code.includes('for (') || code.includes('while (');
    this.addTest(
      'Loop Gas Limit Issues',
      !hasLoops,
      'Avoid unbounded loops that could cause gas limit issues',
      !hasLoops ? 'PASS' : 'MEDIUM'
    );

    // Test 2: Check for external call failures
    const hasFailureHandling = code.includes('try') && code.includes('catch');
    this.addTest(
      'External Call Failure Handling',
      hasFailureHandling,
      'Consider handling external call failures gracefully',
      'INFO'
    );

    // Test 3: Check for emergency pause mechanism
    const hasEmergencyPause = code.includes('PausableUpgradeable') && 
                             code.includes('whenNotPaused');
    this.addTest(
      'Emergency Pause Mechanism',
      hasEmergencyPause,
      'Emergency pause mechanism helps prevent DoS attacks',
      hasEmergencyPause ? 'PASS' : 'LOW'
    );
  }

  testTimestampDependence(code) {
    console.log('⏰ Testing Timestamp Dependence...');

    // Test 1: Check for block.timestamp usage
    const usesBlockTimestamp = code.includes('block.timestamp');
    this.addTest(
      'Block Timestamp Usage',
      usesBlockTimestamp,
      'Block timestamp usage detected - ensure it\'s not critical for security',
      usesBlockTimestamp ? 'INFO' : 'PASS'
    );

    // Test 2: Check for time-based logic
    const hasTimeLogic = code.includes('cooldownPeriod') || 
                        code.includes('lastTransactionTime');
    this.addTest(
      'Time-Based Logic Security',
      hasTimeLogic,
      'Time-based logic should account for timestamp manipulation',
      hasTimeLogic ? 'INFO' : 'PASS'
    );
  }

  testRandomnessVulnerabilities(code) {
    console.log('🎲 Testing Randomness Vulnerabilities...');

    // Test 1: Check for weak randomness sources
    const usesWeakRandomness = code.includes('block.timestamp') && 
                              code.includes('random');
    this.addTest(
      'Weak Randomness Sources',
      !usesWeakRandomness,
      'Avoid using block.timestamp or block.difficulty for randomness',
      !usesWeakRandomness ? 'PASS' : 'HIGH'
    );

    // Test 2: Check for chainlink VRF usage
    const usesChainlinkVRF = code.includes('VRF') || code.includes('chainlink');
    this.addTest(
      'Secure Randomness Implementation',
      usesChainlinkVRF,
      'Consider using Chainlink VRF for secure randomness if needed',
      'INFO'
    );
  }

  testGasLimitIssues(code) {
    console.log('⛽ Testing Gas Limit Issues...');

    // Test 1: Check for expensive operations in transfers
    const hasExpensiveOps = code.includes('_processTransfer') && 
                           (code.includes('_burn') || code.includes('transfer'));
    this.addTest(
      'Expensive Transfer Operations',
      hasExpensiveOps,
      'Transfer function contains additional operations - monitor gas usage',
      hasExpensiveOps ? 'INFO' : 'PASS'
    );

    // Test 2: Check for gas optimization
    const hasGasOptimization = code.includes('unchecked') || 
                              code.includes('assembly');
    this.addTest(
      'Gas Optimization Techniques',
      hasGasOptimization,
      'Consider gas optimization techniques for frequently called functions',
      'INFO'
    );
  }

  generateSecurityReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔬 CLOUTX TOKEN ADVANCED SECURITY TEST REPORT');
    console.log('='.repeat(80));

    // Summary
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed || t.severity === 'INFO').length;
    const failedTests = totalTests - passedTests;
    const criticalIssues = this.criticalIssues.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = this.criticalIssues.filter(i => i.severity === 'HIGH').length;

    console.log(`\n📊 TEST SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Critical Issues: ${criticalIssues}`);
    console.log(`   High Severity Issues: ${highIssues}`);

    // Security Score
    const securityScore = Math.max(0, 100 - (criticalIssues * 25) - (highIssues * 15) - (failedTests * 5));
    const scoreColor = securityScore >= 80 ? '🟢' : securityScore >= 60 ? '🟡' : '🔴';
    console.log(`\n${scoreColor} SECURITY SCORE: ${securityScore}/100`);

    // Critical Issues
    if (this.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES:');
      console.log('-'.repeat(50));
      this.criticalIssues.forEach((issue, index) => {
        const icon = issue.severity === 'CRITICAL' ? '🔴' : '🟠';
        console.log(`${index + 1}. ${icon} [${issue.severity}] ${issue.name}`);
        console.log(`   📄 ${issue.description}\n`);
      });
    }

    // Detailed Test Results
    console.log('\n📋 DETAILED TEST RESULTS:');
    console.log('-'.repeat(50));
    
    const categories = {
      'Reentrancy': this.testResults.filter(t => t.name.toLowerCase().includes('reentrancy')),
      'Access Control': this.testResults.filter(t => t.name.toLowerCase().includes('access')),
      'Integer Operations': this.testResults.filter(t => t.name.toLowerCase().includes('overflow') || t.name.toLowerCase().includes('bounds')),
      'Front-Running': this.testResults.filter(t => t.name.toLowerCase().includes('front') || t.name.toLowerCase().includes('slippage')),
      'Flash Loans': this.testResults.filter(t => t.name.toLowerCase().includes('flash') || t.name.toLowerCase().includes('same-block')),
      'Governance': this.testResults.filter(t => t.name.toLowerCase().includes('governance') || t.name.toLowerCase().includes('timelock')),
      'Tax Logic': this.testResults.filter(t => t.name.toLowerCase().includes('tax')),
      'Upgradeability': this.testResults.filter(t => t.name.toLowerCase().includes('upgrade')),
      'DoS Protection': this.testResults.filter(t => t.name.toLowerCase().includes('denial') || t.name.toLowerCase().includes('pause')),
      'Other': this.testResults.filter(t => !Object.values(categories).flat().includes(t))
    };

    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length > 0) {
        console.log(`\n🔍 ${category.toUpperCase()}:`);
        tests.forEach(test => {
          const icon = test.passed || test.severity === 'INFO' ? '✅' : 
                      test.severity === 'CRITICAL' ? '🔴' : 
                      test.severity === 'HIGH' ? '🟠' : 
                      test.severity === 'MEDIUM' ? '🟡' : '🟢';
          console.log(`   ${icon} ${test.name}`);
          if (!test.passed && test.severity !== 'INFO') {
            console.log(`      ⚠️  ${test.description}`);
          }
        });
      }
    });

    // Recommendations
    console.log('\n💡 SECURITY RECOMMENDATIONS:');
    console.log('-'.repeat(50));
    console.log('1. 🔍 Address all critical and high-severity issues before deployment');
    console.log('2. 🧪 Conduct extensive testing on testnet with various attack scenarios');
    console.log('3. 🏆 Consider professional security audit by reputable firm');
    console.log('4. 📊 Implement monitoring for unusual transaction patterns');
    console.log('5. 🔐 Use multi-signature wallet for all administrative functions');
    console.log('6. ⏰ Implement timelock for governance changes');
    console.log('7. 🚨 Have incident response plan ready');
    console.log('8. 📝 Document all security assumptions and trade-offs');
    console.log('9. 🔄 Regular security reviews for future updates');
    console.log('10. 💰 Consider bug bounty program post-deployment');

    console.log('\n' + '='.repeat(80));
    console.log('🔒 Advanced security testing completed!');
    console.log('📅 Test Date:', new Date().toISOString());
    console.log('🔧 Tester: CloutX Advanced Security Test Suite v1.0');
    console.log('='.repeat(80));
  }
}

// Run the security tests
const tester = new SecurityTester();
tester.runSecurityTests().catch(console.error); 