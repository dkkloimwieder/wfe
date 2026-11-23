import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
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
import { checkVariantParity } from './variant-parity.mjs'
import {
  measureVariants,
  variantStateGroups,
  writeVariantAudit,
} from './variant-audit.mjs'

const stateExceptions = [
  {
    name: 'Passive display samples',
    reason:
      'The breadcrumb link owns interactive paint. The breadcrumb container and other display roles show content.',
    matches: ({ role }) => role === 'display',
  },
  {
    name: 'Surface visibility',
    reason:
      'A surface mounts on open. Its trigger or nested control owns pointer, focus and selection paint.',
    matches: ({ role, state }) => role === 'surfaces' && state !== 'disabled',
  },
  {
    name: 'Closed disclosure',
    reason: 'The closed specimen repeats the resting state.',
    matches: ({ state }) => state === 'closed',
  },
  {
    name: 'Calendar range underlay',
    reason: 'The continuous fill shows which dates fall between the two ends.',
    matches: ({ role, row, state }) =>
      role === 'choices' &&
      state === 'selected' &&
      row.startsWith('range-calendar/'),
    ignore: ['background-image', 'background-size'],
  },
  {
    name: 'Select active descendant',
    reason:
      'Opening a list with a selected value also highlights its keyboard starting point.',
    matches: ({ role, row, state }) =>
      role === 'choices' && state === 'selected' && row.startsWith('select/'),
    ignore: [
      'outline-color',
      'outline-offset',
      'outline-style',
      'outline-width',
    ],
  },
  {
    name: 'Field adornments',
    reason: 'The field frame draws the focus ring for its inner actions.',
    matches: ({ role, state, fieldAdornment }) =>
      role === 'actions' && state === 'focus' && fieldAdornment,
  },
]

const roleStates = {
  actions: [
    'hover',
    'focus',
    'selected',
    'open',
    'disabled',
    'invalid',
    'read-only',
  ],
  fields: ['hover', 'focus', 'open', 'disabled', 'invalid', 'read-only'],
  choices: ['hover', 'focus', 'selected', 'open', 'disabled', 'read-only'],
  checks: ['hover', 'focus', 'selected', 'disabled', 'invalid', 'read-only'],
  surfaces: ['disabled'],
}

const groups = [
  'surfaces',
  'text',
  'borders',
  'colors',
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
          .getByRole('group', { name: 'primary buttons' })
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
        const padding = []
        for (const selector of [
          '.ui-dashboard-navigation',
          '.table-workspace-controls-body',
        ]) {
          const { gaps, content } = await page
            .locator(selector)
            .evaluate((rail) => {
              const sections = [
                ...rail.querySelectorAll(':scope > .ui-section'),
              ]
              const frame = rail.getBoundingClientRect()
              const left = frame.left + rail.clientLeft
              const right = left + rail.clientWidth
              let previousBottom = frame.top + rail.clientTop - rail.scrollTop
              const gaps = sections.map((section) => {
                const box = section.getBoundingClientRect()
                const gap = [
                  box.left - left,
                  right - box.right,
                  box.top - previousBottom,
                ]
                previousBottom = box.bottom
                return gap
              })
              return {
                gaps,
                content: getComputedStyle(
                  sections[0].querySelector(':scope > .ui-collapsible-content'),
                ).padding,
              }
            })
          const detail = `${preset} ${selector} ${JSON.stringify(gaps)}`
          assert.ok(gaps.length > 2, detail)
          assert.ok(
            gaps.flat().every((gap) => Math.abs(gap) < 0.5),
            detail,
          )
          padding.push(content)
        }
        assert.equal(padding[0], padding[1], preset)
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
            const problems = []
            for (const section of document.querySelectorAll('.ui-section')) {
              const name = section.querySelector('summary').textContent.trim()
              const face = getComputedStyle(section)
              if (getComputedStyle(section, '::before').content !== 'none')
                problems.push(`${name}: section has a decoration layer`)
              if (face.outlineStyle !== 'none' || face.borderStyle !== 'none')
                problems.push(`${name}: section has a frame`)
            }
            const header = document.querySelector('.table-workspace-header')
            header.scrollIntoView({ block: 'nearest' })
            const headers = [...header.querySelectorAll('.ui-button')]
            let decorated = 0
            for (const node of headers) {
              const layer = getComputedStyle(node, '::before')
              if (layer.content === 'none' || layer.position !== 'absolute')
                continue
              decorated++
              const name = `${node.className} ${node.textContent.trim().slice(0, 24)}`
              const box = node.getBoundingClientRect()
              const face = getComputedStyle(node)
              const inset = (side) =>
                parseFloat(layer[side]) +
                parseFloat(face.getPropertyValue(`border-${side}-width`))
              const ring = {
                left: box.left + inset('left'),
                top: box.top + inset('top'),
                right: box.right - inset('right'),
                bottom: box.bottom - inset('bottom'),
              }
              // The parent surface sits below the ring and the action face sits above it.
              if (getComputedStyle(node.parentElement).isolation !== 'isolate')
                problems.push(`${name}: no shared stacking context`)
              if (layer.pointerEvents !== 'none')
                problems.push(`${name}: decoration takes input`)
              // Use the transformed corners when the decoration tilts.
              if (layer.transform !== 'none') {
                const [originX, originY] = layer.transformOrigin
                  .split(' ')
                  .map(parseFloat)
                const matrix = new DOMMatrix(layer.transform)
                const width = ring.right - ring.left
                const height = ring.bottom - ring.top
                const corners = [
                  [0, 0],
                  [width, 0],
                  [0, height],
                  [width, height],
                ].map(([x, y]) =>
                  matrix.transformPoint({ x: x - originX, y: y - originY }),
                )
                const xs = corners.map(
                  ({ x, w }) => ring.left + originX + x / w,
                )
                const ys = corners.map(({ y, w }) => ring.top + originY + y / w)
                Object.assign(ring, {
                  left: Math.min(...xs),
                  right: Math.max(...xs),
                  top: Math.min(...ys),
                  bottom: Math.max(...ys),
                })
              }
              for (
                let parent = node.parentElement;
                parent && parent !== document.body;
                parent = parent.parentElement
              ) {
                const style = getComputedStyle(parent)
                const frame = parent.getBoundingClientRect()
                const left = frame.left + parent.clientLeft
                const right = left + parent.clientWidth
                const top = frame.top + parent.clientTop
                const bottom = top + parent.clientHeight
                const horizontal =
                  style.overflowX !== 'visible' &&
                  (ring.left < left - 0.5 || ring.right > right + 0.5)
                const vertical =
                  style.overflowY !== 'visible' &&
                  (ring.top < top - 0.5 || ring.bottom > bottom + 0.5)
                if (horizontal || vertical)
                  problems.push(
                    `${name}: clipped by ${parent.className} ${JSON.stringify({ ring, left, right, top, bottom })}`,
                  )
              }
              const middleX = (box.left + box.right) / 2
              const middleY = (box.top + box.bottom) / 2
              for (const [x, y] of [
                [box.left + 1, middleY],
                [box.right - 1, middleY],
                [middleX, box.top + 1],
              ]) {
                const hit = document.elementFromPoint(x, y)
                if (!hit || !(hit === node || node.contains(hit)))
                  problems.push(
                    `${name}: covered at ${Math.round(x)},${Math.round(y)} by ${hit?.className}`,
                  )
              }
            }
            return { decorated, headers: headers.length, problems }
          })
          assert.ok(report.headers > 0, preset)
          assert.equal(
            report.decorated,
            preset === 'Sketchy' ? report.headers : 0,
            preset,
          )
          assert.deepEqual(report.problems, [], preset)
          if (preset === 'Sketchy') {
            const toggle = page.getByRole('button', { name: 'Table controls' })
            await toggle.hover()
            await toggle.focus()
            await page.keyboard.press('Shift')
            await expect(toggle).toBeFocused()
            await expect(
              toggle.and(page.locator(':focus-visible')),
            ).toBeVisible()
            const header = page.locator('.table-workspace-header')
            const shown = await header.screenshot({ animations: 'disabled' })
            const hidden = await header.screenshot({
              animations: 'disabled',
              style:
                '.table-controls-toggle::before { visibility: hidden !important; }',
            })
            assert.ok(
              !shown.equals(hidden),
              'The hovered table control still has a ring with keyboard focus',
            )
          }
        }
        await choose('Preset', 'Sketchy')
      },
    )

    await record(
      'Sketchy sections keep the open indicator distinct from hover',
      async () => {
        const section = page
          .getByRole('navigation', { name: 'Theme tokens' })
          .locator(':scope > .ui-section')
          .first()
        const summary = section.locator('summary')
        const glyph = summary.locator('.ui-disclosure-decoration')
        const appearance = () =>
          glyph.evaluate((path) => {
            const style = getComputedStyle(path)
            const arrow = path.ownerSVGElement.querySelector(
              '.ui-disclosure-arrow',
            )
            return {
              opacity: style.opacity,
              arrow: getComputedStyle(arrow).visibility,
            }
          })
        if (await section.evaluate((node) => node.open)) await summary.click()
        await page.mouse.move(0, 0)
        const normal = await appearance()
        assert.deepEqual(normal, { opacity: '0', arrow: 'visible' })

        await summary.hover()
        assert.deepEqual(await appearance(), normal)

        await summary.click()
        await expect(section).toHaveAttribute('open', '')
        await page.mouse.move(0, 0)
        assert.deepEqual(await appearance(), {
          opacity: '1',
          arrow: 'hidden',
        })

        await summary.click()
        await expect(section).not.toHaveAttribute('open')
        await page.mouse.move(0, 0)
        assert.deepEqual(await appearance(), normal)
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

    await record('Variants use the gallery backing geometry', async () => {
      await page.setViewportSize({ width: 1600, height: 1000 })
      // The gallery allows up to 4.75 degrees before size reduction.
      const maxAngle = 4.75
      const targets = [
        ['button/text/default/outline', '.ui-button'],
        ['button/text/neutral/outline', '.ui-button'],
        ['button/text/primary/outline', '.ui-button'],
        ['button/icon/default/outline', '.ui-icon-button'],
        ['button/icon/neutral/outline', '.ui-icon-button'],
        ['button/icon/primary/outline', '.ui-icon-button'],
        ['input/text', '[data-ui-control-surface]'],
        ['number-input/default', '[data-ui-control-surface]'],
        ['textarea/default', '[data-ui-control-surface]'],
      ]
      const restingTarget = (preset, [row, selector]) =>
        page.locator(
          `[data-preset="${preset}"][data-variant="${row}/rest"] ${selector}`,
        )
      const readBacking = (node) => {
        const { content, transform } = getComputedStyle(node, '::before')
        const matrix = new DOMMatrix(
          transform === 'none' ? undefined : transform,
        )
        // The second column gives the planar rotation independently of taper.
        const angle = Math.atan2(-matrix.m21, matrix.m22) * (180 / Math.PI)
        return { content, transform, angle }
      }
      for (const mode of ['light', 'dark']) {
        await page.mouse.move(0, 0)
        await page.goto(
          new URL(`?variants&mode=${mode}`, server.resolvedUrls.local[0]).href,
        )
        await page.locator('[data-variants-ready]').waitFor({ timeout: 45_000 })
        await page.evaluate(() => document.fonts.ready)
        const angles = []
        for (const target of targets) {
          const { content, transform, angle } = await restingTarget(
            'default',
            target,
          ).evaluate(readBacking)
          const detail = `${mode} Sketchy ${target[0]}: ${transform} (${angle}deg)`
          assert.equal(content, '""', detail)
          assert.ok(Math.abs(angle) > 0 && Math.abs(angle) <= maxAngle, detail)
          angles.push(angle)
          for (const preset of ['vanilla', 'laser']) {
            const backing = await restingTarget(preset, target).evaluate(
              readBacking,
            )
            assert.equal(
              backing.content,
              'none',
              `${mode} ${preset} ${target[0]}`,
            )
            assert.equal(
              backing.transform,
              'none',
              `${mode} ${preset} ${target[0]}`,
            )
          }
        }
        assert.ok(new Set(angles).size > 1, `${mode} Sketchy resting angles`)

        const hoveredAngles = []
        for (const target of [targets[0], targets[3], targets[6]]) {
          const node = restingTarget('default', target)
          await node.hover()
          hoveredAngles.push((await node.evaluate(readBacking)).angle)
          await page.mouse.move(0, 0)
        }
        assert.notDeepEqual(
          hoveredAngles,
          [angles[0], angles[3], angles[6]],
          `${mode} Sketchy samples on hover`,
        )
      }
    })

    await record('Variants share visible state changes by role', async () => {
      await page.setViewportSize({ width: 1600, height: 1000 })
      const modes = await measureVariants(page, server.resolvedUrls.local[0])
      if (process.env.THEME_AUDIT_OUTPUT)
        await writeVariantAudit(
          process.env.THEME_AUDIT_OUTPUT,
          'matrix-after',
          modes,
          execFileSync('git', ['describe', '--always', '--dirty'], {
            encoding: 'utf8',
          }).trim(),
        )
      report.variantStateExceptions = stateExceptions.map(
        ({ name, reason }) => ({ name, reason }),
      )
      const groups = variantStateGroups(modes, stateExceptions)
      const problems = []
      for (const mode of Object.keys(modes)) {
        for (const preset of ['default', 'vanilla', 'laser']) {
          for (const [role, states] of Object.entries(roleStates)) {
            const group = (state) =>
              groups.get(`${mode}/${preset}/${role}/${state}`)
            for (const state of states) {
              const changes = group(state)
              if (
                !changes ||
                changes.size !== 1 ||
                changes.has('{}') ||
                (preset === 'default' &&
                  state === 'invalid' &&
                  [...changes.keys()].some((delta) => {
                    const paint = JSON.parse(delta)
                    return (
                      !paint['::before background-image']?.startsWith(
                        'radial-gradient(',
                      ) ||
                      !paint['::before border-top-color'] ||
                      paint['::before opacity'] !== '1'
                    )
                  }))
              )
                problems.push({
                  mode,
                  preset,
                  role,
                  state,
                  deltas: changes ? Object.fromEntries(changes) : {},
                })
            }
            for (const [first, second] of [
              ['hover', 'focus'],
              ['hover', 'selected'],
              ['focus', 'selected'],
            ]) {
              if (
                group(first) &&
                group(second) &&
                [...group(first).keys()].some((delta) =>
                  group(second).has(delta),
                )
              )
                problems.push({
                  mode,
                  preset,
                  role,
                  statesWithSamePaint: [first, second],
                })
            }
            if (states.includes('hover')) {
              const hover = group('hover')
              const pressed = group('pressed')
              if (
                !pressed ||
                !hover ||
                pressed.size !== hover.size ||
                [...pressed].some(
                  ([delta, controls]) =>
                    JSON.stringify(controls) !==
                    JSON.stringify(hover.get(delta)),
                )
              )
                problems.push({ mode, preset, role, state: 'pressed' })
            }
          }
        }
      }
      report.variantStateProblems = problems
      assert.equal(
        problems.length,
        0,
        'See variantStateProblems in the browser report',
      )
    })

    await record('Sketchy keeps the error backing when hovered', async () => {
      for (const mode of ['light', 'dark']) {
        await page.goto(
          new URL(`?variants&mode=${mode}`, server.resolvedUrls.local[0]).href,
        )
        await page.locator('[data-variants-ready]').waitFor({
          state: 'attached',
          timeout: 45_000,
        })
        await page.mouse.move(0, 0)
        const problems = await page.evaluate(() => {
          const failures = []
          for (const cell of document.querySelectorAll(
            '[data-preset="default"][data-variant-state="invalid"]',
          )) {
            const targets = cell.querySelectorAll(
              '[data-ui-control-surface]:not(:has(> .ui-slider-thumb)), .ui-slider-thumb, .ui-toggle-group .ui-button, .ui-file-actions > .ui-button',
            )
            if (!targets.length)
              failures.push(`${cell.dataset.variant}: no backing targets`)
            for (const target of targets) {
              const action = target.matches(
                '.ui-button:not([data-ui-control-surface])',
              )
              const probe = document.createElement('span')
              probe.style.color = action
                ? 'var(--ui-error)'
                : 'color-mix(in srgb, var(--ui-error) var(--ui-decoration-border-opacity, 100%), transparent)'
              probe.style.setProperty('--_ui-dots', 'var(--ui-error)')
              probe.style.backgroundImage = 'var(--ui-dot-pattern)'
              target.parentElement.append(probe)
              const expected = getComputedStyle(probe)
              for (const state of ['invalid', 'invalid and hovered']) {
                const backing = getComputedStyle(target, '::before')
                if (
                  backing.opacity !== '1' ||
                  backing.display === 'none' ||
                  backing.backgroundImage !== expected.backgroundImage ||
                  backing.borderTopColor !== expected.color
                )
                  failures.push(
                    `${cell.dataset.variant}: ${target.className} is ${state} (dots ${backing.backgroundImage}, border ${backing.borderTopColor}, opacity ${backing.opacity})`,
                  )
                for (
                  let node = target;
                  node !== cell;
                  node = node.parentElement
                )
                  node.toggleAttribute('data-force-hover', state === 'invalid')
              }
              probe.remove()
            }
          }
          return failures
        })
        assert.deepEqual(problems, [], mode)
      }
    })

    await record(
      'Variants draw one focus ring on the visible frame',
      async () => {
        const problems = []
        for (const mode of ['light', 'dark']) {
          await page.goto(
            new URL(
              `?variants&mode=${mode}&audit-all-focus`,
              server.resolvedUrls.local[0],
            ).href,
          )
          await page.locator('[data-variants-ready]').waitFor({
            state: 'attached',
            timeout: 45_000,
          })
          await page.mouse.move(0, 0)
          const result = await page.evaluate(() => {
            const compound =
              '.ui-input-affix, .ui-input-group, .filter-input, .choice-control'
            const nativeFrame =
              '.ui-control-frame:has(> :is(.ui-input, .ui-textarea, .ui-native-select, .choice-input))'
            const focusAttributes = [
              'data-force-focus-visible',
              'data-force-focus',
              'data-force-focus-within',
            ]
            const body = document.querySelector('.variants-grid > tbody')
            const rows = [...body.children].filter((row) =>
              row.dataset.variantStates.split(' ').includes('focus'),
            )
            const failures = []
            let targetsChecked = 0
            function readRings(nodes) {
              return nodes.map((node) => {
                const style = getComputedStyle(node)
                const outline =
                  style.outlineStyle !== 'none' &&
                  parseFloat(style.outlineWidth) > 0 &&
                  style.outlineColor !== 'rgba(0, 0, 0, 0)'
                    ? style.outline
                    : null
                const shadows = style.boxShadow
                  .split(/,(?![^()]*\))/)
                  .map((layer) => layer.trim())
                  .filter(
                    (layer) =>
                      layer !== 'none' && !layer.startsWith('rgba(0, 0, 0, 0)'),
                  )
                return { outline, shadows }
              })
            }
            for (const row of rows) {
              body.replaceChildren(row)
              for (const cell of row.querySelectorAll(
                '[data-variant-state="focus"]',
              )) {
                const targets = [
                  ...cell.querySelectorAll('[data-force-focus-visible]'),
                ]
                const descendants = [...cell.querySelectorAll('*')]
                for (const node of descendants)
                  for (const attribute of focusAttributes)
                    node.removeAttribute(attribute)
                const nodes = descendants.filter(
                  (node) =>
                    node.checkVisibility({
                      visibilityProperty: true,
                      opacityProperty: true,
                    }) &&
                    node.getBoundingClientRect().width > 2 &&
                    node.getBoundingClientRect().height > 2,
                )
                const resting = readRings(nodes)
                for (const target of targets) {
                  if (!target.checkVisibility({ visibilityProperty: true }))
                    continue
                  const ancestors = []
                  for (
                    let node = target;
                    node !== cell;
                    node = node.parentElement
                  )
                    ancestors.push(node)
                  target.setAttribute('data-force-focus-visible', '')
                  target.setAttribute('data-force-focus', '')
                  for (const node of ancestors)
                    node.setAttribute('data-force-focus-within', '')

                  const visibleFrame =
                    ancestors.findLast((node) => node.matches(compound)) ??
                    target.closest(nativeFrame) ??
                    (target.matches(
                      '.ui-file-picker, .ui-file-actions > button',
                    )
                      ? target.closest('.ui-file-input')
                      : null) ??
                    target
                      .closest('.ui-toggle, .ui-radio-item')
                      ?.querySelector(
                        '.ui-check-control, .ui-radio-control, .ui-switch-control',
                      )
                  const expected = visibleFrame ?? target
                  const frame = getComputedStyle(expected)
                  const radius = frame.borderRadius
                  const groupParts = expected.matches(
                    '.ui-input-group:not(.ui-input-affix)',
                  )
                    ? [...expected.children].filter((part) =>
                        part.checkVisibility({ visibilityProperty: true }),
                      )
                    : []
                  const groupCornersMatch =
                    groupParts.length < 2 ||
                    (frame.borderStartStartRadius ===
                      getComputedStyle(groupParts[0]).borderStartStartRadius &&
                      frame.borderStartEndRadius ===
                        getComputedStyle(groupParts.at(-1))
                          .borderStartEndRadius)
                  const rings = readRings(nodes).flatMap(
                    ({ outline, shadows }, index) =>
                      (outline && outline !== resting[index].outline) ||
                      shadows.some(
                        (shadow) => !resting[index].shadows.includes(shadow),
                      )
                        ? [nodes[index]]
                        : [],
                  )
                  targetsChecked++
                  if (
                    rings.length > 1 ||
                    (visibleFrame && rings[0] !== visibleFrame) ||
                    !groupCornersMatch ||
                    rings.some(
                      (node) => getComputedStyle(node).borderRadius !== radius,
                    )
                  )
                    failures.push({
                      preset: cell.dataset.preset,
                      cell: cell.dataset.variant,
                      target: target.className || target.localName,
                      expected: expected.className || expected.localName,
                      radius,
                      groupCornersMatch,
                      rings: rings.map((node) => ({
                        node: node.className || node.localName,
                        radius: getComputedStyle(node).borderRadius,
                      })),
                    })
                  for (const node of ancestors)
                    for (const attribute of focusAttributes)
                      node.removeAttribute(attribute)
                }
              }
            }
            return { targetsChecked, failures }
          })
          assert.ok(result.targetsChecked > 0, `${mode} focus targets`)
          problems.push(
            ...result.failures.map((failure) => ({ mode, ...failure })),
          )
        }
        report.variantFocusProblems = problems
        assert.deepEqual(
          problems.slice(0, 8),
          [],
          `${problems.length} focus problems`,
        )
      },
    )

    await record('Variants forced paint matches native input', async () => {
      report.variantParity = await checkVariantParity(
        page,
        server.resolvedUrls.local[0],
      )
      assert.equal(
        report.variantParity.problems.length,
        0,
        `Forced paint in ${report.variantParity.comparisons} native comparisons`,
      )
    })

    await record(
      'Variants compare every specimen in light and dark',
      async () => {
        const screenshots = new URL(
          '../../test-results/theme-cleanup/variants/',
          import.meta.url,
        )
        const presets = ['default', 'vanilla', 'laser']
        const requiredGroups = [
          'button',
          'toggle',
          'toggle-group',
          'icon',
          'input',
          'number-input',
          'textarea',
          'native-select',
          'select-field',
          'select',
          'combobox',
          'checkbox',
          'radio-group',
          'switch',
          'slider',
          'range-slider',
          'date-picker',
          'date-range-picker',
          'date-time-picker',
          'time-picker',
          'calendar',
          'range-calendar',
          'color-picker',
          'file-input',
          'popover',
          'tooltip',
          'dropdown-menu',
          'context-menu',
          'dialog',
          'sheet',
          'card',
          'field-group',
          'collapsible-section',
          'dashboard-panel',
          'badge',
          'tabs',
          'breadcrumbs',
          'drag-handle',
        ]
        const popupSelectors = {
          'select-field/popup': '[role="listbox"]',
          'select/single-popup': '[role="listbox"]',
          'select/multiple-popup': '[role="listbox"]',
          'combobox/single-popup': '[role="listbox"]',
          'combobox/multiple-popup': '[role="listbox"]',
          'date-picker/popup': '.ui-date-popup',
          'date-range-picker/popup': '.ui-date-popup',
          'date-time-picker/columns-popup': '.ui-date-popup',
          'date-time-picker/clock-popup': '.ui-date-popup',
          'time-picker/columns-popup': '.ui-time-popup',
          'time-picker/clock-popup': '.ui-time-popup',
          'color-picker/popup': '.ui-color-popup',
          'popover/surface': '.ui-popover',
          'tooltip/content': '.ui-tooltip',
          'dropdown-menu/content': '[role="menu"]',
          'context-menu/content': '[role="menu"]',
          'dialog/surface': '.ui-dialog-content',
          'sheet/surface': '.ui-sheet',
        }

        const ready = page.locator('[data-variants-ready]')
        const presetHeaders = page.locator('.variants-preset > .ui-theme')
        const headers = page
          .locator('.variants-grid > thead')
          .getByRole('columnheader', { name: /^(Sketchy|Vanilla|Laser)$/ })
        async function capture(name) {
          const path = fileURLToPath(new URL(`${name}.png`, screenshots))
          await page.screenshot({
            path,
            fullPage: true,
            animations: 'disabled',
            timeout: 90_000,
          })
          return path
        }

        async function checkLayout(width, mode) {
          await page.setViewportSize({ width, height: 1000 })
          const geometry = await page.evaluate(
            ({ presets, mode }) => {
              const viewport = document.documentElement.clientWidth
              const documentWidth = document.documentElement.scrollWidth
              const inside = (inner, outer) =>
                outer &&
                inner.width > 0 &&
                inner.left >= outer.left - 0.5 &&
                inner.right <= outer.right + 0.5
              const viewportBounds = { left: 0, right: viewport }
              const columns = [...document.querySelectorAll('.variants-column')]
              const headers = [
                ...document.querySelectorAll(
                  '.variants-preset[scope="col"] h2',
                ),
              ]
              const problems = []
              if (documentWidth !== viewport)
                problems.push(
                  `Document is ${documentWidth}px wide in a ${viewport}px viewport`,
                )
              const bounds = columns.map((column) =>
                column.getBoundingClientRect(),
              )
              if (bounds.length !== presets.length)
                return { problems: [`Found ${bounds.length} preset columns`] }
              const label = document.querySelector('.variants-labels')
              if (label.getBoundingClientRect().width * 2 >= bounds[0].width)
                problems.push('Row labels take up too much space')
              for (const [index, rect] of bounds.entries()) {
                if (!inside(rect, viewportBounds))
                  problems.push(
                    `Column ${index + 1} runs from ${rect.left}px to ${rect.right}px`,
                  )
                if (Math.abs(rect.width - bounds[0].width) > 0.5)
                  problems.push(`Column ${index + 1} is a different width`)
              }
              for (const [index, header] of headers.entries()) {
                const text = document.createRange()
                text.selectNodeContents(header)
                const rect = header.closest('th').getBoundingClientRect()
                const name = text.getBoundingClientRect()
                if (
                  !inside(rect, viewportBounds) ||
                  !inside(name, rect) ||
                  name.top < 0 ||
                  name.bottom > innerHeight ||
                  Math.abs(rect.left - bounds[index].left) > 0.5 ||
                  Math.abs(rect.right - bounds[index].right) > 0.5
                )
                  problems.push(
                    `${header.textContent.trim()} header is outside its column or viewport`,
                  )
              }
              const scrollers = []
              for (const cell of document.querySelectorAll('.variant-states')) {
                const td = cell.parentElement.getBoundingClientRect()
                const rect = cell.getBoundingClientRect()
                const samples = [...cell.querySelectorAll('.variant-sample')]
                const { preset, variant } = samples[0].dataset
                const index = presets.indexOf(preset)
                if (!inside(td, bounds[index]) || !inside(rect, td))
                  problems.push(
                    `${preset}/${variant}: cell is outside its column`,
                  )
                if (
                  cell.dataset.uiPreset !== preset ||
                  cell.dataset.uiMode !== mode
                )
                  problems.push(
                    `${preset}/${variant}: cell has the wrong appearance`,
                  )
                for (const sample of samples)
                  if (!inside(sample.getBoundingClientRect(), rect))
                    problems.push(
                      `${preset}/${sample.dataset.variant}: state slot is outside its cell`,
                    )
                if (cell.scrollWidth > cell.clientWidth) {
                  const row = variant.slice(0, variant.lastIndexOf('/'))
                  scrollers.push({ preset, row })
                  cell.scrollLeft = cell.scrollWidth - cell.clientWidth
                  if (
                    cell.scrollLeft <= 0 ||
                    getComputedStyle(cell).overflowX !== 'auto'
                  )
                    problems.push(
                      `${preset}/${row}: overflowing cell cannot scroll sideways`,
                    )
                  cell.scrollLeft = 0
                }
              }
              return { problems, scrollers }
            },
            { presets, mode },
          )
          assert.deepEqual(
            geometry.problems.slice(0, 15),
            [],
            `${mode} ${width}px layout`,
          )
          await expect(headers).toHaveText(['Sketchy', 'Vanilla', 'Laser'])
          await page.evaluate(() => window.scrollTo(0, 1000))
          assert.equal(await page.evaluate(() => window.scrollY), 1000)
          const headerRow = page.locator('.variants-grid > thead')
          assert.equal((await headerRow.boundingBox()).y, 0)
          for (const header of await headers.all())
            await expect(header).toBeInViewport({ ratio: 1 })
          await page.evaluate(() => window.scrollTo(0, 0))
          return geometry.scrollers
        }

        await page.setViewportSize({ width: 1600, height: 1000 })
        await page.goto(server.resolvedUrls.local[0])
        await page.getByRole('link', { name: 'Variants', exact: true }).click()
        await expect(ready).toHaveCount(1, { timeout: 45_000 })
        await expect(
          page.getByRole('link', { name: 'Theme explorer', exact: true }),
        ).toHaveAttribute('href', './')
        await page.mouse.move(0, 0)
        await mkdir(screenshots, { recursive: true })

        for (const mode of ['light', 'dark']) {
          if (mode === 'dark') {
            const toggle = page.getByRole('button', {
              name: 'Dark mode',
              exact: true,
            })
            await toggle.click()
            await expect(toggle).toHaveAttribute('aria-pressed', 'true')
            await expect(page).toHaveURL(/mode=dark/)
            await expect(
              page.locator('.variants-preset > [data-ui-mode=dark]'),
            ).toHaveCount(3)
            await page.reload()
            await expect(ready).toHaveCount(1, { timeout: 45_000 })
            await page.mouse.move(0, 0)
          }
          await page.evaluate(() => document.fonts.ready)
          const layout = {}
          for (const width of [1280, 1600]) {
            layout[width] = { scrollers: await checkLayout(width, mode) }
            if (width === 1280 && mode === 'light')
              layout[width].path = await capture('light-1280')
          }
          assert.deepEqual(
            await presetHeaders.evaluateAll((nodes) =>
              nodes.map((node) => node.dataset.uiPreset),
            ),
            presets,
          )
          for (const heading of await presetHeaders.all())
            await expect(heading).toHaveAttribute('data-ui-mode', mode)

          const result = await page.evaluate(
            ({ presets, popupSelectors }) => {
              const rows = [...document.querySelectorAll('[data-variant-row]')]
              const cells = [...document.querySelectorAll('.variant-sample')]
              const problems = []
              const visible = (node) => {
                if (!node?.checkVisibility({ visibilityProperty: true }))
                  return false
                const rect = node.getBoundingClientRect()
                return rect.width > 0 && rect.height > 0
              }
              const groups = new Set()
              let expectedCells = 0
              for (const row of rows) {
                const id = row.dataset.variantRow
                const states = row.dataset.variantStates.split(' ')
                const samples = new Map(
                  [...row.querySelectorAll('.variant-sample')].map((sample) => [
                    `${sample.dataset.preset}/${sample.dataset.variant}`,
                    sample,
                  ]),
                )
                groups.add(id.split('/')[0])
                expectedCells += states.length * presets.length
                const top = row.getBoundingClientRect().top
                for (const state of states) {
                  const name = `${id}/${state}`
                  for (const preset of presets) {
                    const cell = samples.get(`${preset}/${name}`)
                    const content = cell?.querySelector('.variant-content')
                    if (!visible(content)) {
                      problems.push(`${preset}/${name}: missing or hidden`)
                      continue
                    }
                    if (
                      Math.abs(
                        cell.parentElement.getBoundingClientRect().top - top,
                      ) > 0.5
                    )
                      problems.push(`${preset}/${name}: row misaligned`)
                    const forced = {
                      hover: '[data-force-hover]',
                      focus: '[data-force-focus-visible]',
                      pressed: '[data-force-active]',
                    }[state]
                    if (forced && !cell.querySelector(forced))
                      problems.push(`${preset}/${name}: state target missing`)
                    const selector = state === 'open' && popupSelectors[id]
                    if (selector && !visible(cell.querySelector(selector)))
                      problems.push(
                        `${preset}/${name}: open content missing from cell`,
                      )
                  }
                }
              }
              if (expectedCells !== cells.length)
                problems.push(
                  `Expected ${expectedCells} samples, found ${cells.length}`,
                )
              return {
                problems,
                groups: [...groups],
                rows: rows.length,
                cells: cells.length,
              }
            },
            { presets, popupSelectors },
          )
          assert.deepEqual(
            result.problems.slice(0, 15),
            [],
            `${mode}: ${result.problems.length} problems`,
          )
          for (const group of requiredGroups)
            assert.ok(result.groups.includes(group), group)

          const appearance = (preset, state) =>
            page
              .locator(
                `.variant-sample[data-preset="${preset}"][data-variant="button/text/primary/outline/${state}"] .ui-button`,
              )
              .evaluate((button) => {
                const style = getComputedStyle(button)
                const backing = getComputedStyle(button, '::before')
                return [
                  style.backgroundColor,
                  style.color,
                  style.borderColor,
                  style.boxShadow,
                  backing.opacity,
                ]
              })
          for (const preset of presets) {
            const outlineColor = (tone) =>
              page
                .locator(
                  `[data-preset="${preset}"][data-variant="button/text/${tone}/outline/rest"] .ui-button`,
                )
                .evaluate((node) => getComputedStyle(node).color)
            assert.equal(
              await outlineColor('default'),
              await outlineColor('neutral'),
              `${preset} ${mode} neutral default outline foreground`,
            )
            assert.notDeepEqual(
              await appearance(preset, 'hover'),
              await appearance(preset, 'rest'),
              `${preset} ${mode} forced hover`,
            )
            assert.deepEqual(
              await appearance(preset, 'pressed'),
              await appearance(preset, 'hover'),
              `${preset} ${mode} held button paint`,
            )
          }

          const insetStrength = await page
            .locator(
              '[data-preset="laser"][data-variant="button/text/primary/outline/hover"] .ui-button',
            )
            .evaluate((button) => {
              const style = getComputedStyle(button)
              const inset = style.boxShadow
                .split(/,(?![^()]*\))/)
                .find((layer) => layer.includes('inset'))
              const alpha = inset?.match(/\/\s*([\d.]+)\)/)?.[1]
              const opacity = style.getPropertyValue('--ui-laser-glow-opacity')
              return Number(alpha) / (parseFloat(opacity) / 100)
            })
          // The inset originally used 60% of the shared glow opacity.
          assert.ok(
            Math.abs(insetStrength - 0.6 / 2) < 0.000001,
            `Laser ${mode} inset opacity should be half its original strength, got ${insetStrength}`,
          )
          assert.deepEqual(report.errors, [])
          assert.deepEqual(report.warnings, [])
          report.variants ??= {}
          report.variants[mode] = {
            path: await capture(mode),
            rows: result.rows,
            cells: result.cells,
            layout,
          }
        }
      },
    )
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
