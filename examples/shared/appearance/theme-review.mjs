import { reviewContainerLayout } from '../container-layout-review.mjs'
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
  await expect(root).toHaveAttribute('data-ui-preset', 'default')
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
  for (const preset of ['vanilla', 'default']) {
    await root.locator('#theme-preset').evaluate((node) => node.click())
    await expect(root).toHaveAttribute('data-ui-preset', preset)
    await expect(popupInput).toBeFocused()
    await expect(popupInput).toHaveValue('Retained density draft')
    await expect(input).toHaveValue('Retained theme draft')
    assert.equal(
      await popup.evaluate(
        (node, original) => node === original,
        retainedPopup,
      ),
      true,
    )
    await expect(root.locator('#vanilla-theme')).toHaveAttribute(
      'data-ui-preset',
      'vanilla',
    )
    await expect(root.locator('#vanilla-nested-default')).toHaveAttribute(
      'data-ui-preset',
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
  for (const [ownerId, inputId, triggerId, popupId] of [
    [
      'vanilla-theme',
      'vanilla-theme-draft',
      'vanilla-theme-trigger',
      'vanilla-theme-popup',
    ],
    [
      'vanilla-nested-default',
      'vanilla-nested-draft',
      'vanilla-nested-trigger',
      'vanilla-nested-popup',
    ],
  ]) {
    const draft = root.locator(`#${inputId}`)
    await draft.fill(`Retained ${ownerId} draft`)
    const retainedDraft = await draft.elementHandle()
    const trigger = root.locator(`#${triggerId}`)
    await trigger.click()
    const nestedPopup = page.locator(`#${popupId}`)
    await expect(nestedPopup).toBeVisible()
    assert.equal(
      await nestedPopup.evaluate(
        (node) => node.closest('[data-ui-theme-owner]')?.id,
      ),
      ownerId,
    )
    const nestedPopupDraft = nestedPopup.getByRole('textbox')
    await nestedPopupDraft.fill('Keep the nested popup open')
    for (const preset of ['vanilla', 'default']) {
      await root.locator('#theme-preset').evaluate((node) => node.click())
      await expect(root).toHaveAttribute('data-ui-preset', preset)
      await expect(nestedPopupDraft).toBeFocused()
      await expect(nestedPopupDraft).toHaveValue('Keep the nested popup open')
      await expect(draft).toHaveValue(`Retained ${ownerId} draft`)
      assert.equal(
        await draft.evaluate(
          (node, original) => node === original,
          retainedDraft,
        ),
        true,
      )
      assert.equal(
        await nestedPopup.evaluate(
          (node) => node.closest('[data-ui-theme-owner]')?.id,
        ),
        ownerId,
      )
    }
    await retainedDraft.dispose()
    await page.keyboard.press('Escape')
    await expect(nestedPopup).toHaveCount(0)
    await expect(trigger).toBeFocused()
  }
  await reviewContainerLayout(page, { hydrated })
}
