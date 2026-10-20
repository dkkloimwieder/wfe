import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryLoadingCases({ page, url, record }) {
  await record(
    'gallery: navigation uses one document and retains the dark surface',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${url}?gallery=fields&scheme=2`)
      await expect(page.locator('.gallery-preview')).toBeVisible()
      const documents = []
      const observe = (request) => {
        if (request.isNavigationRequest()) documents.push(request.url())
      }
      page.on('request', observe)
      try {
        await page
          .getByRole('link', { name: 'Select and combobox', exact: true })
          .click()
        await expect(
          page.getByRole('combobox', { name: 'Find category' }),
        ).toBeVisible()
        await expect(page.locator('iframe')).toHaveCount(0)
        assert.equal(page.frames().length, 1)
        assert.equal(
          await page
            .locator('.gallery-preview')
            .evaluate((node) => getComputedStyle(node).backgroundColor),
          await page
            .locator('.gallery-stage')
            .evaluate((node) => getComputedStyle(node).backgroundColor),
        )
        await page.goBack()
        await expect(
          page
            .locator('.gallery-preview')
            .getByRole('textbox', { name: 'Name', exact: true }),
        ).toBeVisible()
        assert.deepEqual(documents, [])
      } finally {
        page.off('request', observe)
      }
    },
  )
  await record(
    'gallery: dialogs and popups share focus with the surrounding page',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${url}?gallery=dialogs`)
      const trigger = page.getByRole('button', {
        name: 'Open dialog',
        exact: true,
      })
      await trigger.click()
      await expect(
        page.getByRole('dialog', { name: 'Record information' }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await page
        .getByRole('link', { name: 'Popover, menu and tooltip', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Open popover', exact: true })
        .click()
      await expect(
        page.getByRole('textbox', { name: 'Display name', exact: true }),
      ).toBeVisible()
      await page.getByRole('link', { name: 'Table', exact: true }).click()
      await expect(
        page.getByRole('table', { name: 'Records', exact: true }),
      ).toBeVisible()
      await expect(page.locator('[data-content="popover"]')).toHaveCount(0)
      assert.equal(await page.evaluate(() => 'overlayFixture' in window), false)
      await expect(
        page.getByRole('heading', { name: 'Table', exact: true }),
      ).toBeFocused()
      await expect(page.locator('iframe')).toHaveCount(0)
    },
  )
}
