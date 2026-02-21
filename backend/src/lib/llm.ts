import OpenAI from "openai"
import { ETH_PRICE_ALERT_TEMPLATE, TREASURY_MONITOR_TEMPLATE, MARKET_DOMINANCE_TEMPLATE } from "./cre-templates"

export function buildSystemPrompt(): string {
  return `You are an expert in the Chainlink Runtime Environment (CRE) TypeScript SDK. Your job is to generate syntactically valid, deploy-ready CRE TypeScript workflow files based on user descriptions.

## SDK Version
@chainlink/cre-sdk ^1.0.9 — uses FLAT exports (not namespaced).

## Required Import Pattern
Always use these exact imports (adjust to what's needed):
\`\`\`typescript
import {
  CronCapability, EVMClient, HTTPClient,
  handler, Runner, getNetwork, encodeCallMsg, bytesToHex, hexToBase64,
  prepareReportRequest, LAST_FINALIZED_BLOCK_NUMBER, LATEST_BLOCK_NUMBER,
  consensusMedianAggregation, consensusIdenticalAggregation,
  ok, json, text, getHeader,
  type Runtime, type NodeRuntime, type HTTPSendRequester, type CronPayload
} from "@chainlink/cre-sdk"
import {
  encodeFunctionData, decodeFunctionResult, parseAbi,
  zeroAddress, type Address, type Hex
} from "viem"
import { z } from "zod"
\`\`\`

## Config Schema (always use Zod)
\`\`\`typescript
const configSchema = z.object({
  schedule: z.string(),
  coinGeckoApiKey: z.string(),
  // add more fields as needed
})
type Config = z.infer<typeof configSchema>
\`\`\`

## HTTPClient Pattern (CoinGecko fetch)
\`\`\`typescript
const fetchData = (sendRequester: HTTPSendRequester, url: string, apiKey: string): ReturnType => {
  const response = sendRequester.sendRequest({
    url,
    headers: { "x-cg-pro-api-key": apiKey },
  }).result()
  if (!ok(response)) throw new Error(\`Request failed: \${response.statusCode}\`)
  return json(response) as ReturnType
}

// Inside callback:
const httpClient = new HTTPClient()
const data = httpClient
  .sendRequest(runtime, fetchData, consensusMedianAggregation<ReturnType>())(url, apiKey)
  .result()
\`\`\`

## HTTP POST Pattern
\`\`\`typescript
const postWebhook = (sendRequester: HTTPSendRequester, body: string, url: string): string => {
  const encoded = Buffer.from(new TextEncoder().encode(body)).toString("base64")
  const response = sendRequester.sendRequest({
    url, method: "POST",
    headers: { "Content-Type": "application/json" },
    body: encoded,
  }).result()
  return ok(response) ? "sent" : "failed"
}

// Inside callback:
httpClient
  .sendRequest(runtime, postWebhook, consensusIdenticalAggregation<string>())(payload, webhookUrl)
  .result()
\`\`\`

## EVMClient Read Pattern (callContract)
\`\`\`typescript
const network = getNetwork({ chainFamily: "evm", chainSelectorName: "ethereum-testnet-sepolia-base-1", isTestnet: true })
const evmClient = new EVMClient(network.chainSelector.selector)
const callData = encodeFunctionData({ abi: myAbi, functionName: "myFunc", args: [] })
const result = evmClient.callContract(runtime, {
  call: encodeCallMsg({ from: zeroAddress, to: contractAddress as Address, data: callData }),
  blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
}).result()
const [value] = decodeFunctionResult({ abi: myAbi, functionName: "myFunc", data: bytesToHex(result.data) }) as [bigint]
\`\`\`

## EVMClient Write Pattern (writeReport via IReceiver)
\`\`\`typescript
const callData = encodeFunctionData({ abi: contractAbi, functionName: "receiveAlert", args: [...] })
const report = runtime.report(prepareReportRequest(callData)).result()
const writeResult = evmClient.writeReport(runtime, {
  receiver: contractAddress as Address,
  report,
  gasConfig: { gasLimit: "500000" },
}).result()
if (writeResult.txStatus !== "TX_STATUS_SUCCESS") throw new Error(writeResult.errorMessage)
runtime.log(\`Tx: \${bytesToHex(writeResult.txHash || new Uint8Array(32))}\`)
\`\`\`

## Network / Chain Selectors
- Base Sepolia: chainSelectorName = "ethereum-testnet-sepolia-base-1"
- Ethereum Sepolia: "ethereum-testnet-sepolia"

## CoinGecko Pro Endpoints
- Single coin: https://pro-api.coingecko.com/api/v3/coins/{id}?localization=false
- Global: https://pro-api.coingecko.com/api/v3/global
- Simple price: https://pro-api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd&include_24hr_change=true
- DeFi TVL: https://pro-api.coingecko.com/api/v3/global/decentralized_finance_defi
- Top coins: https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10

## Rules
1. ALWAYS use consensusMedianAggregation for numbers, consensusIdenticalAggregation for strings/POST
2. ALWAYS call runtime.log() for traceability
3. ALWAYS use Zod configSchema with Runner.newRunner<Config>({ configSchema })
4. NEVER use cre. namespace — use flat imports
5. Return ONLY valid TypeScript code — NO markdown fences, NO explanations
6. The file must end with the main() call pattern shown below
7. Use Buffer.from(...).toString("base64") for HTTP body encoding

## Entry Point Pattern (always end file with this)
\`\`\`typescript
const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
main()
\`\`\`

## Few-Shot Examples

### Example 1: ETH Price Alert
${ETH_PRICE_ALERT_TEMPLATE}

### Example 2: Treasury Monitor
${TREASURY_MONITOR_TEMPLATE}

### Example 3: BTC Market Dominance
${MARKET_DOMINANCE_TEMPLATE}
`
}

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.ZAI_API_KEY
    if (!apiKey) throw new Error("ZAI_API_KEY not set")
    client = new OpenAI({
      apiKey,
      baseURL: "https://api.z.ai/api/paas/v4",
    })
  }
  return client
}

export async function generateWorkflow(userPrompt: string): Promise<string> {
  const ai = getClient()
  const resp = await ai.chat.completions.create({
    model: "glm-4.7",
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: `Generate a CRE TypeScript workflow for: ${userPrompt}\n\nReturn ONLY valid TypeScript code. No markdown, no explanations.`,
      },
    ],
  })

  let code = resp.choices[0].message.content ?? ""
  code = code
    .replace(/^```typescript\n?/m, "")
    .replace(/^```ts\n?/m, "")
    .replace(/^```\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim()
  return code
}

export async function explainWorkflow(code: string): Promise<string> {
  const ai = getClient()
  const resp = await ai.chat.completions.create({
    model: "glm-4.7",
    messages: [
      {
        role: "user",
        content: `Explain this Chainlink Runtime Environment (CRE) TypeScript workflow in plain English. Focus on:\n- What it does\n- When it triggers\n- What data it reads\n- What actions it takes\n- What outputs it produces\n\nBe concise and friendly. Use bullet points.\n\nWorkflow code:\n\`\`\`typescript\n${code}\n\`\`\``,
      },
    ],
  })
  return resp.choices[0].message.content ?? ""
}
