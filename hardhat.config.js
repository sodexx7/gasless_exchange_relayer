require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    local: {
      url: "http://localhost:8545",
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/_atBW1j9EUbuHw54YkqxQzP547KsWPxC",
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};
