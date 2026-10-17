import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function reviewDateServer(page) {
  await expect(
    page.getByRole('textbox', { name: 'Review date', exact: true }),
  ).toHaveValue('29/02/2024')
  await expect(
    page.getByRole('textbox', { name: 'System appointment', exact: true }),
  ).toHaveValue('29/02/2024')
  const local = page.getByRole('group', {
    name: 'Local appointment',
    exact: true,
  })
  await expect(
    local.getByRole('textbox', { name: 'Local appointment', exact: true }),
  ).toBeDisabled()
  await expect(
    local.getByRole('textbox', { name: 'Time', exact: true }),
  ).toHaveValue('')
}
export async function reviewDates({ page, record }) {
  const date = page.getByRole('textbox', { name: 'Review date', exact: true })
  const system = page.getByRole('group', {
    name: 'System appointment',
    exact: true,
  })
  const systemDate = system.getByRole('textbox', {
    name: 'System appointment',
    exact: true,
  })
  const time = system.getByRole('textbox', { name: 'Time', exact: true })
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
    'Date descriptions preserve canonical values through format and timezone changes',
    async () => {
      await configure({
        dateFormat: 'MM/dd/yyyy',
        timeZone: 'America/New_York',
        timeFormat: 'hh:mm:ss a',
        locale: 'en-US',
      })
      await expect(date).toHaveValue('02/29/2024')
      await expect(time).toHaveValue('09:15:16 AM')
      assert.equal((await snapshot()).requests, 0)
      await time.fill('10:20:30 AM')
      assert.equal(
        (await snapshot()).values.systemTime,
        '2024-02-29T15:20:30.123Z',
      )
      await configure({
        dateFormat: 'dd/MM/yyyy',
        timeZone: 'UTC',
        timeFormat: 'HH:mm',
      })
      await expect(time).toHaveValue('15:20')
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
      await time.fill('25:00')
      await submit.click()
      await expect(time).toBeFocused()
      assert.equal((await snapshot()).validations, before)
      await time.press('Escape')
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
      await time.focus()
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
      await expect(systemDate).toHaveValue('15/01/2025')
      await expect(time).toHaveValue('12:45')
    },
  )
  await record(
    'Date controls and description controls fit a narrow viewport',
    async () => {
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
          name: 'Open System appointment calendar',
          exact: true,
        })
        .click()
      const before = (await snapshot()).requests
      await time.evaluate((node) => {
        window.detachedDateTime = node
      })
      await page.evaluate(() => window.generatorFixture.stop())
      await page.evaluate(() => {
        const node = window.detachedDateTime
        node.value = '15:20'
        node.dispatchEvent(new Event('input', { bubbles: true }))
      })
      assert.equal((await snapshot()).requests, before)
      assert.equal(await page.locator('.ui-date-popup').count(), 0)
    },
  )
}
