import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryLoadingCases({ page, url, record }) {
  await record(
    'gallery: slow navigation keeps the current surface until the preview paints',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${url}?gallery=fields&scheme=2`)
      await expect(page.locator('.gallery-frame')).toHaveAttribute(
        'data-ready',
        '',
      )
      let release
      let requested = false
      const gate = new Promise((resolve) => {
        release = resolve
      })
      const pattern = '**/*galleryPreview=choices*'
      await page.route(pattern, async (route) => {
        requested = true
        await gate
        await route.fallback()
      })
      try {
        await page
          .getByRole('link', { name: 'Select and combobox', exact: true })
          .click()
        await expect.poll(() => requested).toBe(true)
        const frame = page.locator('.gallery-frame')
        await expect(frame).toHaveCSS('visibility', 'hidden')
        await expect(page.locator('.gallery-stage')).toHaveAttribute(
          'aria-busy',
          'true',
        )
        assert.equal(
          await page
            .locator('.gallery-stage')
            .evaluate((node) => getComputedStyle(node).backgroundColor),
          await frame.evaluate(
            (node) => getComputedStyle(node).backgroundColor,
          ),
        )
        await frame.evaluate((node) =>
          window.dispatchEvent(
            new MessageEvent('message', {
              source: node.contentWindow,
              origin: location.origin,
              data: { type: 'wfe-gallery-painted', version: -1 },
            }),
          ),
        )
        await expect(frame).toHaveCSS('visibility', 'hidden')
        release()
        await expect(frame).toHaveAttribute('data-ready', '')
        await expect(page.locator('.gallery-stage')).toHaveAttribute(
          'aria-busy',
          'false',
        )
        await expect(
          page
            .frameLocator('.gallery-frame')
            .getByRole('combobox', { name: 'Find category' }),
        ).toBeVisible()
        await page.goBack()
        await expect(page.locator('.gallery-frame')).toHaveAttribute(
          'data-ready',
          '',
        )
        await expect(
          page
            .frameLocator('.gallery-frame')
            .getByRole('textbox', { name: 'Name', exact: true }),
        ).toBeVisible()
      } finally {
        release()
        await page.unroute(pattern)
      }
    },
  )
}
