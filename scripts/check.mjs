import { spawnSync } from 'node:child_process'
for (const script of [
  'format:check',
  'lint',
  'types',
  'test:integrity',
  'build',
  'types:examples',
  'test',
]) {
  console.log(`Check: ${script}`)
  const result = spawnSync('pnpm', [script], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
