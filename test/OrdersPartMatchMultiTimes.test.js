const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadContracts } = require("../src/loadContracts");
const crypto = require("crypto");
const { permitTokens, permitToken, printBalance } = require("../src/helpTools");

const { executePairOrders } = require("../src/OrdersHelp");
const { signBuyOrderData } = require("../src/signerBuyOrder");
const { signSellOrderData } = require("../src/signerSellOrder");

describe("Off-chain books order part matched multiple Test", function () {
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

  // 100 tokenB => 50 tokenA
  // 90 tokenB = > 45 tokenA
  describe("Orders Part Matched Multiple times", function () {
    it("mulit_matcth_orders_1", async function () {
      console.log(
        "1: current matched order: buyer order: 100 tokenA => 50 tokenB, seller order: 5 tokenB => 10 tokenA\n"
      );

      const buyerPermitTokenAAmount = ethers.parseEther("100");
      const sellerPermitTokenBAmount = ethers.parseEther("5");

      buyer_privateKey = "0x" + crypto.randomBytes(32).toString("hex");
      buyer = new ethers.Wallet(buyer_privateKey).address;
      const seller_privateKey = "0x" + crypto.randomBytes(32).toString("hex");
      const seller = new ethers.Wallet(seller_privateKey).address;
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
        buyerPermitTokenAAmount.toString(),
        permitDeadLine,
        seller,
        seller_privateKey,
        eRC20TokenB,
        sellerPermitTokenBAmount.toString(),
        permitDeadLine,
        executeOrder
      );
      /////////////////////////////////////////////////////ORDER 1 MATCHED ///////////////////////////////////////////////////////////
      const buyerHoldTokenAAmoumt1 = ethers.parseEther("100");
      const buyerExpectedTokenBAmoumt1 = ethers.parseEther("50");
      const sellerHoldTokenBAmoumt1 = ethers.parseEther("5");
      const sellerExpectedTokenAAmoumt1 = ethers.parseEther("10");

      const buyOrderInfo1 = {
        user_privateKey: buyer_privateKey,
        user: buyer,
        holdToken: eRC20TokenA,
        holdTokenAmount: buyerHoldTokenAAmoumt1.toString(),
        sellToken: eRC20TokenB,
        sellTokenAmount: buyerExpectedTokenBAmoumt1.toString(),
        deadline: permitDeadLine.toString(),
        signatureStatus: isInit,
      };

      const sellOrderInfo1 = {
        user_privateKey: seller_privateKey,
        user: seller,
        holdToken: eRC20TokenB,
        holdTokenAmount: sellerHoldTokenBAmoumt1.toString(),
        sellToken: eRC20TokenA,
        sellTokenAmount: sellerExpectedTokenAAmoumt1.toString(),
        deadline: permitDeadLine.toString(),
        signatureStatus: isInit,
      };
      expect(await eRC20TokenA.balanceOf(buyer)).to.equal(
        buyerHoldTokenAAmoumt1
      );
      expect(await eRC20TokenB.balanceOf(buyer)).to.equal(0);
      expect(await eRC20TokenA.balanceOf(seller)).to.equal(0);
      expect(await eRC20TokenB.balanceOf(seller)).to.equal(
        sellerHoldTokenBAmoumt1
      );
      const buyOrderResult1 = await signBuyOrderData(
        buyOrderInfo1.user_privateKey,
        buyOrderInfo1.user,
        executeOrder,
        await buyOrderInfo1.holdToken.getAddress(),
        buyOrderInfo1.holdTokenAmount,
        await buyOrderInfo1.sellToken.getAddress(),
        buyOrderInfo1.sellTokenAmount,
        buyOrderInfo1.deadline
      );

      const sellOrderResult1 = await signSellOrderData(
        sellOrderInfo1.user_privateKey,
        sellOrderInfo1.user,
        executeOrder,
        await sellOrderInfo1.holdToken.getAddress(),
        sellOrderInfo1.holdTokenAmount,
        await sellOrderInfo1.sellToken.getAddress(),
        sellOrderInfo1.sellTokenAmount,
        sellOrderInfo1.deadline
      );

      console.log("Before trading first time");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer, seller);

      await executePairOrders(
        buyOrderInfo1,
        buyOrderResult1,
        sellOrderInfo1,
        sellOrderResult1,
        executeOrder
      );
      console.log("After trading first time");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer, seller);
      buyOrderResult1.buyOrderData.holdTokenAAmount = (
        buyOrderResult1.buyOrderData.holdTokenAAmount -
        sellOrderInfo1.sellTokenAmount
      ).toString();

      buyOrderResult1.buyOrderData.expectedTokenBAmount = (
        buyOrderResult1.buyOrderData.expectedTokenBAmount -
        sellOrderInfo1.holdTokenAmount
      ).toString();

      // TOOD CHECK
      // buyOrderInfo1 left order
      expect(await eRC20TokenA.balanceOf(buyer)).to.equal(
        buyOrderResult1.buyOrderData.holdTokenAAmount
      );
      expect(await eRC20TokenB.balanceOf(buyer)).to.equal(
        sellOrderInfo1.holdTokenAmount
      );
      expect(await eRC20TokenA.balanceOf(seller)).to.equal(
        sellerExpectedTokenAAmoumt1
      );
      expect(await eRC20TokenB.balanceOf(seller)).to.equal(0);
      /////////////////////////////////////////////////////ORDER2 MATCHED ///////////////////////////////////////////////////////////

      console.log("-----------buy order and sell order's status are init \n");
      console.log(
        "2: buy order left:buyer 90 tokenA => 45 tokenB,seller order: 5 tokenB => 10 tokenA has all traded\n"
      );
      console.log("buyerLeftTokenAAmoumt", buyOrderInfo1.holdTokenAmount);
      console.log(
        "buyerLeftExpectedTokenBAmoumt",
        buyOrderInfo1.sellTokenAmount
      );
      console.log(
        "-----------enter new sell order:seller order: 45 tokenB => 90 tokenA\n"
      );

      const seller_privateKey2 = "0x" + crypto.randomBytes(32).toString("hex");
      const seller2 = new ethers.Wallet(seller_privateKey2).address;
      const permitDeadLine_seller2 = (await time.latest()) + ONE_DAY;
      const seller2PermitTokenBAmount = ethers.parseEther("90");
      // permit tokenB
      await permitToken(
        tokenPairOwner,
        seller2,
        seller_privateKey2,
        eRC20TokenB,
        seller2PermitTokenBAmount,
        permitDeadLine_seller2,
        executeOrder
      );

      console.log(
        "eRC20TokenB of seller for executeOrder's allowance",
        await eRC20TokenB.allowance(seller2, await executeOrder.getAddress())
      );

      console.log(
        "3. current matched order: buyer order: 90 tokenA => 45 tokenB, seller order: 45 tokenB => 90 tokenA\n"
      );
      /////////////////////////////////////////////////////Trade2 MATCHED ///////////////////////////////////////////////////////////
      console.log(
        "-----------buy order's status are noInit,seller order's status is init\n"
      );
      // todo below code should connected with above code
      const sellerHoldTokenBAmoumt2 = ethers.parseEther("45");
      const sellerExpectedTokenAAmoumt2 = ethers.parseEther("90");
      const sellOrderInfo2 = {
        user_privateKey: seller_privateKey2,
        user: seller2,
        holdToken: eRC20TokenB,
        holdTokenAmount: sellerHoldTokenBAmoumt2.toString(),
        sellToken: eRC20TokenA,
        sellTokenAmount: sellerExpectedTokenAAmoumt2.toString(),
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
      buyOrderInfo1.signatureStatus = noInit;
      console.log("Before trading second time");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer, seller2);
      await executePairOrders(
        buyOrderInfo1,
        buyOrderResult1,
        sellOrderInfo2,
        sellOrderResult2,
        executeOrder
      );
      console.log("After trading second time");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer, seller2);
      // expect(await eRC20TokenA.balanceOf(buyer)).to.equal(0);
      // expect(await eRC20TokenB.balanceOf(buyer)).to.equal(
      //   buyOrderInfo1.expectedTokenBAmount
      // );
      // expect(await eRC20TokenA.balanceOf(seller2)).to.equal(0);
      // expect(await eRC20TokenB.balanceOf(seller2)).to.equal(
      //   sellerExpectedTokenAAmoumt2
      // );

      // expect(await eRC20TokenA.balanceOf(buyer)).to.equal(0);
      // expect(await eRC20TokenB.balanceOf(buyer)).to.equal(
      //   buyerExpectedTokenBAmoumt1
      // );
      // expect(await eRC20TokenA.balanceOf(seller2)).to.equal(
      //   sellerExpectedTokenAAmoumt2
      // );
      // expect(await eRC20TokenB.balanceOf(seller2)).to.equal(0);
      /////////////////////////////////////////////////////Trade  Token///////////////////////////////////////////////////////////
    });
    it("mulit_matcth_orders_2", async function () {
      console.log(
        "1: current matched order: buyer order: 5 tokenA => 10 tokenB, seller order: 100 tokenB => 50 tokenA\n"
      );

      const buyerPermitTokenAAmount = ethers.parseEther("5");
      const sellerPermitTokenBAmount = ethers.parseEther("100");

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
        isInit,
        noInit,
      } = this;

      await permitTokens(
        tokenPairOwner,
        buyer,
        buyer_privateKey,
        eRC20TokenA,
        buyerPermitTokenAAmount.toString(),
        permitDeadLine,
        seller,
        seller_privateKey,
        eRC20TokenB,
        sellerPermitTokenBAmount.toString(),
        permitDeadLine,
        executeOrder
      );
      /////////////////////////////////////////////////////ORDER 1 MATCHED ///////////////////////////////////////////////////////////
      const buyerHoldTokenAAmoumt1 = ethers.parseEther("5");
      const buyerExpectedTokenBAmoumt1 = ethers.parseEther("10");
      const sellerHoldTokenBAmoumt1 = ethers.parseEther("100");
      const sellerExpectedTokenAAmoumt1 = ethers.parseEther("50");

      const buyOrderInfo1 = {
        user_privateKey: buyer_privateKey,
        user: buyer,
        holdToken: eRC20TokenA,
        holdTokenAmount: buyerHoldTokenAAmoumt1.toString(),
        sellToken: eRC20TokenB,
        sellTokenAmount: buyerExpectedTokenBAmoumt1.toString(),
        deadline: permitDeadLine.toString(),
        signatureStatus: isInit,
      };

      const sellOrderInfo1 = {
        user_privateKey: seller_privateKey,
        user: seller,
        holdToken: eRC20TokenB,
        holdTokenAmount: sellerHoldTokenBAmoumt1.toString(),
        sellToken: eRC20TokenA,
        sellTokenAmount: sellerExpectedTokenAAmoumt1.toString(),
        deadline: permitDeadLine.toString(),
        signatureStatus: isInit,
      };
      expect(await eRC20TokenA.balanceOf(buyer)).to.equal(
        buyerHoldTokenAAmoumt1
      );
      expect(await eRC20TokenB.balanceOf(buyer)).to.equal(0);
      expect(await eRC20TokenA.balanceOf(seller)).to.equal(0);
      expect(await eRC20TokenB.balanceOf(seller)).to.equal(
        sellerHoldTokenBAmoumt1
      );
      const buyOrderResult1 = await signBuyOrderData(
        buyOrderInfo1.user_privateKey,
        buyOrderInfo1.user,
        executeOrder,
        await buyOrderInfo1.holdToken.getAddress(),
        buyOrderInfo1.holdTokenAmount,
        await buyOrderInfo1.sellToken.getAddress(),
        buyOrderInfo1.sellTokenAmount,
        buyOrderInfo1.deadline
      );

      const sellOrderResult1 = await signSellOrderData(
        sellOrderInfo1.user_privateKey,
        sellOrderInfo1.user,
        executeOrder,
        await sellOrderInfo1.holdToken.getAddress(),
        sellOrderInfo1.holdTokenAmount,
        await sellOrderInfo1.sellToken.getAddress(),
        sellOrderInfo1.sellTokenAmount,
        sellOrderInfo1.deadline
      );
      console.log("Before trading first time");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer, seller);
      await executePairOrders(
        buyOrderInfo1,
        buyOrderResult1,
        sellOrderInfo1,
        sellOrderResult1,
        executeOrder
      );
      console.log("After trading first time");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer, seller);

      console.log(
        "buyOrderInfo1.sellTokenAmount",
        buyOrderInfo1.sellTokenAmount
      );
      sellOrderResult1.sellOrderData.holdTokenBAmount = (
        sellOrderResult1.sellOrderData.holdTokenBAmount -
        buyOrderInfo1.sellTokenAmount
      ).toString();

      sellOrderResult1.sellOrderData.expectedTokenAAmount = (
        sellOrderResult1.sellOrderData.expectedTokenAAmount -
        buyOrderInfo1.holdTokenAmount
      ).toString();
      // TOOD CHECK
      // buyOrderInfo1 left order
      // expect(await eRC20TokenA.balanceOf(buyer)).to.equal(
      //   sellOrderResult1.sellOrderData.holdTokenAmount
      // );
      // expect(await eRC20TokenB.balanceOf(buyer)).to.equal(
      //   buyOrderInfo1.holdTokenAmount
      // );
      // expect(await eRC20TokenA.balanceOf(seller)).to.equal(
      //   sellerExpectedTokenAAmoumt1
      // );
      // expect(await eRC20TokenB.balanceOf(seller)).to.equal(0);
      /////////////////////////////////////////////////////ORDER2 MATCHED ///////////////////////////////////////////////////////////

      console.log("-----------buy order and sell order's status are init \n");
      console.log(
        "2: buy order has all traded,seller order: 90 tokenB => 45 tokenA has all traded\n"
      );

      console.log("-----------enter new buy order  \n");
      const buyer_privateKey2 = "0x" + crypto.randomBytes(32).toString("hex");
      const buyer2 = new ethers.Wallet(buyer_privateKey2).address;
      const permitDeadLine_buyer2 = (await time.latest()) + ONE_DAY;
      const buyer2PermitTokenAAmount = ethers.parseEther("45");
      console.log("buyer2", buyer2);
      // permit tokenB
      await permitToken(
        tokenPairOwner,
        buyer2,
        buyer_privateKey2,
        eRC20TokenA,
        buyer2PermitTokenAAmount,
        permitDeadLine_buyer2,
        executeOrder
      );

      console.log(
        "eRC20TokenA of seller for executeOrder's allowance",
        await eRC20TokenA.allowance(buyer2, await executeOrder.getAddress())
      );
      console.log(
        "3. current matched order: buyer order: 90 tokenA => 45 tokenB, seller order: 45 tokenB => 90 tokenA\n"
      );
      /////////////////////////////////////////////////////Trade2 MATCHED ///////////////////////////////////////////////////////////
      console.log(
        "-----------buy order's status are noInit,seller order's status is init\n"
      );
      // todo below code should connected with above code
      const buyerHoldTokenAAmoumt2 = ethers.parseEther("45");
      const buyerExpectedTokenBAmoumt2 = ethers.parseEther("90");

      const buyOrderInfo2 = {
        user_privateKey: buyer_privateKey2,
        user: buyer2,
        holdToken: eRC20TokenA,
        holdTokenAmount: buyerHoldTokenAAmoumt2.toString(),
        sellToken: eRC20TokenB,
        sellTokenAmount: buyerExpectedTokenBAmoumt2.toString(),
        deadline: permitDeadLine.toString(),
        signatureStatus: isInit,
      };

      const buyOrderResult2 = await signBuyOrderData(
        buyOrderInfo2.user_privateKey,
        buyOrderInfo2.user,
        executeOrder,
        await buyOrderInfo2.holdToken.getAddress(),
        buyOrderInfo2.holdTokenAmount,
        await buyOrderInfo2.sellToken.getAddress(),
        buyOrderInfo2.sellTokenAmount,
        buyOrderInfo2.deadline
      );

      sellOrderInfo1.signatureStatus = noInit;
      console.log("Before trading Second time");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer2, seller);
      await executePairOrders(
        buyOrderInfo2,
        buyOrderResult2,
        sellOrderInfo1,
        sellOrderResult1,
        executeOrder
      );
      console.log("After trading Second time");
      await printBalance(eRC20TokenA, eRC20TokenB, buyer2, seller);

      // expect(await eRC20TokenA.balanceOf(buyer)).to.equal(0);
      // expect(await eRC20TokenB.balanceOf(buyer)).to.equal(
      //   buyOrderInfo1.expectedTokenBAmount
      // );
      // expect(await eRC20TokenA.balanceOf(seller2)).to.equal(0);
      // expect(await eRC20TokenB.balanceOf(seller2)).to.equal(
      //   sellerExpectedTokenAAmoumt2
      // );

      // expect(await eRC20TokenA.balanceOf(buyer)).to.equal(0);
      // expect(await eRC20TokenB.balanceOf(buyer)).to.equal(
      //   buyerExpectedTokenBAmoumt1
      // );
      // expect(await eRC20TokenA.balanceOf(seller2)).to.equal(
      //   sellerExpectedTokenAAmoumt2
      // );
      // expect(await eRC20TokenB.balanceOf(seller2)).to.equal(0);
      /////////////////////////////////////////////////////Trade  Token///////////////////////////////////////////////////////////
    });
  });
});
