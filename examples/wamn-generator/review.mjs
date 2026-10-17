import { reviewAppearance } from './appearance-review.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import { selectValue } from '../shared/controls/select-review.mjs'
export async function reviewServer(page, name) {
  await expect(
    page
      .locator('form')
      .getByLabel(name === 'original' ? 'Operator note' : 'Service note', {
        exact: true,
      }),
  ).toHaveValue('Widget 0')
  await expect(
    page
      .locator('form')
      .getByLabel(name === 'original' ? 'Widget code' : 'Handling class', {
        exact: true,
      }),
  ).toHaveCount(1)
  await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
  await expect(page.locator('[data-wamn-screen=editor]')).toBeHidden()
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.locator('table')).toContainText('9007199254740993')
}
export async function review({ page, record }) {
  await reviewAppearance({ page, record })
  const edit = async () => {
    if (await page.locator('[data-wamn-screen=editor]').isHidden())
      await page
        .getByRole('button', { name: 'Edit widget', exact: true })
        .click()
  }
  const back = async () => {
    if (await page.locator('[data-wamn-screen=records]').isHidden())
      await page
        .getByRole('button', { name: 'Back to records', exact: true })
        .click()
  }
  const state = () => page.evaluate(() => window.generatorFixture.snapshot())
  const note = () => page.locator('form textarea')
  const phase = (value) =>
    expect.poll(async () => (await state()).phase).toBe(value)
  const refresh = () =>
    page.getByRole('button', { name: /^(Refresh|Reload) widgets$/ })
  const save = () =>
    page.getByRole('button', { name: 'Save widget', exact: true })
  await record(
    'WAMN screen navigation preserves drafts and owners until explicit Cancel',
    async () => {
      await page.evaluate(() => {
        window.adapterNodes = [
          ...document.querySelectorAll('#root textarea, #root table'),
        ]
      })
      await edit()
      assert.equal(
        await page
          .locator('[data-wamn-screen=editor]')
          .evaluate((node) => node.contains(document.activeElement)),
        true,
      )
      await note().fill('Draft across screens')
      const sent = (await state()).sent.length
      await back()
      await expect(note()).toHaveValue('Draft across screens')
      await edit()
      await expect(note()).toHaveValue('Draft across screens')
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
      await expect(note()).toHaveValue('Widget 0')
      await expect(
        page.getByRole('button', { name: 'Edit widget', exact: true }),
      ).toBeFocused()
      assert.equal((await state()).sent.length, sent)
      assert.equal(
        await page.evaluate(() =>
          window.adapterNodes.every((node) => node.isConnected),
        ),
        true,
      )
    },
  )
  await record(
    'WAMN table controls use application-owned collapse state',
    async () => {
      const toggle = page.getByRole('button', {
        name: 'Table controls',
        exact: true,
      })
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    },
  )
  await record('WAMN query and Open use generated wire bindings', async () => {
    await refresh().click()
    await expect
      .poll(async () => (await state()).status)
      .toBe('Widgets refreshed')
    assert.equal((await state()).sent.at(-1).path, '/widget/query')
    assert.deepEqual((await state()).sent.at(-1).item, { limit: 2 })
    await page.getByRole('button', { name: 'Open widget', exact: true }).click()
    await expect.poll(async () => (await state()).status).toMatch(/^Opened /)
    assert.equal((await state()).sent.at(-1).path, '/widget/get')
  })
  await record(
    'WAMN query rejects duplicate rows and read refusals without replacing records',
    async () => {
      const original = (await state()).rows
      for (const fault of ['duplicate', 'refuse']) {
        await page.evaluate(
          (value) => window.generatorFixture.fault('/widget/query', value),
          fault,
        )
        await refresh().click()
        await expect.poll(async () => (await state()).busy).toBe(false)
        assert.notEqual((await state()).status, 'Widgets refreshed')
        assert.deepEqual((await state()).rows, original)
      }
      await refresh().click()
      await expect
        .poll(async () => (await state()).status)
        .toBe('Widgets refreshed')
    },
  )
  await record(
    'WAMN form updates exact revision and maps typed choices and values',
    async () => {
      await edit()
      await note().fill('Saved through generic form')
      await selectValue(
        page.locator('form [aria-haspopup="listbox"]'),
        'priority',
      )
      await save().click()
      await phase('success')
      const sent = (await state()).sent.at(-1)
      assert.equal(sent.path, '/widget/update')
      assert.equal(sent.item.expected_edit_version, '9007199254740993')
      assert.deepEqual(sent.item.change, {
        code: 'priority',
        note: 'Saved through generic form',
      })
      assert.equal(typeof sent.item.request_id, 'string')
      await expect(page.locator('table')).toContainText('9007199254740994')
      await expect(page.locator('table')).toContainText(
        'Saved through generic form',
      )
    },
  )
  await record(
    'WAMN refusals remain form errors and permit retry',
    async () => {
      await page.evaluate(() =>
        window.generatorFixture.fault('/widget/update', 'refuse'),
      )
      await edit()
      await note().fill('Retry draft')
      await save().click()
      await phase('rejected')
      await expect(page.locator('form [role="alert"]')).toBeVisible()
      assert.equal((await state()).rows[0].note, 'Saved through generic form')
      await save().click()
      await phase('success')
      await expect(page.locator('table')).toContainText('Retry draft')
    },
  )
  await record(
    'WAMN metadata changes preserve draft, focus and mounted nodes',
    async () => {
      await edit()
      await note().fill('Preserved local draft')
      await note().focus()
      const initialName = await page.locator('form').getAttribute('aria-label')
      await page.evaluate(
        (name) => {
          window.adapterNodes = [
            ...document.querySelectorAll(
              '#root textarea, #root table, #root form [aria-haspopup="listbox"]',
            ),
          ]
          window.generatorFixture.variant(name)
        },
        initialName === 'update' ? 'review' : 'original',
      )
      await expect(note()).toBeFocused()
      await expect(note()).toHaveValue('Preserved local draft')
      assert.equal(
        await page.evaluate(() =>
          window.adapterNodes.every((node) => node.isConnected),
        ),
        true,
      )
      const expected = initialName === 'update' ? 'note' : 'code'
      await expect(page.locator('tbody td').first()).toHaveAttribute(
        'data-column',
        expected,
      )
      const before = (await state()).sent.length
      await refresh().click()
      await expect
        .poll(async () => (await state()).status)
        .toBe('Save or reset the draft before reading')
      assert.equal((await state()).sent.length, before)
      await page
        .getByRole('button', { name: 'Reset draft', exact: true })
        .click()
      await expect(note()).toHaveValue('Retry draft')
    },
  )
  await record('WAMN held query cannot overwrite a newer draft', async () => {
    await page.evaluate(() =>
      window.generatorFixture.fault('/widget/query', 'hold'),
    )
    const settled = (await state()).lifecycle.readsSettled
    const count = (await state()).sent.length
    await refresh().click()
    await expect.poll(async () => (await state()).sent.length).toBe(count + 1)
    await edit()
    await note().fill('New draft while reading')
    await page.evaluate(() => window.generatorFixture.release())
    await expect
      .poll(async () => (await state()).lifecycle.readsSettled)
      .toBe(settled + 1)
    await expect(note()).toHaveValue('New draft while reading')
    await page.getByRole('button', { name: 'Reset draft', exact: true }).click()
  })
  await record(
    'WAMN cancellation ignores late update publication',
    async () => {
      const settled = (await state()).lifecycle.writesSettled
      await edit()
      await note().fill('Server can commit a cancelled request')
      await page.evaluate(() => {
        window.generatorFixture.fault('/widget/update', 'hold')
        window.generatorFixture.submit()
      })
      await phase('submitting')
      await page.evaluate(() => {
        window.generatorFixture.cancel()
        window.generatorFixture.release()
      })
      await expect
        .poll(async () =>
          page.evaluate(() => window.generatorFixture.outcome()?.status),
        )
        .toBe('cancelled')
      await expect
        .poll(async () => (await state()).lifecycle.writesSettled)
        .toBe(settled + 1)
      assert.equal((await state()).rows[0].note, 'Retry draft')
      await page
        .getByRole('button', { name: 'Reset draft', exact: true })
        .click()
      await refresh().click()
      await expect
        .poll(async () => (await state()).status)
        .toBe('Widgets refreshed')
      await expect(note()).toHaveValue('Server can commit a cancelled request')
    },
  )
  await record(
    'WAMN adapter stays within narrow viewport and disposes held requests',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      const settled = (await state()).lifecycle.writesSettled
      await edit()
      await note().fill('Disposed update')
      await page.evaluate(() => {
        window.generatorFixture.fault('/widget/update', 'hold')
        window.generatorFixture.submit()
      })
      await phase('submitting')
      await page.evaluate(() => window.generatorFixture.stop())
      await expect
        .poll(async () =>
          page.evaluate(() => window.generatorFixture.outcome()?.status),
        )
        .toBe('disposed')
      await expect
        .poll(async () => (await state()).lifecycle.writesSettled)
        .toBe(settled + 1)
      assert.equal((await state()).lifecycle.disposals, 1)
      assert.equal(
        (await state()).rows[0].note,
        'Server can commit a cancelled request',
      )
      await expect(
        page.locator('#root input, #root textarea, #root table'),
      ).toHaveCount(0)
    },
  )
}
