import {
  attachDiagnostics,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  selectGroups,
} from './shared/browser/runner.mjs'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import { withArtifactRun } from '../scripts/artifacts.mjs'

await withArtifactRun(
  {
    suite: 'previews',
    mode: 'development',
    hydration: process.argv.includes('--hydration'),
  },
  async (artifacts) => {
    const output = artifacts.reportPath
    const report = { cases: [], errors: [], warnings: [], failedResponses: [] }
    const previews = []
    let browser
    try {
      report.groups = selectGroups({ 'preview-isolation': true })
      browser = await launchBrowser({ chromium })
      for (const [fixture, ready, query] of [
        ['components', 'consumerFixture', '?consumer=1'],
        ['analytics', 'analyticsFixture', ''],
        ['table-read-only', 'readOnlyFixture', ''],
        ['table-editing', 'editingFixture', ''],
      ]) {
        const server = await createServer({
          configFile: fileURLToPath(
            new URL(`./${fixture}/vite.config.ts`, import.meta.url),
          ),
          optimizeDeps: { force: true },
          server: { host: '127.0.0.1', port: 0, strictPort: true },
        })
        previews.push({ server, fixture, ready, query })
        assert.equal(
          new Set(previews.map(({ server }) => server.config.cacheDir)).size,
          previews.length,
          'Review examples must use separate dependency caches',
        )
        await server.listen()
        const preview = previews.at(-1)
        preview.url = `http://127.0.0.1:${server.httpServer.address().port}/${query}`
        preview.page = await browser.newPage()
        preview.detachDiagnostics = attachDiagnostics(preview.page, report)
        preview.onResponse = (response) => {
          if (response.status() >= 400)
            report.failedResponses.push({
              url: response.url(),
              status: response.status(),
            })
        }
        preview.page.on('response', preview.onResponse)
        // Warm each example serially, then reload all earlier examples.
        for (const active of previews) {
          await active.page.goto(active.url)
          await active.page.waitForFunction(
            (ready) => Boolean(window[ready]),
            active.ready,
          )
          if (active.fixture === 'components') {
            await active.page
              .getByRole('textbox', { name: 'Display name', exact: true })
              .fill('Preview record')
            assert.equal(
              (await active.page.evaluate(() => window.consumerFixture.read()))
                .name,
              'Preview record',
            )
          } else if (active.fixture === 'analytics') {
            await active.page.locator('tr[data-row]').first().waitFor()
          } else if (active.fixture === 'table-read-only') {
            await active.page
              .getByRole('button', { name: 'Sort by Amount', exact: true })
              .click()
            assert.deepEqual(
              await active.page
                .locator('tr[data-row]')
                .evaluateAll((rows) => rows.map((row) => row.dataset.row)),
              ['b', 'c', 'a'],
            )
          } else {
            assert.ok(
              (await active.page
                .getByRole('button', { name: /^Edit / })
                .count()) > 0,
            )
          }
          report.cases.push(
            `${active.fixture} works with ${previews.length} active previews`,
          )
        }
      }
      assert.deepEqual(report.errors, [])
      assert.deepEqual(report.warnings, [])
      assert.deepEqual(report.failedResponses, [])
    } catch (error) {
      report.failure = errorText(error)
      report.failureDetails = errorDetails(error)
    } finally {
      const failed = await finalizeReport({
        report,
        output,
        cleanup: [
          { name: 'browser', close: () => browser?.close() },
          ...previews.flatMap((preview) => [
            {
              name: `${preview.fixture} diagnostics`,
              close: () => preview.detachDiagnostics?.(),
            },
            {
              name: `${preview.fixture} response listener`,
              close: () => {
                if (preview.onResponse)
                  preview.page.off('response', preview.onResponse)
              },
            },
          ]),
          ...[...previews].reverse().map(({ server, fixture }) => ({
            name: `${fixture} Vite server`,
            close: () => server.close(),
          })),
        ],
      })
      if (failed) process.exitCode = 1
    }
  },
)
