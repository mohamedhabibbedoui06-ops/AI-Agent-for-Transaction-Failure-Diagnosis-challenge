/**
 * Example: Programmatic usage of the DeFi AI Agent
 * This shows how to integrate the agent into your own dApp or tooling
 */

const { diagnoseTxFailure, detectErrorCategory } = require("../src/agent");

async function runExamples() {
  console.log("═".repeat(65));
  console.log("  DeFi AI Agent - Programmatic Usage Examples");
  console.log("═".repeat(65));

  // ── Example 1: Basic out-of-gas error ───────────────────────────────────
  console.log("\n[Example 1] Out-of-Gas Error on Token Swap\n");

  const outOfGasTx = {
    hash: "0xabc123...",
    network: "Ethereum Mainnet",
    from: "0xMyWallet",
    to: "0xUniswapRouter",
    contractName: "Uniswap V2 Router",
    functionName: "swapExactTokensForETH",
    gasUsed: "21000",
    gasLimit: "21000",   // ← too low!
    gasPrice: "30 Gwei",
    error: "out of gas",
    revertReason: "",
    additionalContext: {
      note: "Gas limit was set manually to 21000 (ETH transfer default)",
      recommendedGas: "180000-250000 for Uniswap swaps",
    },
  };

  // Quick classification (no AI call, instant)
  const category = detectErrorCategory(outOfGasTx);
  console.log(`Quick Classification: ${category.category}`);
  console.log("Running full AI diagnosis...");

  const result1 = await diagnoseTxFailure(outOfGasTx);
  console.log("\n✅ Diagnosis complete");
  console.log("Category:", result1.errorCategory.category);
  console.log("\nDiagnosis preview (first 300 chars):");
  console.log(result1.diagnosis.substring(0, 300) + "...\n");

  // ── Example 2: DeFi lending protocol error ──────────────────────────────
  console.log("\n[Example 2] Aave Borrowing Error\n");

  const aaveTx = {
    hash: "0xdef456...",
    network: "Ethereum Mainnet",
    from: "0xBorrower",
    to: "0xAaveLendingPool",
    contractName: "Aave V3",
    functionName: "borrow",
    gasUsed: "0",
    gasLimit: "400000",
    error: "execution reverted",
    revertReason: "VL_COLLATERAL_CANNOT_COVER_NEW_BORROW",
    additionalContext: {
      collateralValue: "1500 USD",
      borrowAmount: "2000 USDC",
      healthFactor: "0.75",
      liquidationThreshold: "80%",
    },
  };

  const result2 = await diagnoseTxFailure(aaveTx);
  console.log("✅ Diagnosis complete");
  console.log("Category:", result2.errorCategory.category);
  console.log("\nDiagnosis preview (first 300 chars):");
  console.log(result2.diagnosis.substring(0, 300) + "...\n");

  console.log("═".repeat(65));
  console.log("Examples complete! Check the output above for full diagnoses.");
  console.log("═".repeat(65));
}

runExamples().catch(console.error);
