import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { preview } from 'vite'
import { chromium } from '@playwright/test'
import { reviewTheme } from './review.mjs'

execFileSync(
  'pnpm',
  ['exec', 'vite', 'build', '--config', 'examples/theme/vite.config.ts'],
  { stdio: 'inherit' },
)
const server = await preview({
  configFile: 'examples/theme/vite.config.ts',
  preview: { host: '127.0.0.1', port: 0 },
})
let browser
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error')
      errors.push(message.text())
  })
  await page.goto(server.resolvedUrls.local[0])
  await reviewTheme(page)
  assert.deepEqual(errors, [])
  console.log('Public-only Theme consumer passed')
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
