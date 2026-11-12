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
await withArtifactRun(
  { suite: 'tree-prototype', hydration: process.argv.includes('--hydration') },
  async (artifacts) => {
    const hydration = process.argv.includes('--hydration')
    const suffix = process.env.BENCH_DISTRIBUTION ? '-package' : ''
    const directory = `.dist${hydration ? '-hydration' : ''}${suffix}`
    const assets = fileURLToPath(new URL(`${directory}/`, import.meta.url))
    const report = { directory, hydration, cases: [], errors: [], warnings: [] }
    let browser, server, detach
    try {
      let render
      if (hydration) {
        buildHydrationPair('examples/tree-prototype/vite.hydration.config.ts')
        render = (
          await import(
            pathToFileURL(
              fileURLToPath(
                new URL(
                  `.dist-hydration-server${suffix}/server.js`,
                  import.meta.url,
                ),
              ),
            ).href
          )
        ).render
        const markup = await render()
        assert.match(markup, /role="tree"/)
        assert.match(markup, /aria-label="Projects"/)
        assert.match(markup, /aria-expanded="true"/)
        assert.match(markup, /aria-level="2"/)
        assert.equal((markup.match(/tabindex="0"/g) ?? []).length >= 1, true)
        report.cases.push(
          'server renders names, hierarchy and expansion before JavaScript',
        )
      }
      server = await startStaticServer({
        assets,
        renderIndex: render
          ? async () =>
              (await readFile(assets + 'hydration.html', 'utf8')).replace(
                '<div id="root"></div>',
                `<div id="root" data-ssr="true">${await render()}</div><script>window.serverTreeNodes=[...document.querySelectorAll('[role="treeitem"]')]</script>`,
              )
          : undefined,
      })
      browser = await launchBrowser({ chromium })
      if (hydration) {
        const noScript = await browser.newContext({ javaScriptEnabled: false })
        try {
          const serverPage = await noScript.newPage()
          await serverPage.goto(server.url)
          const serverTree = serverPage.getByRole('tree', { name: 'Files' })
          await expect(serverTree.getByRole('treeitem')).toHaveCount(6)
          await expect(serverTree.locator('[tabindex="0"]')).toHaveCount(1)
          await expect(
            serverTree.getByRole('treeitem', { name: 'Beta', exact: true }),
          ).toHaveAttribute('tabindex', '0')
          await expect(
            serverTree.getByRole('treeitem', { name: 'Projects', exact: true }),
          ).toHaveAttribute('aria-expanded', 'true')
          await expect(
            serverTree.getByRole('treeitem', { name: 'Alpha', exact: true }),
          ).toHaveAttribute('aria-level', '2')
          report.cases.push(
            'accessible server tree works before hydration with JavaScript disabled',
          )
        } finally {
          await noScript.close()
        }
      }
      const page = await browser.newPage({
        viewport: { width: 1100, height: 850 },
      })
      detach = attachDiagnostics(page, report, {
        console: ({ type, text }) =>
          ['error', 'warning'].includes(type) &&
          !text.startsWith('[HOT_SCOPE_TIME]')
            ? 'reject'
            : 'observe',
      })
      await page.goto(server.url)
      const item = (name) => page.getByRole('treeitem', { name, exact: true })
      const button = (name) => page.getByRole('button', { name, exact: true })
      const tree = page.getByRole('tree', { name: 'Files' })
      await expect(item('Beta')).toHaveAttribute('tabindex', '0')
      if (hydration) {
        expect(
          await page.evaluate(
            () =>
              window.serverTreeNodes.length === 6 &&
              window.serverTreeNodes.every((node) => node.isConnected),
          ),
        ).toBe(true)
        report.cases.push('hydration adopts all six original tree items')
      }
      await item('Projects').focus()
      await page.keyboard.press('ArrowRight')
      await expect(item('Alpha')).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(item('Alpha')).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('ArrowRight')
      await expect(item('Notes')).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(
        page.getByRole('status', { name: 'Selected IDs' }),
      ).toHaveText('notes')
      await page.keyboard.press('ArrowLeft')
      await expect(item('Alpha')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(item('Notes')).toHaveCount(0)
      report.cases.push(
        'hierarchy keyboard navigation separates selection and focus',
      )

      await page.getByText('Reject changes', { exact: true }).click()
      await item('Settings').focus()
      await page.keyboard.press('Enter')
      await expect(item('Settings')).toHaveAttribute('aria-selected', 'false')
      await item('Projects').focus()
      await page.keyboard.press('ArrowLeft')
      await expect(item('Projects')).toHaveAttribute('aria-expanded', 'true')
      await page.getByText('Reject changes', { exact: true }).click()
      await page.getByText('Multiple selection', { exact: true }).click()
      await item('Settings').focus()
      await page.keyboard.press('Space')
      await expect(item('Settings')).toHaveAttribute('aria-selected', 'true')
      await item('Archive').focus()
      await page.keyboard.press('Enter')
      await expect(item('Archive')).toHaveAttribute('aria-selected', 'false')
      const retained = await item('Projects').elementHandle()
      await button('Refresh records').click()
      expect(await retained.evaluate((node) => node.isConnected)).toBe(true)
      report.cases.push(
        'rejected changes, multiple selection, disabled items and retained records',
      )

      await item('Projects').focus()
      await page.keyboard.press('s')
      await expect(item('Shared files')).toBeFocused()
      await page.keyboard.press('s')
      await expect(item('Settings')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(button('After tree')).toBeFocused()
      await page.getByText('Right to left', { exact: true }).click()
      await item('Projects').focus()
      await page.keyboard.press('ArrowRight')
      await expect(item('Projects')).toHaveAttribute('aria-expanded', 'false')
      await page.keyboard.press('ArrowLeft')
      await expect(item('Projects')).toHaveAttribute('aria-expanded', 'true')
      await page.getByText('Right to left', { exact: true }).click()
      report.cases.push('type-ahead, one tab stop and right-to-left navigation')

      // Trigger an external collapse without moving focus to the toolbar.
      await item('Beta').focus()
      await button('Collapse all').evaluate((element) => element.click())
      await expect(item('Projects')).toBeFocused()
      await expect(tree.locator('[tabindex="0"]')).toHaveCount(1)
      await button('Empty tree').evaluate((element) => element.click())
      await expect(tree).toBeFocused()
      await expect(tree.getByRole('treeitem')).toHaveCount(0)
      await button('Reset tree').click()
      await expect(button('Reset tree')).toBeFocused()
      report.cases.push(
        'external collapse and removal recover focus without stealing it from outside',
      )

      for (const preset of ['default', 'vanilla', 'laser']) {
        await button(preset).click()
        for (const width of [1100, 390]) {
          await page.setViewportSize({ width, height: 850 })
          await item('Beta').focus()
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true)
          await page.screenshot({
            path: `/tmp/wfe-tree-${suffix || 'source'}-${preset}-${width}.png`,
            fullPage: true,
          })
          await button('Toggle dark mode').click()
        }
        report.cases.push(`${preset}: light wide and dark narrow layout`)
      }
      for (const preset of ['default', 'vanilla', 'laser']) {
        await button(preset).click()
        const single = page.locator('[aria-label="Single select"]')
        const multi = page.locator('[aria-label="Multiselect"]')
        await single.click()
        await page
          .getByRole('option', { name: 'Settings', exact: true })
          .click()
        await expect(single).toContainText('Settings')
        await single.click()
        await page.getByRole('option', { name: 'Beta', exact: true }).click()
        await multi.click()
        const settings = page.getByRole('option', {
          name: 'Settings',
          exact: true,
        })
        await settings.click()
        await expect(multi).toContainText('Settings')
        await expect(
          page.getByRole('option', { name: 'Alpha', exact: true }),
        ).toHaveAttribute('aria-selected', 'true')
        await settings.click()
        await expect(multi).not.toContainText('Settings')
        await page.keyboard.press('Escape')
        await expect(page.getByRole('listbox')).toHaveCount(0)
        report.cases.push(
          `${preset}: single and multiple choices retain selection and close`,
        )
      }
      await page.emulateMedia({ forcedColors: 'active' })
      await item('Beta').focus()
      await expect(item('Beta')).toBeFocused()
      report.cases.push('forced colors focus')
      await page.evaluate(() => {
        window.savedTreeNode = document.querySelector('[role="treeitem"]')
        window.stopTreeFixture()
      })
      await expect(page.locator('#root')).toBeEmpty()
      expect(await page.evaluate(() => !window.savedTreeNode.isConnected)).toBe(
        true,
      )
      report.cases.push('cleanup removes tree and pending ownership')
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
