import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { performance } from 'node:perf_hooks'
import { packages, root } from './packages.mjs'

const require = createRequire(import.meta.url)
const started = performance.now()
function run(label, args) {
  const start = performance.now()
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
  console.log(`${label}: ${((performance.now() - start) / 1000).toFixed(2)}s`)
}
run('Export inventory', ['tests/consumers/generate.mjs'])
for (const { name } of packages) {
  run(`TypeScript ${name}`, [
    require.resolve('typescript/bin/tsc'),
    '--project',
    `tests/consumers/${name}/tsconfig.json`,
  ])
}
run('Vite solid', ['tests/consumers/vite-solid/build.mjs'])
console.log(
  `Consumers passed in ${((performance.now() - started) / 1000).toFixed(2)}s`,
)
