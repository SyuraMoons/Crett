export const ETH_PRICE_ALERT_TEMPLATE = `
import {
  CronCapability, HTTPClient,
  handler, Runner,
  consensusMedianAggregation, consensusIdenticalAggregation,
  ok, json,
  type Runtime, type HTTPSendRequester
} from "@chainlink/cre-sdk"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  coinGeckoApiKey: z.string(),
  priceThreshold: z.number().default(2000),
  webhookUrl: z.string().default(""),
})
type Config = z.infer<typeof configSchema>

const fetchEthPrice = (sendRequester: HTTPSendRequester, url: string, apiKey: string): number => {
  const response = sendRequester.sendRequest({
    url,
    method: "GET",
    headers: { "x-cg-pro-api-key": apiKey },
  }).result()
  if (!ok(response)) throw new Error(\`CoinGecko failed: \${response.statusCode}\`)
  const data = json(response) as { market_data: { current_price: { usd: number } } }
  return data.market_data.current_price.usd
}

const postWebhook = (sendRequester: HTTPSendRequester, body: string, url: string): string => {
  const encoded = Buffer.from(new TextEncoder().encode(body)).toString("base64")
  const response = sendRequester.sendRequest({
    url,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: encoded,
  }).result()
  return ok(response) ? "sent" : "failed"
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const { coinGeckoApiKey, webhookUrl, priceThreshold } = runtime.config
  const httpClient = new HTTPClient()

  const price = httpClient
    .sendRequest(runtime, fetchEthPrice, consensusMedianAggregation<number>())(
      \`https://pro-api.coingecko.com/api/v3/coins/ethereum?localization=false\`,
      coinGeckoApiKey
    )
    .result()

  runtime.log(\`ETH price: $\${price}\`)

  if (price < priceThreshold && webhookUrl) {
    const payload = JSON.stringify({ alert: "ETH price below threshold", price, threshold: priceThreshold })
    const status = httpClient
      .sendRequest(runtime, postWebhook, consensusIdenticalAggregation<string>())(payload, webhookUrl)
      .result()
    runtime.log(\`Webhook: \${status}\`)
  }

  return \`price=\${price}\`
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
`.trim()

export const CHAINLINK_FEED_MONITOR_TEMPLATE = `
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
  linkUsdFeedAddress: z.string().default("0xb113F5A928BCfF189C998ab20d753a47F9dE5A61"),
  divergenceThreshold: z.number().default(2.0),
  webhookUrl: z.string().default(""),
})
type Config = z.infer<typeof configSchema>

const AGGREGATOR_V3_ABI = parseAbi([
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
])

const fetchLinkPrice = (sendRequester: HTTPSendRequester, url: string, apiKey: string): number => {
  const response = sendRequester.sendRequest({ url, method: "GET", headers: { "x-cg-pro-api-key": apiKey } }).result()
  if (!ok(response)) throw new Error(\`CoinGecko request failed: \${response.statusCode}\`)
  const data = json(response) as { chainlink: { usd: number } }
  return data.chainlink.usd
}

const postAlert = (sendRequester: HTTPSendRequester, body: string, url: string): string => {
  const encoded = Buffer.from(new TextEncoder().encode(body)).toString("base64")
  const response = sendRequester.sendRequest({
    url, method: "POST",
    headers: { "Content-Type": "application/json" },
    body: encoded,
  }).result()
  return ok(response) ? "sent" : "failed"
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const { coinGeckoApiKey, webhookUrl, linkUsdFeedAddress, divergenceThreshold } = runtime.config
  const network = getNetwork({ chainFamily: "evm", chainSelectorName: "ethereum-testnet-sepolia-base-1", isTestnet: true })
  const evmClient = new EVMClient(network.chainSelector.selector)
  const httpClient = new HTTPClient()

  runtime.log("Starting LINK price cross-validation...")

  // 1. Fetch LINK price from CoinGecko
  const cgPrice = httpClient
    .sendRequest(runtime, fetchLinkPrice, consensusMedianAggregation<number>())(
      "https://pro-api.coingecko.com/api/v3/simple/price?ids=chainlink&vs_currencies=usd",
      coinGeckoApiKey
    )
    .result()
  runtime.log(\`CoinGecko LINK Price: $\${cgPrice}\`)

  // 2. Fetch LINK/USD from Chainlink feed on Base Sepolia
  const callData = encodeFunctionData({
    abi: AGGREGATOR_V3_ABI,
    functionName: "latestRoundData",
    args: [],
  })
  const result = evmClient.callContract(runtime, {
    call: encodeCallMsg({ from: zeroAddress, to: linkUsdFeedAddress as Address, data: callData }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result()
  const [, answer] = decodeFunctionResult({
    abi: AGGREGATOR_V3_ABI,
    functionName: "latestRoundData",
    data: bytesToHex(result.data),
  }) as [bigint, bigint, bigint, bigint, bigint]

  const clPrice = Number(answer) / 1e8
  runtime.log(\`Chainlink LINK/USD Feed: $\${clPrice}\`)

  // 3. Cross-validate both sources
  const divergence = Math.abs((cgPrice - clPrice) / clPrice) * 100
  runtime.log(\`Divergence: \${divergence.toFixed(4)}%\`)

  if (divergence > divergenceThreshold) {
    runtime.log(\`ALERT: LINK price divergence exceeds \${divergenceThreshold}% threshold!\`)
    if (webhookUrl) {
      const payload = JSON.stringify({
        alert: "LINK Price Divergence Alert",
        coingecko_price: cgPrice,
        chainlink_feed_price: clPrice,
        divergence_percent: divergence.toFixed(2),
        threshold: divergenceThreshold,
        network: "Base Sepolia",
      })
      const status = httpClient
        .sendRequest(runtime, postAlert, consensusIdenticalAggregation<string>())(payload, webhookUrl)
        .result()
      runtime.log(\`Alert webhook: \${status}\`)
    }
  }

  return \`link_divergence=\${divergence.toFixed(2)}\`
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
`.trim()

export const MARKET_DOMINANCE_TEMPLATE = `
import {
  CronCapability, HTTPClient,
  handler, Runner,
  consensusMedianAggregation, consensusIdenticalAggregation,
  ok, json,
  type Runtime, type HTTPSendRequester
} from "@chainlink/cre-sdk"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  coinGeckoApiKey: z.string(),
  minDominance: z.number().default(40),
  maxDominance: z.number().default(60),
  webhookUrl: z.string().default(""),
})
type Config = z.infer<typeof configSchema>

const fetchGlobalData = (sendRequester: HTTPSendRequester, url: string, apiKey: string): number => {
  const response = sendRequester.sendRequest({
    url,
    method: "GET",
    headers: { "x-cg-pro-api-key": apiKey },
  }).result()
  if (!ok(response)) throw new Error(\`CoinGecko global failed: \${response.statusCode}\`)
  const data = json(response) as { data: { market_cap_percentage: { btc: number } } }
  return data.data.market_cap_percentage.btc
}

const postAlert = (sendRequester: HTTPSendRequester, body: string, url: string): string => {
  const encoded = Buffer.from(new TextEncoder().encode(body)).toString("base64")
  const response = sendRequester.sendRequest({
    url, method: "POST",
    headers: { "Content-Type": "application/json" },
    body: encoded,
  }).result()
  return ok(response) ? "sent" : "failed"
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const { coinGeckoApiKey, webhookUrl, minDominance, maxDominance } = runtime.config
  const httpClient = new HTTPClient()

  const dominance = httpClient
    .sendRequest(runtime, fetchGlobalData, consensusMedianAggregation<number>())(
      "https://pro-api.coingecko.com/api/v3/global",
      coinGeckoApiKey
    ).result()

  runtime.log(\`BTC dominance: \${dominance.toFixed(2)}%\`)

  if ((dominance < minDominance || dominance > maxDominance) && webhookUrl) {
    const direction = dominance < minDominance ? "below minimum" : "above maximum"
    const payload = JSON.stringify({
      alert: \`BTC dominance \${direction}\`,
      dominance: dominance.toFixed(2),
      range: { min: minDominance, max: maxDominance },
    })
    const status = httpClient
      .sendRequest(runtime, postAlert, consensusIdenticalAggregation<string>())(payload, webhookUrl)
      .result()
    runtime.log(\`Alert: \${status}\`)
  }

  return \`btc_dominance=\${dominance.toFixed(2)}\`
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
`.trim()
