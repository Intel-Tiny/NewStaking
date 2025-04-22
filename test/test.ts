import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

let owner: any;
let user1: any;
let user2: any;
let user3: any;
let user4: any;
let user5: any;
let usdc: any;
let usdcAddress: any;
let stakingContract: any;
let stakingContractAddress: any;

describe("Create Initial Contracts of all types", async function() {
  it("get accounts", async function () {
    [owner, user1, user2, user3, user4, user5] =
      await ethers.getSigners();
    console.log("\tAccount address\t", await owner.getAddress());
  });
  it("deploy USDC Token Contract", async function () {
    const instanceToken = await ethers.getContractFactory("usdc");
    usdc = await instanceToken.deploy();
    usdcAddress = await usdc.getAddress();
    console.log("\tUSDC Contract deployed at:", usdcAddress);
  });
  it("deploy Staking Contract", async function () {
    const instanceStaking = await ethers.getContractFactory("Staking");
    stakingContract = await instanceStaking.deploy(usdcAddress);
    stakingContractAddress = await stakingContract.getAddress();
    console.log("\tStaking Contract deployed at:", stakingContractAddress);
  })
});

describe("Distribute tokens to users", async function() {
  let amount = ethers.parseUnits("10000000", 9);
  it("send to user1", async function() {
    await usdc.transfer(user1, amount);
    expect(await usdc.balanceOf(user1)).to.equal(amount);
  })
  it("send to user2", async function() {
    await usdc.transfer(user2, amount);
    expect(await usdc.balanceOf(user2)).to.equal(amount);
  })
  it("send to user3", async function() {
    await usdc.transfer(user3, amount);
    expect(await usdc.balanceOf(user3)).to.equal(amount);
  })
  it("send to user4", async function() {
    await usdc.transfer(user4, amount);
    expect(await usdc.balanceOf(user4)).to.equal(amount);
  })
  it("send to user5", async function() {
    await usdc.transfer(user5, amount);
    expect(await usdc.balanceOf(user5)).to.equal(amount);
  })
})

describe("Init staking contract", async function(){
  it("init", async function(){
    let amount: BigInt = BigInt(100000000 * 1e9);
    await usdc.approve(stakingContractAddress, amount);
    await stakingContract.initialize(amount);
    expect(await stakingContract.isOpen()).to.equal(true);
  })
})

describe("Deposit token", async function(){
  it("user1 deposit", async function(){
    let amount: BigInt = BigInt(100000 * 1e9);
    await usdc.connect(user1).approve(stakingContractAddress, amount);
    await stakingContract.connect(user1).stakeTokens(amount, user1.address, 0);
    expect(Number((await stakingContract.getStakeIdsByOwner(user1))[0])).to.equal(0);
  })
  it("user2 deposit", async function(){
    let amount: BigInt = BigInt(500000 * 1e9);
    await usdc.connect(user2).approve(stakingContractAddress, amount);
    await stakingContract.connect(user2).stakeTokens(amount, user2.address, 1);
    expect(Number((await stakingContract.getStakeIdsByOwner(user2))[0])).to.equal(1);
  })
  it("user3 deposit", async function(){
    let amount: BigInt = BigInt(2000000 * 1e9);
    await usdc.connect(user3).approve(stakingContractAddress, amount);
    await stakingContract.connect(user3).stakeTokens(amount, user3.address, 2);
    expect(Number((await stakingContract.getStakeIdsByOwner(user3))[0])).to.equal(2);
  })
  it("user4 deposit", async function(){
    let amount: BigInt = BigInt(100000 * 1e9);
    await usdc.connect(user4).approve(stakingContractAddress, amount);
    await stakingContract.connect(user4).stakeTokens(amount, user4.address, 3);
    expect(Number((await stakingContract.getStakeIdsByOwner(user4))[0])).to.equal(3);
  })
  it("user5 deposit", async function(){
    let amount: BigInt = BigInt(100000 * 1e9);
    await usdc.connect(user5).approve(stakingContractAddress, amount);
    await stakingContract.connect(user5).stakeTokens(amount, user5.address, 4);
    expect(Number((await stakingContract.getStakeIdsByOwner(user5))[0])).to.equal(4);
  })
  it("user1 deposit", async function(){
    let amount: BigInt = BigInt(100000 * 1e9);
    await usdc.connect(user1).approve(stakingContractAddress, amount);
    await stakingContract.connect(user1).stakeTokens(amount, user1.address, 1);
    expect(Number((await stakingContract.getStakeIdsByOwner(user1))[1])).to.equal(5);
  })
})

describe("user1 actions", async function(){
  let rewardAmount = 0;
  it("unlock", async function(){
    await time.increase(30 * 24 * 60 * 60); // Increase time by 24 hours
    await stakingContract.connect(user1).initiateUnlock(0);
  })
  it("calculate Reward", async function(){
    await time.increase(7 * 24 * 60 * 60); // Increase time by 24 hours
    rewardAmount = await stakingContract.connect(user1).calculateReward(0);
    console.log("user1 rewardAmount: ", rewardAmount);
  })
  it("withdraw", async function(){
    await stakingContract.connect(user1).withdrawStake(0);
  })
})

describe("user2 actions", async function(){
  let rewardAmount = 0;
  it("unlock", async function(){
    await stakingContract.connect(user2).initiateUnlock(1);
  })
  it("calculate Reward", async function(){
    await time.increase(7 * 24 * 60 * 60); 
    rewardAmount = await stakingContract.connect(user2).calculateReward(1);
    console.log("user2 rewardAmount: ", rewardAmount);
  })
  it("restake", async function(){
    await stakingContract.connect(user2).restakeRewards(1, 2);
  })
  it("unlock", async function(){
    await time.increase(90 * 24 * 60 * 60); 
    await stakingContract.connect(user2).initiateUnlock(1);
  })
  it("calculate Reward", async function(){
    await time.increase(7 * 24 * 60 * 60); // Increase time by 24 hours
    rewardAmount = await stakingContract.connect(user2).calculateReward(1);
    console.log("user2 rewardAmount: ", rewardAmount);
  })
  it("withdraw", async function(){
    await stakingContract.connect(user2).withdrawStake(1);
  })
})

describe("user3 actions", async function(){
  let rewardAmount = 0;
  it("unlock", async function(){
    await time.increase(9 * 24 * 60 * 60); // Increase time by 24 hours
    await stakingContract.connect(user3).initiateUnlock(2);
  })
  it("calculate Reward", async function(){
    await time.increase(7 * 24 * 60 * 60); // Increase time by 24 hours
    rewardAmount = await stakingContract.connect(user3).calculateReward(2);
    console.log("user3 rewardAmount: ", rewardAmount);
  })
  it("withdraw", async function(){
    await stakingContract.connect(user3).withdrawStake(2);
  })
})

describe("Calculate Scores", async function(){
  it("calculate scores", async function(){
    const score1 = await stakingContract.getTotalScore(user1);
    console.log("user1 score: ", score1);
    const score2 = await stakingContract.getTotalScore(user2);
    console.log("user2 score: ", score2);
    const score3 = await stakingContract.getTotalScore(user3);
    console.log("user3 score: ", score3);
    const score4 = await stakingContract.getTotalScore(user4);
    console.log("user4 score: ", score4);
    const score5 = await stakingContract.getTotalScore(user5);
    console.log("user5 score: ", score5);    
  })
})

describe("Get Tier", async function(){
  it("get Tier Score", async function(){
    const tier1 = await stakingContract.getTierByOwner(user1);
    console.log("Tier1: ", tier1);
    const tier2 = await stakingContract.getTierByOwner(user2);
    console.log("Tier2: ", tier2);
    const tier3 = await stakingContract.getTierByOwner(user3);
    console.log("Tier3: ", tier3);
    const tier4 = await stakingContract.getTierByOwner(user4);
    console.log("Tier4: ", tier4);
    const tier5 = await stakingContract.getTierByOwner(user5);
    console.log("Tier5: ", tier5);
  })
  
})  

describe("set Base Score", async function(){
  it("set base score", async function(){
    await stakingContract.setBaseScoreValue(2);
    const baseScore = await stakingContract.BASE_SCORE_VALUE();
    expect(baseScore).to.equal(2);
  })
})

describe("TierScore", async function(){
  it("get Tier Score", async function(){
    const tierScore0 = await stakingContract.tierScore(0);
    console.log("Tier Score 0: ", tierScore0);
    const tierScore1 = await stakingContract.tierScore(1);
    console.log("Tier Score 1: ", tierScore1);
    const tierScore2 = await stakingContract.tierScore(2);
    console.log("Tier Score 2: ", tierScore2);
    const tierScore3 = await stakingContract.tierScore(3);
    console.log("Tier Score 3: ", tierScore3);
    const tierScore4 = await stakingContract.tierScore(4);
    console.log("Tier Score 4: ", tierScore4);
  })
  it("set Tier Score", async function(){
    await stakingContract.setTierScore(0, 100);
    const tierScore0 = await stakingContract.tierScore(0);
    console.log("Tier Score 0: ", tierScore0);
    await stakingContract.setTierScore(1, 100);
    const tierScore1 = await stakingContract.tierScore(1);
    console.log("Tier Score 1: ", tierScore1);
    await stakingContract.setTierScore(2, 100);
    const tierScore2 = await stakingContract.tierScore(2);
    console.log("Tier Score 2: ", tierScore2);
    await stakingContract.setTierScore(3, 100);
    const tierScore3 = await stakingContract.tierScore(3);
    console.log("Tier Score 3: ", tierScore3);
    await stakingContract.setTierScore(4, 100);
    const tierScore4 = await stakingContract.tierScore(4);
    console.log("Tier Score 4: ", tierScore4);
  })
})  

