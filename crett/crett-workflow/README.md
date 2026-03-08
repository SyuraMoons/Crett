# Crett — CRE Workflow

This is the on-chain workflow powering **Crett**, an AI-powered Chainlink Runtime Environment (CRE) workflow generator. The workflow runs on a cron schedule, fetches live market data, reads from a Chainlink Price Feed, and optionally uses an LLM to generate new CRE workflows tailored to current market conditions.

## Chainlink Usage

This workflow uses Chainlink in two ways:

### 1. `@chainlink/cre-sdk` — CRE Runtime

The entire workflow is built on the **Chainlink Runtime Environment SDK**. It uses:

- **`CronCapability`** — schedules the workflow to run on a cron interval
- **`EVMClient`** — reads from on-chain contracts on Base Sepolia
- **`HTTPClient`** — fetches off-chain data through CRE's consensus mechanism
- **`consensusMedianAggregation`** — aggregates numeric HTTP responses across CRE nodes (used for market price data)
- **`consensusIdenticalAggregation`** — aggregates string responses across CRE nodes (used for LLM-generated code)
- **`Runner`** — the CRE workflow entrypoint

```ts
import {
  CronCapability, EVMClient, HTTPClient,
  handler, Runner, getNetwork, encodeCallMsg, bytesToHex,
  consensusMedianAggregation, consensusIdenticalAggregation,
  ok, json, LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime, type HTTPSendRequester
} from "@chainlink/cre-sdk"
```

### 2. Chainlink Price Feed — AggregatorV3 on Base Sepolia

The workflow calls `latestRoundData()` on the **Chainlink ETH/USD Price Feed** deployed on Base Sepolia to get a trustless on-chain price confirmation:

- **Feed address:** `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` (ETH/USD, Base Sepolia)
- **Interface:** `AggregatorV3Interface` — `latestRoundData()` returns `int256 answer` with 8 decimals

```ts
const callData = encodeFunctionData({ abi: AGGREGATOR_V3_ABI, functionName: "latestRoundData", args: [] })
const result = evmClient.callContract(runtime, {
  call: encodeCallMsg({ from: zeroAddress, to: ethFeedAddress as Address, data: callData }),
  blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
}).result()
const [, answer] = decodeFunctionResult({ abi: AGGREGATOR_V3_ABI, functionName: "latestRoundData", data: bytesToHex(result.data) })
const ethOnchain = Number(answer) / 1e8
```

Other supported feed addresses (Base Sepolia):

| Pair     | Address                                      |
|----------|----------------------------------------------|
| ETH/USD  | `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` |
| BTC/USD  | `0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298` |
| LINK/USD | `0xb113F5A928BCfF189C998ab20d753a47F9dE5A61` |

## What the Workflow Does

1. **Fetch market data** — calls CoinGecko via `HTTPClient` with `consensusMedianAggregation` to get ETH, BTC, and LINK prices with 24h change
2. **Read on-chain price** — calls the Chainlink ETH/USD feed on Base Sepolia via `EVMClient` to confirm the price trustlessly
3. **Generate a CRE workflow** *(optional)* — if `zaiApiKey` is configured, sends market context to an LLM and generates a new CRE workflow tailored to current conditions

## Setup

### 1. Configure environment

Create a `.env` file in the project root (`/crett`):

```
CRE_ETH_PRIVATE_KEY=0000000000000000000000000000000000000000000000000000000000000001
```

> This workflow only reads from chain (no writes), so a dummy key is fine.

### 2. Configure the workflow

Edit `config.staging.json` or `config.production.json`:

```json
{
  "schedule": "*/30 * * * * *",
  "coinGeckoApiKey": "your-coingecko-api-key",
  "zaiApiKey": "your-zai-api-key-optional",
  "ethFeedAddress": "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1"
}
```

Make sure `workflow.yaml` points to the right config:

```yaml
staging-settings:
  user-workflow:
    workflow-name: "crett-workflow"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
```

### 3. Install dependencies

```bash
cd crett/crett-workflow && bun install
```

### 4. Simulate

Run from the `/crett` project root:

```bash
cre workflow simulate ./crett-workflow --target=staging-settings
```
