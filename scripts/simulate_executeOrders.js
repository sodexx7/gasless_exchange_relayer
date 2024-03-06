const { ethers } = require("hardhat");
const { readFileSync, writeFileSync } = require("fs");
const { signBuyOrderData } = require("../src/signerBuyOrder");
const { signSellOrderData } = require("../src/signerSellOrder.js");

function getInstance(name) {
  const address = JSON.parse(readFileSync("deploy.json"))[name];
  if (!address) throw new Error(`Contract ${name} not found in deploy.json`);
  return ethers.getContractFactory(name).then((f) => f.attach(address));
}

async function main() {
  const erc20TokenA = await getInstance("ERC20TokenA");
  const erc20TokenB = await getInstance("ERC20TokenB");
  const executeOrder = await getInstance("ExecuteOrder");

  const buyer_privateKey = process.env.PRIVATE_KEY_BUYER;
  const seller_privateKey = process.env.PRIVATE_KEY_SELLER;
  const buyer = new ethers.Wallet(buyer_privateKey).address;
  const seller = new ethers.Wallet(seller_privateKey).address;

  const permitDeadLine = Math.floor(new Date().getTime() / 1000) + 24 * 60 * 60;

  // buyer 100 tokenA => 50 tokenB, seller 50 tokenB => 100 tokenA
  const buyerTokenAAmountOrder1 = ethers.parseEther("100");
  const buyerExpectedTokenBAmountOrder1 = ethers.parseEther("50");

  const sellerTokenBAmountOrder1 = ethers.parseEther("5");
  const sellerExpectedTokenAAmountOrder1 = ethers.parseEther("10");

  const isInit = 1; // buy order and sell order both as First Order.
  const buyOrderInfo = {
    user_privateKey: buyer_privateKey,
    user: buyer,
    holdToken: erc20TokenA,
    holdTokenAmount: buyerTokenAAmountOrder1.toString(),
    sellToken: erc20TokenB,
    sellTokenAmount: buyerExpectedTokenBAmountOrder1.toString(),
    deadline: permitDeadLine.toString(),
    signatureStatus: isInit,
  };
  const buyOrderResult = await signBuyOrderData(
    buyOrderInfo.user_privateKey,
    buyOrderInfo.user,
    executeOrder,
    await buyOrderInfo.holdToken.getAddress(),
    buyOrderInfo.holdTokenAmount,
    await buyOrderInfo.sellToken.getAddress(),
    buyOrderInfo.sellTokenAmount,
    buyOrderInfo.deadline
  );

  const sellOrderInfo = {
    user_privateKey: seller_privateKey,
    user: seller,
    holdToken: erc20TokenB,
    holdTokenAmount: sellerTokenBAmountOrder1.toString(),
    sellToken: erc20TokenA,
    sellTokenAmount: sellerExpectedTokenAAmountOrder1.toString(),
    deadline: permitDeadLine.toString(),
    signatureStatus: isInit,
  };

  const sellOrderResult = await signSellOrderData(
    sellOrderInfo.user_privateKey,
    sellOrderInfo.user,
    executeOrder,
    await sellOrderInfo.holdToken.getAddress(),
    sellOrderInfo.holdTokenAmount,
    await sellOrderInfo.sellToken.getAddress(),
    sellOrderInfo.sellTokenAmount,
    sellOrderInfo.deadline
  );

  // when the First Order maybe become Left Order, should store buyOrderInfo(buyer,deadline,signature) for future usage.
  const requset = {
    relayerType: "pairOrdersExecute",
    request: {
      buyOrderInfo: buyOrderResult.buyOrderData,
      buyOrderSignature: buyOrderResult.signature,
      buyOrderSignatureStatus: buyOrderInfo.signatureStatus,
      sellOrderInfo: sellOrderResult.sellOrderData,
      sellOrderSignature: sellOrderResult.signature,
      sellOrderSignatureStatus: sellOrderInfo.signatureStatus,
    },
  };

  writeFileSync("tmp/request.json", JSON.stringify(requset, null, 2));
  console.log(`relayerType: `, requset.relayerType);
  console.log(`request: `, requset.request);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
