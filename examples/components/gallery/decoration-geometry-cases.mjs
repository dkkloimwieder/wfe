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
      const wideInput = host.getByRole('textbox', {
        name: 'Wide input 800px',
        exact: true,
      })
      await wideInput.fill('Retained wide draft')
      const wideSelect = choiceControl(host, {
        name: 'Wide select 800px',
        exact: true,
      })
      await wideSelect.click()
      await page
        .getByRole('option', { name: 'Second option', exact: true })
        .click()
      const original = await draft.elementHandle()
      await expect(
        host.getByRole('slider', { name: 'Rotation reduction', exact: true }),
      ).toHaveValue('0.05')
      await expect(
        host.getByRole('slider', { name: 'Taper reduction', exact: true }),
      ).toHaveValue('0.3')
      for (const name of ['Base rotation', 'Base taper X', 'Base taper Y']) {
        const angle = host.getByRole('slider', { name, exact: true })
        await expect(angle).toHaveValue('2')
        await angle.focus()
        await angle.press('ArrowRight')
        await expect(angle).toHaveValue('2.05')
        await expect(angle).toBeFocused()
      }
      for (const name of ['Taper reduction', 'Rotation reduction']) {
        const knob = host.getByRole('slider', { name, exact: true })
        await knob.focus()
        await knob.press('Home')
        await knob.press('ArrowRight')
        await expect(knob).toHaveValue('0.05')
        await expect(knob).toBeFocused()
        await knob.press('Home')
        await expect(knob).toHaveValue('0')
        await expect(draft).toHaveValue('Retained draft')
      }
      for (const name of ['Preview width', 'Preview height']) {
        const dimension = host.getByRole('slider', { name, exact: true })
        const before = Number(await dimension.inputValue())
        await dimension.focus()
        await dimension.press('ArrowRight')
        await expect(dimension).toHaveValue(String(before + 0.05))
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
      await expect(exponent).toHaveValue('2.05')
      await scale.click()
      await page
        .getByRole('option', { name: 'Linear (proportional)', exact: true })
        .click()
      await expect(exponent).toHaveCount(0)
      await expect(draft).toHaveValue('Retained draft')
      for (const name of ['Wide', 'Square', 'Tall'])
        await host.getByRole('button', { name, exact: true }).click()
      const slider = host.getByRole('slider', {
        name: 'Rotation reduction',
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
      await expect(
        host.getByRole('slider', { name: 'Rotation reduction', exact: true }),
      ).toHaveValue('0.05')
      await expect(
        host.getByRole('slider', { name: 'Taper reduction', exact: true }),
      ).toHaveValue('0.3')
      await expect(
        host.getByRole('slider', { name: 'Exponent', exact: true }),
      ).toHaveValue('2')
      await expect(wideInput).toHaveValue('Retained wide draft')
      await expect(wideSelect).toContainText('Second option')
      for (const name of ['Base rotation', 'Base taper X', 'Base taper Y'])
        await expect(
          host.getByRole('slider', { name, exact: true }),
        ).toHaveValue('2')
      await original.dispose()
    },
  )
}
