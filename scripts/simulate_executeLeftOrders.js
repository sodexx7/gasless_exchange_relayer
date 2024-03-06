const { ethers } = require("hardhat");
const { signERC20PermitData } = require("../src/tokenPermit.js");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { splitSignature } = require("../src/helpTools.js");

const { readFileSync, writeFileSync } = require("fs");
const { handler } = require("../autotasks/relay/index.js");

const { signBuyOrderData } = require("../src/signerBuyOrder.js");
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
  const seller_privateKey2 = process.env.PRIVATE_KEY_SELLER;
  const buyer = new ethers.Wallet(buyer_privateKey).address;
  const seller = new ethers.Wallet(seller_privateKey).address;
  const seller2 = new ethers.Wallet(seller_privateKey2).address;

  const permitDeadLine = Math.floor(new Date().getTime() / 1000) + 24 * 60 * 60;

  // buyer left 90 tokenA => 45 tokenB
  // enter new seller 45 tokenB => 90 tokenA
  // buyer 100 tokenA => 50 tokenB, seller 50 tokenB => 100 tokenA
  const buyerTokenAAmountOrder1 = ethers.parseEther("100");
  const buyerExpectedTokenBAmountOrder1 = ethers.parseEther("50");

  const sellerTokenBAmountOrder2 = ethers.parseEther("45");
  const sellerExpectedTokenAAmountOrder2 = ethers.parseEther("90");

  const noInit = 0; // buy order is left Order.
  const isInit = 1; // sell order is First Order.
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

  // const sellOrderInfo = {
  //   user_privateKey: seller_privateKey,
  //   user: seller,
  //   holdToken: erc20TokenB,
  //   holdTokenAmount: sellerTokenBAmountOrder1.toString(),
  //   sellToken: erc20TokenA,
  //   sellTokenAmount: sellerExpectedTokenAAmountOrder1.toString(),
  //   deadline: permitDeadLine.toString(),
  //   signatureStatus: isInit,
  // };

  const sellOrderInfo2 = {
    user_privateKey: seller_privateKey2,
    user: seller2,
    holdToken: erc20TokenB,
    holdTokenAmount: sellerTokenBAmountOrder2.toString(),
    sellToken: erc20TokenA,
    sellTokenAmount: sellerExpectedTokenAAmountOrder2.toString(),
    deadline: permitDeadLine.toString(),
    signatureStatus: isInit,
  };

  const sellOrderResult2 = await signSellOrderData(
    sellOrderInfo2.user_privateKey,
    sellOrderInfo2.user,
    executeOrder,
    await sellOrderInfo2.holdToken.getAddress(),
    sellOrderInfo2.holdTokenAmount,
    await sellOrderInfo2.sellToken.getAddress(),
    sellOrderInfo2.sellTokenAmount,
    sellOrderInfo2.deadline
  );

  // left order, just change the token amount, others keep same
  buyOrderResult.buyOrderData.holdTokenAAmount = (
    buyOrderResult.buyOrderData.holdTokenAAmount -
    ethers.parseEther("10").toString()
  ).toString();
  buyOrderResult.buyOrderData.expectedTokenBAmount = (
    buyOrderResult.buyOrderData.expectedTokenBAmount -
    ethers.parseEther("5").toString()
  ).toString();

  buyOrderResult.buyOrderData.buyDeadline = "1709790646";
  buyOrderResult.signature =
    "0x2a7617fb840906f6ad4371bf130d94c83a32cfd3c26b81f4a8e862ed7ee4374c1a05ad0dba3482d49452a1cd877fc91322238469f5dd762d27f0dde0bc7a8f9e1c";

  const requset = {
    relayerType: "pairOrdersExecute",
    request: {
      buyOrderInfo: buyOrderResult.buyOrderData,
      buyOrderSignature: buyOrderResult.signature,
      buyOrderSignatureStatus: noInit,
      sellOrderInfo: sellOrderResult2.sellOrderData,
      sellOrderSignature: sellOrderResult2.signature,
      sellOrderSignatureStatus: sellOrderInfo2.signatureStatus,
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
