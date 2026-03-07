import {
  CronCapability, EVMClient, HTTPClient,
  handler, Runner, getNetwork, encodeCallMsg, bytesToHex,
  consensusMedianAggregation, consensusIdenticalAggregation,
  ok, json, LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime, type HTTPSendRequester
} from "@chainlink/cre-sdk"
import { encodeFunctionData, decodeFunctionResult, parseAbi, zeroAddress, type Address } from "viem"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  coinGeckoApiKey: z.string(),
  zaiApiKey: z.string().default(""),
  ethFeedAddress: z.string().default("0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1"),
})
type Config = z.infer<typeof configSchema>

const AGGREGATOR_V3_ABI = parseAbi([
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
])

type MarketData = {
  ethereum: { usd: number; usd_24h_change: number }
  bitcoin:  { usd: number; usd_24h_change: number }
  chainlink: { usd: number; usd_24h_change: number }
}

const fetchMarketData = (sendRequester: HTTPSendRequester, url: string, apiKey: string): MarketData => {
  const response = sendRequester.sendRequest({
    url, method: "GET", headers: { "x-cg-pro-api-key": apiKey },
  }).result()
  if (!ok(response)) throw new Error(`CoinGecko failed: ${response.statusCode}`)
  return json(response) as MarketData
}

const generateCREWorkflow = (sendRequester: HTTPSendRequester, prompt: string, apiKey: string): string => {
  const body = JSON.stringify({
    model: "glm-4.7",
    messages: [
      {
        role: "system",
        content: `You are an expert in the Chainlink Runtime Environment (CRE) TypeScript SDK.
Generate a valid, deploy-ready CRE TypeScript workflow based on the market context provided.
Use flat imports from @chainlink/cre-sdk (not namespaced). Use consensusMedianAggregation
for numbers, consensusIdenticalAggregation for strings. Include CronCapability, Zod configSchema
with only schedule + coinGeckoApiKey as required fields (all others use .default()), and the
standard main() entry point. Return ONLY valid TypeScript — no markdown, no explanation.`
      },
      { role: "user", content: prompt }
    ],
    max_tokens: 800
  })
  const encoded = Buffer.from(new TextEncoder().encode(body)).toString("base64")
  const response = sendRequester.sendRequest({
    url: "https://api.z.ai/api/coding/paas/v4/chat/completions",
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: encoded,
  }).result()
  if (!ok(response)) throw new Error(`LLM call failed: ${response.statusCode}`)
  const data = json(response) as { choices: [{ message: { content: string } }] }
  return data.choices[0].message.content
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const { coinGeckoApiKey, zaiApiKey, ethFeedAddress } = runtime.config
  const httpClient = new HTTPClient()
  const network = getNetwork({ chainFamily: "evm", chainSelectorName: "ethereum-testnet-sepolia-base-1", isTestnet: true })
  const evmClient = new EVMClient(network.chainSelector.selector)

  runtime.log("CRE Workflow Advisor: fetching market data...")

  // 1. CoinGecko — ETH, BTC, LINK prices
  const market = httpClient
    .sendRequest(runtime, fetchMarketData, consensusMedianAggregation<MarketData>())(
      "https://pro-api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,chainlink&vs_currencies=usd&include_24hr_change=true",
      coinGeckoApiKey
    ).result()

  runtime.log(`ETH: $${market.ethereum.usd} (${market.ethereum.usd_24h_change.toFixed(2)}% 24h)`)
  runtime.log(`BTC: $${market.bitcoin.usd} (${market.bitcoin.usd_24h_change.toFixed(2)}% 24h)`)
  runtime.log(`LINK: $${market.chainlink.usd} (${market.chainlink.usd_24h_change.toFixed(2)}% 24h)`)

  // 2. Chainlink feed — onchain ETH/USD confirmation
  const callData = encodeFunctionData({ abi: AGGREGATOR_V3_ABI, functionName: "latestRoundData", args: [] })
  const result = evmClient.callContract(runtime, {
    call: encodeCallMsg({ from: zeroAddress, to: ethFeedAddress as Address, data: callData }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result()
  const [, answer] = decodeFunctionResult({
    abi: AGGREGATOR_V3_ABI, functionName: "latestRoundData", data: bytesToHex(result.data)
  }) as [bigint, bigint, bigint, bigint, bigint]
  const ethOnchain = Number(answer) / 1e8
  runtime.log(`Chainlink ETH/USD (Base Sepolia): $${ethOnchain}`)

  // 3. Generate a CRE workflow tailored to current conditions
  if (zaiApiKey) {
    runtime.log("Generating CRE workflow from current market conditions...")
    const prompt = `Market context: ETH $${market.ethereum.usd} (${market.ethereum.usd_24h_change.toFixed(1)}% 24h), BTC $${market.bitcoin.usd} (${market.bitcoin.usd_24h_change.toFixed(1)}% 24h), LINK $${market.chainlink.usd} (${market.chainlink.usd_24h_change.toFixed(1)}% 24h). Chainlink onchain ETH: $${ethOnchain}. Generate a complete CRE TypeScript workflow that monitors the most actionable condition right now based on this market data.`
    const generatedCode = httpClient
      .sendRequest(runtime, generateCREWorkflow, consensusIdenticalAggregation<string>())(prompt, zaiApiKey)
      .result()
    runtime.log(`Generated CRE Workflow (preview):\n${generatedCode.slice(0, 500)}...`)
    return `generated_ok,eth=${market.ethereum.usd}`
  }

  return `advisor_run=ok,eth=${market.ethereum.usd},btc=${market.bitcoin.usd},link=${market.chainlink.usd}`
}

const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
main()
