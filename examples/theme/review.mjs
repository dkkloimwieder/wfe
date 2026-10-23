import { reviewContainerLayout } from '../shared/container-layout-review.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewTheme(page, { hydrated = false } = {}) {
  const root = page.locator('#theme-consumer')
  await expect(root).toBeVisible()
  if (hydrated) {
    assert.equal(
      await page.evaluate(() =>
        window.serverThemeNodes.every(
          (node) =>
            node.isConnected && node === document.getElementById(node.id),
        ),
      ),
      true,
    )
  }
  await expect(root).toHaveAttribute('data-ui-density', 'default')
  assert.equal(await root.locator('.ui-dashboard[data-ui-density]').count(), 0)
  const input = root.locator('#theme-name')
  await input.fill('Retained theme draft')
  await root.getByRole('button', { name: 'Theme popup', exact: true }).click()
  const popup = page.locator('#theme-popup')
  await expect(popup).toBeVisible()
  assert.equal(
    await popup.evaluate((node) => node.closest('.ui-theme')?.id),
    'theme-consumer',
  )
  const popupInput = popup.getByRole('textbox', { name: 'Popup name' })
  await popupInput.fill('Retained density draft')
  const retainedPopup = await popup.elementHandle()
  for (const density of ['comfortable', 'compact', 'default']) {
    // Programmatic activation leaves focus inside the open popup.
    await root.locator('#theme-density').evaluate((node) => node.click())
    await expect(root).toHaveAttribute('data-ui-density', density)
    await expect(popupInput).toBeFocused()
    await expect(popupInput).toHaveValue('Retained density draft')
    assert.equal(
      await popup.evaluate(
        (node, original) => node === original,
        retainedPopup,
      ),
      true,
    )
    assert.equal(
      await popup.evaluate((node) => {
        const owner = node.closest('.ui-theme')
        return [
          '--ui-control-height',
          '--ui-row-height',
          '--ui-table-control-height',
        ].every(
          (token) =>
            getComputedStyle(node).getPropertyValue(token) ===
            getComputedStyle(owner).getPropertyValue(token),
        )
      }),
      true,
    )
    await expect(root.locator('#nested-theme')).toHaveAttribute(
      'data-ui-density',
      'default',
    )
  }
  await retainedPopup.dispose()
  await page.keyboard.press('Escape')
  await root.locator('#theme-mode').click()
  await expect(root).toHaveCSS('--ui-color-scheme', 'dark')
  await expect(input).toHaveValue('Retained theme draft')
  await root.getByRole('button', { name: 'Theme popup', exact: true }).click()
  await page.keyboard.press('Escape')
  await root.locator('#theme-mode').click()
  await reviewContainerLayout(page, { hydrated })
}
