
// Importing necessary functionalities from the Hardhat package.
import { ethers } from 'hardhat'

async function main() {
    // Retrieve the first signer, typically the default account in Hardhat, to use as the deployer.
    const [deployer] = await ethers.getSigners()
    
    // This is sepolia test token
    const instanceUSDC = await ethers.deployContract('usdc');
    await instanceUSDC.waitForDeployment()
    console.log(`USDC contract is deployed. Token address: ${instanceUSDC.target}`)
    // const tokenAddress = "0xe90f70F461C561D9281D2Af6b6c98ECAec9fD850"; // mainnet $henlo address
    const tokenAddress = instanceUSDC.target; // It's for sepolia test token
    
    const instanceStaking = await ethers.deployContract('staking', [tokenAddress]);
    await instanceStaking.waitForDeployment()
    console.log(`Staking contract is deployed. Staking address: ${instanceStaking.target}`)
}

// This pattern allows the use of async/await throughout and ensures that errors are caught and handled properly.
main().catch(error => {
    console.error(error)
    process.exitCode = 1
})