#!/usr/bin/env node
/**
 * DeFi AI Agent - CLI Entry Point
 * Run: node index.js [--demo] [--batch] [--hash <tx_hash>]
 */

const { interactiveDiagnosis, batchAnalyze } = require("./src/agent");

// ─── Demo Transaction Samples ─────────────────────────────────────────────────
const DEMO_TRANSACTIONS = {
  outOfGas: {
    hash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    network: "Ethereum Mainnet",
    from: "0xUserWallet123...abc",
    to: "0xUniswapV2Router02",
    contractName: "Uniswap V2 Router",
    functionName: "swapExactTokensForETH",
    gasUsed: "21000",
    gasLimit: "21000",
    gasPrice: "30 Gwei",
    value: "0",
    nonce: "42",
    error: "out of gas",
    revertReason: "Transaction ran out of gas",
    inputData: "0x18cbafe5....",
    timestamp: "2024-01-15T10:23:45Z",
    additionalContext: {
      tokenIn: "USDC",
      tokenOut: "ETH",
      amountIn: "1000 USDC",
      estimatedGas: "150000",
      actualGasLimit: "21000",
    },
  },

  slippageError: {
    hash: "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
    network: "Ethereum Mainnet",
    from: "0xTrader456...def",
    to: "0xUniswapV3Router",
    contractName: "Uniswap V3 Router",
    functionName: "exactInputSingle",
    gasUsed: "98543",
    gasLimit: "200000",
    gasPrice: "25 Gwei",
    value: "1.5",
    nonce: "7",
    error: "execution reverted",
    revertReason: "Too little received",
    inputData: "0x04e45aaf....",
    timestamp: "2024-01-15T11:45:00Z",
    additionalContext: {
      tokenIn: "ETH",
      tokenOut: "PEPE",
      amountIn: "1.5 ETH",
      slippageTolerance: "0.1%",
      priceImpact: "8.5%",
      poolLiquidity: "Low",
    },
  },

  insufficientAllowance: {
    hash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
    network: "Polygon",
    from: "0xDeFiUser789...ghi",
    to: "0xAaveV3Pool",
    contractName: "Aave V3 Lending Pool",
    functionName: "supply",
    gasUsed: "45231",
    gasLimit: "300000",
    gasPrice: "100 Gwei",
    value: "0",
    nonce: "156",
    error: "execution reverted",
    revertReason: "ERC20: transfer amount exceeds allowance",
    inputData: "0x617ba037....",
    timestamp: "2024-01-15T14:20:30Z",
    additionalContext: {
      token: "USDT",
      attemptedAmount: "5000 USDT",
      currentAllowance: "0 USDT",
      spender: "Aave V3 Pool",
    },
  },

  contractPaused: {
    hash: "0x7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c",
    network: "Arbitrum",
    from: "0xYieldFarmer321...jkl",
    to: "0xCompoundProtocol",
    contractName: "Compound Finance",
    functionName: "mint",
    gasUsed: "31000",
    gasLimit: "250000",
    gasPrice: "0.1 Gwei",
    value: "0",
    nonce: "89",
    error: "execution reverted",
    revertReason: "Pausable: paused",
    inputData: "0xa0712d68....",
    timestamp: "2024-01-15T16:55:10Z",
    additionalContext: {
      reason: "Emergency pause triggered due to oracle manipulation",
      pausedAt: "2024-01-15T16:40:00Z",
      governance: "Multi-sig",
    },
  },
};

// ─── CLI Interface ────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║         🔍 DeFi AI Agent - Transaction Failure Diagnoser          ║
║              Powered by Claude AI (Multi-Turn Analysis)           ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  if (args.includes("--help") || args.length === 0) {
    console.log(`Usage: node index.js [option]

Options:
  --demo <type>    Run a demo diagnosis
                   Types: out-of-gas | slippage | allowance | paused | all
  --batch          Run batch analysis on all demo transactions
  --help           Show this help message

Examples:
  node index.js --demo out-of-gas
  node index.js --demo slippage
  node index.js --demo allowance
  node index.js --demo paused
  node index.js --demo all
  node index.js --batch

Programmatic Usage:
  const { diagnoseTxFailure } = require('./src/agent');
  const result = await diagnoseTxFailure(txData);
`);
    return;
  }

  // Demo mode
  if (args.includes("--demo")) {
    const typeIndex = args.indexOf("--demo") + 1;
    const demoType = args[typeIndex] || "out-of-gas";

    const demoMap = {
      "out-of-gas": "outOfGas",
      slippage: "slippageError",
      allowance: "insufficientAllowance",
      paused: "contractPaused",
    };

    if (demoType === "all") {
      console.log("🚀 Running all demo scenarios...\n");
      for (const [name, tx] of Object.entries(DEMO_TRANSACTIONS)) {
        console.log(`\n${"═".repeat(70)}`);
        console.log(`🔄 Demo: ${name}`);
        console.log("═".repeat(70));
        await interactiveDiagnosis(tx);
      }
    } else {
      const key = demoMap[demoType];
      if (!key || !DEMO_TRANSACTIONS[key]) {
        console.error(`❌ Unknown demo type: ${demoType}`);
        console.log(`Available: ${Object.keys(demoMap).join(", ")}, all`);
        process.exit(1);
      }
      const tx = DEMO_TRANSACTIONS[key];
      await interactiveDiagnosis(tx);
    }
    return;
  }

  // Batch mode
  if (args.includes("--batch")) {
    const allTxs = Object.values(DEMO_TRANSACTIONS);
    await batchAnalyze(allTxs);
    return;
  }

  console.log("Use --help to see available options.");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
