import { spawnSync } from 'node:child_process'
for (const example of [
  'components',
  'table-editing',
  'table-read-only',
  'analytics',
  'styles',
  'layout',
  'virtualization',
  'hydration',
  'accessor-profile',
  'editing-overhead',
]) {
  console.log(`Types: ${example}`)
  const result = spawnSync(
    'pnpm',
    ['exec', 'tsc', '--project', `examples/${example}/tsconfig.json`],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) process.exit(result.status ?? 1)
}
