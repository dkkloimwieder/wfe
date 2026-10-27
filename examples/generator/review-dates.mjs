import {
  reviewNestedMessages,
  reviewNestedMessagesServer,
} from './review-nested-messages.mjs'
import assert from 'node:assert/strict'
import {
  choiceControl,
  selectValue,
} from '../shared/controls/select-review.mjs'
import { expect } from '@playwright/test'
export async function reviewDateServer(page) {
  await reviewNestedMessagesServer(page)
  await expect(
    page.getByRole('textbox', { name: 'Review date', exact: true }),
  ).toHaveValue('29/02/2024')
  await expect(
    page.getByRole('textbox', { name: 'System appointment', exact: true }),
  ).toHaveValue('29/02/2024 14:15')
  await expect(page.locator('[data-date-display="detail-date"]')).toHaveText(
    '29/02/2024',
  )
  await expect(page.locator('[data-date-display="detail-time"]')).toHaveText(
    '29/02/2024 14:15',
  )
  await expect(page.locator('[data-date-display="summary"]')).toHaveText(
    '29/02/2024 14:15',
  )
  await expect(page.locator('[data-date-display="browser-time"]')).toHaveText(
    '',
  )
  const local = page.getByRole('group', {
    name: 'Local appointment',
    exact: true,
  })
  await expect(
    local.getByRole('textbox', { name: 'Local appointment', exact: true }),
  ).toBeDisabled()
  await expect(
    local.getByRole('textbox', { name: 'Local appointment', exact: true }),
  ).toHaveValue('')
}
export async function reviewDates({ page, record }) {
  await reviewNestedMessages({ page, record })
  const date = page.getByRole('textbox', { name: 'Review date', exact: true })
  const system = page.getByRole('group', {
    name: 'System appointment',
    exact: true,
  })
  const systemDate = system.getByRole('textbox', {
    name: 'System appointment',
    exact: true,
  })
  const submit = page.getByRole('button', { name: 'Apply', exact: true })
  const snapshot = () => page.evaluate(() => window.generatorFixture.snapshot())
  const configure = (next) =>
    page.evaluate(
      (next) => window.generatorFixture.dateConfiguration(next),
      next,
    )
  const phase = (expected) =>
    expect.poll(async () => (await snapshot()).phase).toBe(expected)
  await record(
    'Shared date output updates table cells, details and summaries without replacing values',
    async () => {
      const cell = page.locator(
        'tr[data-row="appointment"] [data-column="instant"]',
      )
      const detail = page.locator('[data-date-display="detail-time"]')
      const summary = page.locator('[data-date-display="summary"]')
      await expect(cell).toHaveText('29/02/2024 14:15')
      const before = await snapshot()
      await cell.evaluate((node) => {
        window.originalDateCell = node
      })
      await configure({
        dateFormat: 'MM/dd/yyyy',
        timeFormat: 'hh:mm:ss a',
        timeZone: 'America/New_York',
        locale: 'en-US',
      })
      for (const output of [cell, detail, summary])
        await expect(output).toHaveText('02/29/2024 09:15:16 AM')
      assert.equal(
        await cell.evaluate((node) => node === window.originalDateCell),
        true,
      )
      await selectValue(
        choiceControl(page, { name: 'Timestamp column', exact: true }),
        'datetime-iso',
      )
      for (const output of [cell, detail, summary])
        await expect(output).toHaveText('2024-02-29T14:15:16.123Z')
      await selectValue(
        choiceControl(page, { name: 'Date column', exact: true }),
        'date-long',
      )
      await expect(
        page.locator('[data-date-display="detail-date"]'),
      ).toHaveText('February 29, 2024')
      const after = await snapshot()
      assert.deepEqual(after.values, before.values)
      assert.deepEqual(after.rawRows, before.rawRows)
      assert.deepEqual(after.exportRows, before.exportRows)
      assert.equal(after.requests, 0)
      await selectValue(
        choiceControl(page, { name: 'Timestamp column', exact: true }),
        'datetime',
      )
      await selectValue(
        choiceControl(page, { name: 'Date column', exact: true }),
        'date',
      )
      await configure({
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        timeZone: 'UTC',
        locale: 'en-GB',
      })
    },
  )
  await record(
    'Display choices do not change raw table sorting, filtering or export records',
    async () => {
      await page.evaluate(() => window.generatorFixture.dateTable('desc'))
      const sorted = await snapshot()
      assert.deepEqual(sorted.rowIds, ['other', 'appointment'])
      await configure({ timeZone: 'Asia/Kathmandu', dateFormat: 'MM/dd/yyyy' })
      assert.deepEqual((await snapshot()).exportRows, sorted.exportRows)
      assert.deepEqual((await snapshot()).rowIds, sorted.rowIds)
      await page.evaluate(() =>
        window.generatorFixture.dateTable('desc', '2024-03-01T00:00Z'),
      )
      const filtered = await snapshot()
      assert.deepEqual(filtered.rowIds, ['other'])
      assert.equal(filtered.exportRows[0].instant, '2024-03-10T07:30:00.000Z')
      await configure({ dateFormat: 'dd/MM/yyyy', timeZone: 'UTC' })
      assert.deepEqual((await snapshot()).exportRows, filtered.exportRows)
      await page.evaluate(() => window.generatorFixture.dateTable('asc'))
    },
  )
  await record(
    'Date descriptions preserve canonical values through format and timezone changes',
    async () => {
      await configure({
        dateFormat: 'MM/dd/yyyy',
        timeZone: 'America/New_York',
        timeFormat: 'hh:mm:ss a',
        locale: 'en-US',
      })
      await expect(date).toHaveValue('02/29/2024')
      await expect(systemDate).toHaveValue('02/29/2024 09:15:16 AM')
      assert.equal((await snapshot()).requests, 0)
      await systemDate.fill('02/29/2024 10:20:30 AM')
      assert.equal(
        (await snapshot()).values.systemTime,
        '2024-02-29T15:20:30.123Z',
      )
      await configure({
        dateFormat: 'dd/MM/yyyy',
        timeZone: 'UTC',
        timeFormat: 'HH:mm',
      })
      await expect(systemDate).toHaveValue('29/02/2024 15:20')
    },
  )
  await record(
    'An invalid date draft blocks validation and submission and receives focus',
    async () => {
      await date.fill('30/02/2024')
      await submit.click()
      await expect(date).toBeFocused()
      assert.equal((await snapshot()).validations, 0)
      assert.equal((await snapshot()).submissions, 0)
      assert.equal((await snapshot()).values.reviewDate, '2024-02-29')
      await date.press('Escape')
      await submit.click()
      await phase('success')
      assert.equal((await snapshot()).submissions, 1)
    },
  )
  await record(
    'An invalid datetime draft blocks submission until recovery',
    async () => {
      const before = (await snapshot()).validations
      await systemDate.fill('29/02/2024 25:00')
      await submit.click()
      await expect(systemDate).toBeFocused()
      assert.equal((await snapshot()).validations, before)
      await systemDate.press('Escape')
      await submit.click()
      await phase('success')
      assert.equal((await snapshot()).validations, before + 1)
    },
  )
  await record(
    'Readonly and disabled fields release local draft blocks',
    async () => {
      for (const key of ['readonly', 'disabled']) {
        await date.fill('30/02/2024')
        await configure({ [key]: true })
        const before = (await snapshot()).submissions
        await submit.click()
        await expect
          .poll(async () => (await snapshot()).submissions)
          .toBe(before + 1)
        await configure({ [key]: false })
        await date.press('Escape')
      }
    },
  )
  await record(
    'Application errors allow retry and do not become a local draft block',
    async () => {
      await configure({ businessError: true })
      await submit.click()
      await phase('invalid')
      await expect(
        page.getByText('Application rejected this date', { exact: true }),
      ).toBeVisible()
      const before = (await snapshot()).validations
      await configure({ businessError: false })
      await submit.click()
      await phase('success')
      assert.equal((await snapshot()).validations, before + 1)
    },
  )
  await record(
    'Rejected requests and external values keep application ownership',
    async () => {
      const accepted = (await snapshot()).values.reviewDate
      await configure({ reject: true })
      await date.fill('01/03/2024')
      await systemDate.focus()
      await expect(date).toHaveValue('29/02/2024')
      assert.equal((await snapshot()).values.reviewDate, accepted)
      await configure({ reject: false })
      await page.evaluate(() =>
        window.generatorFixture.dateValues({
          reviewDate: '2025-01-15',
          systemTime: '2025-01-15T12:45:17.456Z',
          browserTime: '2025-01-15T12:45:17.456Z',
        }),
      )
      await expect(date).toHaveValue('15/01/2025')
      await expect(systemDate).toHaveValue('15/01/2025 12:45')
    },
  )
  await record(
    'Date controls and description controls fit a narrow viewport',
    async () => {
      const wide = await page.evaluate(() => {
        const editor = document
          .querySelector('[data-generator-panel="date-editor"]')
          .getBoundingClientRect()
        const records = document
          .querySelector('[data-generator-panel="date-records"]')
          .getBoundingClientRect()
        const table = document.querySelector('.date-display-review table')
        return {
          editor: {
            left: editor.left,
            width: editor.width,
            bottom: editor.bottom,
          },
          records: {
            left: records.left,
            width: records.width,
            top: records.top,
          },
          tableWidth: table.getBoundingClientRect().width,
          available: table.parentElement.clientWidth,
        }
      })
      assert.ok(Math.abs(wide.editor.left - wide.records.left) <= 1)
      assert.ok(Math.abs(wide.editor.width - wide.records.width) <= 1)
      assert.ok(wide.editor.bottom <= wide.records.top)
      assert.ok(Math.abs(wide.tableWidth - wide.available) <= 2)

      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
      )
      const rectangles = await page
        .locator('form .ui-date-picker, form .ui-datetime-picker')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const r = node.getBoundingClientRect()
            return { left: r.left, right: r.right }
          }),
        )
      assert.ok(rectangles.every((r) => r.left >= 0 && r.right <= 390))
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )
  await record(
    'Removing an invalid field releases its local submit block',
    async () => {
      await date.fill('30/02/2024')
      const before = (await snapshot()).submissions
      await page.evaluate(() => window.generatorFixture.remove())
      await expect(date).toHaveCount(0)
      await submit.click()
      await expect
        .poll(async () => (await snapshot()).submissions)
        .toBe(before + 1)
    },
  )
  await record(
    'Date view disposal releases an open popup and retained time listeners',
    async () => {
      await page
        .getByRole('button', {
          name: 'Open System appointment date and time picker',
          exact: true,
        })
        .click()
      const before = (await snapshot()).requests
      await systemDate.evaluate((node) => {
        window.detachedDateTime = node
      })
      await page.evaluate(() => window.generatorFixture.stop())
      await page.evaluate(() => {
        const node = window.detachedDateTime
        node.value = '15/01/2025 15:20'
        node.dispatchEvent(new Event('input', { bubbles: true }))
      })
      assert.equal((await snapshot()).requests, before)
      assert.equal(await page.locator('.ui-date-popup').count(), 0)
    },
  )
}
