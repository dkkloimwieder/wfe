import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewNumber(page, api) {
  const configure = (next) =>
    page.evaluate(
      ({ api, next }) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.number
          : window.numberFixture
        ).configure(next),
      { api, next },
    )
  const read = () =>
    page.evaluate(
      (api) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.number
          : window.numberFixture
        ).read(),
      api,
    )
  const input = page.getByRole('textbox', {
    name: 'Numeric amount',
    exact: true,
  })
  const submit = page.getByRole('button', {
    name: 'Submit numeric value',
    exact: true,
  })
  await expect(input).toHaveValue('2')
  assert.deepEqual((await read()).requests, [])
  assert.equal((await read()).refs, 1)
  assert.equal(await input.evaluate((node) => node.inputMode), 'decimal')
  await page.evaluate(() => {
    window.originalNumberInput = document.querySelector(
      '#number-review input:not([type=hidden])',
    )
  })
  await input.fill('-')
  await expect(input).toHaveValue('-')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  assert.equal((await read()).value, 2)
  assert.deepEqual((await read()).requests, [])
  assert.equal(await input.evaluate((node) => node.validity.customError), true)
  await submit.click()
  assert.equal((await read()).submissions, 0)
  await expect(input).toBeFocused()
  assert.equal(
    await page
      .locator('#number-review')
      .evaluate((form) => new FormData(form).get('amount')),
    '2',
  )
  await input.press('Escape')
  await expect(input).toHaveValue('2')
  for (const text of ['1.', '1e-', '0xff', 'Infinity', '1e309', '1,25']) {
    await input.fill(text)
    await expect(input).toHaveValue(text)
    assert.equal((await read()).value, 2)
    await input.press('Escape')
  }
  for (const [text, value] of [
    ['-0.50', -0.5],
    ['.25', 0.25],
    ['1e-7', 1e-7],
    ['1e21', 1e21],
  ]) {
    await input.fill(text)
    await expect(input).toHaveValue(text)
    assert.equal((await read()).value, value)
  }
  await input.fill('3.00')
  await input.evaluate((node) => {
    node.setSelectionRange(1, 3, 'backward')
    node.blur()
    node.focus()
  })
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('3.00')
  assert.deepEqual(
    await input.evaluate((node) => [
      node.selectionStart,
      node.selectionEnd,
      node.selectionDirection,
    ]),
    [1, 3, 'backward'],
  )
  await page.locator('#number-outside').focus()
  await expect(input).toHaveValue('3')
  await input.fill('1.')
  const requests = (await read()).requests.length
  await configure({ live: true, min: -10 })
  await expect(input).toHaveValue('1.')
  assert.equal((await read()).requests.length, requests)
  assert.equal((await read()).refs, 1)
  assert.equal(
    await input.evaluate((node) => node === window.originalNumberInput),
    true,
  )
  await expect(input).toHaveClass(/caller-live/)
  await configure({ value: 2, max: 4 })
  await expect(input).toHaveValue('2')
  await input.fill('5')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  assert.equal((await read()).value, 2)
  await input.fill('4')
  assert.equal((await read()).value, 4)
  await configure({ accept: false })
  await input.fill('1.50')
  assert.equal((await read()).value, 4)
  await page.locator('#number-outside').focus()
  await expect(input).toHaveValue('4')
  await configure({ accept: true })
  await input.fill('')
  await expect(input).toHaveValue('')
  assert.equal((await read()).value, undefined)
  await expect(input).not.toHaveAttribute('data-ui-invalid-input')
  await configure({ value: 2, allowEmpty: false })
  await input.fill('')
  await expect(input).toHaveAttribute('data-ui-invalid-input', '')
  assert.equal((await read()).value, 2)
  await configure({ readonly: true })
  await expect(input).toHaveAttribute('readonly', '')
  assert.equal((await read()).validity.at(-1), true)
  await configure({ readonly: false, disabled: true })
  await expect(input).toBeDisabled()
  assert.equal(
    await page
      .locator('#number-review')
      .evaluate((form) => new FormData(form).has('amount')),
    false,
  )
  await configure({ disabled: false })
  await input.focus()
  await input.press('Escape')
  await expect(input).toHaveValue('2')
  await submit.click()
  assert.equal((await read()).submissions, 1)
  assert.equal((await read()).refs, 1)
  assert.equal(
    await input.evaluate((node) => node === window.originalNumberInput),
    true,
  )
  assert.equal(
    await input.evaluate((node) =>
      node
        .getAttribute('aria-describedby')
        .split(' ')
        .every((id) => document.getElementById(id)),
    ),
    true,
  )
}
