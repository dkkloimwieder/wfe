import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryFormCases({ page, url, record }) {
  await record(
    'gallery: everything form validates, submits and resets in both modes',
    async () => {
      for (const scheme of [1, 2]) {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto(`${url}?gallery=everything&scheme=${scheme}`)
        const previewHost = page.locator('.gallery-example-host')
        const form = previewHost.getByRole('form', { name: 'Everything form' })
        await expect(form).toBeVisible()
        await form
          .getByRole('button', { name: 'Save example', exact: true })
          .click()
        await expect(form.getByRole('alert')).toContainText(
          'Review the highlighted fields.',
        )
        await expect(
          form.getByRole('textbox', { name: 'Record name', exact: true }),
        ).toBeFocused()
        await form
          .getByRole('textbox', { name: 'Record name', exact: true })
          .fill('Combined example')
        await form
          .getByRole('textbox', { name: 'Contact email', exact: true })
          .fill('review@example.test')
        const quantity = form.getByRole('textbox', {
          name: 'Quantity',
          exact: true,
        })
        await quantity.fill('-1')
        await form
          .getByRole('button', { name: 'Save example', exact: true })
          .click()
        await expect(form.getByRole('alert')).toBeVisible()
        await expect(quantity).toBeFocused()
        await quantity.fill('24')
        await form.getByText('Send notifications', { exact: true }).click()
        await form
          .getByRole('button', { name: 'Save example', exact: true })
          .click()
        await expect(form.getByLabel('Saved example')).toContainText(
          'Combined example',
        )
        await form
          .getByRole('button', { name: 'Reset example', exact: true })
          .click()
        await expect(
          form.getByRole('textbox', { name: 'Record name', exact: true }),
        ).toHaveValue('')
        await expect(form.getByLabel('Saved example')).toHaveCount(0)
        await expect(quantity).toHaveValue('12')
        await expect(
          form.getByRole('checkbox', {
            name: 'Send notifications',
            exact: true,
          }),
        ).toBeChecked()
        await page.setViewportSize({ width: 390, height: 900 })
        assert.equal(
          await form.evaluate(
            (node) =>
              document.documentElement.scrollWidth <= innerWidth &&
              node.getBoundingClientRect().width <= innerWidth,
          ),
          true,
        )
      }
    },
  )
}
