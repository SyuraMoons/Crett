# Crett — AI-powered CRE Workflow Generator

Hackathon project for Chainlink Convergence 2026.

## Project Structure

```
chainlink/                        ← ROOT (git repo + concurrently)
├── fe/                           ← Next.js frontend  (port 3000)
│   ├── package.json
│   ├── node_modules/
│   └── app/                      ← Next.js App Router routes
│       ├── page.tsx              ← Landing page "/"
│       ├── layout.tsx            ← Root HTML shell + Providers
│       └── dashboard/page.tsx   ← Main dashboard
│
├── backend/                      ← Express API server (port 3001)
│   ├── package.json
│   ├── .env                      ← GEMINI_API_KEY, COINGECKO_API_KEY, PORT
│   ├── node_modules/
│   └── src/index.ts
│
├── contract/                     ← Foundry contracts (Base Sepolia)
│   └── src/
│       ├── AlertRegistry.sol
│       ├── TreasuryMock.sol
│       └── RiskLog.sol
│
└── crett/                        ← CRE CLI project
    └── crett-workflow/
        └── main.ts               ← Overwritten on each generate/simulate
```

**Why 3 separate `node_modules`?**
This is a monorepo. Each package manages its own deps independently:
- Root `node_modules` — only `concurrently` (to run both servers at once)
- `fe/node_modules` — Next.js, React, wagmi, rainbowkit, etc.
- `backend/node_modules` — Express, Gemini SDK, dotenv, etc.

## Setup

```bash
# Install all dependencies (run once from root)
npm run setup

# OR manually:
npm install            # root (just concurrently)
cd fe && npm install
cd ../backend && npm install
```

## Running

```bash
# Start both frontend + backend simultaneously (from root)
npm run dev

# OR start individually:
cd fe && npm run dev        # → http://localhost:3000
cd backend && npm run dev   # → http://localhost:3001
```

## Environment Variables

### `fe/.env`
```
GEMINI_API_KEY=...
COINGECKO_API_KEY=...
NEXT_PUBLIC_WALLETCONNECT_ID=...
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### `backend/.env`
```
GEMINI_API_KEY=...
COINGECKO_API_KEY=...
PORT=3001
```

### `crett/.env`
```
CRE_ETH_PRIVATE_KEY=...
CRE_TARGET=staging-settings
```

## Contracts (Base Sepolia)

```bash
cd contract
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --private-key $PRIVATE_KEY
```

## CRE Workflow Simulation

```bash
cd crett
cre workflow simulate ./crett-workflow \
  -T staging-settings \
  --non-interactive \
  --trigger-index 0
```

## Verification

```bash
curl http://localhost:3001/health
# → {"status":"ok"}
```
