require("@nomicfoundation/hardhat-toolbox");

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // OpenZeppelin 5.6 uses the `mcopy` opcode -> requires the Cancun EVM target
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: {
      url: process.env.RPC_URL || "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  mocha: { timeout: 120000 },
};

module.exports = config;