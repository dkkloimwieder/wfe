import { choiceControl } from '../../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function inputDecorationCases({ page, url, record }) {
  await record(
    'gallery: input decoration preserves controls and native submission',
    async () => {
      await page.goto(`${url}?gallery=input-decoration`)
      const host = page.locator('.gallery-example-host')
      const name = host.getByRole('textbox', { name: 'Name', exact: true })
      await name.fill('Draft')
      const node = await name.elementHandle()
      const mode = choiceControl(host, {
        name: 'Input decoration',
        exact: true,
      })
      for (const label of ['Primary', 'Secondary', 'None', 'Neutral']) {
        await mode.click()
        await page.getByRole('option', { name: label, exact: true }).click()
        assert.equal(
          await name.evaluate(
            (current, original) => current === original,
            node,
          ),
          true,
        )
        await expect(name).toHaveValue('Draft')
      }
      const section = host.getByRole('group', { name: 'Inputs', exact: true })
      const sectionMode = choiceControl(host, {
        name: 'Section decoration',
        exact: true,
      })
      for (const label of ['Neutral', 'Secondary', 'None', 'Primary']) {
        await sectionMode.click()
        await page.getByRole('option', { name: label, exact: true }).click()
        await expect(section).toBeVisible()
        assert.equal(
          await name.evaluate(
            (current, original) => current === original,
            node,
          ),
          true,
        )
        await expect(name).toHaveValue('Draft')
      }
      for (const label of ['Section hover', 'Section focus inside']) {
        await host.getByText(label, { exact: true }).click()
        await name.focus()
        await expect(name).toBeFocused()
        await host.getByText(label, { exact: true }).click()
      }
      await host.getByText('Disable section', { exact: true }).click()
      await expect(name).toBeDisabled()
      await expect(
        section.getByRole('button', { name: 'Save', exact: true }),
      ).toBeDisabled()
      await host.getByText('Disable section', { exact: true }).click()
      await expect(name).toBeEnabled()
      await expect(name).toHaveValue('Draft')
      await name.press('Enter')
      await expect(
        host.getByRole('status', { name: 'Submission result' }),
      ).toHaveText('Saved Draft.')
      await host.getByText('Accept', { exact: true }).click()
      await expect(host.getByRole('checkbox', { name: 'Accept' })).toBeChecked()
      const toggle = host.getByRole('switch', { name: 'Enabled' })
      await toggle.focus()
      await page.keyboard.press('Space')
      await expect(toggle).toBeChecked()
      const first = host.getByRole('radio', { name: 'One', exact: true })
      await first.focus()
      await page.keyboard.press('ArrowDown')
      await expect(
        host.getByRole('radio', { name: 'Two', exact: true }),
      ).toBeChecked()
      await expect(
        host.getByRole('textbox', { name: 'Disabled', exact: true }),
      ).toBeDisabled()
      await expect(
        host.getByRole('textbox', { name: 'Read only', exact: true }),
      ).toHaveAttribute('readonly', '')
      const combo = host.getByRole('combobox', {
        name: 'Starts with',
        exact: true,
      })
      await combo.fill('ga')
      await expect(
        page.getByRole('option', { name: 'Gamma', exact: true }),
      ).toBeVisible()
      await page.getByRole('option', { name: 'Gamma', exact: true }).click()
      await expect(combo).toHaveValue('Gamma')
      const trigger = combo.locator('..').getByRole('button')
      await trigger.click()
      await page.keyboard.press('Escape')
      assert.equal(
        await combo.evaluate((node) =>
          node.parentElement.classList.contains('choice-control'),
        ),
        true,
      )
      await host
        .getByRole('button', { name: 'Open Date calendar', exact: true })
        .click()
      await page.keyboard.press('Escape')
      const compact = host.getByRole('textbox', {
        name: 'Compact input',
        exact: true,
      })
      await compact.click()
      await expect(compact).toBeFocused()
      assert.equal(
        await compact.evaluate((input) => {
          const control = input.getBoundingClientRect()
          const frame = input.parentElement.getBoundingClientRect()
          return (
            control.left >= frame.left &&
            control.right <= frame.right &&
            Math.abs(control.width - frame.width) < 1
          )
        }),
        true,
      )
      await name.fill('')
      await host.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(name).toBeFocused()
      await expect(
        host.getByRole('status', { name: 'Submission result' }),
      ).toHaveText('Saved Draft.')
      await node.dispose()
    },
  )
}
