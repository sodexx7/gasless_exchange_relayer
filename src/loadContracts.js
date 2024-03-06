const { ethers } = require("hardhat");

async function loadContracts() {
  const [tokenPairOwner, ,] = await ethers.getSigners();
  const onwerAddress = await tokenPairOwner.getAddress();
  const ERC20TokenAFactory = await ethers.getContractFactory("ERC20TokenA");
  const eRC20TokenA = await ERC20TokenAFactory.deploy(onwerAddress);

  const ERC20TokenBFactory = await ethers.getContractFactory("ERC20TokenB");
  const eRC20TokenB = await ERC20TokenBFactory.deploy(onwerAddress);

  const ExecuteOrderFactory = await ethers.getContractFactory("ExecuteOrder");
  const executeOrder = await ExecuteOrderFactory.deploy(
    await eRC20TokenA.getAddress(),
    await eRC20TokenB.getAddress()
  );

  return { tokenPairOwner, eRC20TokenA, eRC20TokenB, executeOrder };
}

module.exports = {
  loadContracts,
};
