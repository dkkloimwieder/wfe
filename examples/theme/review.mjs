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
  const input = root.locator('#theme-name')
  await input.fill('Retained theme draft')
  await root.getByRole('button', { name: 'Theme popup', exact: true }).click()
  const popup = page.locator('#theme-popup')
  await expect(popup).toBeVisible()
  assert.equal(
    await popup.evaluate((node) => node.closest('.ui-theme')?.id),
    'theme-consumer',
  )
  await page.keyboard.press('Escape')
  await root.locator('#theme-mode').click()
  await expect(root).toHaveCSS('--ui-color-scheme', 'dark')
  await expect(input).toHaveValue('Retained theme draft')
  await root.getByRole('button', { name: 'Theme popup', exact: true }).click()
  await page.keyboard.press('Escape')
  await root.locator('#theme-mode').click()
}
