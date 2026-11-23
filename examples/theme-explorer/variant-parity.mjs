import assert from 'node:assert/strict'
import { paintDelta, readVariantPaint } from './variant-paint.mjs'

const targets = [
  'button:not(:disabled)',
  'a[href]:not([aria-disabled="true"])',
  'summary',
  'input:not(:disabled, [type="hidden"], [type="file"])',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
  '[tabindex]:not([aria-disabled="true"], [data-disabled])',
  '.ui-check-control',
  '.ui-radio-control',
  '.ui-switch-control',
].join(', ')

function readTargets(sample, selectors) {
  const seen = new Set()
  return Array.from(sample.querySelectorAll(selectors)).flatMap(
    (target, index) => {
      if (!target.checkVisibility({ visibilityProperty: true })) return []
      const { width, height } = target.getBoundingClientRect()
      const pointer = width > 2 && height > 2
      const focus = target.matches(
        'button, a[href], summary, input, textarea, select, [tabindex]',
      )
      if (!pointer && !focus) return []
      // A calendar repeats the same day button for each date. Exercise each
      // distinct kind, plus every navigation button.
      if (target.closest('[role="gridcell"]')) {
        const key = [...target.attributes]
          .filter(({ name }) => name.startsWith('data-') || name === 'tabindex')
          .map(({ name }) => name)
          .join(' ')
        if (seen.has(key)) return []
        seen.add(key)
      }
      return [
        { index, focus, pointer, name: target.className || target.tagName },
      ]
    },
  )
}

export async function checkVariantParity(page, url) {
  const problems = []
  let comparisons = 0
  await page.setViewportSize({ width: 1600, height: 1000 })
  for (const mode of ['light', 'dark']) {
    await page.goto(new URL(`?variants&mode=${mode}`, url).href)
    await page.locator('[data-variants-ready]').waitFor({
      state: 'attached',
      timeout: 45_000,
    })
    await page.addStyleTag({
      content: `
        [data-variants-page] *, [data-variants-page] *::before, [data-variants-page] *::after {
          transition: none;
          animation: none;
        }
        [data-variant-row]:not([data-audit-row]) { display: none; }
      `,
    })
    const rows = await page
      .locator('[data-variant-row]')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) =>
            node.dataset.variantStates.split(' ').includes('hover'),
          )
          .map((node) => node.dataset.variantRow),
      )
    for (const preset of ['default', 'vanilla', 'laser']) {
      for (const row of rows) {
        await page.evaluate((name) => {
          document
            .querySelector('[data-audit-row]')
            ?.removeAttribute('data-audit-row')
          document
            .querySelector(`[data-variant-row="${name}"]`)
            .setAttribute('data-audit-row', '')
        }, row)
        const sample = (state) =>
          page.locator(
            `[data-preset="${preset}"][data-variant="${row}/${state}"]`,
          )
        const rest = sample('rest')
        for (const { index, focus, pointer, name } of await rest.evaluate(
          readTargets,
          targets,
        )) {
          const target = rest.locator(targets).nth(index)
          const compare = async (state) => {
            const actual = await target.evaluate(readVariantPaint)
            const forced = await sample(state)
              .locator(targets)
              .nth(index)
              .evaluate(readVariantPaint)
            const difference = paintDelta(actual, forced)
            comparisons++
            if (Object.keys(difference).length > 0)
              problems.push({
                mode,
                preset,
                row,
                name,
                index,
                state,
                difference,
              })
          }
          if (pointer) {
            const point = await target.evaluate((node) => {
              node.scrollIntoView({ block: 'center', inline: 'center' })
              const rect = node.getBoundingClientRect()
              const x = rect.left + rect.width / 2
              const y = rect.top + rect.height / 2
              return node.contains(document.elementFromPoint(x, y))
                ? { x, y }
                : null
            })
            assert.ok(
              point,
              `${mode}/${preset}/${row}: target ${index} missed hit testing`,
            )
            await page.mouse.move(point.x, point.y)
            await compare('hover')
            // Keep the specimen's value and open state stable during mouse down.
            await target.evaluate((node) => {
              const stop = (event) => {
                event.preventDefault()
                event.stopImmediatePropagation()
              }
              for (const type of ['pointerdown', 'mousedown', 'click'])
                node.addEventListener(type, stop, { capture: true, once: true })
            })
            await page.mouse.down()
            await compare('pressed')
            await page.mouse.up()
            await page.mouse.move(0, 0)
          }
          if (focus) {
            // Roving-focus widgets move focus programmatically after a key
            // press. Establish keyboard modality for each of their targets.
            await target.focus()
            await page.keyboard.press('Shift')
            assert.ok(
              await target.evaluate((node) => node.matches(':focus-visible')),
              `${mode}/${preset}/${row}: target ${index} missed keyboard focus`,
            )
            await compare('focus')
            await target.evaluate((node) => node.blur())
          }
        }
      }
    }
  }
  assert.deepEqual(
    problems.slice(0, 20),
    [],
    `${problems.length} forced paint mismatches in ${comparisons} comparisons`,
  )
  return comparisons
}
