const { ethers } = require("hardhat");
const { readFileSync } = require("fs");

function getInstance(name) {
  const address = JSON.parse(readFileSync("deploy.json"))[name];
  if (!address) throw new Error(`Contract ${name} not found in deploy.json`);
  return ethers.getContractFactory(name).then((f) => f.attach(address));
}

async function main() {
  const erc20TokenA = await getInstance("ERC20TokenA");
  const erc20TokenB = await getInstance("ERC20TokenB");

  const buyer_privateKey = process.env.PRIVATE_KEY_BUYER;
  const seller_privateKey = process.env.PRIVATE_KEY_SELLER;
  const seller_privateKey2 = process.env.PRIVATE_KEY_SELLER;
  const buyer = new ethers.Wallet(buyer_privateKey).address;
  const seller = new ethers.Wallet(seller_privateKey).address;
  const seller2 = new ethers.Wallet(seller_privateKey2).address;

  this.buyerPermitTotalTokenBAmount = ethers.parseEther("100");
  this.sellPermitTotalTokenBAmount = ethers.parseEther("5");
  this.sellPermitTotalTokenBAmount2 = ethers.parseEther("45");

  // await erc20TokenA.mint(buyer, buyerPermitTotalTokenBAmount);
  // await erc20TokenB.mint(seller, sellPermitTotalTokenBAmount);
  await erc20TokenB.mint(seller2, sellPermitTotalTokenBAmount2);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
