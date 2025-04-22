import { ethers } from 'hardhat';

async function main() {
    // Retrieve the first signer (default account in Hardhat) to use as the deployer.
    const [deployer] = await ethers.getSigners();
    // const tokenAddress = "0x129e5915326ed86f831b0e035acda34b209633d5"; // mainnet $PAPPLE address 
    const tokenAddress = "0xe5e217b6722d45be85fb37f5d7f4f15950c1b80a"; // mainnet $PAPPLE address 
    // Step 1: Get the contract factory for the staking contract
    const StakingFactory = await ethers.getContractFactory('Staking');
    // Step 2: Get the deploy transaction
    const deployTransaction = await StakingFactory.getDeployTransaction(tokenAddress);
    // Step 3: Estimate the gas required for deployment using the deployer's signer
    const deploymentGasEstimate = await deployer.estimateGas(deployTransaction);
    // Step 3: Get the current gas price
    const gasPrice = (await deployer.provider.getFeeData()).maxFeePerGas;
    if(gasPrice === null) return;
    // Step 4: Calculate the transaction fee in wei
    const transactionFeeWei = deploymentGasEstimate * gasPrice;
    // Step 5: Convert the fee from wei to ether for better readability
    const transactionFeeEther = ethers.formatEther(transactionFeeWei);
    console.log(`Estimated gas for deployment: ${deploymentGasEstimate.toString()}`);
    console.log(`Current gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    console.log(`Estimated transaction fee: ${transactionFeeEther} ETH`);
    // Step 6: Deploy the contract
    const instanceStaking = await StakingFactory.deploy(tokenAddress);
    await instanceStaking.waitForDeployment();
    console.log(`Staking contract is deployed. Staking address: ${instanceStaking.target}`);
}

// Run the deployment script
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});