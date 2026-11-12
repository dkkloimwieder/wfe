import { expect } from '@playwright/test'
import { reviewStatistics } from '../../shared/charts/statistics-review.mjs'
export async function statisticsCases({ url, record, reviewPage }) {
  for (const preset of ['default', 'vanilla', 'laser'])
    for (const scheme of [1, 2])
      await record(`gallery: statistics ${preset} scheme ${scheme}`, () =>
        reviewPage(async (page) => {
          await page.setViewportSize({
            width: scheme === 2 ? 390 : 1280,
            height: 1000,
          })
          await page.goto(
            `${url}?gallery=chart-statistics&preset=${preset}&scheme=${scheme}`,
          )
          await reviewStatistics(page)
        }),
      )
  await record(
    'gallery: statistics disposal removes tooltip and callbacks',
    () =>
      reviewPage(async (page) => {
        await page.goto(`${url}?gallery=chart-statistics`)
        const chart = page.getByRole('img', {
          name: 'Statistical distributions',
          exact: true,
        })
        await chart.focus()
        await chart.press('ArrowRight')
        await chart.press('Enter')
        await expect(page.locator('[data-statistics-tooltip]')).toBeVisible()
        await page.evaluate(() => {
          window.retainedStatisticsHost = document.querySelector(
            '[data-chart-statistics]',
          )
          window.retainedStatisticsApi =
            window.retainedStatisticsHost.statistics
          window.retainedStatisticsSvg =
            window.retainedStatisticsHost.querySelector('svg.ts-chart')
        })
        const nav = page.locator('.ui-dashboard-navigation')
        await nav
          .locator('details')
          .filter({ has: page.locator('summary', { hasText: /^Forms$/ }) })
          .locator('summary')
          .click()
        await nav.getByRole('link', { name: 'Fields', exact: true }).click()
        await expect(
          page.locator('.gallery-preview input:not([type=hidden])').first(),
        ).toBeVisible()
        await expect(page.locator('[data-statistics-tooltip]')).toHaveCount(0)
        expect(
          await page.evaluate(() => {
            const before = window.retainedStatisticsApi.selections()
            for (const key of ['ArrowRight', 'Enter'])
              window.retainedStatisticsSvg.dispatchEvent(
                new KeyboardEvent('keydown', { key, bubbles: true }),
              )
            return (
              !window.retainedStatisticsHost.isConnected &&
              !window.retainedStatisticsHost.statistics &&
              before === window.retainedStatisticsApi.selections()
            )
          }),
        ).toBe(true)
      }),
  )
}
