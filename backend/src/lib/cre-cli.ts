import { spawn } from "child_process"
import { writeFile } from "fs/promises"
import { join } from "path"
import { createInterface } from "readline"

const CRE_PROJECT_ROOT = "/Users/harfi/Documents/Project/hackaton/chainlink/crett"
const CRE_WORKFLOW_DIR = join(CRE_PROJECT_ROOT, "crett-workflow")
const CRE_BIN = `${process.env.HOME}/.cre/bin/cre`

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
  // Write generated code and config
  await writeFile(join(CRE_WORKFLOW_DIR, "main.ts"), opts.code, "utf-8")
  await writeFile(
    join(CRE_WORKFLOW_DIR, "config.staging.json"),
    JSON.stringify(opts.config, null, 2),
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

export async function* deployWorkflow(opts: SimulateOptions): AsyncGenerator<string> {
  await writeFile(join(CRE_WORKFLOW_DIR, "main.ts"), opts.code, "utf-8")
  await writeFile(
    join(CRE_WORKFLOW_DIR, "config.staging.json"),
    JSON.stringify(opts.config, null, 2),
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
