const { ethers } = require("hardhat");
const { signERC20PermitData } = require("../src/tokenPermit.js");
const { readFileSync, writeFileSync } = require("fs");

function getInstance(name) {
  const address = JSON.parse(readFileSync("deploy.json"))[name];
  if (!address) throw new Error(`Contract ${name} not found in deploy.json`);
  return ethers.getContractFactory(name).then((f) => f.attach(address));
}

async function main() {
  // transfer EC20PermitToken to buyer and seller
  const erc20TokenB = await getInstance("ERC20TokenB");
  const executeOrder = await getInstance("ExecuteOrder");

  const seller_privateKey = process.env.PRIVATE_KEY_SELLER2;
  const seller = new ethers.Wallet(seller_privateKey).address;

  this.sellPermitTotalTokenBAmount = ethers.parseEther("45");
  const permitDeadLine = Math.floor(new Date().getTime() / 1000) + 24 * 60 * 60;

  const erc20TokenBPermitData = await signERC20PermitData(
    seller_privateKey,
    seller,
    erc20TokenB,
    await executeOrder.getAddress(),
    sellPermitTotalTokenBAmount.toString(),
    permitDeadLine.toString()
  );

  const request = {
    relayerType: "permitTokenB",
    request: erc20TokenBPermitData,
    signature: erc20TokenBPermitData.signature,
  };

  writeFileSync("tmp/request.json", JSON.stringify(request, null, 2));
  console.log(`relayerType: `, request.relayerType);
  console.log(`request: `, request.request);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
