import { choiceControl } from '../../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function decorationGeometryCases({ page, url, record }) {
  await record(
    'gallery: decoration geometry preserves input state and actions',
    async () => {
      await page.goto(`${url}?gallery=decoration-geometry`)
      const host = page.locator('.gallery-example-host')
      const draft = host.getByRole('textbox', { name: 'Preview draft' })
      await draft.fill('Retained draft')
      const original = await draft.elementHandle()
      for (const name of ['Taper', 'Rotation']) {
        const knob = host.getByRole('slider', { name, exact: true })
        await knob.focus()
        await knob.press('ArrowRight')
        await expect(knob).toHaveValue('2.1')
        await expect(knob).toBeFocused()
        await expect(draft).toHaveValue('Retained draft')
      }
      const scale = choiceControl(host, { name: 'Scale', exact: true })
      await scale.click()
      await page.getByRole('option', { name: 'Exponent', exact: true }).click()
      const exponent = host.getByRole('slider', {
        name: 'Exponent',
        exact: true,
      })
      await exponent.focus()
      await exponent.press('ArrowRight')
      await expect(exponent).toHaveValue('2.1')
      await scale.click()
      await page
        .getByRole('option', { name: 'Linear (proportional)', exact: true })
        .click()
      await expect(exponent).toHaveCount(0)
      await expect(draft).toHaveValue('Retained draft')
      for (const name of ['Wide', 'Square', 'Tall'])
        await host.getByRole('button', { name, exact: true }).click()
      const slider = host.getByRole('slider', {
        name: 'Rotation',
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
