const { ethers } = require("hardhat");
const { signERC20PermitData } = require("../src/tokenPermit.js");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { splitSignature } = require("../src/helpTools.js");

const { readFileSync, writeFileSync } = require("fs");
const { handler } = require("../autotasks/relay/index.js");

function getInstance(name) {
  const address = JSON.parse(readFileSync("deploy.json"))[name];
  if (!address) throw new Error(`Contract ${name} not found in deploy.json`);
  return ethers.getContractFactory(name).then((f) => f.attach(address));
}

async function main() {
  // transfer EC20PermitToken to buyer and seller
  const erc20TokenA = await getInstance("ERC20TokenA");
  const executeOrder = await getInstance("ExecuteOrder");

  const buyer_privateKey = process.env.PRIVATE_KEY_BUYER;
  const buyer = new ethers.Wallet(buyer_privateKey).address;

  //sign these two EC20PermitToken
  this.buyerPermitTotalTokenBAmount = ethers.parseEther("100");
  const permitDeadLine = Math.floor(new Date().getTime() / 1000) + 24 * 60 * 60;

  const erc20TokenAPermitData = await signERC20PermitData(
    buyer_privateKey,
    buyer,
    erc20TokenA,
    await executeOrder.getAddress(),
    buyerPermitTotalTokenBAmount.toString(),
    permitDeadLine.toString()
  );

  const request = {
    relayerType: "permitTokenA",
    request: erc20TokenAPermitData,
    signature: erc20TokenAPermitData.signature,
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
