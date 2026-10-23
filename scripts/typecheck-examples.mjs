import { spawnSync } from 'node:child_process'
import { examples } from './coverage-inventory.mjs'
for (const { id: example, types } of examples.filter(
  ({ status }) => status !== 'optional',
)) {
  console.log(`Types: ${example}`)
  const result = spawnSync('pnpm', ['exec', 'tsc', '--project', types], {
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
