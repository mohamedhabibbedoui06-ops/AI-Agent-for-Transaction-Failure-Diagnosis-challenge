/**
 * DeFi AI Agent - Express Web API Server
 * Run: node server.js
 * Endpoints:
 *   POST /diagnose         - Single transaction diagnosis
 *   POST /batch            - Batch transaction diagnosis
 *   GET  /health           - Health check
 */

const express = require("express");
const { diagnoseTxFailure, batchAnalyze, detectErrorCategory } = require("./src/agent");

const app = express();
app.use(express.json());

// ─── CORS Headers ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "DeFi AI Agent",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─── Quick Error Classification (no AI) ──────────────────────────────────────
app.post("/classify", (req, res) => {
  try {
    const txData = req.body;
    const category = detectErrorCategory(txData);
    res.json({ category, txData });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Full AI Diagnosis ────────────────────────────────────────────────────────
app.post("/diagnose", async (req, res) => {
  const txData = req.body;

  if (!txData || typeof txData !== "object") {
    return res.status(400).json({
      error: "Request body must be a transaction data object",
      example: {
        hash: "0x...",
        error: "execution reverted",
        revertReason: "ERC20: insufficient allowance",
        gasUsed: "45000",
        gasLimit: "300000",
      },
    });
  }

  try {
    console.log(`\n📥 Diagnosing tx: ${txData.hash || "unknown"}`);
    const result = await diagnoseTxFailure(txData);

    res.json({
      success: true,
      hash: txData.hash,
      errorCategory: result.errorCategory,
      diagnosis: result.diagnosis,
      codeFix: result.codeFix,
      riskAssessment: result.riskAssessment,
      analysisTimestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Diagnosis error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Batch Diagnosis ──────────────────────────────────────────────────────────
app.post("/batch", async (req, res) => {
  const { transactions } = req.body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({
      error: "Request body must have a 'transactions' array",
    });
  }

  if (transactions.length > 10) {
    return res.status(400).json({ error: "Max 10 transactions per batch" });
  }

  try {
    console.log(`\n📦 Batch processing ${transactions.length} transactions`);
    const { results, summary } = await batchAnalyze(transactions);

    res.json({
      success: true,
      summary,
      results: results.map((r) =>
        r.success
          ? {
              hash: r.result.transactionContext.hash,
              errorCategory: r.result.errorCategory,
              diagnosis: r.result.diagnosis,
              codeFix: r.result.codeFix,
              riskAssessment: r.result.riskAssessment,
            }
          : { error: r.error, tx: r.tx }
      ),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║         🔍 DeFi AI Agent Server - Transaction Diagnoser           ║
╠═══════════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                                    ║
║  Health: GET  /health                                             ║
║  Classify: POST /classify  (fast, no AI)                         ║
║  Diagnose: POST /diagnose  (full AI analysis)                    ║
║  Batch:    POST /batch     (up to 10 transactions)               ║
╚═══════════════════════════════════════════════════════════════════╝
`);
});

module.exports = app;
