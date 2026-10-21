import { reviewFormActions } from './review-server.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function reviewFocus({ page, record }) {
  await record('forms without submit or actions omit the action row', () =>
    reviewFormActions(page, true),
  )
  for (const kind of ['fields', 'panels'])
    await record(
      `retained ${kind} moves preserve each focused control and selection`,
      async () => {
        for (const label of ['Title', 'Notes', 'Extra'])
          for (const reversed of [true, false]) {
            const input = page.getByLabel(label, { exact: true })
            await input.focus()
            await input.evaluate((node) =>
              node.setSelectionRange(2, 6, 'backward'),
            )
            await page.evaluate(
              ({ kind, reversed }) =>
                window.generatorFixture.focusOrder(kind, reversed),
              { kind, reversed },
            )
            await expect(input).toBeFocused()
            assert.deepEqual(
              await input.evaluate((node) => [
                node.selectionStart,
                node.selectionEnd,
                node.selectionDirection,
              ]),
              [2, 6, 'backward'],
            )
          }
      },
    )
  await record('explicit focus after reorder wins', async () => {
    await page.getByLabel('Notes', { exact: true }).focus()
    await page.evaluate(() =>
      window.generatorFixture.focusOrder('panels', true, 'elsewhere'),
    )
    await expect(
      page.getByRole('button', { name: 'Elsewhere', exact: true }),
    ).toBeFocused()
  })
  await record(
    'disabled and removed controls do not regain focus',
    async () => {
      await page.getByLabel('Notes', { exact: true }).focus()
      await page.evaluate(() =>
        window.generatorFixture.focusOrder('panels', false, 'disable'),
      )
      await expect(page.getByLabel('Notes', { exact: true })).not.toBeFocused()
      await page.evaluate(() =>
        window.generatorFixture.focusOrder('panels', true, 'remove'),
      )
      await expect(page.locator('form input, form textarea')).toHaveCount(0)
      await page.evaluate(() =>
        window.generatorFixture.focusOrder('panels', false, 'dispose'),
      )
      await expect(page.locator('#root input, #root textarea')).toHaveCount(0)
    },
  )
}
