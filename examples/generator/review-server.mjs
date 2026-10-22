import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import { choiceControl } from '../shared/controls/select-review.mjs'
export async function reviewServer(initial, name) {
  if (name === 'focus') {
    await reviewFormActions(initial, true)
    for (const label of ['Title', 'Notes', 'Extra'])
      await expect(initial.getByLabel(label, { exact: true })).toHaveCount(1)
  } else if (name === 'records') {
    await reviewFormActions(initial)
    await expect(initial.locator('form .app-first-action-icon')).toHaveCount(2)
    await expect(
      initial.locator('form span[aria-hidden="true"][inert]'),
    ).toHaveCount(2)
    const group = initial.getByRole('group', {
      name: 'Record details',
      exact: true,
    })
    await expect(group).toHaveAccessibleDescription('Identity and quantity')
    await expect(group.getByLabel('Name', { exact: true })).toHaveCount(1)
    await expect(
      initial.getByRole('group', { name: 'Preferences', exact: true }),
    ).toHaveCount(1)

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
    await expect(
      initial.locator('[data-generator-panel="dispatch-context-panel"]'),
    ).toHaveCount(1)
    await expect(
      initial.locator('[data-generator-panel="dispatch-footer-panel"]'),
    ).toHaveCount(1)
  }
}

export async function reviewFormActions(page, empty = false) {
  const form = page.locator('form')
  const row = form.locator(':scope > .ui-form-actions')
  if (empty) {
    await expect(row).toHaveCount(0)
    return
  }
  await expect(row).toHaveCount(1)
  await expect(row.locator(':scope > button')).toHaveText([
    'Save',
    'Reset',
    'Extra',
  ])
  await expect(
    row.getByRole('button', { name: 'Save', exact: true }),
  ).toHaveAttribute('type', 'submit')
  for (const name of ['Reset', 'Extra'])
    await expect(
      row.getByRole('button', { name, exact: true }),
    ).toHaveAttribute('type', 'button')
  assert.equal(
    await row.evaluate((node) => node.parentElement.lastElementChild === node),
    true,
  )
}
