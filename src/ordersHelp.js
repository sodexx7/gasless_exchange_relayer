const { signBuyOrderData } = require("./signerBuyOrder");
const { signSellOrderData } = require("./signerSellOrder");

async function signPairOrdersAndExecute(
  buyOrderInfo,
  sellOrderInfo,
  executeOrder
) {
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

  await executeOrder.pairOrdersExecute(
    buyOrderResult.buyOrderData,
    buyOrderResult.signature,
    buyOrderInfo.signatureStatus,
    sellOrderResult.sellOrderData,
    sellOrderResult.signature,
    sellOrderInfo.signatureStatus
  );
}

async function executePairOrders(
  buyOrderInfo,
  buyOrderResult,
  sellOrderInfo,
  sellOrderResult,
  executeOrder
) {
  await executeOrder.pairOrdersExecute(
    buyOrderResult.buyOrderData,
    buyOrderResult.signature,
    buyOrderInfo.signatureStatus,
    sellOrderResult.sellOrderData,
    sellOrderResult.signature,
    sellOrderInfo.signatureStatus
  );
}

module.exports = {
  signPairOrdersAndExecute,
  executePairOrders,
};
