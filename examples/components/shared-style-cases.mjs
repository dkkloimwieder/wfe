import { choiceControl } from '../shared/controls/select-review.mjs'
import { expect } from '@playwright/test'

export async function sharedStyleCases({ page, url, record, settle }) {
  for (const theme of ['light', 'dark']) {
    for (const density of ['compact', 'comfortable']) {
      await record(
        `field behavior: ${theme} ${density} readonly and disabled controls`,
        async () => {
          await page.goto(
            `${url}?fields=1${density === 'comfortable' ? '&comfortable=1' : ''}`,
          )
          await page.locator('main[data-ui]').evaluate((node, theme) => {
            node.dataset.uiTheme = theme
          }, theme)
          const fields = [
            page.getByLabel('Account name', { exact: true }),
            page.getByLabel('Notes', { exact: true }),
            page.getByLabel('Native choice', { exact: true }),
            choiceControl(page, { name: 'Shared choice', exact: true }),
          ]
          for (const field of fields) {
            await field.focus()
            await expect(field).toBeFocused()
          }
          await page.evaluate(() =>
            window.nativeFieldFixture.configure({
              readonly: true,
              invalid: true,
            }),
          )
          await fields[3].focus()
          await fields[3].press('ArrowDown')
          await expect(page.getByRole('listbox')).toHaveCount(0)
          await page.evaluate(() =>
            window.nativeFieldFixture.configure({
              disabled: true,
              readonly: false,
            }),
          )
          for (const field of fields) await expect(field).toBeDisabled()
        },
      )
    }
  }
  await record(
    'field behavior: readonly compound choice retains the accepted value',
    async () => {
      await page.goto(`${url}?choices=1`)
      await page.evaluate(() =>
        window.choiceFixture.configure({ readOnly: true }),
      )
      const input = page.getByRole('combobox', { name: 'Find category' })
      await expect(
        page.getByRole('button', { name: 'Show categories' }),
      ).toBeDisabled()
      await input.focus()
      await input.press('ArrowDown')
      await expect(page.getByRole('listbox')).toHaveCount(0)
      await expect(input).toHaveValue('Alpha')
    },
  )
  await record(
    'field behavior: forced colors retain keyboard access and invalid semantics',
    async () => {
      await page.emulateMedia({ forcedColors: 'active' })
      try {
        await page.goto(`${url}?fields=1`)
        const input = page.getByLabel('Account name', { exact: true })
        await input.focus()
        await expect(input).toBeFocused()
        await page.evaluate(() =>
          window.nativeFieldFixture.configure({ invalid: true }),
        )
        await settle()
        await expect(input).toHaveAttribute('aria-invalid', 'true')
        await input.press('Tab')
        await expect(input).not.toBeFocused()
      } finally {
        await page.emulateMedia({ forcedColors: 'none' })
      }
    },
  )
}
