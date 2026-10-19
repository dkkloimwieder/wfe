import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewButtonLinks(page) {
  const section = page.locator('[data-button-link-review]')
  for (const variant of ['outline', 'filled', 'inverted', 'ghost']) {
    const link = section.locator(`#button-link-${variant}`)
    const reference = section.getByRole('button', {
      name: `${variant} reference`,
    })
    const appearance = (node) => {
      const style = getComputedStyle(node)
      return Object.fromEntries(
        [
          'height',
          'fontFamily',
          'fontSize',
          'fontWeight',
          'lineHeight',
          'textTransform',
          'padding',
          'borderWidth',
          'borderColor',
          'color',
          'backgroundColor',
        ].map((key) => [key, style[key]]),
      )
    }
    await page.mouse.move(0, 0)
    assert.deepEqual(
      await link.evaluate(appearance),
      await reference.evaluate(appearance),
    )
    await link.hover()
    const hovered = await link.evaluate(appearance)
    await reference.hover()
    assert.deepEqual(hovered, await reference.evaluate(appearance))
    await expect(link).toHaveCSS('text-decoration-line', 'none')
    await expect(link).not.toHaveAttribute('role', 'button')
  }
  const link = section.locator('#button-link-outline')
  const original = page.url()
  await link.focus()
  await expect(link).toHaveCSS('outline-style', 'solid')
  await link.press('Enter')
  await expect(page).toHaveURL(/#button-link-destination$/)
  await page.goBack()
  assert.equal(page.url(), original)
  const popupPromise = page.context().waitForEvent('page')
  await link.click({ modifiers: ['ControlOrMeta'] })
  const popup = await popupPromise
  await popup.waitForLoadState()
  assert.equal(page.url(), original)
  await popup.close()
  const blankPromise = page.context().waitForEvent('page')
  await section.getByRole('link', { name: 'New tab destination' }).click()
  const blank = await blankPromise
  await blank.waitForLoadState()
  assert.equal(blank.url(), 'about:blank')
  await blank.close()
  const downloadPromise = page.waitForEvent('download')
  await section.getByRole('link', { name: 'Download example' }).click()
  const download = await downloadPromise
  assert.equal(download.suggestedFilename(), 'example.txt')
  await download.delete()
}
