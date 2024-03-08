// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract ExecuteOrder is EIP712, Nonces {

    using ECDSA for bytes32;
    using SafeERC20 for IERC20;
    bytes32 private constant ORDER_TYPEHASH = keccak256("Order(address user,address holdToken,address sellToken,uint256 holdTokenAmount,uint256 sellTokenAmount,uint256 nonce,uint256 deadline)");
    address public tokenA;
    address public tokenB;

    struct BuyOrder {
        address buyer;
        uint112 holdTokenAAmount;    // default as tokenA
        uint112 expectedTokenBAmount;// default as tokenB
        uint32 buyDeadline;
    }

    struct SellOrder {
        address seller;
        uint112 holdTokenBAmount;        // default as tokenB
        uint112 expectedTokenAAmount;    // default as tokenA
        uint32 sellDeadline;
    }

    // This store the unused amount for the order, 
    // Such as one buy order: 100 tokenA => 50 tokenB, but fist time only used 10 tokenA =>5 tokenB, then the left is 90 tokenA => 45 tokenB
    // bytes32 = keccak256(siganture)
    mapping(bytes32 => BuyOrder) public  buyOrders;
    mapping(bytes32 => SellOrder) public sellOrders;


    error NoEnoughTokenAApprovals(address buyer,uint112 tokenAAmount);
    error NoEnoughTokenBApprovals(address seller,uint112 tokenBAmount);

    error UnValidBuySignature(address buyer, address singer); // add more params?
    error UnValidSellSignature(address seller, uint112 holdTokenBAmount, uint112 expectedTokenAAmount,uint32 sellDeadline); // add more params?

    error OrderBuyExpired(address buyer,uint112 holdTokenAAmount, uint112 expectedTokenBAmount,uint32 deadline);
    error OrderSellExpired(address seller,uint112 holdTokenBAmount, uint112 expectedTokenAAmount,uint32 deadline);

    error OrderBuyLeftNoMatched(address buyer,uint112 holdTokenAAmount, uint112 expectedTokenBAmount,uint32 deadline);
    error OrderSellLeftNoMatched(address seller,uint112 holdTokenBAmount, uint112 expectedTokenAAmount,uint32 deadline);


    error OrdersPriceNoMatch();

    event OrderAllComplete(address indexed buyer,address indexed  seller,uint112 buyerReceiveTokenBAmount,uint112 sellReceiveTokenAAmount);

    event OrderPartComplete(address indexed buyer,address indexed seller,uint112 buyerReceiveTokenBAmount,uint112 sellReceiveTokenAAmount);


    //  tokenA and tokenB as trade pairs
    constructor(address _tokenA,address _tokenB) EIP712("onChainOrder", "1") {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    /**
        when off-chain book orders matched the buy order and sell order by price, then call this function executing the matched orders.
        
        First Order: the first time to execute one order, should check the signature is valid

        Left Order: the left amount of First Order, should check the left amount is enough, and the timestamp is valid
        Such as buy order: 100 tokenA => 50 tokenB as First Order,but only matched sell order 10 tokenA => 5 tokenB, then the left order is 90 tokenA => 45 tokenB,which called
        Left Order, no necessary check the order signature, but should check the left amount and timestamp. 

        check list
        1. check this contract have enough approval for tokenA and tokenB
        2. Check the buy order and sell order price
        3. No Matter for the buy order or sell order, if the order is First Order, should check the signature is valid, if  which is left order, should 
        check the left amount is enough. Meanwhile should check the timestamp.
        4. transfer token
            4.1 completed matched
            4.2 part matched 
        5. if there is left amount, should update the left amount, if all have been used, should delete the order.
    
    */

    function pairOrdersExecute(
        BuyOrder calldata buyOrder,
        bytes calldata buyerOrderSignature, 
        bool isBuyInit,
        SellOrder calldata sellOrder,
        bytes memory sellOrderSignature,
        bool isSellInit
       ) external {

        // 1. ERC20 permit token balance check
        if(IERC20(tokenA).allowance(buyOrder.buyer,address(this)) < buyOrder.holdTokenAAmount){
            revert NoEnoughTokenAApprovals(buyOrder.buyer,buyOrder.holdTokenAAmount);

        }
        if(IERC20(tokenB).allowance(sellOrder.seller,address(this)) < sellOrder.holdTokenBAmount){
            revert NoEnoughTokenBApprovals(sellOrder.seller,sellOrder.holdTokenBAmount);
        }

        // 2. price check, off-chain should checked , but should also check here. check formula: holdTokenAAmount*holdTokenBAmount = expectedTokenBAmount*expectedTokenAAmount
        if(uint256(buyOrder.holdTokenAAmount) * uint256(sellOrder.holdTokenBAmount) != uint256(buyOrder.expectedTokenBAmount) * uint256(sellOrder.expectedTokenAAmount)){
            revert OrdersPriceNoMatch(); 
        }

        // 3. Order signature Check, for the left order, should check the left amount is enough
        if(isBuyInit){
            _orderBuySignatureCheck(buyOrder.buyer, buyOrder.holdTokenAAmount, buyOrder.expectedTokenBAmount,buyOrder.buyDeadline,buyerOrderSignature);
        } else {
            _orderLeftBuyCheck(buyOrder.buyer, buyOrder.holdTokenAAmount, buyOrder.expectedTokenBAmount,buyOrder.buyDeadline,buyerOrderSignature);

        }

        if(isSellInit){
            _orderSellSignatureCheck(sellOrder.seller,sellOrder.holdTokenBAmount,sellOrder.expectedTokenAAmount,sellOrder.sellDeadline,sellOrderSignature);
        } else {
            _orderLeftSellCheck(sellOrder.seller, sellOrder.holdTokenBAmount, sellOrder.expectedTokenAAmount,sellOrder.sellDeadline,sellOrderSignature);
        }

        // 4. Transfer token, including complete match and part match
        if(buyOrder.holdTokenAAmount == sellOrder.expectedTokenAAmount && sellOrder.holdTokenBAmount == buyOrder.expectedTokenBAmount) {

            IERC20(tokenA).safeTransferFrom(buyOrder.buyer ,sellOrder.seller,sellOrder.expectedTokenAAmount);
            IERC20(tokenB).safeTransferFrom(sellOrder.seller,buyOrder.buyer,buyOrder.expectedTokenBAmount);

            //todo  if this time is used the left Order. shoud update left synature
            emit OrderAllComplete(buyOrder.buyer,sellOrder.seller,sellOrder.expectedTokenAAmount,buyOrder.expectedTokenBAmount);
        } else {
            // case 1 buyer has left Amount, using the seller Amount
            if(buyOrder.holdTokenAAmount >  sellOrder.expectedTokenAAmount){

                IERC20(tokenA).safeTransferFrom(buyOrder.buyer,sellOrder.seller,sellOrder.expectedTokenAAmount);
                IERC20(tokenB).safeTransferFrom(sellOrder.seller,buyOrder.buyer,sellOrder.holdTokenBAmount);
                bytes32 buyLeftOrderSignature = keccak256(buyerOrderSignature);
                buyOrders[buyLeftOrderSignature] = BuyOrder({buyer:buyOrder.buyer,holdTokenAAmount:buyOrder.holdTokenAAmount - sellOrder.expectedTokenAAmount,expectedTokenBAmount:buyOrder.expectedTokenBAmount-sellOrder.holdTokenBAmount ,buyDeadline:buyOrder.buyDeadline});
            }
            // case 2, seller has left Amount, using the buyer Amount
            if(sellOrder.holdTokenBAmount > buyOrder.expectedTokenBAmount){

                IERC20(tokenA).safeTransferFrom(buyOrder.buyer,sellOrder.seller,buyOrder.holdTokenAAmount);
                IERC20(tokenB).safeTransferFrom(sellOrder.seller,buyOrder.buyer,buyOrder.expectedTokenBAmount);
                bytes32 sellLeftOrderSignature = keccak256(sellOrderSignature);
                sellOrders[sellLeftOrderSignature] = SellOrder({seller:sellOrder.seller,holdTokenBAmount:sellOrder.holdTokenBAmount - buyOrder.expectedTokenBAmount,expectedTokenAAmount:sellOrder.expectedTokenAAmount-buyOrder.holdTokenAAmount ,sellDeadline:sellOrder.sellDeadline});
            }

            emit OrderPartComplete(buyOrder.buyer,sellOrder.seller,sellOrder.expectedTokenAAmount,buyOrder.expectedTokenBAmount);
        } 
    }
        
    function _orderBuySignatureCheck(address buyer, uint112 holdTokenAAmount, uint112 expectedTokenBAmount,uint32 buyDeadline,bytes memory signature) internal {

        if (block.timestamp > buyDeadline) {
            revert OrderBuyExpired(buyer,holdTokenAAmount,expectedTokenBAmount,buyDeadline);
        }
        bytes32 structHash = keccak256(abi.encode(ORDER_TYPEHASH, buyer,tokenA,tokenB,holdTokenAAmount,expectedTokenBAmount,_useNonce(buyer),buyDeadline));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        if (signer != buyer) {
            revert UnValidBuySignature(buyer,signer);
        }
    }

    function _orderSellSignatureCheck(address seller, uint112 holdTokenBAmount, uint112 expectedTokenAAmount ,uint32 sellDeadline,bytes memory signature) internal {

        if (block.timestamp > sellDeadline) {
            revert OrderSellExpired(seller,holdTokenBAmount,expectedTokenAAmount,sellDeadline);
        }
        bytes32 structHash = keccak256(abi.encode(ORDER_TYPEHASH,seller,tokenB,tokenA,holdTokenBAmount,expectedTokenAAmount,_useNonce(seller),sellDeadline));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        if (signer != seller) {
            revert UnValidSellSignature(seller,holdTokenBAmount,expectedTokenAAmount,sellDeadline);
        }
   }


    function _orderLeftBuyCheck(address buyer, uint112 holdTokenAAmount, uint112 expectedTokenBAmount ,uint32 deadline,bytes memory orderSignature) internal {

        bytes32 buyLeftOrderSignature = keccak256(orderSignature);
        BuyOrder memory buyOrder =  buyOrders[buyLeftOrderSignature];
        if(buyOrder.buyer != address(0)){
            if (block.timestamp > deadline) {
                delete buyOrders[buyLeftOrderSignature];
                revert OrderSellExpired(buyer,holdTokenAAmount,expectedTokenBAmount,deadline);
            }
        }
        if(buyOrder.buyer != buyer && buyOrder.holdTokenAAmount < holdTokenAAmount 
            && buyOrder.expectedTokenBAmount < expectedTokenBAmount && buyOrder.buyDeadline !=  deadline){
            revert OrderBuyLeftNoMatched(buyer,holdTokenAAmount,expectedTokenBAmount,deadline);
        }
        
    }

    
    function _orderLeftSellCheck(address seller, uint112 holdTokenBAmount, uint112 expectedTokenAAmount,uint32 deadline,bytes memory orderSignature) internal {

        bytes32 sellLeftOrderSignature = keccak256(orderSignature);

        if(sellOrders[sellLeftOrderSignature].seller != seller && sellOrders[sellLeftOrderSignature].holdTokenBAmount < holdTokenBAmount 
            && sellOrders[sellLeftOrderSignature].expectedTokenAAmount < expectedTokenAAmount && sellOrders[sellLeftOrderSignature].sellDeadline !=  deadline){
                
            revert OrderSellLeftNoMatched(seller,holdTokenBAmount,expectedTokenAAmount,deadline);

        }

        if (block.timestamp > deadline) {
            delete sellOrders[sellLeftOrderSignature];
            revert OrderSellExpired(seller,holdTokenBAmount,expectedTokenAAmount,deadline);
        }

    }
}

