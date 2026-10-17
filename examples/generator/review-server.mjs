import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import { choiceControl } from '../shared/controls/select-review.mjs'
export async function reviewServer(initial, name) {
  if (name === 'focus') {
    for (const label of ['Title', 'Notes', 'Extra'])
      await expect(initial.getByLabel(label, { exact: true })).toHaveCount(1)
  } else if (name === 'records') {
    await expect(initial.locator('[data-generator-amount]')).toHaveAttribute(
      'data-row-id',
      'record-0',
    )
    await expect(initial.locator('[data-generator-amount]')).toHaveAttribute(
      'data-record-name',
      'Sample record',
    )
    for (const label of ['Name', 'Active', 'Alerts', 'Notes', 'Quantity'])
      await expect(
        initial.locator('form').getByLabel(label, { exact: true }),
      ).toHaveCount(1)
    await expect(
      choiceControl(initial.locator('form'), {
        name: 'Category',
        exact: true,
      }),
    ).toHaveCount(1)
    for (const label of ['Active', 'Alerts']) {
      const metadata = await initial
        .getByLabel(label, { exact: true })
        .evaluate((node) => ({
          id: node.id,
          described: node
            .getAttribute('aria-describedby')
            ?.split(' ')
            .every((id) => document.getElementById(id)),
        }))
      assert.ok(metadata.id)
      assert.equal(metadata.described, true)
    }
  } else {
    for (const label of [
      'Tracking code',
      'Insured',
      'Declared value',
      'Dispatch date',
    ])
      await expect(
        initial.locator('form').getByLabel(label, { exact: true }),
      ).toHaveCount(1)
    await expect(
      choiceControl(initial.locator('form'), {
        name: 'Carrier',
        exact: true,
      }),
    ).toHaveCount(1)
    await expect(initial.locator('tbody tr')).toHaveCount(2)
  }
}
