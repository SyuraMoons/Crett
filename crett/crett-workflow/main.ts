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
  ethUsdFeedAddress: z.string().default("0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1"),
  linkUsdFeedAddress: z.string().default("0xb113F5A928BCfF189C998ab20d753a47F9dE5A61"),
  divergenceThreshold: z.number().default(1.0),
  webhookUrl: z.string().default(""),
})
type Config = z.infer<typeof configSchema>

const AGGREGATOR_V3_ABI = parseAbi([
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
])

const fetchPrices = (sendRequester: HTTPSendRequester, url: string, apiKey: string): { ethereum: { usd: number }; chainlink: { usd: number } } => {
  const response = sendRequester.sendRequest({
    url, method: "GET",
    headers: { "x-cg-pro-api-key": apiKey },
  }).result()
  if (!ok(response)) throw new Error(`CoinGecko request failed: ${response.statusCode}`)
  return json(response) as { ethereum: { usd: number }; chainlink: { usd: number } }
}

const postWebhook = (sendRequester: HTTPSendRequester, body: string, url: string): string => {
  const encoded = Buffer.from(new TextEncoder().encode(body)).toString("base64")
  const response = sendRequester.sendRequest({
    url, method: "POST",
    headers: { "Content-Type": "application/json" },
    body: encoded,
  }).result()
  return ok(response) ? "sent" : "failed"
}

function readFeedPrice(evmClient: EVMClient, runtime: Runtime<Config>, feedAddress: string): number {
  const callData = encodeFunctionData({ abi: AGGREGATOR_V3_ABI, functionName: "latestRoundData", args: [] })
  const result = evmClient.callContract(runtime, {
    call: encodeCallMsg({ from: zeroAddress, to: feedAddress as Address, data: callData }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result()
  const [, answer] = decodeFunctionResult({
    abi: AGGREGATOR_V3_ABI,
    functionName: "latestRoundData",
    data: bytesToHex(result.data),
  }) as [bigint, bigint, bigint, bigint, bigint]
  return Number(answer) / 1e8
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const { coinGeckoApiKey, ethUsdFeedAddress, linkUsdFeedAddress, webhookUrl, divergenceThreshold } = runtime.config
  const network = getNetwork({ chainFamily: "evm", chainSelectorName: "ethereum-testnet-sepolia-base-1", isTestnet: true })
  const evmClient = new EVMClient(network.chainSelector.selector)
  const httpClient = new HTTPClient()

  runtime.log("Crett CRE Feed: fetching ETH + LINK prices...")

  // 1. Fetch ETH + LINK prices from CoinGecko
  const cgData = httpClient
    .sendRequest(runtime, fetchPrices, consensusMedianAggregation<{ ethereum: { usd: number }; chainlink: { usd: number } }>())(
      "https://pro-api.coingecko.com/api/v3/simple/price?ids=ethereum,chainlink&vs_currencies=usd",
      coinGeckoApiKey
    ).result()

  const cgEth = cgData.ethereum.usd
  const cgLink = cgData.chainlink.usd
  runtime.log(`CoinGecko ETH: $${cgEth}`)
  runtime.log(`CoinGecko LINK: $${cgLink}`)

  // 2. Fetch from Chainlink on-chain feeds (Base Sepolia)
  const clEth = readFeedPrice(evmClient, runtime, ethUsdFeedAddress)
  const clLink = readFeedPrice(evmClient, runtime, linkUsdFeedAddress)
  runtime.log(`Chainlink ETH: $${clEth}`)
  runtime.log(`Chainlink LINK: $${clLink}`)

  // 3. Compute divergence
  const ethDivergence = Math.abs((cgEth - clEth) / clEth) * 100
  const linkDivergence = Math.abs((cgLink - clLink) / clLink) * 100
  runtime.log(`ETH Divergence: ${ethDivergence.toFixed(4)}%`)
  runtime.log(`LINK Divergence: ${linkDivergence.toFixed(4)}%`)

  // 4. Send webhook unconditionally (reports live data every run)
  if (webhookUrl) {
    const payload = JSON.stringify({
      eth: { coingecko: cgEth, chainlink: clEth, divergence: ethDivergence.toFixed(4) },
      link: { coingecko: cgLink, chainlink: clLink, divergence: linkDivergence.toFixed(4) },
      alert: ethDivergence > divergenceThreshold || linkDivergence > divergenceThreshold,
    })
    const status = httpClient
      .sendRequest(runtime, postWebhook, consensusIdenticalAggregation<string>())(payload, webhookUrl)
      .result()
    runtime.log(`Webhook: ${status}`)
  }

  return `eth=${cgEth},link=${cgLink}`
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
