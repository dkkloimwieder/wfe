import { execFileSync } from 'node:child_process'

/** These fixtures use the same server-first HYDRATION_SERVER Vite contract. */
export function buildHydrationPair(config) {
  for (const server of [true, false])
    execFileSync('pnpm', ['exec', 'vite', 'build', '--config', config], {
      stdio: 'inherit',
      env: { ...process.env, HYDRATION_SERVER: server ? '1' : '' },
    })
}
