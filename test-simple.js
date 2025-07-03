const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("CloutXTokenImproved - Simple Test", function () {
  let CloutXTokenImproved, cloutXToken;
  let owner, user1, user2, rewardPool;

  beforeEach(async function () {
    [owner, user1, user2, rewardPool] = await ethers.getSigners();
    
    // Deploy the improved contract using upgradeable pattern
    CloutXTokenImproved = await ethers.getContractFactory("CloutXTokenImproved");
    cloutXToken = await upgrades.deployProxy(CloutXTokenImproved, [
      "CloutX",
      "CLX",
      1000000000 * 10**18, // 1 billion tokens
      owner.address,
      rewardPool.address
    ], { kind: 'uups' });
    await cloutXToken.deployed();
  });

  it("Should initialize correctly", async function () {
    expect(await cloutXToken.name()).to.equal("CloutX");
    expect(await cloutXToken.symbol()).to.equal("CLX");
    expect(await cloutXToken.totalSupply()).to.equal(ethers.utils.parseEther("1000000000"));
    expect(await cloutXToken.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1000000000"));
  });

  it("Should transfer tokens without tax for excluded addresses", async function () {
    const transferAmount = ethers.utils.parseEther("1000");
    await cloutXToken.transfer(user1.address, transferAmount);
    expect(await cloutXToken.balanceOf(user1.address)).to.equal(transferAmount);
  });

  it("Should apply tax on regular transfers", async function () {
    // Transfer some tokens to user1 first
    await cloutXToken.transfer(user1.address, ethers.utils.parseEther("10000"));
    
    // Now transfer from user1 to user2 (should apply tax)
    const transferAmount = ethers.utils.parseEther("1000");
    const initialRewardBalance = await cloutXToken.balanceOf(rewardPool.address);
    
    await cloutXToken.connect(user1).transfer(user2.address, transferAmount);
    
    // Calculate expected tax (1% transfer tax)
    const taxAmount = transferAmount.mul(100).div(10000); // 1%
    const netTransfer = transferAmount.sub(taxAmount);
    
    expect(await cloutXToken.balanceOf(user2.address)).to.equal(netTransfer);
  });

  it("Should apply tax on transferFrom (SECURITY FIX)", async function () {
    // Transfer some tokens to user1 first
    await cloutXToken.transfer(user1.address, ethers.utils.parseEther("10000"));
    
    const transferAmount = ethers.utils.parseEther("1000");
    const initialRewardBalance = await cloutXToken.balanceOf(rewardPool.address);
    
    // Approve user2 to spend user1's tokens
    await cloutXToken.connect(user1).approve(user2.address, transferAmount);
    
    // Use transferFrom - should apply tax
    await cloutXToken.connect(user2).transferFrom(user1.address, user2.address, transferAmount);
    
    const taxAmount = transferAmount.mul(100).div(10000); // 1% transfer tax
    const netTransfer = transferAmount.sub(taxAmount);
    
    expect(await cloutXToken.balanceOf(user2.address)).to.equal(netTransfer);
  });
}); 