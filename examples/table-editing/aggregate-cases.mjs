import { expect } from '@playwright/test'
import {
  choiceOptions,
  choiceControl,
  selectValue,
  controlValue,
} from '../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'

export async function aggregateCases({
  page,
  start,
  call,
  read,
  record,
  settle,
  edit,
  input,
  idle,
}) {
  const choice = (name) =>
    choiceControl(page, { name: `${name} summary`, exact: true })
  const group = () => page.locator('[data-group]').first()
  const summary = (id) => group().locator(`[data-group-summary="${id}"]`)
  const value = (id) => summary(id).textContent()
  const header = (id) =>
    page.locator(`[data-summary-header="${id}"]`).innerText()
  const day = 86_400_000
  async function seed() {
    await start(5, 'table')
    const amounts = [10, 20, 90, null, 20]
    const names = ['Amy', 'Ben', 'Ada', 'Bea', 'Ari']
    for (let i = 0; i < 5; i++)
      await call('patch', `R000${i + 1}`, {
        amount: amounts[i],
        name: names[i],
        dueDate: i === 3 ? null : Date.UTC(2026, 9, 1) + i * day,
      })
    await call('grouping', ['priority'])
    await settle()
  }
  await record(
    'numeric summaries include median, range and span over saved filtered leaves',
    async () => {
      await seed()
      for (const [name, result] of [
        ['sum', '140'],
        ['min', '10'],
        ['max', '90'],
        ['mean', '35'],
        ['median', '20'],
        ['range', '10 – 90'],
        ['span', '80'],
        ['count', '5'],
        ['filled', '4'],
        ['empty', '1'],
        ['distinct', '3'],
      ]) {
        await selectValue(choice('Amount'), name)
        assert.equal(await value('amount'), result)
        assert.equal(
          await header('amount'),
          (name === 'mean' ? 'avg' : name).toUpperCase(),
        )
      }
      await selectValue(choice('Amount'), 'mean')
      await call('grouping', ['priority', 'name'])
      assert.equal(await value('amount'), '35') // Child averages would be incorrect.
      await call('filter', 'name', 'a')
      assert.equal(await value('amount'), '40')
      await selectValue(choice('Amount'), 'median')
      assert.equal(await value('amount'), '20')
      await call('filter', 'name', '')
      await call('patch', 'R0003', { amount: -10 })
      await selectValue(choice('Amount'), 'range')
      assert.equal(await value('amount'), '-10 – 20')
    },
  )
  await record(
    'date summaries show UTC dates, elapsed days and empty values',
    async () => {
      await seed()
      assert.equal(
        (await choiceOptions(choice('Due date'))).filter(
          (option) => option.value === 'sum',
        ).length,
        0,
      )
      for (const [name, result] of [
        ['min', '2026-10-01'],
        ['max', '2026-10-05'],
        ['range', '2026-10-01 – 2026-10-05'],
        ['span', '4 days'],
        ['filled', '4'],
        ['empty', '1'],
        ['count', '5'],
      ]) {
        await selectValue(choice('Due date'), name)
        assert.equal(await value('dueDate'), result)
        assert.equal(await header('dueDate'), name.toUpperCase())
      }
      await call('filter', 'name', 'Bea')
      await selectValue(choice('Due date'), 'range')
      assert.equal(await value('dueDate'), '—')
      await selectValue(choice('Amount'), 'mean')
      assert.equal(await value('amount'), '—')
      await selectValue(choice('Amount'), 'sum')
      assert.equal(await value('amount'), '0')
      await call('filter', 'name', 'absent')
      assert.equal(await page.locator('[data-group]').count(), 0)
      await call('filter', 'name', '')
      assert.equal(await value('dueDate'), '2026-10-01 – 2026-10-05')
    },
  )
  await record(
    'general aggregates count blanks and distinct values without changing source values',
    async () => {
      await seed()
      for (const [id, note] of [
        ['R0001', 'same'],
        ['R0002', 'same'],
        ['R0003', ''],
        ['R0004', '  '],
        ['R0005', ' same '],
      ])
        await call('patch', id, { note })
      for (const [name, result] of [
        ['count', 5],
        ['filled', 3],
        ['empty', 2],
        ['distinct', 2],
      ]) {
        await selectValue(choice('Note'), name)
        assert.equal(await value('note'), String(result))
        assert.equal(await header('note'), name.toUpperCase())
      }
      assert.equal(
        (await choiceOptions(choice('Note'))).filter(
          (option) => option.value === 'median',
        ).length,
        0,
      )
      await call('summary', 'note', 'median') // Reject a caller choice outside the column catalog.
      assert.equal(await controlValue(choice('Note')), 'distinct')
      assert.equal((await read()).sample[4].note, ' same ')
    },
  )
  await record(
    'first and last follow record sorting independently of expansion and group ordering',
    async () => {
      await seed()
      await call('grouping', ['priority', 'name'])
      await selectValue(choice('Amount'), 'last')
      assert.equal(await value('amount'), '20')
      await call('sorting', [{ id: 'name', desc: false }])
      assert.equal(await value('amount'), '20') // Ben is last.
      await selectValue(choice('Amount'), 'first')
      assert.equal(await value('amount'), '90') // Ada is first.
      await call('sorting', [{ id: 'name', desc: true }])
      assert.equal(await value('amount'), '20')
      await call('sorting', [{ id: 'dueDate', desc: true }])
      await selectValue(choice('Amount'), 'last')
      assert.equal(await value('amount'), '—') // Missing dates sort last, and first/last preserve blanks.
      assert.equal(await page.locator('[data-row]').count(), 0)
      await call('expandGroups', true)
      assert.equal(await value('amount'), '—')
    },
  )
  await record(
    'grouping columns retain their bucket labels while showing a selected aggregate',
    async () => {
      await seed()
      await selectValue(choice('Priority'), 'count')
      assert.equal(
        await group().locator('[data-group-toggle]').innerText(),
        '▸ normal',
      )
      assert.equal(await value('priority'), '5')
      assert.equal(await header('priority'), 'GROUP · COUNT')
      await call('grouping', ['name'])
      await selectValue(choice('Name'), 'first')
      await call('sorting', [{ id: 'name', desc: false }])
      assert.equal(
        await group().locator('[data-group-toggle]').innerText(),
        '▸ A',
      )
      assert.equal(await value('name'), 'Ada')
      assert.equal(await header('name'), 'GROUP · FIRST')
    },
  )
  await record(
    'summary controls retain configuration and reflect edits saved before grouping',
    async () => {
      await seed()

      assert.equal(await value('note'), '5')
      assert.equal(await header('note'), 'FILLED')
      await selectValue(choice('Note'), 'empty')
      assert.equal(await value('note'), '0')
      await expect(choice('Note')).toBeFocused()
      await choice('Amount').focus()
      await expect(choice('Amount')).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(page.getByRole('listbox')).toBeVisible()
      // Exercise navigation after the existing opening autofocus settles.
      await settle()
      await expect
        .poll(() =>
          page
            .getByRole('listbox')
            .evaluate((node) => node.contains(document.activeElement)),
        )
        .toBe(true)
      await page.keyboard.press('Home')
      await expect(page.getByRole('option').first()).toHaveAttribute(
        'data-highlighted',
        '',
      )
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('[data-choice-value="count"]')).toHaveAttribute(
        'data-highlighted',
        '',
      )
      await page.keyboard.press('Enter')
      await expect(choice('Amount')).toHaveAttribute('data-value', 'count')
      assert.equal((await read()).summaries.amount, 'count')
      await call('summary', 'amount', 'median')
      assert.equal(await controlValue(choice('Amount')), 'median')
      await call('controls', { grouping: false })
      assert.equal(await choice('Amount').count(), 0)
      await call('controls', { grouping: true })
      assert.equal(await controlValue(choice('Amount')), 'median')
      await call('localProcessing', false)
      assert.ok(await choice('Amount').isDisabled())
      await call('localProcessing', true)
      await call('grouping', [])
      await edit('R0001', 'note').click()
      await input('R0001', 'note').fill('')
      await page.getByRole('button', { name: 'Save all', exact: true }).click()
      await idle()
      await call('grouping', ['priority'])
      assert.equal(await value('note'), '1')
      assert.deepEqual((await read()).drafts, {})
    },
  )
  await record(
    'summary ordering uses numeric and range values and retains its choice when disabled',
    async () => {
      await seed()
      await call('patch', 'R0003', { priority: 'high' })
      const order = choiceControl(page, {
        name: 'Order Priority groups',
        exact: true,
      })
      await selectValue(order, 'amount:desc')
      assert.equal(
        await group().locator('[data-group-toggle]').innerText(),
        '▸ high',
      )
      await selectValue(choice('Amount'), 'range')
      await selectValue(order, 'amount:asc')
      assert.equal(
        await group().locator('[data-group-toggle]').innerText(),
        '▸ normal',
      )
      await call('patch', 'R0001', { amount: 100 })
      await call('patch', 'R0002', { amount: 100 })
      await call('patch', 'R0005', { amount: 100 })
      assert.equal(
        await group().locator('[data-group-toggle]').innerText(),
        '▸ high',
      )
      await selectValue(choice('Amount'), 'none')
      assert.equal(await summary('amount').count(), 0)
      assert.equal(await header('amount'), '-')
      assert.equal((await read()).groupSorting[0].id, 'amount')
      await selectValue(choice('Amount'), 'sum')
      assert.equal(
        await group().locator('[data-group-toggle]').innerText(),
        '▸ high',
      )
    },
  )
  await record(
    'equivalent ranges and repeated aggregate changes keep views stable and release them',
    async () => {
      await seed()
      await selectValue(choice('Amount'), 'range')
      const before = await read()
      for (let i = 0; i < 8; i++)
        await call('patch', 'R0002', { amount: 21 + i })
      assert.equal(await value('amount'), '10 – 90')
      for (let i = 0; i < 8; i++) {
        await selectValue(choice('Amount'), 'median')
        await selectValue(choice('Amount'), 'range')
      }
      const after = await read()
      assert.equal(after.counts.groupReads, before.counts.groupReads)
      assert.equal(after.counts.groupViews, before.counts.groupViews)
      assert.equal(after.counts.groupCells, before.counts.groupCells)
      assert.equal(
        after.counts.medianValues - before.counts.medianValues,
        8 * 4,
      )
      assert.equal(after.counts.requests, 0)
      assert.equal(after.counts.validations, 0)
      await call('stop')
      const disposed = await call('lastCounts')
      assert.equal(disposed.groupViews, disposed.groupsUnmounted)
      assert.equal(disposed.views, disposed.unmounted)
    },
  )
}
