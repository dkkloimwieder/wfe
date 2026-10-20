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
  await expect(input).toHaveCSS('height', '32px')
  await expect(input).toHaveCSS('color', 'rgb(38, 38, 38)')
  const layouts = await root
    .locator('.ui-dashboard')
    .evaluateAll((nodes) =>
      nodes.map((node) =>
        getComputedStyle(node).getPropertyValue('--ui-control-height').trim(),
      ),
    )
  assert.deepEqual(layouts, ['32px', '32px'])
  await expect(root.locator('#nested-theme')).toHaveCSS(
    '--ui-accent',
    '#ffe8cc',
  )
  await expect(root.locator('#theme-row-action')).toHaveCSS('height', '26px')
  await expect(root.locator('.ui-dashboard-main').first()).toHaveCSS(
    'background-image',
    /radial-gradient/,
  )
  await input.fill('Retained theme draft')
  await root.getByRole('button', { name: 'Theme popup', exact: true }).click()
  const popup = page.locator('#theme-popup')
  await expect(popup).toBeVisible()
  assert.equal(
    await popup.evaluate((node) => node.closest('.ui-theme')?.id),
    'theme-consumer',
  )
  await expect(popup.getByRole('textbox')).toHaveCSS('height', '32px')
  await page.keyboard.press('Escape')
  await root.locator('#theme-mode').click()
  await expect(root).toHaveCSS('--ui-color-scheme', 'dark')
  await expect(input).toHaveCSS('color', 'rgb(250, 250, 250)')
  await expect(input).toHaveValue('Retained theme draft')
  await root.getByRole('button', { name: 'Theme popup', exact: true }).click()
  await expect(popup).toHaveCSS('color', 'rgb(250, 250, 250)')
  await page.keyboard.press('Escape')
  const fonts = await page.evaluate(async () => {
    await document.fonts.load('12px "Fira Code Variable"')
    return [...document.fonts].some(
      (font) => font.family.includes('Fira Code') && font.status === 'loaded',
    )
  })
  assert.equal(fonts, true)
  await root.locator('#theme-mode').click()
}
