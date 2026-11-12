import { expect } from '@playwright/test'
import { reviewTimeSeries } from '../../shared/charts/time-series-review.mjs'
export async function timeSeriesCases({ url, record, reviewPage }) {
  for (const preset of ['default', 'vanilla', 'laser'])
    for (const scheme of [1, 2]) {
      await record(`gallery: time-series ${preset} scheme ${scheme}`, () =>
        reviewPage(async (page) => {
          await page.setViewportSize({
            width: scheme === 2 ? 390 : 1280,
            height: 1000,
          })
          await page.goto(
            `${url}?gallery=chart-time-series&preset=${preset}&scheme=${scheme}`,
          )
          await reviewTimeSeries(page)
        }),
      )
    }
  await record(
    'gallery: time-series disposal closes pinned details and callbacks',
    () =>
      reviewPage(async (page) => {
        await page.goto(`${url}?gallery=chart-time-series`)
        const svg = page.getByRole('img', {
          name: 'Operational time series',
          exact: true,
        })
        await svg.focus()
        await svg.press('ArrowRight')
        await svg.press('Enter')
        await expect(
          page.getByRole('textbox', { name: 'Bucket annotation' }),
        ).toBeVisible()
        await page.evaluate(() => {
          window.retainedTimeSeries =
            document.querySelector('[data-time-series]')
          window.retainedTimeSeriesApi = window.retainedTimeSeries.timeSeries
          window.retainedTimeSeriesSvg =
            window.retainedTimeSeries.querySelector('svg.ts-chart')
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
        await expect(page.locator('[data-time-series-detail]')).toHaveCount(0)
        expect(
          await page.evaluate(() => {
            const before = window.retainedTimeSeriesApi.selections()
            window.retainedTimeSeriesSvg.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: 'ArrowRight',
                bubbles: true,
              }),
            )
            window.retainedTimeSeriesSvg.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
            )
            return (
              !window.retainedTimeSeries.isConnected &&
              !window.retainedTimeSeries.timeSeries &&
              before === window.retainedTimeSeriesApi.selections()
            )
          }),
        ).toBe(true)
      }),
  )
}
