import OpenAI from "openai"
import { ETH_PRICE_ALERT_TEMPLATE, CHAINLINK_FEED_MONITOR_TEMPLATE, MARKET_DOMINANCE_TEMPLATE } from "./cre-templates"
import { buildChainlinkContext } from "./chainlink-context"
import { WorkflowAnalysisSchema, type WorkflowAnalysis } from "./analysis-schema"

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

## Config Schema — CRITICAL SIMULATION RULE
Only TWO fields are REQUIRED (always provided by the simulator):
\`\`\`typescript
const configSchema = z.object({
  schedule: z.string(),
  coinGeckoApiKey: z.string(),
  // ALL other fields MUST use .default() — they are NOT in config.staging.json
  priceThreshold: z.number().default(2000),   // sensible real-world value
  webhookUrl: z.string().default(""),          // skip action if empty string
  contractAddress: z.string().default("0x0000000000000000000000000000000000000000"),
})
type Config = z.infer<typeof configSchema>
\`\`\`
NEVER add required fields beyond \`schedule\` + \`coinGeckoApiKey\` — they will not be present
in config.staging.json and Zod will throw a parse error, failing simulation immediately.

Always guard optional string config before using it:
\`\`\`typescript
if (webhookUrl) {
  httpClient.sendRequest(runtime, postWebhook, consensusIdenticalAggregation<string>())(payload, webhookUrl).result()
}
\`\`\`

## HTTPClient Pattern (CoinGecko fetch)
\`\`\`typescript
const fetchData = (sendRequester: HTTPSendRequester, url: string, apiKey: string): ReturnType => {
  const response = sendRequester.sendRequest({
    url,
    method: "GET",
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

## Simulation-Safe Operations
- \`callContract()\` ✅ — hits real Base Sepolia RPC during simulation (reads work)
- \`sendRequest()\` ✅ — real HTTP calls during simulation
- \`writeReport()\` ❌ — requires Chainlink KeystoneForwarder (Early Access only); do NOT use

## Network / Chain Selectors
- Base Sepolia ONLY: chainSelectorName = "ethereum-testnet-sepolia-base-1"
- Always set isTestnet: true

## CoinGecko Pro Endpoints
- Single coin: https://pro-api.coingecko.com/api/v3/coins/{id}?localization=false
- Global: https://pro-api.coingecko.com/api/v3/global
- Simple price: https://pro-api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd&include_24hr_change=true
- DeFi TVL: https://pro-api.coingecko.com/api/v3/global/decentralized_finance_defi
- Top coins: https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10
${buildChainlinkContext()}
## Rules
1. ALWAYS use consensusMedianAggregation for numbers, consensusIdenticalAggregation for strings/POST
2. ALWAYS call runtime.log() for traceability
3. ALWAYS use Zod configSchema with Runner.newRunner<Config>({ configSchema })
4. NEVER use cre. namespace — use flat imports
5. Return ONLY valid TypeScript code — NO markdown fences, NO explanations
6. The file must end with the main() call pattern shown below
7. Use Buffer.from(...).toString("base64") for HTTP body encoding
8. NEVER copy or reproduce the example templates verbatim. Always generate FRESH, UNIQUE code tailored exactly to the user's specific prompt — their asset, threshold values, schedule, contract addresses, and logic.

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

### Example 2: Chainlink Feed Monitor (LINK/USD cross-validation)
${CHAINLINK_FEED_MONITOR_TEMPLATE}

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
      baseURL: "https://api.z.ai/api/coding/paas/v4",
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
        content: `Generate a NEW, UNIQUE CRE TypeScript workflow that specifically implements: ${userPrompt}

Use the correct SDK patterns from the system prompt. Do NOT copy any example template — write fresh code with the exact asset, values, thresholds, schedule, and logic the user described.

Return ONLY valid TypeScript code. No markdown, no explanations.`,
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

export async function* generateWorkflowStream(
  userPrompt: string
): AsyncGenerator<string> {
  const ai = getClient()
  const stream = await ai.chat.completions.create({
    model: "glm-4.7",
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: `Generate a NEW, UNIQUE CRE TypeScript workflow that specifically implements: ${userPrompt}

Use the correct SDK patterns from the system prompt. Do NOT copy any example template — write fresh code with the exact asset, values, thresholds, schedule, and logic the user described.

Return ONLY valid TypeScript code. No markdown, no explanations.`,
      },
    ],
    stream: true,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? ""
    if (delta) yield delta
  }
}

export async function debugWorkflow(code: string, logs: string): Promise<string> {
  const ai = getClient()
  const resp = await ai.chat.completions.create({
    model: "glm-4.7",
    messages: [
      {
        role: "system",
        content: `You are an expert in the Chainlink Runtime Environment (CRE) TypeScript SDK. You diagnose failed CRE workflow simulations and provide specific, actionable fixes. Focus on CRE-specific issues: wrong aggregation type, bad imports, EVMClient errors, consensus failures, missing runtime.log calls, invalid cron schedules, wrong chain selectors, or incorrect IReceiver usage.`,
      },
      {
        role: "user",
        content: `This CRE workflow simulation failed. Diagnose what went wrong and suggest the exact fix.

## Simulation Logs
\`\`\`
${logs}
\`\`\`

## Workflow Code
\`\`\`typescript
${code}
\`\`\`

Provide:
1. **Root cause** — what specifically failed (CRE-specific)
2. **Suggested fix** — exact code change needed
3. **Why** — brief explanation

Be concise and technical.`,
      },
    ],
  })
  return resp.choices[0].message.content ?? ""
}

export async function analyzeWorkflow(code: string): Promise<WorkflowAnalysis> {
  const ai = getClient()
  const resp = await ai.chat.completions.create({
    model: "glm-4.7",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are a skeptical CRE (Chainlink Runtime Environment) code reviewer. You analyze CRE TypeScript workflow files and return a structured JSON assessment.

Scoring calibration:
- 0–20: Wrong patterns, broken imports, namespace errors (cre.xxx instead of flat imports)
- 21–40: Partial — missing Zod configSchema, wrong aggregation type, no runtime.log
- 41–60: Works but has issues — missing tx status check, hardcoded values, weak error handling
- 61–80: Good — correct patterns, proper aggregation, logging present
- 81–100: Exemplary — all patterns correct, robust error handling, clean structure

CRE compliance checks:
- Uses flat imports from @chainlink/cre-sdk (NOT namespaced as cre.xxx)
- Uses consensusMedianAggregation for numbers, consensusIdenticalAggregation for strings/POST
- Uses IReceiver pattern correctly (receiveAlert/receiveData via writeReport)
- Calls .result() on all async operations

Code quality checks:
- Zod configSchema with Runner.newRunner<Config>({ configSchema })
- Proper TypeScript types
- No hardcoded API keys or secrets

Runtime safety checks:
- runtime.log() calls for traceability
- txStatus check after writeReport
- No infinite loops or unhandled promise rejections

Return ONLY a valid JSON object — no markdown fences, no explanations, no extra text. The JSON must match this exact shape:
{
  "overall_score": <number 0-100>,
  "sub_scores": {
    "cre_compliance": { "score": <number>, "reasoning": <string> },
    "code_quality": { "score": <number>, "reasoning": <string> },
    "runtime_safety": { "score": <number>, "reasoning": <string> }
  },
  "risk_flags": [{ "severity": "critical"|"high"|"medium"|"low", "label": <string>, "detail": <string> }],
  "one_line_verdict": <string>,
  "improvements": [<string>, ...],  // max 4 concise action items
  "deploy_ready": <boolean>
}`,
      },
      {
        role: "user",
        content: `Analyze this CRE workflow and return the structured JSON assessment:

\`\`\`typescript
${code}
\`\`\`

Return ONLY the JSON object.`,
      },
    ],
  })

  let raw = resp.choices[0].message.content ?? ""
  // Strip markdown fences if present
  raw = raw
    .replace(/^```json\n?/m, "")
    .replace(/^```\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim()

  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed.improvements)) {
    parsed.improvements = parsed.improvements.slice(0, 4)
  }
  return WorkflowAnalysisSchema.parse(parsed)
}

export async function fixWorkflow(code: string, improvement: string): Promise<string> {
  const ai = getClient()
  const resp = await ai.chat.completions.create({
    model: "glm-4.7",
    messages: [
      {
        role: "system",
        content: `You are an expert CRE TypeScript developer. You receive a workflow file and ONE specific improvement instruction. Apply ONLY that improvement to the code. Return the COMPLETE, fixed TypeScript file. No markdown fences, no explanations — just valid TypeScript.`,
      },
      {
        role: "user",
        content: `Apply this improvement to the workflow:\n\nImprovement: ${improvement}\n\nWorkflow:\n\`\`\`typescript\n${code}\n\`\`\`\n\nReturn ONLY the fixed TypeScript file.`,
      },
    ],
  })
  let fixed = resp.choices[0].message.content ?? ""
  fixed = fixed
    .replace(/^```typescript\n?/m, "")
    .replace(/^```ts\n?/m, "")
    .replace(/^```\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim()
  return fixed
}

export async function chatWorkflow(
  code: string | undefined,
  messages: { role: "user" | "assistant"; content: string }[],
  systemContentOverride?: string
): Promise<string> {
  const ai = getClient()
  const systemContent = systemContentOverride ?? (code
    ? `You are an expert CRE (Chainlink Runtime Environment) code assistant.
The user is working on this CRE TypeScript workflow:

\`\`\`typescript
${code}
\`\`\`

Answer concisely. If asked to fix something, return the COMPLETE fixed TypeScript file wrapped in a \`\`\`typescript ... \`\`\` block so the frontend can detect and apply it automatically. Otherwise, reply in plain text.`
    : `You are a friendly CRE workflow assistant. Help users understand what CRE (Chainlink Runtime Environment) workflows are, how they work, and how to write one. Keep answers concise and beginner-friendly.`)

  const resp = await ai.chat.completions.create({
    model: "glm-4.7",
    messages: [
      { role: "system", content: systemContent },
      ...messages,
    ],
  })
  return resp.choices[0].message.content ?? ""
}

export async function agentClassify(
  message: string,
  hasCode: boolean,
  hasMarketData: boolean
): Promise<"chat" | "generate" | "simulate" | "analyze" | "autonomous"> {
  const ai = getClient()
  const resp = await ai.chat.completions.create({
    model: "glm-4.7",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `Classify the user message into exactly one of these intents:
- generate: user wants to create/write/build a new CRE workflow
- simulate: user wants to run/test/execute the workflow
- analyze: user wants to score/review/check/assess the code quality
- autonomous: user asks the agent to "watch", "monitor", "decide", "act automatically", or "keep an eye on" something without specifying a single action
- chat: everything else (questions, explanations, general discussion)

Context: hasCode=${hasCode}, hasMarketData=${hasMarketData}
Return ONLY the single intent word with no punctuation or explanation.`,
      },
      { role: "user", content: message },
    ],
  })
  const raw = resp.choices[0].message.content?.trim().toLowerCase() ?? "chat"
  const valid = ["chat", "generate", "simulate", "analyze", "autonomous"]
  return (valid.includes(raw) ? raw : "chat") as "chat" | "generate" | "simulate" | "analyze" | "autonomous"
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
