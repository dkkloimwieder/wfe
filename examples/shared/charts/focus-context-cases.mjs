import { expect } from '@playwright/test'

/** Gallery navigation must dispose both linked chart adapters. */
export async function focusContextCases({ url, record, reviewPage }) {
  await record('gallery: linked chart navigation disposes both charts', () =>
    reviewPage(async (page) => {
      await page.goto(`${url}?gallery=chart-focus-context`)
      const host = page.locator('[data-focus-context]')
      await expect(host.getByRole('img')).toHaveCount(2)
      await host
        .getByRole('img', { name: 'Month overview', exact: true })
        .focus()
      await page.evaluate(() => {
        const host = document.querySelector('[data-focus-context]')
        window.disposedFocusContext = {
          host,
          svgs: [...host.querySelectorAll('svg.ts-chart')],
          outputs: [...host.querySelectorAll('output')],
        }
      })
      const nav = page.locator('.ui-dashboard-navigation')
      const forms = nav
        .locator('details')
        .filter({ has: page.locator('summary', { hasText: /^Forms$/ }) })
      await forms.locator('summary').click()
      await nav.getByRole('link', { name: 'Fields', exact: true }).click()
      await expect(
        page.locator('.gallery-preview input:not([type=hidden])').first(),
      ).toBeVisible()
      await expect(page.locator('[data-focus-context]')).toHaveCount(0)
      expect(
        await page.evaluate(async () => {
          const retained = window.disposedFocusContext
          const before = retained.outputs.map((output) => output.textContent)
          for (const svg of retained.svgs) {
            for (const key of ['ArrowRight', 'Enter'])
              svg.dispatchEvent(
                new KeyboardEvent('keydown', { key, bubbles: true }),
              )
            svg.dispatchEvent(
              new PointerEvent('pointermove', {
                bubbles: true,
                clientX: 100,
                clientY: 100,
              }),
            )
            svg.dispatchEvent(
              new PointerEvent('pointerup', {
                bubbles: true,
                clientX: 100,
                clientY: 100,
              }),
            )
          }
          window.dispatchEvent(new Event('resize'))
          await new Promise((resolve) => requestAnimationFrame(resolve))
          return (
            !retained.host.isConnected &&
            retained.svgs.every((svg) => !svg.isConnected) &&
            retained.outputs.every(
              (output, index) => output.textContent === before[index],
            ) &&
            document.querySelectorAll('.gallery-preview svg.ts-chart')
              .length === 0
          )
        }),
      ).toBe(true)
    }),
  )
}
