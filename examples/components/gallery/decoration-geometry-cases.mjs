import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import { choiceControl } from '../../shared/controls/select-review.mjs'
export async function decorationGeometryCases({ page, url, record }) {
  await record(
    'gallery: decoration geometry preserves input state and actions',
    async () => {
      await page.goto(`${url}?gallery=decoration-geometry`)
      const host = page.locator('.gallery-example-host')
      const draft = host.getByRole('textbox', { name: 'Preview draft' })
      await draft.fill('Retained draft')
      const original = await draft.elementHandle()
      const mode = choiceControl(host, { name: 'Size adjustment', exact: true })
      for (const name of [
        'None (original behavior)',
        'Both axes',
        'Longest side',
      ]) {
        await mode.click()
        await page.getByRole('option', { name, exact: true }).click()
        await expect(draft).toHaveValue('Retained draft')
      }
      for (const name of ['Wide', 'Square', 'Tall'])
        await host.getByRole('button', { name, exact: true }).click()
      const slider = host.getByRole('slider', {
        name: 'Maximum rotation',
        exact: true,
      })
      await slider.focus()
      await slider.press('ArrowRight')
      await expect(slider).toBeFocused()
      assert.equal(
        await draft.evaluate((node, before) => node === before, original),
        true,
      )
      await host
        .getByRole('button', { name: 'Section action', exact: true })
        .click()
      await expect(
        host.getByRole('status', { name: 'Sample actions' }),
      ).toHaveText('1 actions')
      await host
        .getByRole('button', { name: 'New samples', exact: true })
        .click()
      await expect(draft).toHaveValue('Retained draft')
      await host
        .getByRole('button', { name: 'Small action', exact: true })
        .click()
      await expect(
        host.getByRole('status', { name: 'Sample actions' }),
      ).toHaveText('2 actions')
      await host
        .getByRole('button', { name: 'Reset geometry', exact: true })
        .click()
      await expect(draft).toHaveValue('Retained draft')
      await original.dispose()
    },
  )
}
