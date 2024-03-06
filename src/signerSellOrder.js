const ethSigUtil = require("eth-sig-util");
const { ethers, network } = require("hardhat");

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const Order = [
  { name: "user", type: "address" },
  { name: "holdToken", type: "address" },
  { name: "sellToken", type: "address" },
  { name: "holdTokenAmount", type: "uint256" },
  { name: "sellTokenAmount", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
];

async function getOrderTypeData(chainId, executeOrder) {
  return {
    types: {
      EIP712Domain: EIP712Domain,
      Order: Order,
    },
    domain: {
      name: "onChainOrder",
      version: "1",
      chainId: chainId,
      verifyingContract: executeOrder,
    },
    primaryType: "Order", // should check
  };
}

async function buildMsgForOrder(
  user,
  holdToken,
  holdTokenAmount,
  sellToken,
  sellTokenAmount,
  deadline,
  executeOrder
) {
  const nonce = await executeOrder
    .nonces(user)
    .then((nonce) => nonce.toString());

  return {
    user: user,
    holdToken: holdToken,
    sellToken: sellToken,
    holdTokenAmount: holdTokenAmount,
    sellTokenAmount: sellTokenAmount,
    nonce: nonce,
    deadline: deadline,
  };
}
async function sellOrderRequest(
  user,
  holdTokenAmount,
  sellTokenAmount,
  deadline,
  executeOrder
) {
  const nonce = await executeOrder
    .nonces(user)
    .then((nonce) => nonce.toString());
  return {
    seller: user,
    holdTokenBAmount: holdTokenAmount,
    expectedTokenAAmount: sellTokenAmount,
    nonce: nonce,
    sellDeadline: deadline,
  };
}

async function signOrderData(user_privateKey, user, data) {
  // If user is a private key, use it to sign
  if (typeof user === "string") {
    const privateKey = Buffer.from(user_privateKey.replace(/^0x/, ""), "hex");
    return ethSigUtil.signTypedMessage(privateKey, { data });
  }
}

async function addTypedData(orderData, executeOrder) {
  const chainIdHex = await network.provider.send("eth_chainId");
  const chainId = parseInt(chainIdHex);
  const typeData = await getOrderTypeData(
    chainId,
    await executeOrder.getAddress()
  );
  return { ...typeData, message: orderData };
}

async function signSellOrderData(
  user_privateKey,
  user,
  executeOrder,
  holdToken,
  holdTokenAmount,
  sellToken,
  sellTokenAmount,
  deadline
) {
  const orderData = await buildMsgForOrder(
    user,
    holdToken,
    holdTokenAmount,
    sellToken,
    sellTokenAmount,
    deadline,
    executeOrder
  );
  const toSignData = await addTypedData(orderData, executeOrder);
  // console.log("toSignData");
  // console.log(toSignData);
  const signature = await signOrderData(user_privateKey, user, toSignData);

  //  buyOrderData and  toSignData should consistant? todo check
  const sellOrderData = await sellOrderRequest(
    user,
    holdTokenAmount,
    sellTokenAmount,
    deadline,
    executeOrder
  );
  return { sellOrderData, signature };
}

module.exports = {
  signSellOrderData,
};
