import { artifactPath } from '../../../scripts/artifacts.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function matchingCases({ page, url, record }) {
  await record(
    'matching: contains, prefix and ranked fuzzy options follow typed input',
    async () => {
      await page.goto(`${url}?gallery=choices`)
      const visible = () => page.getByRole('option')
      const contains = page.getByRole('combobox', {
        name: 'Contains',
        exact: true,
      })
      await contains.fill('gam')
      await expect(visible()).toHaveText(['Gamma'])
      await contains.fill('mm')
      await expect(visible()).toHaveText(['Gamma'])
      await contains.press('ArrowDown')
      await contains.press('Enter')
      await expect(contains).toHaveValue('Gamma')
      const prefix = page.getByRole('combobox', {
        name: 'Starts with',
        exact: true,
      })
      await prefix.fill('mm')
      await expect(visible()).toHaveCount(0)
      await prefix.fill('GA')
      await expect(visible()).toHaveText(['Gamma', 'Gamma Ray'])
      await prefix.fill('cafe')
      await expect(visible()).toHaveText(['Café'])
      await prefix.press('Escape')
      const fuzzy = page.getByRole('combobox', { name: 'Fuzzy', exact: true })
      await fuzzy.fill('gm')
      await expect(visible()).toHaveText(['Green Meadow', 'Gamma', 'Gamma Ray'])
      await fuzzy.press('ArrowDown')
      await fuzzy.press('Enter')
      assert.ok(
        ['Green Meadow', 'Gamma', 'Gamma Ray'].includes(
          await fuzzy.inputValue(),
        ),
      )
      await fuzzy.fill('zzzz')
      await expect(visible()).toHaveCount(0)
      await fuzzy.fill('')
      await expect(visible()).toHaveCount(5)
      await fuzzy.press('Escape')
      await page.setViewportSize({ width: 390, height: 844 })
      await fuzzy.fill('gm')
      const bounds = await page.getByRole('listbox').boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391)
      await page.screenshot({
        path: await artifactPath('wfe-matching-phone.png'),
      })
      await fuzzy.press('Escape')
    },
  )
  await record(
    'matching: all gallery modes retain disabled, readonly and invalid states',
    async () => {
      for (const state of ['disabled', 'readonly', 'invalid']) {
        await page.goto(`${url}?gallery=choices&state=${state}`)
        for (const name of ['Contains', 'Starts with', 'Fuzzy']) {
          const input = page.getByRole('combobox', { name, exact: true })
          if (state === 'disabled') await expect(input).toBeDisabled()
          else if (state === 'readonly')
            await expect(input).toHaveAttribute('readonly', '')
          else await expect(input).toHaveAttribute('aria-invalid', 'true')
        }
      }
    },
  )
}
