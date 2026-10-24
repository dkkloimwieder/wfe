import {
  attachDiagnostics,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  selectGroups,
  startStaticServer,
  withCleanup,
} from '../shared/browser/runner.mjs'
import { reviewThemeHost } from '../shared/appearance/host-review.mjs'
import assert from 'node:assert/strict'
import { buildHydrationPair } from '../shared/browser/hydration-build.mjs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { withArtifactRun } from '../../scripts/artifacts.mjs'

await withArtifactRun(
  { suite: 'date-picker', hydration: true },
  async (artifacts) => {
    const suffix = process.env.BENCH_DEVELOPMENT
      ? '-dev'
      : process.env.BENCH_DISTRIBUTION
        ? '-package'
        : ''
    const root = new URL('.', import.meta.url)
    const assets = new URL(`.dist-hydration${suffix}/`, root)
    const output = artifacts.reportPath
    const report = { cases: [], errors: [], warnings: [], diagnostics: [] }
    let browser, html, server, detachDiagnostics

    try {
      report.groups = selectGroups({ 'date-picker-hydration': true })
      buildHydrationPair(
        fileURLToPath(new URL('vite.hydration.config.ts', root)),
      )
      const { render } = await import(
        new URL(`.dist-hydration-server${suffix}/server.js`, root)
      )
      const warn = console.warn
      let content
      try {
        console.warn = (...args) =>
          report.warnings.push(args.map(String).join(' '))
        content = await render()
      } finally {
        console.warn = warn
      }
      html = (
        await readFile(new URL('hydration.html', assets), 'utf8')
      ).replace('<!--ssr-->', content)
      if (!process.env.BENCH_URL)
        server = await startStaticServer({
          assets: fileURLToPath(assets),
          renderIndex: () => html,
          onServerError: (error) => {
            report.serverErrors ??= []
            report.serverErrors.push(error)
          },
        })
      const url = process.env.BENCH_URL ?? server.url + '/'
      browser = await launchBrowser({ chromium })
      const initialContext = await browser.newContext({
        javaScriptEnabled: false,
        timezoneId: 'Asia/Kathmandu',
      })
      await withCleanup(async () => {
        const initial = await initialContext.newPage()
        await initial.goto(url)
        await expect(
          initial.getByRole('textbox', { name: 'System date', exact: true }),
        ).toHaveValue('28/02/2024')
        await expect(
          initial.getByLabel('System time', { exact: true }),
        ).toHaveValue('21:15')
        await expect(
          initial.getByRole('textbox', { name: 'Browser date', exact: true }),
        ).toBeDisabled()
        await expect(
          initial.getByRole('textbox', { name: 'Browser date', exact: true }),
        ).toHaveValue('')
        await expect(
          initial.getByLabel('Browser time', { exact: true }),
        ).toHaveValue('')
        await expect(initial.locator('[data-date-display="date"]')).toHaveText(
          '29/02/2024',
        )
        await expect(
          initial.locator('[data-date-display="system"]'),
        ).toHaveText('28/02/2024 21:15')
        await reviewThemeHost(initial)
        await expect(
          initial.locator('[data-date-display="browser"]'),
        ).toHaveText('')
        await expect(
          initial.getByRole('button', {
            name: 'Abrir System date',
            exact: true,
          }),
        ).toBeVisible()
        report.cases.push(
          'Explicit timezone renders on the server and browser timezone stays pending',
        )
      }, [
        {
          name: 'server-only date context',
          close: () => initialContext.close(),
        },
      ])
      const context = await browser.newContext({ timezoneId: 'Asia/Kathmandu' })
      const page = await context.newPage()
      detachDiagnostics = attachDiagnostics(page, report)
      await page.goto(url)
      await expect(page.locator('html')).toHaveAttribute(
        'data-hydrated',
        'true',
      )
      await reviewThemeHost(page)
      await expect(
        page.getByRole('textbox', { name: 'System date', exact: true }),
      ).toHaveValue('28/02/2024')
      await expect(page.getByLabel('System time', { exact: true })).toHaveValue(
        '21:15',
      )
      await expect(
        page.getByRole('textbox', { name: 'Browser date', exact: true }),
      ).toHaveValue('29/02/2024')
      await expect(
        page.getByLabel('Browser time', { exact: true }),
      ).toHaveValue('08:00')
      await expect(page.locator('[data-date-display="date"]')).toHaveText(
        '29/02/2024',
      )
      await expect(page.locator('[data-date-display="system"]')).toHaveText(
        '28/02/2024 21:15',
      )
      await expect(page.locator('[data-date-display="browser"]')).toHaveText(
        '29/02/2024 08:00',
      )
      assert.equal(
        await page.evaluate(() =>
          window.dateServerNodes.every(
            (node) =>
              node.isConnected &&
              [
                ...document.querySelectorAll(
                  '#root input, #root [data-date-display]',
                ),
              ].includes(node),
          ),
        ),
        true,
      )
      assert.equal(
        (await page.evaluate(() => window.dateHydration.snapshot())).requests,
        0,
      )
      report.cases.push(
        'Hydration preserves server inputs and resolves browser timezone without requests',
      )
      await page
        .getByRole('button', { name: 'Abrir System date', exact: true })
        .click()
      const selectedDay = page.locator('[data-date="2024-02-28"]')
      await expect(selectedDay).toBeFocused()
      const dayLabel = await selectedDay.getAttribute('aria-label')
      await page
        .getByRole('button', { name: 'Use English messages', exact: true })
        .evaluate((node) => node.click())
      await expect(selectedDay).toBeFocused()
      assert.equal(await selectedDay.getAttribute('aria-label'), dayLabel)
      await expect(
        page.getByRole('button', { name: 'Next month', exact: true }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(
        page.getByRole('button', {
          name: 'Open System date calendar',
          exact: true,
        }),
      ).toBeFocused()
      assert.equal(
        (await page.evaluate(() => window.dateHydration.snapshot())).requests,
        0,
      )
      report.cases.push(
        'Translated server controls hydrate and change language without replacing focused calendar days',
      )
      await page.getByLabel('Browser time', { exact: true }).fill('09:00')
      assert.equal(
        (await page.evaluate(() => window.dateHydration.snapshot())).value,
        '2024-02-29T03:15:16.123Z',
      )
      await expect(page.getByLabel('System time', { exact: true })).toHaveValue(
        '22:15',
      )
      await expect(page.locator('[data-date-display="system"]')).toHaveText(
        '28/02/2024 22:15',
      )
      await expect(page.locator('[data-date-display="browser"]')).toHaveText(
        '29/02/2024 09:00',
      )
      report.cases.push(
        'Hydrated controls request one instant and update both timezone displays',
      )
      await page
        .getByRole('button', {
          name: 'Open Browser date calendar',
          exact: true,
        })
        .click()
      await page.evaluate(() => {
        window.dateHydration.stop()
        const node = window.dateServerNodes.find(
          (node) => node.id === 'browser-date-time',
        )
        node.value = '10:00'
        node.dispatchEvent(new Event('input', { bubbles: true }))
      })
      assert.equal(
        (await page.evaluate(() => window.dateHydration.snapshot())).requests,
        1,
      )
      assert.equal(await page.locator('.ui-date-popup').count(), 0)
      report.diagnostics = (
        await page.evaluate(() => window.dateHydration.diagnostics())
      ).filter((event) => event.code !== 'HOT_SCOPE_TIME')
      assert.deepEqual(report.diagnostics, [])
      assert.deepEqual(report.errors, [])
      assert.deepEqual(report.warnings, [])
      report.cases.push(
        'Hydrated disposal releases popup and retained input listeners',
      )
    } catch (error) {
      report.failure = errorText(error)
      report.failureDetails = errorDetails(error)
    } finally {
      const failed = await finalizeReport({
        report,
        output,
        cleanup: [
          { name: 'browser', close: () => browser?.close() },
          { name: 'diagnostic listeners', close: () => detachDiagnostics?.() },
          { name: 'static server', close: () => server?.close() },
        ],
      })
      if (failed) process.exitCode = 1
    }
  },
)
