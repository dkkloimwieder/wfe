import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import {
  choiceControl,
  selectValue,
} from '../shared/controls/select-review.mjs'

export async function reviewDispatch({ page, record }) {
  const snapshot = () => page.evaluate(() => window.generatorFixture.snapshot())
  const code = () =>
    page.locator('form').getByLabel(/^(Tracking|Package) code$/)
  const phase = (value) =>
    expect.poll(async () => (await snapshot()).phase).toBe(value)
  const request = async () => (await snapshot()).provider.requests.at(-1)
  const begin = async (stage) => {
    await page.evaluate((value) => {
      window.generatorFixture.hold(value)
      window.generatorFixture.submit()
    }, stage)
    await phase(stage === 'validation' ? 'validating' : 'submitting')
    return await request()
  }
  const complete = async (entry) =>
    page.evaluate((entry) => {
      if (entry.stage === 'validation')
        window.generatorFixture.completeValidation(entry.id)
      else window.generatorFixture.completeSave(entry.id)
    }, entry)

  await record(
    'dispatch uses unrelated records, computed columns and a generated nullable number',
    async () => {
      await expect(page.locator('tbody tr')).toHaveCount(2)
      await expect(page.locator('table')).toContainText('PKG-100 / post')
      await expect(page.locator('table')).toContainText('$7.25')
      await expect(
        page.getByLabel('Declared value', { exact: true }),
      ).toHaveValue('')
      await page.getByLabel('Declared value', { exact: true }).fill('25')
      assert.equal((await snapshot()).values.declaredValue, 25)
      await page.getByLabel('Declared value', { exact: true }).fill('')
      assert.equal((await snapshot()).values.declaredValue, null)
    },
  )
  await record(
    'dispatch incomplete numeric drafts block UI submission before requests and retain accepted amounts',
    async () => {
      const amount = page.getByRole('textbox', {
        name: 'Declared value',
        exact: true,
      })
      await amount.fill('12.50')
      await expect(amount).toHaveValue('12.50')
      const before = (await snapshot()).provider.requests.length
      await amount.fill('1.')
      await code().press('Enter')
      await expect(amount).toBeFocused()
      assert.equal((await snapshot()).provider.requests.length, before)
      assert.equal((await snapshot()).values.declaredValue, 12.5)
      await amount.press('Escape')
      await expect(amount).toHaveValue('12.5')
      await page.evaluate(() => window.generatorFixture.rejectEdits(true))
      await amount.fill('9')
      await code().focus()
      await expect(amount).toHaveValue('12.5')
      assert.equal((await snapshot()).values.declaredValue, 12.5)
      await page.evaluate(() => window.generatorFixture.rejectEdits(false))
      await amount.fill('')
      assert.equal((await snapshot()).values.declaredValue, null)
    },
  )
  await record(
    'dispatch restores rejected edits and accepts shared select and switch changes',
    async () => {
      await page.evaluate(() => window.generatorFixture.rejectEdits(true))
      await code().fill('PKG-222')
      await expect(code()).toHaveValue('PKG-100')
      await page.evaluate(() => window.generatorFixture.rejectEdits(false))
      await selectValue(
        choiceControl(page.locator('form'), { name: 'Carrier', exact: true }),
        'courier',
      )
      await page
        .getByRole('switch', { name: 'Insured', exact: true })
        .press('Space')
      await expect(
        page.getByRole('switch', { name: 'Insured', exact: true }),
      ).toBeChecked()
      await page.getByLabel('Declared value', { exact: true }).fill('40')
      assert.equal((await snapshot()).values.carrier, 'courier')
    },
  )
  await record(
    'dispatch waits for validation and associates deferred field errors',
    async () => {
      await code().fill('bad')
      const entry = await begin('validation')
      assert.equal((await snapshot()).provider.publications, 0)
      await complete(entry)
      await phase('invalid')
      await expect(code()).toHaveAttribute('aria-invalid', 'true')
      assert.equal(
        await code().evaluate((node) =>
          node
            .getAttribute('aria-describedby')
            .split(' ')
            .some((id) =>
              document.getElementById(id)?.textContent.includes('Use PKG'),
            ),
        ),
        true,
      )
      await code().fill('PKG-222')
      await page.evaluate(() => window.generatorFixture.hold(undefined))
    },
  )
  await record(
    'dispatch presents service errors and retries through keyboard submission',
    async () => {
      for (const response of ['field-error', 'form-error', 'failure']) {
        await page.evaluate(
          (value) => window.generatorFixture.response(value),
          response,
        )
        await code().press('Enter')
        await phase(response === 'failure' ? 'error' : 'rejected')
        if (response === 'field-error')
          await expect(code()).toHaveAttribute('aria-invalid', 'true')
        if (response === 'form-error')
          await expect(page.locator('form')).toContainText(
            'Dispatch is closed for this date',
          )
        assert.equal((await snapshot()).provider.publications, 0)
      }
      await page.evaluate(() => window.generatorFixture.response('accepted'))
      await code().press('Enter')
      await phase('success')
      await expect(page.locator('tbody tr')).toHaveCount(3)
      assert.equal((await snapshot()).provider.publications, 1)
    },
  )
  await record(
    'dispatch keeps owners, focus and live callbacks after description changes',
    async () => {
      await page
        .getByRole('button', { name: 'Inspect package', exact: true })
        .click()
      await code().focus()
      await page.evaluate(() => {
        window.dispatchNodes = [
          ...document.querySelectorAll('#root input, #root table'),
        ]
        window.generatorFixture.revise()
      })
      await expect(code()).toBeFocused()
      await expect(code()).toHaveValue('PKG-222')
      await expect(page.locator('thead')).toContainText('Shipment route')
      await expect(page.locator('tbody td').first()).toHaveAttribute(
        'data-column',
        'fee',
      )
      await page
        .getByRole('button', { name: 'Inspect package', exact: true })
        .click()
      assert.deepEqual((await snapshot()).calls, ['first', 'updated'])
      assert.equal(
        await page.evaluate(() =>
          window.dispatchNodes.every((node) => node.isConnected),
        ),
        true,
      )
    },
  )
  await record(
    'dispatch cancels both request phases and ignores late replies',
    async () => {
      for (const stage of ['validation', 'save']) {
        const entry = await begin(stage)
        await page
          .getByRole('button', { name: 'Cancel request', exact: true })
          .click()
        await phase('idle')
        await complete(entry)
        await expect
          .poll(async () =>
            page.evaluate(() => window.generatorFixture.outcome()?.status),
          )
          .toBe('cancelled')
        assert.equal((await request()).aborted, true)
        assert.equal((await snapshot()).provider.publications, 1)
      }
    },
  )
  await record(
    'dispatch ignores replies for replaced accepted values',
    async () => {
      const entry = await begin('save')
      await page.evaluate(() => {
        const values = window.generatorFixture.snapshot().values
        window.generatorFixture.replace({ ...values, trackingCode: 'PKG-444' })
      })
      await phase('idle')
      await complete(entry)
      await expect(code()).toHaveValue('PKG-444')
      assert.equal((await snapshot()).provider.publications, 1)
    },
  )
  await record(
    'dispatch navigation supports narrow keyboard opening and Escape',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      const toggle = page.getByRole('button', { name: /navigation/i })
      await toggle.focus()
      await toggle.press('Enter')
      await expect(code()).toBeVisible()
      await code().press('Escape')
      await expect(toggle).toBeFocused()
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )
  await record(
    'dispatch removal explicitly cancels while whole disposal aborts its provider',
    async () => {
      const removed = await begin('save')
      await page.evaluate(() => window.generatorFixture.remove())
      await expect(page.locator('form')).toHaveCount(0)
      await complete(removed)
      assert.equal((await snapshot()).provider.publications, 1)
      const disposed = await begin('save')
      await page.evaluate(() => window.generatorFixture.stop())
      await complete(disposed)
      await expect
        .poll(async () =>
          page.evaluate(() => window.generatorFixture.outcome()?.status),
        )
        .toBe('disposed')
      assert.equal((await snapshot()).provider.publications, 1)
      assert.equal((await snapshot()).lifecycle.cleanups, 1)
      await expect(page.locator('#root input, #root table')).toHaveCount(0)
    },
  )
}
