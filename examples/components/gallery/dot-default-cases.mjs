import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function faceAlpha(locator) {
  return locator.evaluate((node) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')
    context.fillStyle = getComputedStyle(node).backgroundColor
    context.fillRect(0, 0, 1, 1)
    return context.getImageData(0, 0, 1, 1).data[3]
  })
}
export async function dotDefaultCases({ page, url, record }) {
  await record(
    'theme dots: default faces stay opaque with explicit transparency overrides',
    async () => {
      await page.goto(`${url}?theme=1`)
      const root = page.locator('#theme-consumer')
      const button = root.locator('#theme-mode')
      for (const mode of ['light', 'dark']) {
        await expect(root).toHaveCSS('--ui-color-scheme', mode)
        await expect(root).toHaveCSS('--ui-action-dot-visibility', '0%')
        await button.hover()
        assert.equal(await faceAlpha(button), 255)
        await button.click()
      }
      for (const scheme of [1, 2]) {
        await page.goto(`${url}?gallery=fields&scheme=${scheme}`)
        const nav = page.getByRole('navigation', { name: 'Component catalog' })
        const selected = nav.locator('a[aria-current="page"]')
        await expect(selected).toBeVisible()
        await selected.hover()
        await expect(selected).toHaveCSS('--ui-action-dot-visibility', '0%')
        assert.equal(await faceAlpha(selected), 255)
        const decoration = await selected.evaluate(
          (node) => getComputedStyle(node, '::before').backgroundImage,
        )
        assert.match(decoration, /radial-gradient/)
        const preview = page
          .locator('.gallery-example-host')
          .locator('.gallery-preview')
        await expect(preview).toHaveCSS('--ui-action-dot-visibility', '0%')
      }
      await page.goto(`${url}?gallery=fields&inside=100`)
      const selected = page
        .getByRole('navigation', { name: 'Component catalog' })
        .locator('a[aria-current="page"]')
      await selected.hover()
      await expect(selected).toHaveCSS('--ui-action-dot-visibility', '100%')
      assert.equal(await faceAlpha(selected), 0)
    },
  )
}
