import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'

const suffix = process.env.BENCH_DEVELOPMENT
  ? '-dev'
  : process.env.BENCH_DISTRIBUTION
    ? '-package'
    : ''
const directory = `.dist${suffix}`
const assets = fileURLToPath(new URL(`${directory}/`, import.meta.url))
const modules = JSON.parse(await readFile(assets + 'modules.json', 'utf8'))
const syncDirectory = process.env.BENCH_DISTRIBUTION
  ? '/packages/sync/dist/'
  : '/packages/sync/src/'
assert.ok(
  modules.some((id) => id.includes(syncDirectory)),
  `Missing sync modules from ${syncDirectory}`,
)
const report = { directory, cases: [], errors: [], warnings: [] }
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://sync.example')
    if (url.pathname === '/favicon.ico') {
      response.writeHead(204).end()
      return
    }
    response.setHeader(
      'Content-Type',
      url.pathname.endsWith('.js')
        ? 'text/javascript'
        : url.pathname.endsWith('.css')
          ? 'text/css'
          : 'text/html',
    )
    response.end(
      await readFile(
        assets + (url.pathname === '/' ? 'index.html' : url.pathname.slice(1)),
      ),
    )
  } catch (error) {
    response.writeHead(500).end(String(error))
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
page.setDefaultTimeout(120_000)
page.on('pageerror', (error) => report.errors.push(String(error)))
page.on('console', (message) => {
  if (
    ['error', 'warning'].includes(message.type()) &&
    !message.text().startsWith('[HOT_SCOPE_TIME]')
  )
    report.warnings.push(message.text())
})
async function run(name, fn) {
  await fn()
  report.cases.push(name)
  console.log('PASS', name)
}
const status = page.locator('[data-sync-status]')
const rows = page.locator('[data-sync-rows]')
const list = page.locator('[data-sync-list]')
const count = (locator, attribute) =>
  locator.evaluate((node, name) => Number(node.dataset[name]), attribute)
const tableRows = () =>
  page.evaluate(() => document.querySelectorAll('.sync-table tbody tr').length)
const listRows = () =>
  page.evaluate(() => document.querySelectorAll('.sync-list li').length)
async function expectShapes(size) {
  await expect(status).toHaveAttribute('data-sync-status', 'ready')
  await expect(rows).toHaveAttribute('data-sync-rows', String(size))
  await expect(list).toHaveAttribute('data-sync-list', String(size))
  assert.equal(await tableRows(), Math.min(size, 200))
  assert.equal(await listRows(), Math.min(size, 200))
}
const base =
  process.env.BENCH_URL ?? `http://127.0.0.1:${server.address().port}/`
let failure
try {
  await page.goto(base + '?qualification=1')
  await run('the first page fills both shapes at 10,000 rows', async () => {
    await expect(status).toHaveAttribute('data-sync-status', 'ready')
    await expectShapes(10_000)
    assert.equal(await count(rows, 'syncRows'), 10_000)
  })
  await run('a change on the server reaches both shapes', async () => {
    const before = await page
      .locator('[data-sync-current-at]')
      .getAttribute('data-sync-current-at')
    assert.ok(before, 'current as of is set after the list')
    await page.getByRole('button', { name: 'Change on the server' }).click()
    await expect(page.locator('[data-sync-served]')).toHaveAttribute(
      'data-sync-served',
      '1',
    )
    await expectShapes(10_010)
    const updated = await count(rows, 'syncUpdated')
    assert.ok(updated >= 60, `updated rows: ${updated}`)
    await expect(status).toHaveAttribute('data-sync-status', 'ready')
    await expect(page.locator('[data-sync-current-at]')).not.toHaveAttribute(
      'data-sync-current-at',
      before,
    )
  })
  await run('one batch of 100 changes reaches both shapes', async () => {
    const first = await page.locator('.sync-list li').first().textContent()
    await page.getByRole('button', { name: 'Apply 100 changes' }).click()
    await expect(page.locator('[data-sync-applied]')).toHaveAttribute(
      'data-sync-applied',
      '1',
    )
    await expectShapes(10_020)
    const updated = await count(rows, 'syncUpdated')
    assert.ok(updated >= 120, `updated rows: ${updated}`)
    assert.ok(typeof first === 'string')
  })
  await run(
    'ReadOnlyTable renders a window of virtual rows through its body slot',
    async () => {
      const frame = page.locator('[data-sync-virtual]')
      await expect(frame).toHaveAttribute('data-sync-virtual', '10020')
      const scroll = frame.locator('.table-scroll')
      const mounted = frame.locator('tr[data-row]')
      await expect(mounted.first()).toBeVisible()
      const before = await mounted.count()
      assert.ok(before > 0 && before < 100, `mounted rows: ${before}`)
      await expect(
        frame.getByRole('columnheader', { name: /Quantity/ }),
      ).toBeVisible()
      const first = await mounted.first().getAttribute('data-row')
      await scroll.evaluate((node) => {
        node.scrollTop = 5_000 * 32
      })
      await expect(mounted.first()).not.toHaveAttribute('data-row', first)
      const after = await mounted.count()
      assert.ok(after > 0 && after < 100, `mounted rows: ${after}`)
      const height = await scroll.evaluate((node) => node.scrollHeight)
      assert.ok(height >= 10_020 * 32, `scroll height: ${height}`)
      await scroll.evaluate((node) => {
        node.scrollTop = 0
      })
      await expect(mounted.first()).toHaveAttribute('data-row', first)
    },
  )
  const counts = page.locator('[data-sync-pending]')
  const nameField = page.getByLabel('Order name')
  const written = (name) =>
    page.locator('[data-sync-written]').filter({ hasText: name })
  async function add(name) {
    await nameField.fill(name)
    await page.getByRole('button', { name: 'Add row' }).click()
  }
  await run(
    'an online write shows at once and lands from the feed',
    async () => {
      await add('Online write')
      await expect(written('Online write')).toHaveCount(1)
      await expect(written('Online write')).toHaveAttribute(
        'data-sync-version',
        '1',
      )
      await expect(written('Online write')).toHaveAttribute(
        'data-sync-state',
        'sent',
      )
      await expect(counts).toHaveAttribute('data-sync-pending', '0')
      await expect(counts).not.toHaveAttribute('data-sync-last-sent', '')
      await expect(rows).toHaveAttribute('data-sync-rows', '10021')
    },
  )
  await run('an offline write waits, and the reconnect sends it', async () => {
    await page.getByRole('button', { name: 'Offline' }).click()
    await add('Offline write')
    await expect(written('Offline write')).toHaveAttribute(
      'data-sync-state',
      'pending',
    )
    await expect(written('Offline write')).toContainText(
      'recorded, not uploaded',
    )
    await expect(counts).toHaveAttribute('data-sync-pending', '1')
    await page.waitForTimeout(500)
    await expect(counts).toHaveAttribute('data-sync-pending', '1')
    await expect(written('Offline write')).toHaveAttribute(
      'data-sync-version',
      '0',
    )
    await page.getByRole('button', { name: 'Offline' }).click()
    await expect(counts).toHaveAttribute('data-sync-pending', '0')
    await expect(written('Offline write')).toHaveAttribute(
      'data-sync-version',
      '1',
    )
    await expect(written('Offline write')).toHaveAttribute(
      'data-sync-state',
      'sent',
    )
  })
  await run(
    'a refusal reverts the row, and resubmit or discard clear it',
    async () => {
      const refusedList = page.locator('[data-sync-refused-seq]')
      await page.getByRole('button', { name: 'Refuse next send' }).click()
      await add('Refused write')
      await expect(counts).toHaveAttribute('data-sync-refused', '1')
      await expect(refusedList).toHaveCount(1)
      await expect(refusedList).toContainText('The server refused this write')
      await expect(
        page.locator('[data-sync-written]').filter({
          hasText: 'Not in the collection',
        }),
      ).toHaveCount(1)
      await refusedList.getByRole('button', { name: 'Resubmit' }).click()
      await expect(counts).toHaveAttribute('data-sync-refused', '0')
      await expect(refusedList).toHaveCount(0)
      await expect(written('Refused write')).toHaveAttribute(
        'data-sync-version',
        '1',
      )
      await page.getByRole('button', { name: 'Refuse next send' }).click()
      await add('Discarded write')
      await expect(counts).toHaveAttribute('data-sync-refused', '1')
      await refusedList.getByRole('button', { name: 'Discard' }).click()
      await expect(counts).toHaveAttribute('data-sync-refused', '0')
      await expect(refusedList).toHaveCount(0)
      await expect(counts).toHaveAttribute('data-sync-pending', '0')
      await expect(written('Discarded write')).toHaveCount(0)
      await expect(rows).toHaveAttribute('data-sync-rows', '10023')
    },
  )
  await run('both shapes render 100,000 rows and accept a batch', async () => {
    await page.getByRole('button', { name: '100,000 rows' }).click()
    // The fill of 100,000 rows and the table over them take several seconds
    // under load; the case checks the result, not the time.
    await expect(status).toHaveAttribute('data-sync-status', 'ready', {
      timeout: 30_000,
    })
    await expectShapes(100_000)
    await page.getByRole('button', { name: 'Apply 100 changes' }).click()
    await expectShapes(100_010)
    await page.screenshot({ path: '/tmp/wfe-sync-100k.png', fullPage: false })
  })
  await run('returning to 10,000 rows rebuilds both shapes', async () => {
    await page.getByRole('button', { name: '10,000 rows' }).click()
    await expectShapes(10_000)
  })
  await run('disposal empties the page', async () => {
    await page.evaluate(() => window.syncFixture.stop())
    await expect(page.locator('#root')).toBeEmpty()
  })
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
} catch (error) {
  report.failure = String(error)
  failure = error
} finally {
  try {
    await mkdir('test-results/sync', { recursive: true })
    await writeFile(
      process.env.BENCH_OUTPUT ?? `test-results/sync/${directory}.json`,
      JSON.stringify(report, null, 2),
    )
  } catch (error) {
    failure ??= error
    console.error('Sync diagnostics failed:', error)
  } finally {
    try {
      await browser.close()
    } catch (error) {
      failure ??= error
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  }
}
if (failure) throw failure
