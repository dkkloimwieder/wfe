import assert from 'node:assert/strict'
import {
  normalizeVariantBacking,
  paintDelta,
  readVariantPaint,
} from './variant-paint.mjs'

const targets = [
  'button:not(:disabled)',
  'a[href]:not([aria-disabled="true"])',
  'summary',
  'input:not(:disabled, [type="hidden"], [type="file"])',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
  '[tabindex]:not([aria-disabled="true"], [data-disabled])',
  '[role="option"]',
  '.ui-check-control',
  '.ui-radio-control',
  '.ui-switch-control',
].join(', ')

function readTargets(sample, selectors) {
  const seen = new Set()
  return Array.from(sample.querySelectorAll(selectors)).flatMap(
    (target, index) => {
      if (
        target.matches(':disabled, [aria-disabled="true"], [data-disabled]') ||
        !target.checkVisibility({ visibilityProperty: true })
      )
        return []
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
        {
          index,
          focus,
          pointer,
          pointerFocus: target.matches('.popup-option, .ui-menu-item'),
          name: target.className || target.tagName,
        },
      ]
    },
  )
}

function readProbe(target) {
  function paintSource(node, value) {
    const reference = /^url\(["']?#([^"')]+)["']?\)$/.exec(value)
    const pattern = reference && node.ownerDocument.getElementById(reference[1])
    if (!pattern || pattern.localName !== 'pattern') return value
    // Separate specimens get unique SVG IDs. Compare the referenced paint.
    const geometry = pattern.cloneNode(true)
    geometry.removeAttribute('id')
    return JSON.stringify([
      geometry.outerHTML,
      Array.from(pattern.children, (part) => {
        const style = getComputedStyle(part)
        return [
          style.fill,
          style.fillOpacity,
          style.stroke,
          style.strokeOpacity,
        ]
      }),
    ])
  }
  const nodes = [['control', target]]
  const frame = target.closest(
    '.ui-input-affix, .choice-control, .ui-control-frame, .ui-file-input',
  )
  if (frame && frame !== target) nodes.push(['frame', frame])
  const check = target
    .closest('.ui-toggle, .ui-radio-item')
    ?.querySelector('.ui-check-control, .ui-radio-control, .ui-switch-control')
  if (check && check !== target) nodes.push(['check', check])
  target
    .querySelectorAll(
      'svg, img, .ui-disclosure-arrow, .ui-disclosure-decoration',
    )
    .forEach((node, index) => {
      const owner = node.closest(
        'button, a[href], summary, [tabindex], [role="option"], [data-ui-action], .column-resize, .ui-menu-item, .ui-check-control, .ui-radio-control, .ui-switch-control',
      )
      if (owner === target || !target.contains(owner))
        nodes.push([`part ${index + 1}`, node])
    })
  return Object.fromEntries(
    nodes.flatMap(([label, node]) =>
      Object.entries(globalThis.readVariantPaint(node)).map(([name, value]) => [
        `${label} ${name}`,
        paintSource(node, value),
      ]),
    ),
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
    await normalizeVariantBacking(page)
    await page.addStyleTag({
      content: `
        [data-variants-page] *, [data-variants-page] *::before, [data-variants-page] *::after {
          transition: none;
          animation: none;
        }
      `,
    })
    await page.addScriptTag({
      content: `
        globalThis.readVariantPaint = ${readVariantPaint.toString()};
        globalThis.readVariantProbe = ${readProbe.toString()};
      `,
    })
    await page.evaluate(() => {
      const anchor = document.createElement('button')
      anchor.tabIndex = -1
      anchor.style.cssText =
        'position:fixed;top:0;left:0;width:4px;height:4px;opacity:0;z-index:10000'
      document.body.append(anchor)
    })
    const rows = await page.evaluate(() => {
      // Keep the original mounted controls and event handlers. Attaching one
      // row at a time keeps focus and hover from relaying out the whole page.
      const body = document.querySelector('.variants-grid > tbody')
      const entries = [...body.children]
        .filter((node) =>
          node.dataset.variantStates.split(' ').includes('hover'),
        )
        .map((node) => [node.dataset.variantRow, node])
      globalThis.variantParityRows = new Map(entries)
      body.replaceChildren()
      return [...globalThis.variantParityRows.keys()]
    })
    for (const preset of ['default', 'vanilla', 'laser']) {
      const previousProblemCount = problems.length
      for (const row of rows) {
        await page.evaluate((name) => {
          document
            .querySelector('.variants-grid > tbody')
            .replaceChildren(globalThis.variantParityRows.get(name))
        }, row)
        const sample = (state) =>
          page.locator(
            `[data-preset="${preset}"][data-variant="${row}/${state}"]`,
          )
        const rest = sample('rest')
        const rowTargets = await rest.evaluate(readTargets, targets)
        const forcedStates = await rest.evaluate(
          (rest, { selectors, indices }) =>
            Object.fromEntries(
              [
                ...rest.parentElement.querySelectorAll(
                  ':scope > .variant-sample:is([data-variant-state="hover"], [data-variant-state="focus"], [data-variant-state="pressed"])',
                ),
              ].map((sample) => {
                const nodes = sample.querySelectorAll(selectors)
                return [
                  sample.dataset.variantState,
                  Object.fromEntries(
                    indices.map((index) => [
                      index,
                      globalThis.readVariantProbe(nodes[index]),
                    ]),
                  ),
                ]
              }),
            ),
          { selectors: targets, indices: rowTargets.map(({ index }) => index) },
        )
        for (const {
          index,
          focus,
          pointer,
          pointerFocus,
          name,
        } of rowTargets) {
          const target = rest.locator(targets).nth(index)
          const compare = async (state) => {
            const actual = await target.evaluate(readProbe)
            const forced = forcedStates[state][index]
            const difference = paintDelta(actual, forced)
            comparisons++
            if (Object.keys(difference).length > 0) {
              const native = await target.evaluate((node) => ({
                hover: node.matches(':hover'),
                focusVisible: node.matches(':focus-visible'),
                active: node.matches(':active'),
                highlighted: node.hasAttribute('data-highlighted'),
              }))
              problems.push({
                mode,
                preset,
                row,
                name,
                index,
                state,
                native,
                difference,
              })
            }
          }
          if (pointer) {
            // A pointer move can give a menu option focus. Start in pointer
            // modality so an earlier keyboard probe cannot add a focus ring.
            if (pointerFocus) await page.mouse.click(2, 2)
            const point = await target.evaluate((node) => {
              const hit = () => {
                const rect = node.getBoundingClientRect()
                const x = rect.left + rect.width / 2
                const y = rect.top + rect.height / 2
                return node.contains(document.elementFromPoint(x, y))
                  ? { x, y }
                  : null
              }
              const current = hit()
              if (current) return current
              node.scrollIntoView({ block: 'center', inline: 'center' })
              return hit()
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
      console.log(
        `Variants parity ${mode}/${preset}: ${comparisons} comparisons, ${problems.length} differences so far`,
      )
      if (problems.length > previousProblemCount)
        console.log(
          problems.slice(previousProblemCount, previousProblemCount + 3),
        )
    }
  }
  return { comparisons, problems }
}
