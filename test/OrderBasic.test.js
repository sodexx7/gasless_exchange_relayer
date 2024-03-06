const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadContracts } = require("../src/loadContracts.js");
const crypto = require("crypto");
const {
  permitTokens,
  printBalance,
  beforeOrderCheck,
} = require("../src/helpTools.js");

const { signPairOrdersAndExecute } = require("../src/OrdersHelp.js");

describe("Off-chain books order Basic Test", function () {
  beforeEach(async function () {
    const { tokenPairOwner, eRC20TokenA, eRC20TokenB, executeOrder } =
      await loadContracts();
    this.buyerPermitTotalTokenBAmount = ethers.parseEther("100");
    this.sellPermitTotalTokenBAmount = ethers.parseEther("50");

    this.tokenPairOwner = tokenPairOwner;
    this.eRC20TokenA = eRC20TokenA;
    this.eRC20TokenB = eRC20TokenB;
    this.executeOrder = executeOrder;
    this.isInit = 1; // First Order status
    this.noInit = 0; // Left Order status
  });

  it("buyer permit 100 tokenA for executeOrder, seller permit 100 tokenB for executeOrder", async function () {
    const buyer_privateKey = "0x" + crypto.randomBytes(32).toString("hex");
    const buyer = new ethers.Wallet(buyer_privateKey).address;
    const seller_privateKey = "0x" + crypto.randomBytes(32).toString("hex");
    const seller = new ethers.Wallet(seller_privateKey).address;

    const ONE_DAY = 24 * 60 * 60;
    const permitDeadLine = (await time.latest()) + ONE_DAY;
    const {
      tokenPairOwner,
      eRC20TokenA,
      eRC20TokenB,
      executeOrder,
      buyerPermitTotalTokenBAmount,
      sellPermitTotalTokenBAmount,
      isInit,
      noInit,
    } = this;
    await permitTokens(
      tokenPairOwner,
      buyer,
      buyer_privateKey,
      eRC20TokenA,
      buyerPermitTotalTokenBAmount.toString(),
      permitDeadLine,
      seller,
      seller_privateKey,
      eRC20TokenB,
      sellPermitTotalTokenBAmount.toString(),
      permitDeadLine,
      executeOrder
    );

    expect(
      await eRC20TokenA.allowance(buyer, await executeOrder.getAddress())
    ).to.equal(buyerPermitTotalTokenBAmount.toString());

    expect(
      await eRC20TokenB.allowance(seller, await executeOrder.getAddress())
    ).to.equal(sellPermitTotalTokenBAmount.toString());
  });

  describe("Order Basic Test", function () {
    it("buyer 100 tokenA => 50 tokenB, seller 50 tokenB => 100 tokenA", async function () {
      /////////////////////////////////////////////////////Permit Token///////////////////////////////////////////////////////////
      const buyerTokenAAmountOrder1 = ethers.parseEther("100");
      const buyerExpectedTokenBAmountOrder1 = ethers.parseEther("50");

      const sellerTokenBAmountOrder1 = ethers.parseEther("50");
      const buyerExpectedTokenAAmountOrder1 = ethers.parseEther("100");

      buyer_privateKey = "0x" + crypto.randomBytes(32).toString("hex");
      buyer = new ethers.Wallet(buyer_privateKey).address;
      seller_privateKey = "0x" + crypto.randomBytes(32).toString("hex");
      seller = new ethers.Wallet(seller_privateKey).address;

      const ONE_DAY = 24 * 60 * 60;
      const permitDeadLine = (await time.latest()) + ONE_DAY;
      const {
        tokenPairOwner,
        eRC20TokenA,
        eRC20TokenB,
        executeOrder,
        buyerPermitTotalTokenBAmount,
        sellPermitTotalTokenBAmount,
        isInit,
        noInit,
      } = this;
      await permitTokens(
        tokenPairOwner,
        buyer,
        buyer_privateKey,
        eRC20TokenA,
        buyerTokenAAmountOrder1.toString(),
        permitDeadLine,
        seller,
        seller_privateKey,
        eRC20TokenB,
        sellerTokenBAmountOrder1.toString(),
        permitDeadLine,
        executeOrder
      );
      /////////////////////////////////////////////////////Trade  Token///////////////////////////////////////////////////////////
      const buyOrderInfo = {
        user_privateKey: buyer_privateKey,
        user: buyer,
        holdToken: eRC20TokenA,
        holdTokenAmount: buyerTokenAAmountOrder1.toString(),
        sellToken: eRC20TokenB,
        sellTokenAmount: buyerExpectedTokenBAmountOrder1.toString(),
        deadline: permitDeadLine.toString(),
        signatureStatus: isInit,
      };

      const sellOrderInfo = {
        user_privateKey: seller_privateKey,
        user: seller,
        holdToken: eRC20TokenB,
        holdTokenAmount: sellerTokenBAmountOrder1.toString(),
        sellToken: eRC20TokenA,
        sellTokenAmount: buyerExpectedTokenAAmountOrder1.toString(),
        deadline: permitDeadLine.toString(),
        signatureStatus: isInit,
      };
      beforeOrderCheck(
        eRC20TokenA,
        eRC20TokenB,
        buyer,
        buyerPermitTotalTokenBAmount,
        seller,
        sellPermitTotalTokenBAmount
      );
      console.log("Before trading");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer, seller);
      await signPairOrdersAndExecute(buyOrderInfo, sellOrderInfo, executeOrder);

      expect(await eRC20TokenA.balanceOf(buyer)).to.equal(0);
      expect(await eRC20TokenB.balanceOf(buyer)).to.equal(
        sellerTokenBAmountOrder1.toString()
      );

      expect(await eRC20TokenA.balanceOf(seller)).to.equal(
        buyerTokenAAmountOrder1.toString()
      );
      expect(await eRC20TokenB.balanceOf(seller)).to.equal(0);
      console.log("After trading");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer, seller);
    });
  });
});
