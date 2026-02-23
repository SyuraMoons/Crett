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

const configSchema = z.object({
  schedule: z.string(),
  coinGeckoApiKey: z.string(),
  webhookUrl: z.string(),
  ethUsdFeedAddress: z.string(),
})
type Config = z.infer<typeof configSchema>

const AGGREGATOR_V3_ABI = parseAbi([
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
])

const fetchEthPrice = (sendRequester: HTTPSendRequester, url: string, apiKey: string): number => {
  const response = sendRequester.sendRequest({
    url,
    headers: { "x-cg-pro-api-key": apiKey },
  }).result()
  if (!ok(response)) throw new Error(`CoinGecko request failed: ${response.statusCode}`)
  const data = json(response) as Array<{ current_price: { usd: number } }>
  return data[0].current_price.usd
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
  const { coinGeckoApiKey, webhookUrl, ethUsdFeedAddress } = runtime.config
  const network = getNetwork({ chainFamily: "evm", chainSelectorName: "ethereum-testnet-sepolia-base-1", isTestnet: true })
  const evmClient = new EVMClient(network.chainSelector.selector)
  const httpClient = new HTTPClient()

  runtime.log("Starting ETH price divergence check...")

  // 1. Fetch price from CoinGecko
  const cgPrice = httpClient
    .sendRequest(runtime, fetchEthPrice, consensusMedianAggregation<number>())(
      "https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum",
      coinGeckoApiKey
    )
    .result()
  
  runtime.log(`CoinGecko ETH Price: $${cgPrice}`)

  // 2. Fetch price from Chainlink Feed on Base Sepolia
  const callData = encodeFunctionData({
    abi: AGGREGATOR_V3_ABI,
    functionName: "latestRoundData",
    args: [],
  })

  const result = evmClient.callContract(runtime, {
    call: encodeCallMsg({ from: zeroAddress, to: ethUsdFeedAddress as Address, data: callData }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result()

  const [, answer] = decodeFunctionResult({
    abi: AGGREGATOR_V3_ABI,
    functionName: "latestRoundData",
    data: bytesToHex(result.data),
  }) as [bigint, bigint, bigint, bigint, bigint]

  // Chainlink USD feeds usually have 8 decimals
  const clPrice = Number(answer) / 1e8
  runtime.log(`Chainlink ETH Price: $${clPrice}`)

  // 3. Compare and check divergence
  const divergence = Math.abs((cgPrice - clPrice) / clPrice) * 100
  runtime.log(`Divergence: ${divergence.toFixed(4)}%`)

  const THRESHOLD_PERCENT = 1.0
  if (divergence > THRESHOLD_PERCENT) {
    const alertPayload = JSON.stringify({
      alert: "ETH Price Divergence Alert",
      coingecko_price: cgPrice,
      chainlink_price: clPrice,
      divergence_percent: divergence.toFixed(2),
      threshold: THRESHOLD_PERCENT,
      network: "Base Sepolia",
    })

    const status = httpClient
      .sendRequest(runtime, postAlert, consensusIdenticalAggregation<string>())(alertPayload, webhookUrl)
      .result()
    
    runtime.log(`Alert triggered! Webhook status: ${status}`)
  }

  return `divergence=${divergence.toFixed(2)}`
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