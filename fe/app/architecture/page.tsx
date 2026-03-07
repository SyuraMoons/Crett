import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <div className="h-4 w-px bg-zinc-800" />
        <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Crett — System Architecture</h1>
        <span className="ml-auto text-xs text-zinc-600">Chainlink Convergence 2026 · CRE &amp; AI Track</span>
      </div>

      {/* Three-column diagram */}
      <div className="grid grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Column 1: Frontend */}
        <Column
          title="Crett Frontend"
          subtitle="Next.js 16 · port 3000"
          color="blue"
          badge="UI"
          nodes={[
            { label: "Monaco Editor", desc: "TypeScript CRE code" },
            { label: "Template Selector", desc: "Starter workflow templates" },
            { label: "AI Generate panel", desc: "Prompt → stream → code" },
            { label: "Agent Panel (chat)", desc: "Code analysis & chat" },
            { label: "CRE Live Feed", desc: "Poll /cre-data every 5s" },
          ]}
          arrows={[
            { label: "POST /generate (stream)", dir: "out" },
            { label: "POST /simulate (SSE)", dir: "out" },
            { label: "GET /cre-data (poll)", dir: "in" },
          ]}
        />

        {/* Column 2: Backend */}
        <Column
          title="Express Backend"
          subtitle="Node.js · port 3001"
          color="orange"
          badge="API"
          nodes={[
            { label: "GLM-4.7 / Z.AI", desc: "/generate — stream CRE code" },
            { label: "/analyze", desc: "Workflow scoring & review" },
            { label: "/debug", desc: "LLM error diagnosis" },
            { label: "/simulate (SSE)", desc: "Writes main.ts → cre-cli.ts" },
            { label: "/cre-data", desc: "Returns last sim output" },
            { label: "cre-cli.ts", desc: "Spawns CRE binary subprocess" },
          ]}
          arrows={[
            { label: "cre workflow simulate", dir: "out" },
            { label: "SSE log stream", dir: "in" },
          ]}
        />

        {/* Column 3: CRE Runtime */}
        <Column
          title="CRE Runtime"
          subtitle="Base Sepolia · @chainlink/cre-sdk"
          color="purple"
          badge="CRE"
          nodes={[
            { label: "CronCapability (*/30s)", desc: "Trigger entry point" },
            { label: "HTTPClient → CoinGecko", desc: "ETH, BTC, LINK prices + 24h%" },
            { label: "consensusMedianAggregation", desc: "Numeric price consensus" },
            { label: "HTTPClient → Z.AI LLM", desc: "Generates CRE TypeScript code" },
            { label: "consensusIdenticalAggregation", desc: "String/code consensus" },
            { label: "EVMClient → Chainlink Feed", desc: "ETH/USD · 0x4aDC… Base Sepolia" },
          ]}
          arrows={[]}
        />
      </div>

      {/* Data flow legend */}
      <div className="max-w-6xl mx-auto mt-8 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
        <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Data flow</p>
        <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400">
          <FlowStep n="1" text="User types prompt in AI Generate panel → POST /generate → Z.AI GLM-4.7 streams CRE TypeScript → Monaco Editor" />
          <FlowStep n="2" text="User clicks Simulate → POST /simulate → backend writes main.ts → spawns `cre workflow simulate` → SSE lines stream to frontend" />
          <FlowStep n="3" text="CRE runtime triggers on cron → fetches CoinGecko prices (consensusMedianAggregation) → reads Chainlink ETH/USD onchain feed" />
          <FlowStep n="4" text="CRE runtime sends market context to Z.AI → receives generated CRE workflow code → logs preview via runtime.log()" />
        </div>
      </div>

      {/* Chainlink products used */}
      <div className="max-w-6xl mx-auto mt-4 grid grid-cols-2 gap-4">
        <ProductCard
          title="Chainlink Runtime Environment (CRE)"
          color="purple"
          items={[
            "CronCapability — scheduled workflow trigger",
            "HTTPClient with consensus aggregation",
            "EVMClient — reads onchain Aggregator feeds",
            "Runner + handler pattern",
          ]}
        />
        <ProductCard
          title="Chainlink Data Feeds"
          color="blue"
          items={[
            "AggregatorV3Interface.latestRoundData()",
            "ETH/USD — 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
            "LINK/USD — 0xb113F5A928BCfF189C998ab20d753a47F9dE5A61",
            "BTC/USD — 0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298",
          ]}
        />
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Column({
  title,
  subtitle,
  color,
  badge,
  nodes,
  arrows,
}: {
  title: string
  subtitle: string
  color: "blue" | "orange" | "purple"
  badge: string
  nodes: { label: string; desc: string }[]
  arrows: { label: string; dir: "in" | "out" }[]
}) {
  const borderColor = {
    blue: "border-blue-800",
    orange: "border-orange-800",
    purple: "border-purple-800",
  }[color]

  const badgeBg = {
    blue: "bg-blue-900/60 text-blue-300 border-blue-700",
    orange: "bg-orange-900/60 text-orange-300 border-orange-700",
    purple: "bg-purple-900/60 text-purple-300 border-purple-700",
  }[color]

  const nodeBorder = {
    blue: "border-blue-900/60 hover:border-blue-700/60",
    orange: "border-orange-900/60 hover:border-orange-700/60",
    purple: "border-purple-900/60 hover:border-purple-700/60",
  }[color]

  const arrowColor = {
    blue: "text-blue-500",
    orange: "text-orange-500",
    purple: "text-purple-500",
  }[color]

  return (
    <div className={`rounded-xl border ${borderColor} bg-zinc-900 p-4 flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{title}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{subtitle}</div>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${badgeBg}`}>{badge}</span>
      </div>

      {/* Nodes */}
      <div className="flex flex-col gap-1.5">
        {nodes.map((node) => (
          <div
            key={node.label}
            className={`rounded border ${nodeBorder} bg-zinc-950 px-2.5 py-1.5 transition-colors`}
          >
            <div className="text-xs font-medium text-zinc-200">{node.label}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{node.desc}</div>
          </div>
        ))}
      </div>

      {/* Arrows */}
      {arrows.length > 0 && (
        <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800">
          {arrows.map((arrow) => (
            <div key={arrow.label} className={`text-[10px] ${arrowColor} flex items-center gap-1`}>
              <span>{arrow.dir === "out" ? "→" : "←"}</span>
              <span>{arrow.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FlowStep({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-zinc-600 shrink-0">{n}.</span>
      <span>{text}</span>
    </div>
  )
}

function ProductCard({ title, color, items }: { title: string; color: "blue" | "purple"; items: string[] }) {
  const border = color === "purple" ? "border-purple-900" : "border-blue-900"
  const dot = color === "purple" ? "bg-purple-500" : "bg-blue-500"
  const heading = color === "purple" ? "text-purple-300" : "text-blue-300"

  return (
    <div className={`rounded-lg border ${border} bg-zinc-900/60 p-4`}>
      <p className={`text-xs font-semibold mb-2 ${heading}`}>{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-zinc-400">
            <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0 mt-1`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
