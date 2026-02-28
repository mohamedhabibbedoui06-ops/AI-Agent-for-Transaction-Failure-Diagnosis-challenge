/**
 * DeFi AI Agent for Transaction Failure Diagnosis
 * Uses Claude AI to analyze failed transactions and provide human-readable explanations
 */

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

// ─── Error Pattern Library ────────────────────────────────────────────────────
const ERROR_PATTERNS = {
  OUT_OF_GAS: {
    patterns: ["out of gas", "gas required exceeds allowance", "intrinsic gas too low"],
    category: "Gas Error",
  },
  REVERT_NO_REASON: {
    patterns: ["execution reverted", "transaction reverted"],
    category: "Execution Revert",
  },
  SLIPPAGE: {
    patterns: ["insufficient output amount", "excessive input amount", "UniswapV2: K", "slippage"],
    category: "Slippage Error",
  },
  ALLOWANCE: {
    patterns: ["allowance", "transfer amount exceeds allowance", "erc20: insufficient allowance"],
    category: "Allowance Error",
  },
  BALANCE: {
    patterns: ["insufficient balance", "transfer amount exceeds balance", "erc20: transfer amount exceeds balance"],
    category: "Balance Error",
  },
  DEADLINE: {
    patterns: ["transaction too old", "expired", "deadline"],
    category: "Deadline Error",
  },
  REENTRANCY: {
    patterns: ["reentrant call", "reentrancy guard"],
    category: "Reentrancy Guard",
  },
  OWNERSHIP: {
    patterns: ["ownable: caller is not the owner", "not authorized", "access denied", "onlyowner"],
    category: "Access Control Error",
  },
  PAUSED: {
    patterns: ["paused", "contract is paused", "pausable: paused"],
    category: "Contract Paused",
  },
  NONCE: {
    patterns: ["nonce too low", "nonce too high", "replacement transaction underpriced"],
    category: "Nonce Error",
  },
};

// ─── Transaction Analyzer ─────────────────────────────────────────────────────
function detectErrorCategory(txData) {
  const searchStr = [
    txData.error || "",
    txData.revertReason || "",
    txData.errorMessage || "",
  ]
    .join(" ")
    .toLowerCase();

  for (const [key, value] of Object.entries(ERROR_PATTERNS)) {
    if (value.patterns.some((p) => searchStr.includes(p.toLowerCase()))) {
      return { key, ...value };
    }
  }
  return { key: "UNKNOWN", category: "Unknown Error", patterns: [] };
}

function buildTransactionContext(txData) {
  const errorCategory = detectErrorCategory(txData);

  return {
    hash: txData.hash || "N/A",
    status: txData.status || "failed",
    errorCategory,
    gasUsed: txData.gasUsed || "N/A",
    gasLimit: txData.gasLimit || "N/A",
    gasPrice: txData.gasPrice || "N/A",
    from: txData.from || "N/A",
    to: txData.to || "N/A",
    value: txData.value || "0",
    nonce: txData.nonce || "N/A",
    error: txData.error || "No error message",
    revertReason: txData.revertReason || "No revert reason",
    contractAddress: txData.contractAddress || txData.to || "N/A",
    contractName: txData.contractName || "Unknown Contract",
    functionName: txData.functionName || "Unknown Function",
    inputData: txData.inputData || "N/A",
    network: txData.network || "Ethereum Mainnet",
    timestamp: txData.timestamp || new Date().toISOString(),
    additionalContext: txData.additionalContext || {},
  };
}

// ─── AI Diagnosis Engine ──────────────────────────────────────────────────────
async function diagnoseTxFailure(txData) {
  const ctx = buildTransactionContext(txData);

  const systemPrompt = `You are an expert DeFi transaction failure analyst. Your job is to:
1. Analyze failed blockchain transaction data
2. Provide clear, human-readable explanations of WHY the transaction failed
3. Give actionable fix recommendations
4. Explain concepts in plain language for both beginners and developers

Always structure your response as:
- **Root Cause**: One sentence summary
- **Detailed Explanation**: 2-3 sentences explaining what happened technically
- **User-Friendly Explanation**: Explain in plain English as if talking to a non-technical user
- **Fix Recommendations**: Numbered list of concrete steps to resolve the issue
- **Prevention Tips**: How to avoid this in the future
- **Severity**: Low / Medium / High / Critical

Be specific, practical, and empathetic. Users are frustrated when transactions fail.`;

  const userPrompt = `Analyze this failed DeFi transaction and explain why it failed:

## Transaction Details
- **Hash**: ${ctx.hash}
- **Network**: ${ctx.network}
- **Timestamp**: ${ctx.timestamp}
- **From**: ${ctx.from}
- **To**: ${ctx.to}
- **Contract**: ${ctx.contractName} (${ctx.contractAddress})
- **Function Called**: ${ctx.functionName}
- **Value Sent**: ${ctx.value} ETH

## Gas Information
- **Gas Used**: ${ctx.gasUsed}
- **Gas Limit**: ${ctx.gasLimit}
- **Gas Price**: ${ctx.gasPrice}

## Error Information
- **Error Category Detected**: ${ctx.errorCategory.category}
- **Raw Error**: ${ctx.error}
- **Revert Reason**: ${ctx.revertReason}
- **Input Data**: ${ctx.inputData}

## Additional Context
${JSON.stringify(ctx.additionalContext, null, 2)}

Please provide a comprehensive diagnosis of why this transaction failed and how to fix it.`;

  const conversationHistory = [{ role: "user", content: userPrompt }];

  console.log("\n🤖 AI Agent analyzing transaction...\n");

  // Initial diagnosis
  const diagnosisResponse = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8096,
    system: systemPrompt,
    messages: conversationHistory,
  });

  const diagnosis = diagnosisResponse.content[0].text;
  conversationHistory.push({ role: "assistant", content: diagnosis });

  // Follow-up: Ask for code fix if applicable
  conversationHistory.push({
    role: "user",
    content: `Based on your diagnosis, can you provide:
1. A specific code snippet or transaction parameter fix (if applicable)
2. The exact values/settings the user should change
3. A checklist before retrying the transaction

Format code examples in markdown code blocks with the appropriate language.`,
  });

  const codeFixResponse = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8096,
    system: systemPrompt,
    messages: conversationHistory,
  });

  const codeFix = codeFixResponse.content[0].text;
  conversationHistory.push({ role: "assistant", content: codeFix });

  // Follow-up: Risk assessment
  conversationHistory.push({
    role: "user",
    content: `Finally, provide a brief risk assessment:
1. Was any ETH/tokens lost? (gas fees are usually lost in failed txs)
2. Are there any security concerns with this transaction?
3. What's the confidence level of your diagnosis (High/Medium/Low) and why?`,
  });

  const riskResponse = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8096,
    system: systemPrompt,
    messages: conversationHistory,
  });

  const riskAssessment = riskResponse.content[0].text;

  return {
    transactionContext: ctx,
    diagnosis,
    codeFix,
    riskAssessment,
    errorCategory: ctx.errorCategory,
    conversationTurns: 3,
  };
}

// ─── Interactive CLI Mode ─────────────────────────────────────────────────────
async function interactiveDiagnosis(txData) {
  const result = await diagnoseTxFailure(txData);

  console.log("═".repeat(70));
  console.log("  🔍 DeFi Transaction Failure Diagnosis Report");
  console.log("═".repeat(70));

  console.log(`\n📋 Transaction: ${result.transactionContext.hash}`);
  console.log(`🏷️  Network: ${result.transactionContext.network}`);
  console.log(`⚠️  Error Category: ${result.errorCategory.category}`);

  console.log("\n" + "─".repeat(70));
  console.log("📊 DIAGNOSIS");
  console.log("─".repeat(70));
  console.log(result.diagnosis);

  console.log("\n" + "─".repeat(70));
  console.log("🔧 CODE FIX & CHECKLIST");
  console.log("─".repeat(70));
  console.log(result.codeFix);

  console.log("\n" + "─".repeat(70));
  console.log("⚠️  RISK ASSESSMENT");
  console.log("─".repeat(70));
  console.log(result.riskAssessment);

  console.log("\n" + "═".repeat(70));
  console.log(`✅ Analysis complete. (${result.conversationTurns} AI conversation turns)`);
  console.log("═".repeat(70) + "\n");

  return result;
}

// ─── Batch Analysis Mode ──────────────────────────────────────────────────────
async function batchAnalyze(transactions) {
  console.log(`\n📦 Batch analyzing ${transactions.length} transactions...\n`);
  const results = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    console.log(`\n[${i + 1}/${transactions.length}] Processing: ${tx.hash || "Unknown"}`);
    try {
      const result = await diagnoseTxFailure(tx);
      results.push({ success: true, result });
    } catch (err) {
      console.error(`  ❌ Failed to analyze: ${err.message}`);
      results.push({ success: false, error: err.message, tx });
    }
  }

  const summary = {
    total: transactions.length,
    analyzed: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    categorySummary: {},
  };

  results
    .filter((r) => r.success)
    .forEach((r) => {
      const cat = r.result.errorCategory.category;
      summary.categorySummary[cat] = (summary.categorySummary[cat] || 0) + 1;
    });

  console.log("\n📈 Batch Analysis Summary:");
  console.log(`  Total: ${summary.total}`);
  console.log(`  ✅ Analyzed: ${summary.analyzed}`);
  console.log(`  ❌ Failed: ${summary.failed}`);
  console.log("  Category Breakdown:");
  Object.entries(summary.categorySummary).forEach(([cat, count]) => {
    console.log(`    • ${cat}: ${count}`);
  });

  return { results, summary };
}

module.exports = {
  diagnoseTxFailure,
  interactiveDiagnosis,
  batchAnalyze,
  detectErrorCategory,
  buildTransactionContext,
};
