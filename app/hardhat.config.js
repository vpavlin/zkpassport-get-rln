import "@nomicfoundation/hardhat-toolbox";

import dotenv from "dotenv";
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: "0.8.24",
  paths: {
    sources: "./contracts",
    tests: "./test",
    artifacts: "./artifacts"
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  networks: {
      "sepolia": {
        url: process.env.RPC,
        accounts: [process.env.PRIVATE_KEY],
        chainId: 11155111,
      }
  }
};

export default config;