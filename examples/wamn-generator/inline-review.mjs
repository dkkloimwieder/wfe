import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import { selectValue } from '../shared/controls/select-review.mjs'

export async function reviewInline({ page, record }) {
  const state = () => page.evaluate(() => window.generatorFixture.snapshot())
  const rowId = async (index) => (await state()).rows[index].id
  const trigger = async (index) =>
    page.locator(`[data-inline-code="${await rowId(index)}"]`)
  const editor = () => page.locator('[data-inline-editor]')
  const control = () => editor().locator('[aria-haspopup=listbox]')
  const cancel = () =>
    editor().getByRole('button', { name: 'Cancel', exact: true })
  const save = () => editor().getByRole('button', { name: 'Save', exact: true })
  const rowAction = async (action, index) =>
    page.getByRole('button', {
      name: `${action} ${await rowId(index)}`,
      exact: true,
    })
  const back = () =>
    page.getByRole('button', { name: 'Back to records', exact: true }).click()

  await record(
    'Inline code uses the shared select with explicit Save and Cancel',
    async () => {
      const before = await state()
      const second = await rowId(1)
      const url = page.url()
      const initial = before.rows[1].code
      const changed = initial === 'priority' ? 'standard' : 'priority'
      await (await trigger(1)).press('Enter')
      await expect(control()).toBeFocused()
      await expect(control()).toHaveAttribute('data-value', initial)
      await selectValue(control(), changed)
      assert.equal((await state()).rows[1].code, initial)
      assert.equal((await state()).sent.length, before.sent.length)
      await control().press('Escape')
      await expect(editor()).toHaveCount(0)
      await expect(await trigger(1)).toBeFocused()
      assert.equal((await state()).sent.length, before.sent.length)
      await (await trigger(1)).click()
      await selectValue(control(), changed)
      const retained = await control().elementHandle()
      for (
        let step = 0;
        step < 3 &&
        (await page
          .locator('th[data-column=createdAt]')
          .getAttribute('aria-sort')) !== 'ascending';
        step++
      )
        await page
          .getByRole('button', { name: /^Sort by Created at$/i })
          .click()
      const variant =
        (await page.locator('form').getAttribute('aria-label')) === 'update'
          ? 'review'
          : 'original'
      await page.evaluate(
        (name) => window.generatorFixture.variant(name),
        variant,
      )
      assert.equal(await retained.evaluate((node) => node.isConnected), true)
      await retained.dispose()
      await (await rowAction('View', 0)).click()
      await expect(page.locator('[data-wamn-screen=details]')).toBeVisible()
      await page.goBack()
      await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
      await expect(control()).toHaveAttribute('data-value', changed)
      await expect(page).toHaveURL(url)
      await save().click()
      await expect(editor()).toHaveCount(0)
      await expect(await trigger(1)).toHaveText(changed)
      await expect(await trigger(1)).toBeFocused()
      const after = await state()
      const sent = after.sent.at(-1)
      assert.equal(sent.path, '/widget/update')
      assert.equal(sent.item.id, second)
      assert.equal(sent.item.expected_edit_version, before.rows[1].editVersion)
      assert.deepEqual(sent.item.change, {
        code: changed,
        note: before.rows[1].note,
      })
      assert.equal(after.rows[1].code, changed)
      assert.deepEqual(after.rows[0], before.rows[0])
    },
  )

  await record(
    'Inline drafts transfer to the full editor on a phone-sized screen',
    async () => {
      const before = await state()
      const changed =
        before.rows[1].code === 'priority' ? 'standard' : 'priority'
      await page.setViewportSize({ width: 390, height: 844 })
      try {
        await (await trigger(1)).click()
        await selectValue(control(), changed)
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        )
        await (await rowAction('Edit', 0)).click()
        await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
        await expect(editor()).toHaveAttribute(
          'data-inline-editor',
          await rowId(1),
        )
        await (await rowAction('Edit', 1)).click()
        await expect(page.locator('[data-wamn-screen=editor]')).toBeVisible()
        await expect(
          page.locator('form [aria-haspopup=listbox]'),
        ).toHaveAttribute('data-value', changed)
        await expect(page.locator('form textarea')).toHaveValue(
          before.rows[1].note,
        )
        await page.getByRole('button', { name: 'Cancel', exact: true }).click()
        await expect(editor()).toHaveCount(0)
        assert.equal((await state()).sent.length, before.sent.length)
        assert.deepEqual((await state()).rows, before.rows)
      } finally {
        await page.setViewportSize({ width: 1280, height: 900 })
      }
    },
  )
  await record(
    'Inline code preserves full-form drafts and shows application errors',
    async () => {
      await (await rowAction('Edit', 0)).click()
      await page.locator('form textarea').fill('Keep the full form draft')
      await back()
      await (await trigger(1)).click()
      await expect(editor()).toHaveCount(0)
      assert.equal((await state()).values.note, 'Keep the full form draft')
      await (await rowAction('Edit', 0)).click()
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      const before = await state()
      await (await trigger(1)).click()
      const changed =
        before.rows[1].code === 'priority' ? 'standard' : 'priority'
      await selectValue(control(), changed)
      await page.evaluate(() =>
        window.generatorFixture.fault('/widget/update', 'refuse'),
      )
      await save().click()
      await expect(editor().getByRole('alert')).toBeVisible()
      await expect(control()).toHaveAttribute('data-value', changed)
      await expect(control()).not.toHaveAttribute('aria-invalid', 'true')
      assert.deepEqual((await state()).rows[1], before.rows[1])
      await save().click()
      await expect(editor()).toHaveCount(0)
      assert.equal((await state()).rows[1].code, changed)
    },
  )

  await record(
    'Inline pending state keeps Cancel available and ignores late completion',
    async () => {
      const before = await state()
      await (await trigger(1)).click()
      const changed =
        before.rows[1].code === 'priority' ? 'standard' : 'priority'
      await selectValue(control(), changed)
      await page.evaluate(() =>
        window.generatorFixture.fault('/widget/update', 'hold'),
      )
      await save().click()
      await expect(editor()).toHaveAttribute('aria-busy', 'true')
      await expect(control()).toBeDisabled()
      await expect(save()).toBeDisabled()
      await expect(cancel()).toBeEnabled()
      await cancel().click()
      await expect(editor()).toHaveCount(0)
      await (await trigger(0)).click()
      const firstChange =
        before.rows[0].code === 'priority' ? 'standard' : 'priority'
      await selectValue(control(), firstChange)
      await page.evaluate(() => window.generatorFixture.release())
      await expect
        .poll(async () => (await state()).lifecycle.writesSettled)
        .toBe(before.lifecycle.writesSettled + 1)
      await expect(editor()).toHaveAttribute(
        'data-inline-editor',
        await rowId(0),
      )
      await expect(control()).toHaveAttribute('data-value', firstChange)
      assert.deepEqual((await state()).rows, before.rows)
      await cancel().click()
      await expect(editor()).toHaveCount(0)
    },
  )
}
