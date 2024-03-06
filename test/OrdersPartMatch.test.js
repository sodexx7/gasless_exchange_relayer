const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadContracts } = require("../src/loadContracts");
const crypto = require("crypto");
const { permitTokens, printBalance } = require("../src/helpTools");

const { signPairOrdersAndExecute } = require("../src/OrdersHelp");

describe("Off-chain books order Part Match Test", function () {
  beforeEach(async function () {
    const { tokenPairOwner, eRC20TokenA, eRC20TokenB, executeOrder } =
      await loadContracts();
    this.tokenPairOwner = tokenPairOwner;
    this.eRC20TokenA = eRC20TokenA;
    this.eRC20TokenB = eRC20TokenB;
    this.executeOrder = executeOrder;
    this.isInit = 1;
    this.noInit = 0;
  });

  describe("Order Part Matched One time", function () {
    it("buyer 100 tokenA => 50 tokenB, seller 5 tokenB => 10 tokenA", async function () {
      /////////////////////////////////////////////////////Permit Token///////////////////////////////////////////////////////////

      const buyerInitTokenAAmount = ethers.parseEther("100");
      const sellerInitTokenBAmount = ethers.parseEther("5");

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
        isInit,
        noInit,
      } = this;
      await permitTokens(
        tokenPairOwner,
        buyer,
        buyer_privateKey,
        eRC20TokenA,
        buyerInitTokenAAmount.toString(),
        permitDeadLine,
        seller,
        seller_privateKey,
        eRC20TokenB,
        sellerInitTokenBAmount.toString(),
        permitDeadLine,
        executeOrder
      );
      /////////////////////////////////////////////////////Trade  Token///////////////////////////////////////////////////////////
      const buyerHoldTokenAAmoumt = ethers.parseEther("100");
      const buyerExpectedTokenBAmoumt = ethers.parseEther("50");
      const sellerHoldTokenBAmoumt = ethers.parseEther("5");
      const sellerExpectedTokenAAmoumt = ethers.parseEther("10");

      const buyOrderInfo = {
        user_privateKey: buyer_privateKey,
        user: buyer,
        holdToken: eRC20TokenA,
        holdTokenAmount: buyerHoldTokenAAmoumt.toString(),
        sellToken: eRC20TokenB,
        sellTokenAmount: buyerExpectedTokenBAmoumt.toString(),
        deadline: permitDeadLine.toString(),
        signatureStatus: isInit,
      };

      const sellOrderInfo = {
        user_privateKey: seller_privateKey,
        user: seller,
        holdToken: eRC20TokenB,
        holdTokenAmount: sellerHoldTokenBAmoumt.toString(),
        sellToken: eRC20TokenA,
        sellTokenAmount: sellerExpectedTokenAAmoumt.toString(),
        deadline: permitDeadLine.toString(),
        signatureStatus: isInit,
      };
      expect(await eRC20TokenA.balanceOf(buyer)).to.equal(
        buyerHoldTokenAAmoumt
      );
      expect(await eRC20TokenB.balanceOf(buyer)).to.equal(0);
      expect(await eRC20TokenA.balanceOf(seller)).to.equal(0);
      expect(await eRC20TokenB.balanceOf(seller)).to.equal(
        sellerHoldTokenBAmoumt
      );

      console.log("Before trading");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer, seller);

      await signPairOrdersAndExecute(buyOrderInfo, sellOrderInfo, executeOrder);
      expect(await eRC20TokenA.balanceOf(buyer)).to.equal(
        buyerHoldTokenAAmoumt - sellerExpectedTokenAAmoumt
      );
      expect(await eRC20TokenB.balanceOf(buyer)).to.equal(
        sellerHoldTokenBAmoumt
      );
      expect(await eRC20TokenA.balanceOf(seller)).to.equal(
        sellerExpectedTokenAAmoumt
      );
      expect(await eRC20TokenB.balanceOf(seller)).to.equal(0);
      console.log("After trading");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer, seller);
    });
  });
});
