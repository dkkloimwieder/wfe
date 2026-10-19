import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function reviewDetailsServer(page) {
  await expect(page.getByLabel('name', { exact: true })).toHaveText(
    'Example record',
  )
  await expect(page.getByLabel('created', { exact: true })).toHaveText(
    '29/02/2024',
  )
  await expect(
    page.getByRole('img', { name: '0123456789abcdef' }),
  ).toHaveAttribute('title', '0123456789abcdef')
  await expect(
    page.getByRole('button', { name: 'Delete record', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
}
export async function reviewDetails({ page, record }) {
  const snapshot = () => page.evaluate(() => window.generatorFixture.snapshot())
  const trigger = () =>
    page.getByRole('button', { name: 'Delete record', exact: true })
  await record(
    'Generated detail fields share formats and application-owned actions',
    async () => {
      await reviewDetailsServer(page)
      await expect(page.getByRole('img', { name: 'Yes' })).toBeVisible()
      await page.getByRole('button', { name: 'Toggle active' }).click()
      await expect(page.getByRole('img', { name: 'No' })).toBeVisible()
      assert.equal((await snapshot()).actions, 1)
      assert.equal((await snapshot()).confirmations, 0)
      await expect(page.locator('form,input')).toHaveCount(0)
    },
  )
  await record(
    'Confirmation focuses Cancel and restores focus on cancel or Escape',
    async () => {
      await trigger().click()
      const cancel = page.getByRole('button', { name: 'Cancel', exact: true })
      await expect(cancel).toBeFocused()
      await cancel.click()
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      await expect(trigger()).toBeFocused()
      await trigger().click()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      await expect(trigger()).toBeFocused()
      assert.equal((await snapshot()).confirmations, 0)
    },
  )
  await record(
    'Changing a record key invalidates an open confirmation',
    async () => {
      await trigger().click()
      await page.evaluate(() => window.generatorFixture.revise())
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      await expect(page.getByLabel('name', { exact: true })).toHaveText(
        'Other record',
      )
      assert.equal((await snapshot()).confirmations, 0)
      await expect(trigger()).toBeFocused()
    },
  )
  await record(
    'Detail and confirmation fit small screens and delete only through the callback',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      )
      await trigger().click()
      await expect(page.getByRole('alertdialog')).toBeVisible()
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      )
      await page.screenshot({ path: '/tmp/wfe-details-phone.png' })
      await page
        .getByRole('button', { name: 'Confirm deletion', exact: true })
        .click()
      await expect(page.getByText('No record', { exact: true })).toBeVisible()
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      assert.equal((await snapshot()).confirmations, 1)
      await page.getByRole('button', { name: 'Restore example' }).click()
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.screenshot({ path: '/tmp/wfe-details-wide.png' })
    },
  )
  await record(
    'Disposing an open generated confirmation releases its portal and focus work',
    async () => {
      await trigger().click()
      await page.evaluate(() => window.generatorFixture.stop())
      await expect(page.locator('#root')).toBeEmpty()
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      assert.equal((await snapshot()).confirmations, 1)
    },
  )
}
