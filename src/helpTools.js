const { signERC20PermitData } = require("./tokenPermit");
const { expect } = require("chai");

function splitSignature(signature) {
  let r = "0x" + signature.slice(2, 66);
  let s = "0x" + signature.slice(66, 130);
  let v = parseInt(signature.slice(130, 132), 16);
  return { r, s, v };
}

async function printBalance(eRC20TokenA, eRC20TokenB, buyer, seller) {
  console.log(
    "buyer:",
    buyer,
    "tokenA balance",
    await eRC20TokenA.balanceOf(buyer),
    "ntokenB balance",
    await eRC20TokenB.balanceOf(buyer)
  );
  console.log(
    "seller:",
    seller,
    "tokenA balance",
    await eRC20TokenA.balanceOf(seller),
    "ntokenB balance",
    await eRC20TokenB.balanceOf(seller)
  );
}

async function beforeOrderCheck(
  eRC20TokenA,
  eRC20TokenB,
  buyer,
  buyerPermitTotalTokenBAmount,
  seller,
  sellPermitTotalTokenBAmount
) {
  expect(await eRC20TokenA.balanceOf(buyer)).to.equal(
    buyerPermitTotalTokenBAmount.toString()
  );
  expect(await eRC20TokenB.balanceOf(buyer)).to.equal(0);
  expect(await eRC20TokenA.balanceOf(seller)).to.equal(0);
  expect(await eRC20TokenB.balanceOf(seller)).to.equal(
    sellPermitTotalTokenBAmount.toString()
  );
}

// todo more check, after more oders check balance
async function AfterOrderCheck(
  eRC20TokenA,
  eRC20TokenB,
  buyer,
  buyerPermitTotalTokenBAmount,
  seller,
  sellPermitTotalTokenBAmount,
  buyerOrderInfos,
  sellOrderInfos
) {
  expect(await eRC20TokenA.balanceOf(buyer)).to.equal(
    buyerPermitTotalTokenBAmount.toString()
  );
  expect(await eRC20TokenB.balanceOf(buyer)).to.equal(0);
  expect(await eRC20TokenA.balanceOf(seller)).to.equal(0);
  expect(await eRC20TokenB.balanceOf(seller)).to.equal(
    sellPermitTotalTokenBAmount.toString()
  );
}

async function transferTokenToUser(owner, token, user, amount) {
  await token.connect(owner).mint(user, amount); // transfer token to this address
}

async function permitTokens(
  owner,
  buyer,
  buyer_privateKey,
  eRC20TokenA,
  tokenAAmount,
  permitTokenADeadLine,
  seller,
  seller_privateKey,
  eRC20TokenB,
  tokenBAmount,
  permitTokenBDeadLine,
  executeOrder
) {
  // permit tokenA
  await permitToken(
    owner,
    buyer,
    buyer_privateKey,
    eRC20TokenA,
    tokenAAmount,
    permitTokenADeadLine,
    executeOrder
  );

  // permit tokenB
  await permitToken(
    owner,
    seller,
    seller_privateKey,
    eRC20TokenB,
    tokenBAmount,
    permitTokenBDeadLine,
    executeOrder
  );
}

async function permitToken(
  owner,
  user,
  user_privateKey,
  eRC20Token,
  tokenAmount,
  permitDeadLine,
  executeOrder
) {
  await transferTokenToUser(owner, eRC20Token, user, tokenAmount);

  const permitInfo = {
    user_privatekey: user_privateKey,
    user: user,
    holdToken: eRC20Token,
    approveAmount: tokenAmount.toString(),
    permitDeadline: permitDeadLine.toString(),
  };

  const executeOrderAddress = await executeOrder.getAddress();

  const permitInfoData = await signERC20PermitData(
    permitInfo.user_privatekey,
    permitInfo.user,
    permitInfo.holdToken,
    executeOrderAddress,
    permitInfo.approveAmount,
    permitInfo.permitDeadline
  );

  const { r, s, v } = splitSignature(permitInfoData.signature);
  await eRC20Token.permit(
    permitInfo.user,
    executeOrderAddress,
    permitInfo.approveAmount,
    permitInfo.permitDeadline,
    v,
    r,
    s
  );
}

module.exports = {
  splitSignature,
  transferTokenToUser,
  permitTokens,
  permitToken,
  printBalance,
  beforeOrderCheck,
};
