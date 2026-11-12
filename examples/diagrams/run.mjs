import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { withArtifactRun } from '../../scripts/artifacts.mjs'
import { buildHydrationPair } from '../shared/browser/hydration-build.mjs'
import {
  attachDiagnostics,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  startStaticServer,
} from '../shared/browser/runner.mjs'
import { reviewDiagram } from '../shared/diagrams/review.mjs'
await withArtifactRun(
  { suite: 'diagrams', hydration: process.argv.includes('--hydration') },
  async (artifacts) => {
    const hydration = process.argv.includes('--hydration')
    const suffix = process.env.BENCH_DEVELOPMENT
      ? '-dev'
      : process.env.BENCH_DISTRIBUTION
        ? '-package'
        : ''
    const directory = `.dist${hydration ? '-hydration' : ''}${suffix}`
    const assets = fileURLToPath(new URL(`${directory}/`, import.meta.url))
    const report = { directory, hydration, cases: [], errors: [], warnings: [] }
    let browser, server, detach
    try {
      let render
      if (hydration) {
        buildHydrationPair('examples/diagrams/vite.hydration.config.ts')
        render = (
          await import(
            pathToFileURL(
              assets.replace(
                `.dist-hydration${suffix}/`,
                `.dist-hydration-server${suffix}/`,
              ) + 'server.js',
            ).href
          )
        ).render
      }
      server = await startStaticServer({
        assets,
        renderIndex: render
          ? async () =>
              (await readFile(assets + 'hydration.html', 'utf8')).replace(
                '<div id="root"></div>',
                `<div id="root" data-ssr="true">${await render()}</div><script>window.serverDiagramNodes=[...document.querySelectorAll('[data-diagram-node],[data-diagram-edge]')]</script>`,
              )
          : undefined,
      })
      browser = await launchBrowser({ chromium })
      const page = await browser.newPage({
        viewport: { width: 1200, height: 900 },
      })
      detach = attachDiagnostics(page, report, {
        console: ({ type, text }) =>
          ['error', 'warning'].includes(type) &&
          !text.startsWith('[HOT_SCOPE_TIME]')
            ? 'reject'
            : 'observe',
      })
      await page.goto(server.url)
      await expect(page.locator('[data-diagram-node]')).toHaveCount(9)
      if (hydration) {
        expect(
          await page.evaluate(
            () =>
              window.serverDiagramNodes.length === 16 &&
              window.serverDiagramNodes.every((n) => n.isConnected),
          ),
        ).toBe(true)
        report.cases.push('server markup and hydrated node identity')
      }
      for (const kind of ['workflow', 'erd']) {
        await reviewDiagram(page, kind)
        report.cases.push(
          `${kind}: inspection, accepted and rejected selection, retained state, keyboard, read-only navigation, narrow layout, empty data`,
        )
      }
      await page.emulateMedia({ forcedColors: 'active' })
      await page.locator('.ui-diagram-surface').first().focus()
      await expect(page.locator('.ui-diagram-surface').first()).toBeFocused()
      report.cases.push('forced colors and keyboard focus')
      await page.evaluate(() => {
        window.savedDiagramNode = document.querySelector('[data-diagram-node]')
        window.stopDiagramFixture()
      })
      await expect(page.locator('#root')).toBeEmpty()
      expect(
        await page.evaluate(() => !window.savedDiagramNode.isConnected),
      ).toBe(true)
      report.cases.push('disposal removes diagrams')
      assert.deepEqual(report.errors, [])
      assert.deepEqual(report.warnings, [])
    } catch (error) {
      report.failure = errorText(error)
      report.failureDetails = errorDetails(error)
    } finally {
      const failed = await finalizeReport({
        report,
        output: artifacts.reportPath,
        cleanup: [
          { name: 'browser', close: () => browser?.close() },
          { name: 'diagnostics', close: () => detach?.() },
          { name: 'server', close: () => server?.close() },
        ],
      })
      if (failed) process.exitCode = 1
    }
  },
)
