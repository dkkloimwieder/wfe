import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewDragBoard(page) {
  const fixture = page.locator('#drag-board-review')
  await fixture
    .getByRole('button', { name: 'Assign hydrated sample', exact: true })
    .click()
  await expect(fixture.locator('[data-generic-assigned]')).toHaveText(
    'Assigned',
  )
  const handle = fixture.getByRole('button', {
    name: 'Move Hydrated draft',
    exact: true,
  })
  await handle.focus()
  await handle.press('Space')
  await expect(fixture.getByRole('status').last()).toHaveText(
    'Picked up Hydrated draft.',
  )
  await handle.press('Escape')
  await expect(fixture.locator('[data-hydrated-move-count]')).toHaveText('0')
  assert.equal(
    await handle.evaluate((node) => node === document.activeElement),
    true,
  )
  await fixture
    .getByRole('button', {
      name: 'Move hydrated draft to second lane',
      exact: true,
    })
    .click()
  await expect(fixture.locator('[data-hydrated-move-count]')).toHaveText('1')
  await expect(
    fixture
      .getByRole('region', { name: 'Second lane' })
      .locator('[data-hydrated-card]'),
  ).toHaveCount(1)
  await expect(
    fixture
      .getByRole('region', { name: 'First lane' })
      .locator('[data-hydrated-card]'),
  ).toHaveCount(0)
}
