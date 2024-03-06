// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const PAIR_TOKENS_OWNER = "0xaf9cc770475a9a36184124f3ecc023eb9ee80d2e";
  const erc20TokenA = await hre.ethers.deployContract("ERC20TokenA", [
    PAIR_TOKENS_OWNER,
  ]);
  await erc20TokenA.waitForDeployment();
  const erc20TokenB = await hre.ethers.deployContract("ERC20TokenB", [
    PAIR_TOKENS_OWNER,
  ]);
  await erc20TokenB.waitForDeployment();
  const erc20TokenAddress = await erc20TokenA.getAddress();
  const erc20TokenBAddress = await erc20TokenB.getAddress();

  const executeOrder = await hre.ethers.deployContract("ExecuteOrder", [
    erc20TokenAddress,
    erc20TokenBAddress,
  ]);

  const executeOrderAddress = await executeOrder.getAddress();
  await executeOrder.waitForDeployment();

  console.log(
    "erc20TokenAddress",
    erc20TokenAddress,
    "erc20TokenBAddress",
    erc20TokenBAddress,
    "executeOrder",
    executeOrderAddress
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
