import { spawnSync } from 'node:child_process'
import { runTsc } from '../../scripts/lib/tsc.mjs'
import { performance } from 'node:perf_hooks'
import { packages, root } from './packages.mjs'

const started = performance.now()
function run(label, command, args) {
  const start = performance.now()
  const result = command(args, {
    cwd: root,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
  console.log(`${label}: ${((performance.now() - start) / 1000).toFixed(2)}s`)
}
const runNode = (args, options) => spawnSync(process.execPath, args, options)
run('Export inventory', runNode, ['tests/consumers/generate.mjs'])
for (const { name } of packages) {
  run(`TypeScript ${name}`, runTsc, [
    '--project',
    `tests/consumers/${name}/tsconfig.json`,
  ])
}
run('Vite solid', runNode, ['tests/consumers/vite-solid/build.mjs'])
console.log(
  `Consumers passed in ${((performance.now() - started) / 1000).toFixed(2)}s`,
)
