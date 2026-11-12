import { expect } from '@playwright/test'
import { reviewFinancial } from '../../shared/charts/financial-review.mjs'
export async function financialCases({ url, record, reviewPage }) {
  for (const preset of ['default', 'vanilla', 'laser'])
    for (const scheme of [1, 2])
      await record(`gallery: financial ${preset} scheme ${scheme}`, () =>
        reviewPage(async (page) => {
          await page.setViewportSize({
            width: scheme === 2 ? 390 : 1280,
            height: 1000,
          })
          await page.goto(
            `${url}?gallery=chart-financial&preset=${preset}&scheme=${scheme}`,
          )
          await reviewFinancial(page)
        }),
      )
  await record('gallery: financial disposal closes details and callbacks', () =>
    reviewPage(async (page) => {
      await page.goto(`${url}?gallery=chart-financial`)
      const svg = page.getByRole('img', { name: 'Candlestick', exact: true })
      await svg.focus()
      await svg.press('ArrowRight')
      await svg.press('Enter')
      await expect(page.locator('.financial-detail')).toBeVisible()
      await page.evaluate(() => {
        window.retainedFinancial = document.querySelector(
          '[data-financial-charts]',
        )
        window.retainedFinancialApi = window.retainedFinancial.financialCharts
        window.retainedFinancialSvg =
          window.retainedFinancial.querySelector('svg.ts-chart')
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
      await expect(page.locator('.financial-detail')).toHaveCount(0)
      expect(
        await page.evaluate(() => {
          const before = window.retainedFinancialApi.selections()
          for (const key of ['ArrowRight', 'Enter'])
            window.retainedFinancialSvg.dispatchEvent(
              new KeyboardEvent('keydown', { key, bubbles: true }),
            )
          return (
            !window.retainedFinancial.isConnected &&
            !window.retainedFinancial.financialCharts &&
            before === window.retainedFinancialApi.selections()
          )
        }),
      ).toBe(true)
    }),
  )
}
