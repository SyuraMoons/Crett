export const CHAINLINK_PRICE_FEEDS = {
  "ETH/USD": "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",   // Base Sepolia
  "BTC/USD": "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298",   // Base Sepolia
  "LINK/USD": "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61",  // Base Sepolia
} as const

export function buildChainlinkContext(): string {
  return `
## Known Chainlink Price Feeds (Base Sepolia — AggregatorV3, 8 decimals)
${Object.entries(CHAINLINK_PRICE_FEEDS).map(([k, v]) => `- ${k}: \`${v}\``).join("\n")}

## AggregatorV3 ABI
\`"function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)"\`
Price from feed has 8 decimals — divide answer by 1e8.

## CRE Runner Constraints
- Minimum cron interval: 30 seconds (*/30 * * * * *)
- Max execution time per trigger: ~30s
- HTTP requests go through consensus (multiple nodes); always use consensusMedianAggregation/consensusIdenticalAggregation
- callContract() reads are simulation-safe (hits real Base Sepolia RPC)
- writeReport() requires KeystoneForwarder infrastructure (Early Access) — do not use
`
}
