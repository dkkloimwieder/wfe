import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

const families = {
  layers: ['layers'],
  data: ['histogram', 'groups', 'heatmap'],
  polar: ['pie', 'radar', 'radial-bars'],
}
export async function reviewChartGrammar(
  page,
  { family, hydration = false } = {},
) {
  const root = page.locator('[data-chart-grammar]')
  await expect(root).toBeVisible()
  const panels = family ? families[family] : Object.values(families).flat()
  const note = root.getByRole('textbox', { name: 'Retained chart note' })
  await note.fill('Retained chart analysis')
  await root.evaluate((node) => {
    node.reviewNodes = {
      note: node.querySelector('input[aria-label="Retained chart note"]'),
      svgs: [...node.querySelectorAll('svg.ts-chart')],
    }
  })
  if (hydration) {
    assert.equal(
      await page.evaluate(
        () =>
          window.chartServerGrammarNodes?.length > 7 &&
          window.chartServerGrammarNodes.every((node) => node.isConnected),
      ),
      true,
      'Grammar chart SVGs and controls adopt server nodes',
    )
    const snapshots = await page.evaluate(() =>
      window.chartServerGrammarSvgNodes.every(
        (node, index) =>
          node ===
          document.querySelectorAll('[data-chart-grammar] svg.ts-chart')[index],
      ),
    )
    assert.equal(
      snapshots,
      true,
      'Grammar SVG identity remains stable through attachment',
    )
  }
  const scene = (id) =>
    root.evaluate((node, id) => node.chartGrammar?.scene(id), id)
  for (const panel of panels) {
    const svg = root.locator(`[data-chart-panel="${panel}"] svg.ts-chart`)
    await expect(svg).toBeVisible()
    await expect
      .poll(async () => (await scene(panel))?.points.length ?? 0)
      .toBeGreaterThan(0)
    if (panel === 'radar')
      await expect(
        svg.locator('text').filter({ hasText: /^Latency$/ }),
      ).toHaveCount(1)
    if (panel === 'radar' || panel === 'radial-bars')
      assert.equal(
        await svg.evaluate((node) => {
          const host = node.getBoundingClientRect()
          return [...node.querySelectorAll('text')].every((label) => {
            const box = label.getBoundingClientRect()
            return (
              box.left >= host.left - 1 &&
              box.right <= host.right + 1 &&
              box.top >= host.top - 1 &&
              box.bottom <= host.bottom + 1
            )
          })
        }),
        true,
        'Polar labels remain inside the chart at the current width',
      )
    await svg.scrollIntoViewIfNeeded()
    const position = await svg.evaluate((svg, id) => {
      const snapshot = svg
        .closest('[data-chart-grammar]')
        .chartGrammar.scene(id)
      const point = snapshot.points[0]
      const box = svg.getBoundingClientRect()
      return {
        x: box.x + (point.x / snapshot.width) * box.width,
        y: box.y + (point.y / snapshot.height) * box.height,
      }
    }, panel)
    await page.mouse.move(position.x, position.y)
    await svg.focus()
    await svg.press('ArrowRight')
    await svg.press('Enter')
    await expect(root.locator('[data-chart-selection]')).toContainText(
      `${panel}:`,
    )
    await expect(root.locator('[data-chart-selection]')).toContainText('source')
    await svg.press('Escape')
    assert.doesNotMatch(await svg.innerHTML(), /NaN|Infinity/)
  }
  await root
    .getByRole('button', { name: 'Update chart data', exact: true })
    .click()
  await expect(root.getByLabel('Chart data revision')).toHaveText('1')
  await root.getByText('Accept chart changes', { exact: true }).click()
  await root
    .getByRole('button', { name: 'Update chart data', exact: true })
    .click()
  await expect(root.locator('[data-chart-request]')).toHaveText(
    'Requested data revision 2',
  )
  await expect(root.getByLabel('Chart data revision')).toHaveText('1')
  if (panels.includes('pie')) {
    const legend = root.getByRole('group', {
      name: 'Composition series',
      exact: true,
    })
    const item = legend.getByRole('button', { name: 'API', exact: true })
    await item.click()
    await expect(item).toHaveAttribute('aria-pressed', 'true')
    expect((await scene('pie')).points).toHaveLength(3)
  }
  await root.getByText('Accept chart changes', { exact: true }).click()
  if (panels.includes('layers')) {
    expect((await scene('layers')).points).toHaveLength(6)
    await root
      .getByText('Use raw pointer events when available', { exact: true })
      .click()
  }
  if (panels.includes('groups')) {
    const values = root.getByRole('group', { name: 'Bar values', exact: true })
    await values.getByRole('button', { name: 'Stacked', exact: true }).click()
    await expect(
      values.getByRole('button', { name: 'Stacked', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await values.getByRole('button', { name: 'Percent', exact: true }).click()
    await expect(
      values.getByRole('button', { name: 'Percent', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await root
      .getByRole('group', { name: 'Chart orientation' })
      .getByRole('button', { name: 'Horizontal charts', exact: true })
      .click()
    const legend = root.getByRole('group', {
      name: 'Workload series',
      exact: true,
    })
    await legend.getByRole('button', { name: 'API', exact: true }).click()
    await expect.poll(async () => (await scene('groups')).points.length).toBe(3)
    await legend.getByRole('button', { name: 'API', exact: true }).click()
    await expect.poll(async () => (await scene('groups')).points.length).toBe(6)
  }
  if (panels.includes('pie')) {
    const shape = root.getByRole('group', { name: 'Composition shape' })
    await shape.getByRole('button', { name: 'Pie', exact: true }).click()
    await expect(
      shape.getByRole('button', { name: 'Pie', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    const legend = root.getByRole('group', {
      name: 'Composition series',
      exact: true,
    })
    await legend.getByRole('button', { name: 'API', exact: true }).click()
    await expect.poll(async () => (await scene('pie')).points.length).toBe(2)
    await legend.getByRole('button', { name: 'API', exact: true }).click()
    await expect.poll(async () => (await scene('pie')).points.length).toBe(3)
    await root
      .getByRole('group', { name: 'Radial bar direction' })
      .getByRole('button', { name: 'Angle bars', exact: true })
      .click()
  }
  await root
    .getByRole('button', { name: 'Reverse chart records', exact: true })
    .click()
  await expect(note).toHaveValue('Retained chart analysis')
  assert.equal(
    await root.evaluate(
      (node) =>
        node.reviewNodes.note ===
          node.querySelector('input[aria-label="Retained chart note"]') &&
        node.reviewNodes.svgs.every(
          (svg, index) => svg === node.querySelectorAll('svg.ts-chart')[index],
        ),
    ),
    true,
    'Data and layout updates retain chart SVGs and note inputs',
  )
  await root
    .getByRole('button', { name: 'Toggle chart data', exact: true })
    .click()
  for (const panel of panels.filter((id) => id !== 'histogram'))
    await expect.poll(async () => (await scene(panel)).points.length).toBe(0)
  await root
    .getByRole('button', { name: 'Toggle chart data', exact: true })
    .click()
  for (const panel of panels) {
    await expect
      .poll(async () => (await scene(panel)).points.length)
      .toBeGreaterThan(0)
    const svg = root.locator(`[data-chart-panel="${panel}"] svg.ts-chart`)
    assert.doesNotMatch(await svg.innerHTML(), /NaN|Infinity/)
    const bounds = await svg.evaluate((svg) => {
      const box = svg.getBoundingClientRect()
      const host = svg.closest('[data-chart-panel]').getBoundingClientRect()
      return {
        visible: box.width > 0 && box.height > 0,
        contained: box.left >= host.left - 1 && box.right <= host.right + 1,
      }
    })
    assert.deepEqual(bounds, { visible: true, contained: true })
  }
}
