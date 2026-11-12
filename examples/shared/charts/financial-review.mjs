import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

/** Shared by source, packaged, development, and server-adoption runners. */
export async function reviewFinancial(page, { hydration = false } = {}) {
  const root = page.locator('[data-financial-charts]')
  await expect(root).toBeVisible()
  const note = root.getByRole('textbox', { name: 'Retained financial note' })
  await note.fill('Compare October regional performance')
  await root.evaluate((node) => {
    node.financialReviewNodes = {
      note: node.querySelector('input'),
      svgs: [...node.querySelectorAll('svg.ts-chart')],
    }
  })
  if (hydration)
    assert.equal(
      await page.evaluate(
        () =>
          window.chartServerFinancialNodes?.length > 9 &&
          window.chartServerFinancialNodes.every((node) => node.isConnected) &&
          window.chartServerFinancialSvgNodes.every(
            (node, index) =>
              node ===
              document.querySelectorAll('[data-financial-charts] svg.ts-chart')[
                index
              ],
          ),
      ),
      true,
      'Financial charts and controls adopt server nodes',
    )
  const ids = [
    'candlestick',
    'ohlc',
    'dumbbell',
    'slope',
    'bubble',
    'multiple-North',
    'multiple-South',
    'multiple-East',
    'multiple-West',
  ]
  for (const id of ids) {
    const svg = root.locator(`[data-financial-panel="${id}"] svg.ts-chart`)
    await expect(svg).toBeVisible()
    await expect
      .poll(() =>
        root.evaluate(
          (node, id) => node.financialCharts?.scene(id)?.points.length ?? 0,
          id,
        ),
      )
      .toBeGreaterThan(0)
    await svg.scrollIntoViewIfNeeded()
    const position = await svg.evaluate((node, id) => {
      const scene = node
        .closest('[data-financial-charts]')
        .financialCharts.scene(id)
      const point = scene.points[0]
      const box = node.getBoundingClientRect()
      const x = box.x + (point.x / scene.width) * box.width
      const y = box.y + (point.y / scene.height) * box.height
      const paddingX = (4 / scene.width) * box.width
      const paddingY = (4 / scene.height) * box.height
      // Each recipe exposes its interactive endpoint as an SVG circle.
      // Match its center to the scene point instead of relying on DOM order.
      const mark = [...node.querySelectorAll('circle')]
        .map((circle) => circle.getBoundingClientRect())
        .find(
          (bounds) =>
            bounds.width > 0 &&
            bounds.height > 0 &&
            Math.abs(bounds.left + bounds.width / 2 - x) <= 1 &&
            Math.abs(bounds.top + bounds.height / 2 - y) <= 1,
        )
      return {
        x,
        y,
        protectedBounds: {
          left: Math.min(x - paddingX, mark?.left ?? x),
          right: Math.max(x + paddingX, mark?.right ?? x),
          top: Math.min(y - paddingY, mark?.top ?? y),
          bottom: Math.max(y + paddingY, mark?.bottom ?? y),
        },
      }
    }, id)
    await page.mouse.move(position.x, position.y)
    const detail = page.locator('.financial-detail')
    await expect(detail).toBeVisible()
    const shell = page
      .locator('[data-ui-chart-tooltip]')
      .filter({ has: detail })
    await expect
      .poll(
        () =>
          shell.evaluate((node, protectedBounds) => {
            const box = node.getBoundingClientRect()
            return {
              contained:
                box.width > 0 &&
                box.height > 0 &&
                box.left >= 0 &&
                box.top >= 0 &&
                box.right <= window.innerWidth &&
                box.bottom <= window.innerHeight,
              avoidsMark:
                box.right <= protectedBounds.left ||
                box.left >= protectedBounds.right ||
                box.bottom <= protectedBounds.top ||
                box.top >= protectedBounds.bottom,
            }
          }, position.protectedBounds),
        {
          message: `${id} tooltip stays in the viewport and avoids its referenced mark`,
        },
      )
      .toEqual({ contained: true, avoidsMark: true })
    await svg.focus()
    await svg.press('ArrowRight')
    await svg.press('Enter')
    await expect(root.locator('[data-financial-selection]')).toContainText(
      `${id}:`,
    )
    await expect(root.locator('[data-financial-selection]')).toContainText(
      'source',
    )
    await svg.press('Escape')
    assert.doesNotMatch(await svg.innerHTML(), /NaN|Infinity/)
    assert.equal(
      await svg.evaluate((node) => {
        const a = node.getBoundingClientRect()
        const b = node.closest('[data-financial-panel]').getBoundingClientRect()
        return a.width > 0 && a.left >= b.left - 1 && a.right <= b.right + 1
      }),
      true,
      'Financial SVG stays inside its panel',
    )
  }
  await root
    .getByRole('button', { name: 'Refresh financial data', exact: true })
    .click()
  await expect(root.getByLabel('Financial data revision')).toHaveText('1')
  await root.getByText('Accept financial changes', { exact: true }).click()
  await root
    .getByRole('button', { name: 'Refresh financial data', exact: true })
    .click()
  await expect(root.locator('[data-financial-request]')).toHaveText(
    'Requested financial revision 2',
  )
  await expect(root.getByLabel('Financial data revision')).toHaveText('1')
  await root.getByText('Accept financial changes', { exact: true }).click()
  await root
    .getByRole('button', { name: 'Reverse financial records', exact: true })
    .click()
  await expect(note).toHaveValue('Compare October regional performance')
  assert.equal(
    await root.evaluate(
      (node) =>
        node.financialReviewNodes.note === node.querySelector('input') &&
        node.financialReviewNodes.svgs.every(
          (svg, index) => svg === node.querySelectorAll('svg.ts-chart')[index],
        ),
    ),
    true,
    'Refresh and reorder retain SVG and input nodes',
  )
  await root
    .getByRole('button', { name: 'Toggle financial data', exact: true })
    .click()
  for (const id of ids)
    await expect
      .poll(() =>
        root.evaluate(
          (node, id) => node.financialCharts.scene(id).points.length,
          id,
        ),
      )
      .toBe(0)
  await root
    .getByRole('button', { name: 'Toggle financial data', exact: true })
    .click()
  for (const id of ids)
    await expect
      .poll(() =>
        root.evaluate(
          (node, id) => node.financialCharts.scene(id).points.length,
          id,
        ),
      )
      .toBeGreaterThan(0)
}
