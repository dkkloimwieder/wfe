import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export const timeSeriesViewLabels = [
  'Stacked columns',
  '100% stacked columns',
  'Grouped columns',
  'Stacked area',
  'Multi-series lines',
  'Columns and total line',
  'Latency percentile band',
  'Service/time heatmap',
  'Request-change waterfall',
  'Indexed service trends',
]
export async function chooseTimeSeriesView(page, label) {
  const root = page.locator('[data-time-series]')
  await root.getByRole('button', { name: /^Time-series view\b/ }).click()
  await page.getByRole('option', { name: label, exact: true }).click()
  await expect(
    root.getByRole('heading', { name: label, exact: true }),
  ).toBeVisible()
}
export async function reviewTimeSeries(page, { hydration = false } = {}) {
  const root = page.locator('[data-time-series]')
  const svg = root.locator('svg.ts-chart')
  await expect(svg).toBeVisible()
  const scene = () => root.evaluate((node) => node.timeSeries?.scene())
  await expect.poll(async () => (await scene())?.points.length ?? 0).toBe(90)
  if (hydration)
    assert.equal(
      await page.evaluate(
        () =>
          window.timeSeriesServerNodes?.length > 5 &&
          window.timeSeriesServerNodes.every((node) => node.isConnected) &&
          window.timeSeriesServerSvg ===
            document.querySelector('[data-time-series] svg.ts-chart'),
      ),
      true,
      'Time-series SVG and controls adopt their server nodes',
    )
  const note = root.getByRole('textbox', { name: 'Retained time-series note' })
  await note.fill('Keep time-series analysis')
  await root.evaluate((node) => {
    node.timeSeriesReview = {
      svg: node.querySelector('svg.ts-chart'),
      note: node.querySelector('input[aria-label="Retained time-series note"]'),
    }
  })
  const popup = page.locator('.time-series-popover:visible')
  async function pin({ last = false, pointer = false } = {}) {
    await expect
      .poll(async () => (await scene())?.points.length ?? 0)
      .toBeGreaterThan(0)
    await svg.scrollIntoViewIfNeeded()
    const point = await svg.evaluate((node, last) => {
      const scene = node.closest('[data-time-series]').timeSeries.scene()
      const point = scene.points.at(last ? -1 : 0)
      const box = node.getBoundingClientRect()
      return {
        x: box.x + (point.x / scene.width) * box.width,
        y: box.y + (point.y / scene.height) * box.height,
      }
    }, last)
    await page.mouse.move(point.x, point.y)
    await expect(popup).toBeVisible()
    if (pointer) await page.mouse.click(point.x, point.y)
    else {
      await svg.focus()
      await svg.press('ArrowRight')
      await svg.press('Enter')
    }
    await expect(
      popup.getByRole('textbox', { name: 'Bucket annotation' }),
    ).toBeVisible()
    await expect(
      popup.getByRole('heading', { name: 'Interval details' }),
    ).toBeVisible()
    const requests = await popup
      .locator('tbody tr')
      .evaluateAll((rows) =>
        rows.map((row) =>
          Number(row.children[1].textContent.replaceAll(',', '')),
        ),
      )
    const total = Number(
      (
        await popup.locator('[data-time-series-bucket-total]').innerText()
      ).replaceAll(',', ''),
    )
    expect(requests.reduce((a, b) => a + b, 0)).toBe(total)
    await expect
      .poll(
        () =>
          popup.evaluate((node) => {
            const box = node.getBoundingClientRect()
            return {
              left: box.left >= -1,
              right: box.right <= innerWidth + 1,
              top: box.top >= -1,
              bottom: box.bottom <= innerHeight + 1,
            }
          }),
        {
          message:
            'Pinned details fit inside the viewport after scheduled placement',
        },
      )
      .toEqual({ left: true, right: true, top: true, bottom: true })
    assert.doesNotMatch(await svg.innerHTML(), /NaN|Infinity/)
  }
  await pin()
  const annotation = popup.getByRole('textbox', { name: 'Bucket annotation' })
  await annotation.fill('Investigate this interval')
  await annotation.evaluate((node) => {
    window.timeSeriesAnnotation = node
  })
  await expect(annotation).toBeFocused()
  const before = await popup
    .locator('[data-time-series-bucket-total]')
    .innerText()
  await popup
    .getByRole('button', { name: 'Refresh interval details', exact: true })
    .click()
  await expect(root.getByLabel('Time-series revision')).toHaveText('1')
  await expect(annotation).toHaveValue('Investigate this interval')
  expect(
    await annotation.evaluate((node) => node === window.timeSeriesAnnotation),
  ).toBe(true)
  await expect(popup.locator('[data-time-series-bucket-total]')).not.toHaveText(
    before,
  )
  await popup
    .getByRole('button', { name: 'Inspect source records', exact: true })
    .click()
  await expect(root.locator('[data-time-series-inspected]')).toContainText(
    '72 hourly source records',
  )
  await expect(
    root.locator('[data-time-series-inspected] tbody tr'),
  ).toHaveCount(6)
  await annotation.press('Escape')
  await expect(popup).toBeHidden()
  await expect(svg).toBeFocused()
  await root.getByText('Accept time-series changes', { exact: true }).click()
  await root
    .getByRole('button', { name: 'Refresh time series', exact: true })
    .click()
  await expect(root.getByLabel('Time-series revision')).toHaveText('1')
  const legend = root.getByRole('group', {
    name: 'Visible services',
    exact: true,
  })
  await legend.getByRole('button', { name: 'API', exact: true }).click()
  await expect(
    legend.getByRole('button', { name: 'API', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await root.getByText('Accept time-series changes', { exact: true }).click()
  await legend.getByRole('button', { name: 'API', exact: true }).click()
  await expect.poll(async () => (await scene()).points.length).toBe(60)
  await legend.getByRole('button', { name: 'API', exact: true }).click()
  await expect.poll(async () => (await scene()).points.length).toBe(90)
  for (const label of timeSeriesViewLabels) {
    await chooseTimeSeriesView(page, label)
    await pin()
    if (label === 'Grouped columns') {
      const rectangles = await svg
        .locator('.ts-chart__rect rect')
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            width: Number(node.getAttribute('width')),
            height: Number(node.getAttribute('height')),
          })),
        )
      expect(rectangles).toHaveLength(90)
      expect(rectangles.every((box) => box.width > 0 && box.height > 0)).toBe(
        true,
      )
    }
    await expect(popup.locator('tbody tr')).toHaveCount(3)
    await popup
      .getByRole('button', { name: 'Close interval details', exact: true })
      .click()
    await expect(popup).toBeHidden()
    await expect(svg).toBeFocused()
  }
  const window = root.getByRole('group', { name: 'Time window', exact: true })
  await pin({ last: true, pointer: true })
  await popup
    .getByRole('textbox', { name: 'Bucket annotation' })
    .fill('Daily interval note')
  await popup
    .getByRole('button', { name: 'Close interval details', exact: true })
    .click()
  await window.getByRole('button', { name: '24 hours', exact: true }).click()
  await expect.poll(async () => (await scene()).points.length).toBe(72)
  await pin({ pointer: true })
  await expect(
    popup.getByRole('textbox', { name: 'Bucket annotation' }),
  ).toHaveValue('')
  await popup
    .getByRole('textbox', { name: 'Bucket annotation' })
    .fill('Hourly interval note')
  await popup
    .getByRole('button', { name: 'Close interval details', exact: true })
    .click()
  await window.getByRole('button', { name: '30 days', exact: true }).click()
  await expect.poll(async () => (await scene()).points.length).toBe(90)
  await pin({ last: true, pointer: true })
  await expect(
    popup.getByRole('textbox', { name: 'Bucket annotation' }),
  ).toHaveValue('Daily interval note')
  await popup
    .getByRole('button', { name: 'Close interval details', exact: true })
    .click()
  for (const [label, count] of [
    ['24 hours', 24],
    ['7 days', 28],
    ['30 days', 30],
  ]) {
    await window.getByRole('button', { name: label, exact: true }).click()
    await expect(root.getByLabel('Time bucket count')).toContainText(
      String(count),
    )
    await expect.poll(async () => (await scene()).points.length).toBe(count * 3)
  }
  await root.getByText('Simulate missing interval', { exact: true }).click()
  await expect(root.getByLabel('Time-series coverage')).toHaveText(
    '29/30 intervals',
  )
  await expect.poll(async () => (await scene()).points.length).toBe(87)
  const paths = await svg
    .locator('.ts-chart__line path')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('d')))
  expect(paths.join(' ').match(/M/g)?.length ?? 0).toBeGreaterThanOrEqual(6)
  await root.getByText('Simulate missing interval', { exact: true }).click()
  await root.getByText('Empty time series', { exact: true }).click()
  await expect(root.getByText('No request data', { exact: true })).toBeVisible()
  await expect.poll(async () => (await scene()).points.length).toBe(0)
  await root.getByText('Empty time series', { exact: true }).click()
  await expect.poll(async () => (await scene()).points.length).toBe(90)
  await chooseTimeSeriesView(page, 'Stacked columns')
  await expect(note).toHaveValue('Keep time-series analysis')
  expect(
    await root.evaluate(
      (node) =>
        node.timeSeriesReview.svg === node.querySelector('svg.ts-chart') &&
        node.timeSeriesReview.note ===
          node.querySelector('input[aria-label="Retained time-series note"]'),
    ),
  ).toBe(true)
  await root.getByText('View interval data table', { exact: true }).click()
  await expect(
    root
      .getByRole('table', {
        name: 'Time-series intervals and visible services',
      })
      .locator('tbody tr'),
  ).toHaveCount(30)
  const tableBounds = await root
    .locator('.ui-collapsible .time-series-table-scroll')
    .evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      parent: node.closest('[data-time-series]').getBoundingClientRect().width,
    }))
  expect(tableBounds.width).toBeLessThanOrEqual(tableBounds.parent + 1)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
}
