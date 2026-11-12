import { expect } from '@playwright/test'

export async function reviewChartDescriptions(
  page,
  { hydration = false } = {},
) {
  const host = page.locator('[data-chart-descriptions]')
  if (hydration)
    expect(
      await page.evaluate(() =>
        window.chartDescriptionServerNodes.every((node) => node.isConnected),
      ),
    ).toBe(true)
  const layers = host.getByRole('img', {
    name: 'Generated monthly actual and target',
    exact: true,
  })
  const pie = host.getByRole('img', {
    name: 'Generated monthly share',
    exact: true,
  })
  await expect(layers).toBeVisible()
  await expect(pie).toBeVisible()
  const note = host.getByRole('textbox', { name: 'Retained description note' })
  await note.fill('Preserve description analysis')
  for (const chart of [layers, pie]) {
    await chart.focus()
    await chart.press('ArrowRight')
    await chart.press('Enter')
    await expect(host.locator('p[role=status]')).toContainText(
      'source identity retained',
    )
  }
  await host.evaluate((node) => {
    node.descriptionReviewSvgs = [...node.querySelectorAll('svg.ts-chart')]
  })
  await host.getByRole('button', { name: 'Update description records' }).click()
  await host.getByText('Description donut', { exact: true }).click()
  await host.getByText('Empty description records', { exact: true }).click()
  await expect(host.getByRole('img')).toHaveCount(2)
  await host.getByText('Empty description records', { exact: true }).click()
  await expect(note).toHaveValue('Preserve description analysis')
  expect(
    await host.evaluate((node) =>
      node.descriptionReviewSvgs.every((svg) => svg.isConnected),
    ),
  ).toBe(true)
  expect(
    await host.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true)
  expect(await host.innerHTML()).not.toContain('NaN')
}
