import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { paintDelta, readVariantPaint } from './variant-paint.mjs'

const roles = {
  actions: [
    '.ui-button:is(button, a[href], [role="button"], [tabindex]):not(.popup-trigger, .ui-calendar td button, .ui-date-range-picker > .ui-button:first-child)',
    'summary',
    '.ui-dashboard-menu > a',
    '.choice-toggle',
    '.ui-context-trigger',
    '.ui-breadcrumbs-link',
    '[data-ui-action]',
  ],
  fields: [
    '.ui-input-affix:not(.ui-input-affix .ui-input-affix)',
    '.choice-control',
    '.ui-input-group',
    '.ui-control-frame:has(> :is(.ui-input, .ui-textarea, .ui-native-select, .choice-input)):not(.ui-input-affix *, .choice-control *)',
    '.popup-trigger:not(.ui-input-affix *, .choice-control *)',
    '.ui-date-range-picker > .ui-button:first-child',
    '.ui-file-input',
    '.ui-field-value',
    '.ui-input:not(.ui-control-frame *, .ui-input-affix *, .ui-input-group *, .choice-control *)',
    '.ui-textarea:not(.ui-control-frame *)',
    '.ui-native-select:not(.ui-control-frame *)',
  ],
  choices: [
    '.popup-option',
    '.ui-menu-item',
    '.ui-calendar td button',
    '.ui-tree-item',
  ],
  checks: [
    '.ui-check-control',
    '.ui-radio-control',
    '.ui-switch-control',
    '.ui-slider-thumb',
  ],
  surfaces: [
    '.ui-card',
    '.ui-field-group',
    '.ui-field-set',
    '.ui-dashboard-panel',
    '.ui-collapsible',
    '.ui-popover',
    '.ui-tooltip',
    '.ui-dialog-content',
    '.ui-sheet',
    '.ui-toast',
    '.ui-inline-alert',
    '.popup-content',
  ],
  display: [
    '.ui-badge',
    '.ui-breadcrumbs',
    '.ui-progress',
    '.ui-spinner',
    '.ui-skeleton',
    '.ui-status-tile',
    '[data-variant^="value-display/"] > .variant-content',
    '.ui-empty-state',
  ],
}

function collectSamples(roles) {
  const entries = []
  const seenStyles = new Map()
  const styles = []
  function styleId(node) {
    const paint = globalThis.readVariantPaint(node)
    const signature = JSON.stringify(paint)
    if (!seenStyles.has(signature)) {
      seenStyles.set(signature, styles.length)
      styles.push(paint)
    }
    return seenStyles.get(signature)
  }
  for (const sample of document.querySelectorAll('.variant-sample')) {
    const { preset, variantState: state, variant } = sample.dataset
    const row = variant.slice(0, variant.lastIndexOf('/'))
    for (const [role, selectors] of Object.entries(roles)) {
      const matches = sample.querySelectorAll(selectors.join(', '))
      for (const [index, node] of matches.entries()) {
        if (!node.checkVisibility({ visibilityProperty: true })) continue
        const component = [...node.classList].find((name) =>
          name.startsWith('ui-'),
        )
        entries.push({
          preset,
          role,
          row,
          state,
          index,
          component: component || node.getAttribute('role') || node.localName,
          label:
            node.getAttribute('aria-label') ||
            node.textContent.trim().replace(/\s+/g, ' ').slice(0, 70),
          baselineRow: sample.dataset.variantBaseline || row,
          style: styleId(node),
          selected:
            node.matches(
              '[data-selected], [data-checked], [aria-selected="true"], [aria-current="page"], [aria-pressed="true"], [aria-checked="true"], [data-ui-active="true"], details[data-ui-active="true"] > summary',
            ) && !node.matches('.ui-command-option'),
          disabled: node.matches(
            ':disabled, [aria-disabled="true"], [data-disabled], :has(:is(input, textarea, select):disabled)',
          ),
          invalid: node.matches(
            '[aria-invalid="true"], [data-invalid], .ui-toggle-group[data-invalid] *, :has([aria-invalid="true"])',
          ),
          readonly: node.matches(
            '[readonly], [data-readonly], [aria-readonly="true"], .ui-calendar[data-readonly] *, :has(:is(input, textarea)[readonly])',
          ),
          open: node.matches(
            '[open], [aria-expanded="true"], details[open] > summary, :has(> [aria-expanded="true"])',
          ),
          parts: Array.from(
            node.querySelectorAll(
              ':scope > svg, :scope > img, :scope > svg > .ui-disclosure-arrow, :scope > svg > .ui-disclosure-decoration, :scope > .ui-switch-thumb, :scope > .ui-check-mark',
            ),
            styleId,
          ),
        })
      }
    }
  }
  const rows = Array.from(
    document.querySelectorAll('[data-variant-row]'),
    ({ dataset }) => ({
      row: dataset.variantRow,
      states: dataset.variantStates.split(' '),
    }),
  )
  return { entries, styles, rows }
}

export async function measureVariants(page, url) {
  const modes = {}
  for (const mode of ['light', 'dark']) {
    await page.goto(new URL(`?variants&mode=${mode}`, url).href)
    await page.locator('[data-variants-ready]').waitFor({
      state: 'attached',
      timeout: 45_000,
    })
    await page.mouse.move(0, 0)
    await page.evaluate(() => document.fonts.ready)
    await page.addScriptTag({
      content: `globalThis.readVariantPaint = ${readVariantPaint.toString()}`,
    })
    const { entries, styles, rows } = await page.evaluate(collectSamples, roles)
    const keys = ({ preset, role, row, index, component }) =>
      [preset, role, row, index, component].join('/')
    const rest = new Map(
      entries
        .filter(({ state }) => state === 'rest')
        .map((entry) => [keys(entry), entry]),
    )
    const deltas = new Map()
    const values = []
    for (const entry of entries) {
      const baseline =
        rest.get(keys(entry)) ??
        rest.get(keys({ ...entry, row: entry.baselineRow }))
      entry.rest = baseline?.style ?? null
      if (baseline === undefined || entry.state === 'rest') continue
      const delta = paintDelta(styles[baseline.style], styles[entry.style])
      const signature = JSON.stringify(delta)
      if (!deltas.has(signature)) {
        deltas.set(signature, values.length)
        values.push(delta)
      }
      entry.delta = deltas.get(signature)
      entry.partDeltas = entry.parts.map((part, index) => {
        const previous = baseline.parts[index]
        return previous === undefined
          ? null
          : paintDelta(styles[previous], styles[part])
      })
    }
    modes[mode] = { entries, styles, deltas: values, rows }
  }
  return modes
}

export async function writeVariantAudit(output, name, modes, revision) {
  await mkdir(output, { recursive: true })
  await writeFile(
    join(output, `${name}.json`),
    JSON.stringify({ revision, modes }, null, 2) + '\n',
  )
  const lines = [
    `# Variants state matrix for ${revision}`,
    '',
    'Measurements use Chromium computed styles. Both values of each changed property are recorded in the accompanying JSON. A delta ID is local to a mode. “No rest” identifies an open-only or otherwise unmatched specimen.',
  ]
  const escape = (value) => value.replaceAll('|', '\\|')
  for (const preset of ['default', 'vanilla', 'laser']) {
    for (const role of Object.keys(roles)) {
      lines.push(
        '',
        `## ${preset} / ${role}`,
        '',
        '| Mode | State | Delta | Changed properties | Controls |',
        '| --- | --- | --- | --- | --- |',
      )
      for (const [mode, { entries, deltas }] of Object.entries(modes)) {
        const groups = new Map()
        for (const entry of entries) {
          if (
            entry.preset !== preset ||
            entry.role !== role ||
            entry.state === 'rest'
          )
            continue
          const key = `${entry.state}/${entry.delta ?? 'No rest'}`
          let group = groups.get(key)
          if (!group) {
            group = { entry, controls: new Set() }
            groups.set(key, group)
          }
          group.controls.add(
            `${entry.row} (${entry.component} #${entry.index + 1})`,
          )
        }
        for (const { entry, controls } of groups.values()) {
          const delta = deltas[entry.delta]
          const changes = delta ? Object.keys(delta).join(', ') || 'None' : '—'
          lines.push(
            `| ${mode} | ${entry.state} | ${entry.delta ?? 'No rest'} | ${changes} | ${escape([...controls].join(', '))} |`,
          )
        }
      }
    }
  }
  await writeFile(join(output, `${name}.md`), lines.join('\n') + '\n')
}

// Compare the added paint. Resting variants can have different colors and
// shadow stacks, including transparent placeholders for optional layers.
function visibleChange(rest, style, delta, ignore) {
  const result = {}
  for (const [key, [before, after]] of Object.entries(delta)) {
    if (ignore?.includes(key)) continue
    if (key.startsWith('::')) {
      const [layer, property] = key.split(' ')
      if (
        (!rest[`${layer} content`] ||
          rest[`${layer} opacity`] === '0' ||
          rest[`${layer} display`] === 'none') &&
        (!style[`${layer} content`] ||
          style[`${layer} opacity`] === '0' ||
          style[`${layer} display`] === 'none')
      )
        continue
      if (['color', 'fill', 'stroke'].includes(property)) continue
    }
    if (
      ['background-size', 'background-position', 'background-clip'].includes(
        key,
      ) &&
      rest['background-image'] === 'none' &&
      style['background-image'] === 'none'
    )
      continue
    if (
      key.startsWith('outline-') &&
      rest['outline-style'] === 'none' &&
      style['outline-style'] === 'none'
    )
      continue
    if (
      /^border-.+-color$/.test(key) &&
      rest[key.replace(/color$/, 'width')] === '0px' &&
      style[key.replace(/color$/, 'width')] === '0px'
    )
      continue
    if (key.startsWith('box-shadow')) {
      const layers = (value) =>
        (value || '')
          .split(/,(?![^()]*\))/)
          .map((layer) => layer.trim())
          .filter((layer) => layer && !layer.startsWith('rgba(0, 0, 0, 0)'))
      const previous = layers(before)
      const next = layers(after)
      const added = next.filter((layer) => !previous.includes(layer))
      const removed = previous.filter((layer) => !next.includes(layer))
      if (added.length || removed.length) result[key] = { added, removed }
      continue
    }
    if (key !== 'fill' && key !== 'stroke') result[key] = after
  }
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
    ),
  )
}

export function variantStateGroups(modes, exceptions = []) {
  const groups = new Map()
  for (const [mode, { entries, styles, deltas }] of Object.entries(modes)) {
    const baselines = new Map()
    const identity = ({ preset, role, row, index, component }) =>
      [preset, role, row, index, component].join('/')
    for (const entry of entries)
      if (entry.state === 'rest') baselines.set(identity(entry), entry)
    for (const entry of entries) {
      const { preset, role, state, row, index, component, delta } = entry
      if (delta === undefined) continue
      const baseline =
        baselines.get(identity(entry)) ??
        baselines.get(identity({ ...entry, row: entry.baselineRow }))
      if (['hover', 'focus', 'pressed'].includes(state) && baseline.disabled)
        continue
      if (
        ['selected', 'checked'].includes(state) &&
        (!entry.selected || baseline.selected)
      )
        continue
      if (state === 'disabled' && (!entry.disabled || baseline.disabled))
        continue
      if (state === 'invalid' && !entry.invalid) continue
      if (state === 'read-only' && !entry.readonly) continue
      if (state === 'open' && !entry.open) continue
      const stateName = state === 'checked' ? 'selected' : state
      const exception = exceptions.find(({ matches }) =>
        matches({ ...entry, state: stateName }),
      )
      if (exception && !exception.ignore) continue
      const key = `${mode}/${preset}/${role}/${stateName}`
      let changes = groups.get(key)
      if (!changes) {
        changes = new Map()
        groups.set(key, changes)
      }
      const signature = visibleChange(
        styles[baseline.style],
        styles[entry.style],
        deltas[delta],
        exception?.ignore,
      )
      let controls = changes.get(signature)
      if (!controls) {
        controls = []
        changes.set(signature, controls)
      }
      controls.push(`${row} (${component} #${index + 1})`)
    }
  }
  return groups
}
