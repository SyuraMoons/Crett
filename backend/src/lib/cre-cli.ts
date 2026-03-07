import { spawn } from "child_process"
import { access, writeFile } from "fs/promises"
import { constants } from "fs"
import { join } from "path"
import { createInterface } from "readline"

const CRE_PROJECT_ROOT =
  process.env.CRE_PROJECT_ROOT ??
  "/Users/harfi/Documents/Project/hackaton/chainlink/crett"
const CRE_WORKFLOW_DIR = join(CRE_PROJECT_ROOT, "crett-workflow")
const CRE_BIN = `${process.env.HOME}/.cre/bin/cre`

async function isCREAvailable(): Promise<boolean> {
  try {
    await access(CRE_BIN, constants.X_OK)
    await access(CRE_WORKFLOW_DIR, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const spawnEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.cre/bin:${process.env.PATH}`,
}

export interface SimulateOptions {
  code: string
  config: Record<string, unknown>
}

async function* spawnStream(
  cmd: string,
  args: string[],
  opts: { cwd: string; env: NodeJS.ProcessEnv }
): AsyncGenerator<string> {
  const proc = spawn(cmd, args, {
    cwd: opts.cwd,
    env: opts.env,
    stdio: ["ignore", "pipe", "pipe"],
  })

  const stdout = createInterface({ input: proc.stdout! })
  const stderr = createInterface({ input: proc.stderr! })

  const lines: string[] = []
  const resolvers: Array<(value: { done: boolean; value: string }) => void> = []

  const push = (line: string) => {
    if (resolvers.length > 0) {
      resolvers.shift()!({ done: false, value: line })
    } else {
      lines.push(line)
    }
  }

  stdout.on("line", (line) => push(line + "\n"))
  stderr.on("line", (line) => push(`[stderr] ${line}\n`))

  let exitCode: number | null = null
  const exitPromise = new Promise<void>((resolve) => {
    proc.on("close", (code) => {
      exitCode = code
      resolve()
    })
  })

  while (true) {
    if (lines.length > 0) {
      yield lines.shift()!
    } else {
      const line = await new Promise<{ done: boolean; value: string }>((resolve) => {
        if (lines.length > 0) {
          resolve({ done: false, value: lines.shift()! })
        } else {
          resolvers.push(resolve)
        }
      })

      if (line.done) break
      yield line.value

      // Check if process has ended and no more lines
      if (exitCode !== null && lines.length === 0 && resolvers.length === 0) break
    }
  }

  await exitPromise

  if (exitCode !== 0) {
    throw new Error(`CRE CLI exited with code ${exitCode}`)
  }
}

export async function* simulateWorkflow(opts: SimulateOptions): AsyncGenerator<string> {
  if (!(await isCREAvailable())) {
    yield* mockSimulate()
    return
  }

  // Write generated code and config
  const enrichedConfig = {
    schedule: "*/30 * * * * *",
    coinGeckoApiKey: process.env.COINGECKO_API_KEY ?? "",
    zaiApiKey: process.env.ZAI_API_KEY ?? "",
    ...opts.config,
  }
  await writeFile(join(CRE_WORKFLOW_DIR, "main.ts"), opts.code, "utf-8")
  await writeFile(
    join(CRE_WORKFLOW_DIR, "config.staging.json"),
    JSON.stringify(enrichedConfig, null, 2),
    "utf-8"
  )

  yield `[crett] Workflow written to crett-workflow/main.ts\n`
  yield `[crett] Config written to crett-workflow/config.staging.json\n`
  yield `[crett] Running CRE simulation...\n`

  yield* spawnStream(
    CRE_BIN,
    [
      "workflow",
      "simulate",
      "./crett-workflow",
      "-T",
      "staging-settings",
      "--non-interactive",
      "--trigger-index",
      "0",
    ],
    { cwd: CRE_PROJECT_ROOT, env: spawnEnv }
  )

  yield `[crett] Simulation complete.\n`
}

async function* mockSimulate(): AsyncGenerator<string> {
  const steps = [
    "[cre] Initializing CRE workflow simulation (demo mode)...\n",
    "[cre] Loading workflow: main.ts\n",
    "[cre] Parsing configuration: staging-settings\n",
    "[cre] Trigger type: cron (*/30 * * * * *)\n",
    "[cre] ─────────────────────────────────────────\n",
    "[cre] Simulating trigger #0 execution...\n",
    "[cre] CRE Workflow Advisor: fetching market data...\n",
    "ETH: $2,845.32 (+1.24% 24h)\n",
    "BTC: $42,180.00 (-0.89% 24h)\n",
    "LINK: $18.92 (+2.31% 24h)\n",
    "Chainlink ETH/USD (Base Sepolia): $2,843.18\n",
    "[cre] Generating CRE workflow from current market conditions...\n",
    "[cre] Generated CRE Workflow (preview):\n",
    "[cre] import { CronCapability, HTTPClient, handler, Runner, consensusMedianAggregation,\n",
    "[cre]   ok, json, type Runtime } from \"@chainlink/cre-sdk\"\n",
    "[cre] import { z } from \"zod\"\n",
    "[cre] const configSchema = z.object({ schedule: z.string(), coinGeckoApiKey: z.string(),\n",
    "[cre]   linkAlertThreshold: z.number().default(20) })\n",
    "[cre] ...\n",
    "[cre] ─────────────────────────────────────────\n",
    "[cre] Simulation complete ✓\n",
  ]
  for (const step of steps) {
    await new Promise(r => setTimeout(r, 300))
    yield step
  }
}

export async function* deployWorkflow(opts: SimulateOptions): AsyncGenerator<string> {
  if (!(await isCREAvailable())) {
    yield* mockDeploy()
    return
  }

  const enrichedConfig = {
    schedule: "*/30 * * * * *",
    coinGeckoApiKey: process.env.COINGECKO_API_KEY ?? "",
    zaiApiKey: process.env.ZAI_API_KEY ?? "",
    ...opts.config,
  }
  await writeFile(join(CRE_WORKFLOW_DIR, "main.ts"), opts.code, "utf-8")
  await writeFile(
    join(CRE_WORKFLOW_DIR, "config.staging.json"),
    JSON.stringify(enrichedConfig, null, 2),
    "utf-8"
  )

  yield `[crett] Workflow written to crett-workflow/main.ts\n`
  yield `[crett] Deploying workflow...\n`

  yield* spawnStream(
    CRE_BIN,
    ["workflow", "deploy", "./crett-workflow", "-T", "staging-settings", "--non-interactive"],
    { cwd: CRE_PROJECT_ROOT, env: spawnEnv }
  )

  yield `[crett] Deployment complete.\n`
}

async function* mockDeploy(): AsyncGenerator<string> {
  const steps = [
    "[cre] Validating workflow for deployment...\n",
    "[cre] Connecting to Chainlink Runtime Environment...\n",
    "[cre] not authorized: CRE Early Access required\n",
  ]
  for (const step of steps) {
    await new Promise(r => setTimeout(r, 300))
    yield step
  }
  throw new Error("not authorized: CRE Early Access required")
}
