import { choiceControl } from '../../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryThemeCases({ page, url, record }) {
  await record(
    'gallery: theme changes retain the mounted draft and navigation preset',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${url}?gallery=fields`)
      const draft = page
        .locator('.gallery-preview')
        .getByRole('textbox', { name: 'Name', exact: true })
      await draft.fill('Retained through theme changes')
      await draft.evaluate((node) => {
        node.dataset.themeRetained = 'yes'
      })
      await page
        .getByRole('button', { name: 'Appearance', exact: true })
        .click()
      await choiceControl(page, { name: 'Theme', exact: true }).click()
      await page.getByRole('option', { name: 'Vanilla', exact: true }).click()
      await expect(draft).toHaveValue('Retained through theme changes')
      await expect(draft).toHaveAttribute('data-theme-retained', 'yes')
      await expect(page.locator('.gallery-shell')).toHaveAttribute(
        'data-ui-preset',
        'vanilla',
      )
      assert.equal(new URL(page.url()).searchParams.get('preset'), 'vanilla')
      await expect(
        page.getByRole('group', {
          name: 'Secondary accent colors',
          exact: true,
        }),
      ).toHaveCount(0)
      await choiceControl(page, { name: 'Theme', exact: true }).click()
      await page.getByRole('option', { name: 'Default', exact: true }).click()
      await expect(draft).toHaveValue('Retained through theme changes')
      await expect(draft).toHaveAttribute('data-theme-retained', 'yes')
      await page.goBack()
      await expect(page.locator('.gallery-shell')).toHaveAttribute(
        'data-ui-preset',
        'vanilla',
      )
      await expect(draft).toHaveValue('Retained through theme changes')
    },
  )
  await record(
    'gallery: nested themes keep popups in their owning boundary and share application state',
    async () => {
      await page.goto(`${url}?gallery=themes&preset=vanilla`)
      await page
        .getByRole('textbox', { name: 'Vanilla inner draft', exact: true })
        .fill('One application draft')
      for (const [name, id] of [
        ['Default outer', 'theme-review-default'],
        ['Vanilla inner', 'theme-review-vanilla-inner'],
        ['Vanilla outer', 'theme-review-vanilla'],
        ['Default inner', 'theme-review-default-inner'],
        ['Custom vanilla', 'theme-review-custom'],
      ]) {
        await expect(
          page.getByRole('textbox', { name: `${name} draft`, exact: true }),
        ).toHaveValue('One application draft')
        const trigger = page.getByRole('button', {
          name: `${name} details`,
          exact: true,
        })
        await trigger.click()
        const popup = page.locator(`[data-theme-review-popup="${name}"]`)
        await expect(popup).toBeVisible()
        assert.equal(
          await popup.evaluate(
            (node) => node.closest('[data-ui-theme-owner]')?.id,
          ),
          id,
        )
        await expect(popup.getByRole('textbox')).toHaveValue(
          'One application draft',
        )
        await page.keyboard.press('Escape')
        await expect(popup).toHaveCount(0)
        await expect(trigger).toBeFocused()
      }
    },
  )
}
