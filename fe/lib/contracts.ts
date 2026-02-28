// RiskLog contract — deployed on Base Sepolia
// Update RISK_LOG_ADDRESS after running: forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast
export const RISK_LOG_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`

export const RISK_LOG_ABI = [
  {
    name: "logRisk",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "category", type: "string" },
      { name: "severity", type: "uint8" },
      { name: "message",  type: "string" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "RiskLogged",
    inputs: [
      { name: "category",  type: "string",  indexed: true },
      { name: "severity",  type: "uint8",   indexed: false },
      { name: "message",   type: "string",  indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const
