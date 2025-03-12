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
  it("deploy Henlo Token Contract", async function () {
    const instanceToken = await ethers.getContractFactory("usdc");
    usdc = await instanceToken.deploy();
    usdcAddress = await usdc.getAddress();
    console.log("\tUSDC Contract deployed at:", usdcAddress);
  });
  it("deploy Staking Contract", async function () {
    const instanceStaking = await ethers.getContractFactory("staking");
    stakingContract = await instanceStaking.deploy(usdcAddress);
    stakingContractAddress = await stakingContract.getAddress();
    console.log("\tStaking Contract deployed at:", stakingContractAddress);
  })
});

describe("Distribute tokens to users", async function() {
  let amount = ethers.parseEther("100000");
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
    let amount: BigInt = BigInt(100000000 * 1e18);
    await usdc.approve(stakingContractAddress, amount);
    await stakingContract.init(amount);
    expect(await stakingContract.isOpen()).to.equal(true);
  })
})

describe("Deposit token", async function(){
  it("user1 deposit", async function(){
    let amount: BigInt = BigInt(1000 * 1e18);
    await usdc.connect(user1).approve(stakingContractAddress, amount);
    await stakingContract.connect(user1).deposit(amount, 0);
    expect(Number((await stakingContract.getStakedIdsByOwner(user1))[0])).to.equal(0);
  })
  it("user2 deposit", async function(){
    let amount: BigInt = BigInt(5000 * 1e18);
    await usdc.connect(user2).approve(stakingContractAddress, amount);
    await stakingContract.connect(user2).deposit(amount, 1);
    expect(Number((await stakingContract.getStakedIdsByOwner(user2))[0])).to.equal(1);
  })
  it("user3 deposit", async function(){
    let amount: BigInt = BigInt(20000 * 1e18);
    await usdc.connect(user3).approve(stakingContractAddress, amount);
    await stakingContract.connect(user3).deposit(amount, 2);
    expect(Number((await stakingContract.getStakedIdsByOwner(user3))[0])).to.equal(2);
  })
  it("user4 deposit", async function(){
    let amount: BigInt = BigInt(1000 * 1e18);
    await usdc.connect(user4).approve(stakingContractAddress, amount);
    await stakingContract.connect(user4).deposit(amount, 3);
    expect(Number((await stakingContract.getStakedIdsByOwner(user4))[0])).to.equal(3);
  })
  it("user5 deposit", async function(){
    let amount: BigInt = BigInt(1000 * 1e18);
    await usdc.connect(user5).approve(stakingContractAddress, amount);
    await stakingContract.connect(user5).deposit(amount, 4);
    expect(Number((await stakingContract.getStakedIdsByOwner(user5))[0])).to.equal(4);
  })
})

describe("user1 actions", async function(){
  let rewardAmount = 0;
  it("unlock", async function(){
    await time.increase(30 * 24 * 60 * 60); // Increase time by 24 hours
    await stakingContract.connect(user1).activeUnlock(0);
  })
  it("calculate Reward", async function(){
    await time.increase(7 * 24 * 60 * 60); // Increase time by 24 hours
    rewardAmount = await stakingContract.connect(user1).calculateReward(0);
    console.log("user1 rewardAmount: ", rewardAmount);
  })
  it("withdraw", async function(){
    await stakingContract.connect(user1).withdraw(0);
  })
  it("calculate Launchpad Tier", async function() {
    const type = await stakingContract.calculateLaunchpadTier(0);
    console.log("user1 Tier: ", type);
  })
})

describe("user2 actions", async function(){
  let rewardAmount = 0;
  it("unlock", async function(){
    await stakingContract.connect(user2).activeUnlock(1);
  })
  it("calculate Reward", async function(){
    await time.increase(7 * 24 * 60 * 60); 
    rewardAmount = await stakingContract.connect(user2).calculateReward(1);
    console.log("user2 rewardAmount: ", rewardAmount);
  })
  it("restake", async function(){
    await stakingContract.connect(user2).restake(1, 2);
  })
  it("unlock", async function(){
    await time.increase(90 * 24 * 60 * 60); 
    await stakingContract.connect(user2).activeUnlock(1);
  })
  it("calculate Reward", async function(){
    await time.increase(7 * 24 * 60 * 60); // Increase time by 24 hours
    rewardAmount = await stakingContract.connect(user2).calculateReward(1);
    console.log("user2 rewardAmount: ", rewardAmount);
  })
  it("withdraw", async function(){
    await stakingContract.connect(user2).withdraw(1);
  })
  it("calculate Launchpad Tier", async function() {
    const type = await stakingContract.calculateLaunchpadTier(1);
    console.log("user2 Tier: ", type);
  })
})

describe("user3 actions", async function(){
  let rewardAmount = 0;
  it("unlock", async function(){
    await time.increase(9 * 24 * 60 * 60); // Increase time by 24 hours
    await stakingContract.connect(user3).activeUnlock(2);
  })
  it("calculate Reward", async function(){
    await time.increase(7 * 24 * 60 * 60); // Increase time by 24 hours
    rewardAmount = await stakingContract.connect(user3).calculateReward(2);
    console.log("user3 rewardAmount: ", rewardAmount);
  })
  it("withdraw", async function(){
    await stakingContract.connect(user3).withdraw(2);
  })
  it("calculate Launchpad Tier", async function() {
    const type = await stakingContract.calculateLaunchpadTier(2);
    console.log("user3 Tier: ", type);
  })
})

