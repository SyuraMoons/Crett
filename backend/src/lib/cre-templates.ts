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
  webhookUrl: z.string(),
  priceThreshold: z.number(),
})
type Config = z.infer<typeof configSchema>

const fetchEthPrice = (sendRequester: HTTPSendRequester, url: string, apiKey: string): number => {
  const response = sendRequester.sendRequest({
    url,
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

  if (price < priceThreshold) {
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

export const TREASURY_MONITOR_TEMPLATE = `
import {
  CronCapability, HTTPClient, EVMClient,
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
  slackWebhookUrl: z.string(),
  treasuryAddress: z.string(),
  balanceThresholdUsd: z.number(),
})
type Config = z.infer<typeof configSchema>

const TREASURY_ABI = parseAbi(["function getBalance(address token) view returns (uint256)"])
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" // Base Sepolia USDC

const fetchUsdcPrice = (sendRequester: HTTPSendRequester, url: string, apiKey: string): number => {
  const response = sendRequester.sendRequest({ url, headers: { "x-cg-pro-api-key": apiKey } }).result()
  if (!ok(response)) return 1.0
  const data = json(response) as { usd_coin: { usd: number } }
  return data.usd_coin?.usd ?? 1.0
}

const postSlack = (sendRequester: HTTPSendRequester, body: string, url: string): string => {
  const encoded = Buffer.from(new TextEncoder().encode(body)).toString("base64")
  const response = sendRequester.sendRequest({
    url, method: "POST",
    headers: { "Content-Type": "application/json" },
    body: encoded,
  }).result()
  return ok(response) ? "sent" : "failed"
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const { coinGeckoApiKey, slackWebhookUrl, treasuryAddress, balanceThresholdUsd } = runtime.config
  const network = getNetwork({ chainFamily: "evm", chainSelectorName: "ethereum-testnet-sepolia-base-1", isTestnet: true })
  const evmClient = new EVMClient(network.chainSelector.selector)
  const httpClient = new HTTPClient()

  // Read treasury USDC balance
  const callData = encodeFunctionData({
    abi: TREASURY_ABI,
    functionName: "getBalance",
    args: [USDC_ADDRESS as Address],
  })
  const result = evmClient.callContract(runtime, {
    call: encodeCallMsg({ from: zeroAddress, to: treasuryAddress as Address, data: callData }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result()
  const [balanceRaw] = decodeFunctionResult({ abi: TREASURY_ABI, functionName: "getBalance", data: bytesToHex(result.data) }) as [bigint]
  const balanceUsdc = Number(balanceRaw) / 1e6

  // Get USDC/USD price
  const usdcPrice = httpClient
    .sendRequest(runtime, fetchUsdcPrice, consensusMedianAggregation<number>())(
      "https://pro-api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd",
      coinGeckoApiKey
    ).result()

  const balanceUsd = balanceUsdc * usdcPrice
  runtime.log(\`Treasury balance: \${balanceUsdc.toFixed(2)} USDC = $\${balanceUsd.toFixed(2)}\`)

  if (balanceUsd < balanceThresholdUsd) {
    const msg = JSON.stringify({ text: \`⚠️ Treasury alert: $\${balanceUsd.toFixed(2)} USD (below $\${balanceThresholdUsd} threshold)\` })
    const status = httpClient
      .sendRequest(runtime, postSlack, consensusIdenticalAggregation<string>())(msg, slackWebhookUrl)
      .result()
    runtime.log(\`Slack alert: \${status}\`)
  }

  return \`balance_usd=\${balanceUsd.toFixed(2)}\`
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
  webhookUrl: z.string(),
  minDominance: z.number(),
  maxDominance: z.number(),
})
type Config = z.infer<typeof configSchema>

const fetchGlobalData = (sendRequester: HTTPSendRequester, url: string, apiKey: string): number => {
  const response = sendRequester.sendRequest({
    url,
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

  if (dominance < minDominance || dominance > maxDominance) {
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
