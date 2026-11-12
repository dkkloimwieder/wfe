import { expect } from '@playwright/test'
import { reviewChartGrammar } from '../../shared/charts/grammar-review.mjs'
export async function galleryChartCases({ url, record, reviewPage }) {
  await record('gallery: chart grammar loads only on chart routes', () =>
    reviewPage(async (page) => {
      const requests = []
      page.on('request', (request) => {
        const path = new URL(request.url()).pathname
        if (
          /\/(?:vendor\/charts\/|charts\/(?:Grammar|TimeSeries)\.|(?:Grammar|TimeSeries)[-.]|d3[-_])/.test(
            path,
          ) &&
          !path.endsWith('.css')
        )
          requests.push(path)
      })
      await page.goto(`${url}?gallery=fields`)
      await expect(
        page.locator('.gallery-preview input:not([type=hidden])').first(),
      ).toBeVisible()
      expect(requests).toEqual([])
      await page.goto(`${url}?gallery=chart-layers`)
      await expect(
        page.getByRole('img', { name: 'Layered request trend', exact: true }),
      ).toBeVisible()
      expect(requests.length).toBeGreaterThan(0)
    }),
  )
  for (const family of ['layers', 'data', 'polar'])
    for (const preset of ['default', 'vanilla', 'laser'])
      for (const scheme of [1, 2])
        await record(
          `gallery: chart grammar ${family} ${preset} scheme ${scheme}`,
          () =>
            reviewPage(async (page) => {
              await page.setViewportSize({
                width: scheme === 2 ? 390 : 1280,
                height: 1000,
              })
              await page.goto(
                `${url}?gallery=chart-${family}&preset=${preset}&scheme=${scheme}`,
              )
              await reviewChartGrammar(page, { family })
              expect(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              ).toBe(true)
            }),
        )
  await record(
    'gallery: disposed chart grammar cannot select retained points',
    () =>
      reviewPage(async (page) => {
        await page.goto(`${url}?gallery=chart-polar`)
        await expect(
          page.getByRole('img', { name: 'Service composition', exact: true }),
        ).toBeVisible()
        await page.evaluate(() => {
          window.retainedGrammar = document.querySelector(
            '[data-chart-grammar]',
          )
          window.retainedGrammarApi = window.retainedGrammar.chartGrammar
          window.retainedGrammarSvg = document.querySelector(
            '[data-chart-panel="pie"] svg',
          )
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
        expect(
          await page.evaluate(() => {
            const before = window.retainedGrammarApi.selections()
            window.retainedGrammarSvg.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: 'ArrowRight',
                bubbles: true,
              }),
            )
            window.retainedGrammarSvg.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
            )
            return (
              !window.retainedGrammar.isConnected &&
              !window.retainedGrammar.chartGrammar &&
              before === window.retainedGrammarApi.selections()
            )
          }),
        ).toBe(true)
      }),
  )
}
