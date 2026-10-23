import { spawnSync } from 'node:child_process'
for (const script of [
  'format:check',
  'lint',
  'test:integrity',
  'build',
  'types',
  'types:unit',
  'types:examples',
  'test:unit',
  'test',
]) {
  console.log(`Check: ${script}`)
  const result = spawnSync('pnpm', [script], {
    stdio: 'inherit',
    env:
      script === 'test:unit'
        ? { ...process.env, NODE_ENV: 'test' }
        : process.env,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
