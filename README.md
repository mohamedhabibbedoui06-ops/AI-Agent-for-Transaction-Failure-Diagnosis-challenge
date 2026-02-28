# 🔍 DeFi AI Agent — Transaction Failure Diagnoser

An AI-powered agent that analyzes failed or reverted DeFi transactions and generates **clear, human-readable explanations** with actionable fix recommendations — powered by Claude.

---

## 🌟 Features

- **Multi-turn AI analysis** — Claude engages in a 3-turn conversation to deeply diagnose the failure, generate code fixes, and assess risk
- **8 error categories** — Out-of-gas, slippage, allowance, balance, deadline, reentrancy, access control, paused contracts
- **Actionable fix recommendations** — Specific steps and code snippets to resolve the issue
- **Risk assessment** — Identifies if funds were lost and flags security concerns
- **Batch analysis** — Analyze up to 10 transactions at once
- **REST API server** — Integrates with your dApp or tooling via HTTP
- **Instant classification** — Fast pattern-matching before the AI call

---

## 📋 Prerequisites

- **Node.js** v18 or higher
- **Anthropic API key** — [Get one here](https://console.anthropic.com/)

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd defi-ai-agent
npm install
```

### 2. Set your API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run a demo

```bash
# Diagnose an out-of-gas error
node index.js --demo out-of-gas

# Diagnose a slippage error
node index.js --demo slippage

# Diagnose an allowance error
node index.js --demo allowance

# Diagnose a paused contract error
node index.js --demo paused

# Run all demo scenarios
node index.js --demo all

# Batch analysis of all demos
node index.js --batch
```

---

## 📁 Project Structure

```
defi-ai-agent/
├── index.js              # CLI entry point
├── server.js             # Express REST API server
├── package.json
├── README.md
├── src/
│   └── agent.js          # Core AI agent logic
└── examples/
    └── usage.js          # Programmatic usage examples
```

---

## 🖥️ CLI Usage

```
Usage: node index.js [option]

Options:
  --demo <type>    Run a demo diagnosis
                   Types: out-of-gas | slippage | allowance | paused | all
  --batch          Run batch analysis on all demo transactions
  --help           Show this help message
```

---

## 🌐 REST API Server

Start the server:

```bash
npm run server
# or
node server.js
```

Server starts on **http://localhost:3000**

### Endpoints

#### `GET /health`
Health check.

```bash
curl http://localhost:3000/health
```

#### `POST /classify`
Fast pattern-matching classification (no AI, instant response).

```bash
curl -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{
    "error": "execution reverted",
    "revertReason": "ERC20: insufficient allowance"
  }'
```

#### `POST /diagnose`
Full AI-powered diagnosis with multi-turn analysis.

```bash
curl -X POST http://localhost:3000/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "0xabc123...",
    "network": "Ethereum Mainnet",
    "from": "0xYourWallet",
    "to": "0xUniswapRouter",
    "contractName": "Uniswap V2",
    "functionName": "swapExactTokensForETH",
    "gasUsed": "21000",
    "gasLimit": "21000",
    "gasPrice": "30 Gwei",
    "error": "out of gas",
    "revertReason": ""
  }'
```

**Response:**
```json
{
  "success": true,
  "hash": "0xabc123...",
  "errorCategory": {
    "key": "OUT_OF_GAS",
    "category": "Gas Error"
  },
  "diagnosis": "## Root Cause\nYour transaction ran out of gas...",
  "codeFix": "```javascript\n// Set gas limit to at least 200000...",
  "riskAssessment": "## Risk Assessment\nGas fees (~0.002 ETH) were lost...",
  "analysisTimestamp": "2024-01-15T12:00:00Z"
}
```

#### `POST /batch`
Batch diagnosis (up to 10 transactions).

```bash
curl -X POST http://localhost:3000/batch \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [
      { "hash": "0x1...", "error": "out of gas" },
      { "hash": "0x2...", "error": "execution reverted", "revertReason": "slippage" }
    ]
  }'
```

---

## 🔧 Programmatic Usage

```javascript
const { diagnoseTxFailure, detectErrorCategory } = require('./src/agent');

// Quick pattern-matching classification (synchronous, no AI)
const category = detectErrorCategory({
  error: "execution reverted",
  revertReason: "ERC20: insufficient allowance"
});
console.log(category.category); // "Allowance Error"

// Full AI diagnosis (async, calls Claude)
const result = await diagnoseTxFailure({
  hash: "0xabc...",
  network: "Ethereum Mainnet",
  from: "0xSender",
  to: "0xContract",
  contractName: "Uniswap V2",
  functionName: "swap",
  gasUsed: "45000",
  gasLimit: "300000",
  gasPrice: "25 Gwei",
  value: "0",
  error: "execution reverted",
  revertReason: "UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT",
  additionalContext: {
    slippageTolerance: "0.5%",
    priceImpact: "12%"
  }
});

console.log(result.errorCategory);   // { key: "SLIPPAGE", category: "Slippage Error" }
console.log(result.diagnosis);        // Full markdown diagnosis
console.log(result.codeFix);          // Code fix with checklist
console.log(result.riskAssessment);   // Risk and fund safety assessment
```

---

## 📊 Transaction Data Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hash` | string | No | Transaction hash |
| `network` | string | No | Network name (e.g., "Ethereum Mainnet") |
| `from` | string | No | Sender wallet address |
| `to` | string | No | Recipient / contract address |
| `contractName` | string | No | Human-readable contract name |
| `functionName` | string | No | Function that was called |
| `gasUsed` | string | No | Gas units consumed |
| `gasLimit` | string | No | Gas limit set for the transaction |
| `gasPrice` | string | No | Gas price (Gwei) |
| `value` | string | No | ETH value sent |
| `nonce` | string | No | Transaction nonce |
| `error` | string | **Yes** | Raw error message |
| `revertReason` | string | No | Decoded revert reason |
| `inputData` | string | No | Encoded input data / calldata |
| `timestamp` | string | No | ISO timestamp of the transaction |
| `additionalContext` | object | No | Any extra context (amounts, prices, etc.) |

---

## ⚠️ Supported Error Categories

| Category | Common Causes |
|----------|--------------|
| **Gas Error** | Gas limit too low, complex contract operations |
| **Slippage Error** | Price moved too much, high price impact, low liquidity |
| **Allowance Error** | Token not approved for the contract to spend |
| **Balance Error** | Insufficient token or ETH balance |
| **Deadline Error** | Transaction submitted too late |
| **Reentrancy Guard** | Contract blocked recursive calls |
| **Access Control Error** | Caller not authorized (not owner/admin) |
| **Contract Paused** | Protocol emergency pause is active |
| **Nonce Error** | Transaction ordering/replacement issue |
| **Unknown Error** | Custom reverts analyzed by AI |

---

## 🤖 How the AI Works

The agent uses **multi-turn conversation** with Claude for deep analysis:

1. **Turn 1 — Diagnosis**: Claude analyzes the raw transaction data, identifies the root cause, explains it in plain English, and provides initial fix recommendations.

2. **Turn 2 — Code Fix**: Based on the diagnosis, Claude generates specific code snippets, parameter values, and a pre-flight checklist for retrying.

3. **Turn 3 — Risk Assessment**: Claude evaluates whether funds were lost, identifies security concerns, and gives a confidence rating for the diagnosis.

---

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required) |
| `PORT` | Server port (default: 3000) |

---

## 📝 License

MIT

---

## 🤝 Contributing

Contributions welcome! Areas to improve:
- Add support for more chains (BSC, Avalanche, Solana)
- Integrate with Etherscan/Alchemy APIs to auto-fetch transaction data
- Add a web frontend
- Improve error pattern library
- Add test coverage
