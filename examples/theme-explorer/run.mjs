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
      // Each token group is a section titled by its summary label.
      const listed = await page
        .getByRole('navigation', { name: 'Theme tokens' })
        .locator(':scope > .ui-section .ui-section-label')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.firstChild?.textContent),
        )
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

    await record(
      'Section and table band decoration paints in view and on top',
      async () => {
        for (const preset of ['Sketchy', 'Vanilla', 'Laser']) {
          await choose('Preset', preset)
          await page.mouse.move(0, 0)
          const report = await page.evaluate(() => {
            const targets = [
              ...document.querySelectorAll(
                [
                  '.ui-dashboard-navigation > .ui-section',
                  '.table-workspace-controls .ui-section',
                  '.table-workspace-header .ui-button',
                ].join(', '),
              ),
            ]
            const problems = []
            let decorated = 0
            for (const node of targets) {
              const layer = getComputedStyle(node, '::before')
              if (layer.content === 'none' || layer.position !== 'absolute')
                continue
              decorated++
              const name = `${node.className} ${node.textContent.trim().slice(0, 24)}`
              const box = node.getBoundingClientRect()
              const inset = (side) => parseFloat(layer[side]) || 0
              const ring = {
                left: box.left + inset('left'),
                top: box.top + inset('top'),
                right: box.right - inset('right'),
                bottom: box.bottom - inset('bottom'),
              }
              // The layer paints above the action background and takes no input.
              if (getComputedStyle(node).zIndex === 'auto')
                problems.push(`${name}: no stacking context`)
              if (layer.pointerEvents !== 'none')
                problems.push(`${name}: decoration takes input`)
              // No clipping ancestor may cut the ring sideways. The nearest
              // scrolling ancestor must also hold it within its scroll height.
              let scroller = false
              for (
                let parent = node.parentElement;
                parent && parent !== document.body;
                parent = parent.parentElement
              ) {
                const style = getComputedStyle(parent)
                if (
                  style.overflowX === 'visible' &&
                  style.overflowY === 'visible'
                )
                  continue
                const frame = parent.getBoundingClientRect()
                const left = frame.left + parent.clientLeft
                const right = left + parent.clientWidth
                const top = frame.top + parent.clientTop - parent.scrollTop
                const bottom =
                  top + Math.max(parent.scrollHeight, parent.clientHeight)
                const vertical =
                  !scroller &&
                  (ring.top < top - 0.5 || ring.bottom > bottom + 0.5)
                if (
                  ring.left < left - 0.5 ||
                  ring.right > right + 0.5 ||
                  vertical
                )
                  problems.push(
                    `${name}: clipped by ${parent.className} ${JSON.stringify({ ring, left, right, top, bottom })}`,
                  )
                if (/auto|scroll/.test(style.overflowY)) scroller = true
              }
              // Points on the ring band belong to the action, not a neighbor.
              node.scrollIntoView({ block: 'nearest' })
              const now = node.getBoundingClientRect()
              const shift = { x: now.left - box.left, y: now.top - box.top }
              const middleX = (ring.left + ring.right) / 2 + shift.x
              const middleY = Math.min(
                (ring.top + ring.bottom) / 2 + shift.y,
                ring.top + shift.y + 12,
              )
              for (const [x, y] of [
                [ring.left + 3 + shift.x, middleY],
                [ring.right - 3 + shift.x, middleY],
                [middleX, ring.top + 3 + shift.y],
              ]) {
                const hit = document.elementFromPoint(x, y)
                if (!hit || !(hit === node || node.contains(hit)))
                  problems.push(
                    `${name}: covered at ${Math.round(x)},${Math.round(y)} by ${hit?.className}`,
                  )
              }
            }
            return { decorated, problems }
          })
          if (preset === 'Sketchy') assert.ok(report.decorated > 4, preset)
          assert.deepEqual(report.problems, [], preset)
        }
        await choose('Preset', 'Sketchy')
      },
    )

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
