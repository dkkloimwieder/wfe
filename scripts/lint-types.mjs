import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const args = [
  '--type-aware',
  '--config',
  '.oxlintrc.types.json',
  ...process.argv.slice(2),
]
// Like types:examples, a fresh checkout can lint without an external WAMN
// checkout. Once prepared, both optional examples use their real input types.
if (!existsSync('examples/wamn/.input/runtime/index.ts')) {
  console.log(
    'Typed lint skips the optional WAMN examples until inputs are prepared.',
  )
  args.push(
    '--ignore-pattern',
    'examples/wamn/**',
    '--ignore-pattern',
    'examples/wamn-generator/**',
  )
}

const oxlint = fileURLToPath(
  new URL('../node_modules/oxlint/bin/oxlint', import.meta.url),
)
const result = spawnSync(process.execPath, [oxlint, ...args, '.'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    // Bound Go's heap and worker count when loading all example projects.
    GOMEMLIMIT: process.env.GOMEMLIMIT ?? '2GiB',
    GOMAXPROCS: process.env.GOMAXPROCS ?? '4',
  },
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
