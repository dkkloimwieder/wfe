import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { preview } from 'vite'
import { chromium, expect } from '@playwright/test'
import { choiceControl } from '../shared/controls/select-review.mjs'
import {
  attachDiagnostics,
  createRecorder,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  selectGroups,
} from '../shared/browser/runner.mjs'
import { withArtifactRun } from '../../scripts/artifacts.mjs'

const groups = [
  'surfaces',
  'text',
  'borders',
  'accent',
  'sizing',
  'radius',
  'shadows',
  'spacing',
]

await withArtifactRun({ suite: 'theme-explorer' }, async (artifacts) => {
  const report = { cases: [], errors: [], warnings: [] }
  let server, browser, page, detach
  try {
    report.groups = selectGroups({ 'theme-explorer': true })
    execFileSync(
      'pnpm',
      [
        'exec',
        'vite',
        'build',
        '--config',
        'examples/theme-explorer/vite.config.ts',
      ],
      { stdio: 'inherit' },
    )
    server = await preview({
      configFile: 'examples/theme-explorer/vite.config.ts',
      preview: { host: '127.0.0.1', port: 0 },
    })
    browser = await launchBrowser({
      chromium,
      launchOptions: { args: ['--no-sandbox'] },
    })
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
    })
    page = await context.newPage()
    detach = attachDiagnostics(page, report)
    const record = createRecorder(report)
    const root = page.locator('.ui-theme').first()
    const token = (name) => page.locator(`[data-token="${name}"]`)
    const rootValue = (name) =>
      root.evaluate(
        (node, name) => getComputedStyle(node).getPropertyValue(name).trim(),
        name,
      )
    const css = page.getByRole('textbox', {
      name: 'Changed tokens as CSS',
      exact: true,
    })
    async function choose(label, option) {
      await choiceControl(page, { name: label, exact: true }).click()
      await page.getByRole('option', { name: option, exact: true }).click()
    }

    await record('Explorer lists grouped tokens with live values', async () => {
      await page.goto(server.resolvedUrls.local[0])
      await expect(token('--ui-radius').locator('input')).not.toHaveValue('')
      // Each token group is a collapsible section titled by its summary.
      const listed = await page
        .getByRole('navigation', { name: 'Theme tokens' })
        .locator(':scope > .ui-collapsible > summary > span:first-of-type')
        .allTextContents()
      for (const group of groups) assert.ok(listed.includes(group), group)
      const mismatches = await page.evaluate(() => {
        const style = getComputedStyle(document.querySelector('.ui-theme'))
        return [...document.querySelectorAll('[data-token]')].flatMap(
          (field) => {
            const name = field.getAttribute('data-token')
            const shown = field.querySelector('input').value
            const actual = style.getPropertyValue(name).trim()
            return shown === actual ? [] : [{ name, shown, actual }]
          },
        )
      })
      assert.deepEqual(mismatches, [])
    })

    await record(
      'Editing a token applies live, exports CSS and resets',
      async () => {
        const field = token('--ui-radius')
        const input = field.locator('input')
        const original = await input.inputValue()
        const reset = field.getByRole('button', { name: 'Reset --ui-radius' })
        await expect(reset).toBeDisabled()
        await input.fill('7px')
        await expect.poll(() => rootValue('--ui-radius')).toBe('7px')
        const button = page
          .getByRole('group', { name: 'accent buttons' })
          .getByRole('button', { name: 'outline' })
        await expect
          .poll(() =>
            button.evaluate(
              (node) => getComputedStyle(node).borderTopLeftRadius,
            ),
          )
          .toBe('7px')
        await expect(css).toHaveValue(/--ui-radius: 7px;/)
        await expect(css).toHaveValue(/data-ui-preset='default'/)
        await page
          .getByRole('button', { name: 'Copy changes as CSS', exact: true })
          .click()
        await expect(page.locator('[data-copy-status]')).toHaveText(
          'Copied the changed tokens.',
        )
        assert.equal(
          await page.evaluate(() => navigator.clipboard.readText()),
          await css.inputValue(),
        )
        await reset.click()
        await expect.poll(() => rootValue('--ui-radius')).toBe(original)
        await expect(input).toHaveValue(original)
        await expect(css).toHaveValue('')
        await expect(reset).toBeDisabled()
      },
    )

    await record(
      'Preset switch replaces tokens and keeps edits per preset',
      async () => {
        await token('--ui-gap').locator('input').fill('13px')
        await expect.poll(() => rootValue('--ui-gap')).toBe('13px')
        await choose('Preset', 'Laser')
        await expect(root).toHaveAttribute('data-ui-preset', 'laser')
        await expect(page.locator('[data-token-panel]')).toHaveAttribute(
          'data-token-panel',
          'laser',
        )
        await expect.poll(() => rootValue('--ui-gap')).not.toBe('13px')
        await expect(css).toHaveValue('')
        // Each token names the tokens.css block that sets it.
        await expect(
          token('--ui-radius').locator('[data-token-source]'),
        ).toHaveText('Laser')
        await expect(
          token('--ui-font-size').locator('[data-token-source]'),
        ).toHaveText(/^Base/)
        const all = await page.locator('[data-token]').count()
        await page
          .getByText('Show only tokens that a block overrides', { exact: true })
          .click()
        await expect
          .poll(() => page.locator('[data-token]').count())
          .toBeLessThan(all)
        await expect(token('--ui-font-size')).toHaveCount(0)
        await expect(token('--ui-radius')).toHaveCount(1)
        await page
          .getByText('Show only tokens that a block overrides', { exact: true })
          .click()
        await expect.poll(() => page.locator('[data-token]').count()).toBe(all)
        await expect
          .poll(
            async () =>
              (await token('--ui-radius').locator('input').inputValue()) ===
              (await rootValue('--ui-radius')),
          )
          .toBe(true)
        await choose('Preset', 'Vanilla')
        await expect(root).toHaveAttribute('data-ui-preset', 'vanilla')
        await choose('Preset', 'Sketchy')
        await expect(root).toHaveAttribute('data-ui-preset', 'default')
        await expect.poll(() => rootValue('--ui-gap')).toBe('13px')
        await expect(css).toHaveValue(/--ui-gap: 13px;/)
        await page
          .getByRole('button', { name: 'Reset all', exact: true })
          .click()
        await expect(css).toHaveValue('')
        await expect.poll(() => rootValue('--ui-gap')).not.toBe('13px')
      },
    )

    await record(
      'Dialog and sheet stay in the theme and restore focus',
      async () => {
        for (const [trigger, title] of [
          ['Open dialog', 'Record information'],
          ['Open sheet', 'Display details'],
        ]) {
          const opener = page.getByRole('button', {
            name: trigger,
            exact: true,
          })
          await opener.click()
          const dialog = page.getByRole('dialog', { name: title })
          await expect(dialog).toBeVisible()
          assert.equal(
            await dialog.evaluate((node) =>
              Boolean(node.closest('.ui-theme[data-ui-preset="default"]')),
            ),
            true,
          )
          await page.keyboard.press('Escape')
          await expect(dialog).toBeHidden()
          await expect(opener).toBeFocused()
        }
      },
    )

    await record(
      'Disabled controls stay opaque so no layer shows through',
      async () => {
        // Element opacity would let the dotted backing behind a control show through.
        const opaque = (locator) =>
          locator.evaluate((node) => {
            const style = getComputedStyle(node)
            // rgba(r, g, b, a), rgb(r g b / a) and color(srgb r g b / a) carry alpha last.
            const color = style.backgroundColor
            const parts = color.slice(color.indexOf('(') + 1, -1)
            const alpha = parts.includes('/')
              ? parts.split('/')[1]
              : color.startsWith('rgba(')
                ? parts.split(',')[3]
                : '1'
            return { opacity: style.opacity, alpha: Number(alpha) }
          })
        for (const preset of ['Sketchy', 'Vanilla', 'Laser']) {
          await choose('Preset', preset)
          const field = token('--ui-radius')
          await field.locator('input').focus()
          await field.locator('input').hover()
          const reset = field.getByRole('button', { name: 'Reset --ui-radius' })
          await expect(reset).toBeDisabled()
          const tab = page.getByRole('tab', {
            name: 'Unavailable',
            exact: true,
          })
          for (const control of [reset, tab]) {
            const paint = await opaque(control)
            assert.equal(paint.opacity, '1', preset)
            // Laser glyph buttons have no box by design; boxed controls stay opaque.
            if (preset !== 'Laser') assert.equal(paint.alpha, 1, preset)
          }
        }
        await choose('Preset', 'Sketchy')
      },
    )

    await record('The token rail matches the table filter pane', async () => {
      for (const preset of ['Sketchy', 'Vanilla', 'Laser']) {
        await choose('Preset', preset)
        const rail = await page.evaluate(() => {
          const rail = document.querySelector('.ui-dashboard-navigation')
          const sections = [
            ...rail.querySelectorAll(':scope > .ui-collapsible'),
          ]
          const box = rail.getBoundingClientRect()
          const left = box.left + rail.clientLeft
          const top = box.top + rail.clientTop - rail.scrollTop
          const [first, second] = sections.map((section) =>
            section.getBoundingClientRect(),
          )
          const padding = (node) => getComputedStyle(node).padding
          return {
            sections: sections.length,
            left: first.left - left,
            right: left + rail.clientWidth - first.right,
            top: first.top - top,
            between: second.top - first.bottom,
            content: padding(
              sections[0].querySelector(':scope > .ui-collapsible-content'),
            ),
            filters: padding(
              document.querySelector(
                '.table-workspace-controls .ui-collapsible-content',
              ),
            ),
          }
        })
        const detail = `${preset} ${JSON.stringify(rail)}`
        assert.ok(rail.sections > 2, detail)
        // Sections touch the rail edges and each other, as filter sections do.
        for (const side of ['left', 'right', 'top', 'between'])
          assert.ok(Math.abs(rail[side]) < 0.5, `${side} ${detail}`)
        assert.equal(rail.content, rail.filters, detail)
      }
      await choose('Preset', 'Sketchy')
    })

    await record('Table and tabs respond inside the explorer', async () => {
      const table = page.getByRole('region', { name: 'Table' })
      await expect(
        table.getByRole('cell', { name: 'Sample record' }),
      ).toBeVisible()
      const notes = page.getByRole('tab', { name: 'Notes', exact: true })
      await notes.click()
      await expect(notes).toHaveAttribute('aria-selected', 'true')
    })

    await record('Phone width keeps the page inside the viewport', async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
        )
        .toBeLessThanOrEqual(0)
      assert.deepEqual(report.errors, [])
      assert.deepEqual(report.warnings, [])
    })
  } catch (error) {
    report.failure = errorText(error)
    report.failureDetails = errorDetails(error)
  } finally {
    const failed = await finalizeReport({
      report,
      output: artifacts.reportPath,
      cleanup: [
        { name: 'page', close: () => page?.context().close() },
        { name: 'diagnostic listeners', close: () => detach?.() },
        { name: 'browser', close: () => browser?.close() },
        {
          name: 'preview server',
          close: () =>
            server
              ? new Promise((resolve, reject) =>
                  server.httpServer.close((error) =>
                    error ? reject(error) : resolve(),
                  ),
                )
              : undefined,
        },
      ],
    })
    if (failed) process.exitCode = 1
  }
})
