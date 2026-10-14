import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { preview } from 'vite'

const server = await preview({
  configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url)),
  preview: { host: '127.0.0.1', port: 0 },
})
let browser
try {
  browser = await chromium.launch({
    executablePath: process.env.BENCH_EXECUTABLE_PATH,
  })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(server.resolvedUrls.local[0])
  const grid = page.getByRole('grid', { name: 'People' })
  await expect(grid).toBeVisible()
  await expect(grid).toHaveAttribute('aria-rowcount', '10001')
  const rows = grid.locator('.native-row[data-kind="row"]')
  await expect(rows.first()).toBeVisible()
  const initial = await rows.first().getAttribute('data-key')
  assert.ok((await rows.count()) < 100, 'only the viewport and buffer render')
  await grid.evaluate((element) => {
    element.scrollTop = 240000
  })
  await expect
    .poll(() => rows.first().getAttribute('data-key'))
    .not.toBe(initial)
  assert.ok((await rows.count()) < 100, 'scrolling keeps DOM rows bounded')
  await grid.evaluate((element) => {
    element.scrollTop = 0
  })
  await expect.poll(() => rows.first().getAttribute('data-key')).toBe(initial)
  const name = rows.first().locator('[data-column="name"]')
  await name.dblclick()
  const input = name.locator('input')
  await expect(input).toBeVisible()
  await input.fill('Migrated record')
  await page.getByRole('button', { name: 'Save edit', exact: true }).click()
  await expect(name).toHaveText('Migrated record')
  await page.getByRole('button', { name: 'Append record', exact: true }).click()
  await expect(grid).toHaveAttribute('aria-rowcount', '10002')
  assert.deepEqual(errors, [])
  console.log(
    'PASS measured virtualization, bounded DOM, scrolling, editing, and append',
  )
} finally {
  await browser?.close()
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  )
}
