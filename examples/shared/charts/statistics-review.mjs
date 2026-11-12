import { expect } from '@playwright/test'
export async function reviewStatistics(page, { hydration = false } = {}) {
  const root = page.locator('[data-chart-statistics]')
  const chart = root.getByRole('img', {
    name: 'Statistical distributions',
    exact: true,
  })
  await expect(chart).toBeVisible()
  if (hydration)
    expect(
      await page.evaluate(
        () =>
          window.statisticsServerNodes?.length > 0 &&
          window.statisticsServerNodes.every((node) => node.isConnected) &&
          window.statisticsServerSvg ===
            document.querySelector('[data-chart-statistics] svg.ts-chart'),
      ),
    ).toBe(true)
  const note = root.getByRole('textbox', { name: 'Statistical analysis note' })
  await note.fill('Keep statistical analysis')
  await root
    .getByText('View statistical summary table', { exact: true })
    .click()
  await expect(
    root.getByRole('table', { name: 'Statistical sample summaries' }),
  ).toBeVisible()
  await expect(
    root.getByRole('row').filter({
      has: page.getByRole('rowheader', { name: 'API', exact: true }),
    }),
  ).toContainText('95')
  for (const label of [
    'Box summary',
    'Empirical CDF',
    'Histogram density',
    'Observed range and mean',
  ]) {
    await root.getByRole('button', { name: label, exact: true }).click()
    await expect(chart).toBeVisible()
    await chart.focus()
    await chart.press('ArrowRight')
    await chart.press('Enter')
    await expect(root.locator('[data-statistics-selection]')).toContainText(
      'source samples; first',
    )
    await expect(page.locator('[data-statistics-tooltip]')).toContainText('ms')
    await expect(note).toHaveValue('Keep statistical analysis')
    await chart.press('Escape')
    expect(
      await chart.evaluate((svg) => !/NaN|Infinity/.test(svg.innerHTML)),
    ).toBe(true)
  }
  const dot = chart.locator('circle').first()
  const detail = page.locator('[data-statistics-tooltip]')
  const shell = page.locator('[data-ui-chart-tooltip]').filter({ has: detail })
  async function assertOverlayGeometry() {
    const mark = await dot.elementHandle()
    expect(mark).not.toBeNull()
    await expect
      .poll(() =>
        shell.evaluate((overlay, circle) => {
          const box = overlay.getBoundingClientRect()
          const target = circle.getBoundingClientRect()
          const style = getComputedStyle(overlay)
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          const context = canvas.getContext('2d')
          context.clearRect(0, 0, 1, 1)
          context.fillStyle = style.backgroundColor
          context.fillRect(0, 0, 1, 1)
          const alpha = context.getImageData(0, 0, 1, 1).data[3]
          return {
            opaque: alpha === 255 && Number(style.opacity) === 1,
            contained:
              box.left >= -0.5 &&
              box.top >= -0.5 &&
              box.right <= window.innerWidth + 0.5 &&
              box.bottom <= window.innerHeight + 0.5,
            avoidsMark:
              box.right <= target.left ||
              box.left >= target.right ||
              box.bottom <= target.top ||
              box.top >= target.bottom,
          }
        }, mark),
      )
      .toEqual({ opaque: true, contained: true, avoidsMark: true })
  }
  await chart.scrollIntoViewIfNeeded()
  const bounds = await dot.boundingBox()
  expect(bounds).not.toBeNull()
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  )
  await expect(detail).toBeVisible()
  await expect(detail).toContainText('source samples')
  await assertOverlayGeometry()
  const sourceSamples = detail.getByText('Source samples', { exact: true })
  const sourceTable = detail.getByRole('table', { name: /source samples$/ })
  await expect(sourceTable).toBeHidden()
  await sourceSamples.click()
  await expect(sourceTable).toBeVisible()
  await expect(sourceTable.getByRole('row')).toHaveCount(13)
  await expect(
    sourceTable.getByRole('columnheader', { name: 'Latency (ms)' }),
  ).toBeVisible()
  await assertOverlayGeometry()
  const originalViewport = page.viewportSize()
  try {
    await page.setViewportSize({ width: 390, height: 1000 })
    await dot.scrollIntoViewIfNeeded()
    await expect(detail).toBeVisible()
    await expect(sourceTable).toBeVisible()
    await assertOverlayGeometry()
    await sourceSamples.click()
    await expect(sourceTable).toBeHidden()
    await assertOverlayGeometry()
    await sourceSamples.click()
    await expect(sourceTable).toBeVisible()
    await expect(sourceTable.getByRole('row')).toHaveCount(13)
    await assertOverlayGeometry()
  } finally {
    if (originalViewport) {
      await page.setViewportSize(originalViewport)
      await dot.scrollIntoViewIfNeeded()
    }
  }
  await assertOverlayGeometry()
  await chart.press('Escape')
  await root.getByRole('button', { name: 'Box summary', exact: true }).click()
  await chart.scrollIntoViewIfNeeded()
  const outlier = chart.locator('circle').first()
  const outlierBounds = await outlier.boundingBox()
  expect(outlierBounds).not.toBeNull()
  await page.mouse.click(
    outlierBounds.x + outlierBounds.width / 2,
    outlierBounds.y + outlierBounds.height / 2,
  )
  await expect(detail).toContainText('API:')
  const boxSourceTable = detail.getByRole('table', {
    name: 'API source samples',
  })
  if (!(await boxSourceTable.isVisible()))
    await detail.getByText('Source samples', { exact: true }).click()
  await expect(boxSourceTable).toBeVisible()
  await expect
    .poll(() =>
      shell.evaluate((overlay) => {
        const host = document.querySelector('[data-chart-statistics]')
        const scene = host.statistics.scene()
        const svg = host.querySelector('svg.ts-chart').getBoundingClientRect()
        const service = scene.points.filter(
          (point) => point.datum.group === 'API',
        )
        const left =
          svg.left +
          (Math.min(...service.map((point) => point.x)) * svg.width) /
            scene.width -
          4
        const right =
          svg.left +
          (Math.max(...service.map((point) => point.x)) * svg.width) /
            scene.width +
          4
        const top =
          svg.top +
          (Math.min(...service.map((point) => point.y)) * svg.height) /
            scene.height -
          4
        const bottom =
          svg.top +
          (Math.max(...service.map((point) => point.y)) * svg.height) /
            scene.height +
          4
        const box = overlay.getBoundingClientRect()
        return (
          service.length > 5 &&
          (box.right <= left ||
            box.left >= right ||
            box.bottom <= top ||
            box.top >= bottom)
        )
      }),
    )
    .toBe(true)
  await assertOverlayGeometry()
  await chart.press('Escape')
  const svg = await chart.elementHandle()
  await root
    .getByRole('button', { name: 'Refresh statistical samples' })
    .click()
  expect(await chart.evaluate((node, old) => node === old, svg)).toBe(true)
  await expect(note).toHaveValue('Keep statistical analysis')
  await root.getByText('Empty statistical samples', { exact: true }).click()
  await expect(chart).toHaveCount(0)
  await expect(
    root.getByText('No statistical samples', { exact: true }),
  ).toBeVisible()
  await root.getByText('Empty statistical samples', { exact: true }).click()
  await expect(chart).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
}
