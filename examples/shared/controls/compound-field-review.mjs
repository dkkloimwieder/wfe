import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewCompoundFields(page) {
  const configure = (next) =>
    page.evaluate(
      (next) => window.hydrationFixture.lifecycle.compound.configure(next),
      next,
    )
  const read = () =>
    page.evaluate(() => window.hydrationFixture.lifecycle.compound.read())
  const form = page.locator('#compound-field-form')
  const checkbox = form.getByRole('checkbox', { name: 'Field checkbox' })
  const toggle = form.getByRole('switch', { name: 'Field switch' })
  const select = form.getByRole('button', { name: /^Field select/ })
  const combo = form.getByRole('combobox', { name: 'Field combobox' })
  const fields = [
    checkbox,
    toggle,
    form.getByRole('radiogroup', { name: 'Field radio' }),
    select,
    combo,
  ]
  for (const field of fields) {
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    assert.equal(
      await field.evaluate((node) =>
        node
          .getAttribute('aria-describedby')
          .split(/\s+/)
          .every((id) => Boolean(document.getElementById(id))),
      ),
      true,
    )
  }
  assert.equal(await checkbox.getAttribute('id'), 'compound-checkbox')
  await configure({ readonly: true })
  const before = await read()
  await checkbox.focus()
  await checkbox.press('Space')
  await toggle.focus()
  await toggle.press('Space')
  await select.focus()
  await select.press('ArrowDown')
  await expect(page.getByRole('option')).toHaveCount(0)
  await expect(combo).toHaveAttribute('readonly', '')
  const uncontrolled = form.getByRole('button', {
    name: /Uncontrolled readonly select/,
  })
  await uncontrolled.focus()
  await uncontrolled.press('ArrowRight')
  await uncontrolled.press('b')
  assert.deepEqual((await read()).requests, before.requests)
  assert.equal(
    await form.evaluate((node) => new FormData(node).get('uncontrolled')),
    'Alpha',
  )
  assert.equal(
    await form.evaluate((node) => new FormData(node).get('select')),
    'Alpha',
  )
  assert.equal(
    await form.evaluate((node) => new FormData(node).get('checkbox')),
    'checked-value',
  )
  await form.locator('select[name=uncontrolled]').evaluate((node) => {
    node.value = 'Beta'
    node.dispatchEvent(new Event('change', { bubbles: true }))
  })
  assert.equal(
    await form.evaluate((node) => new FormData(node).get('uncontrolled')),
    'Alpha',
  )
  await form.locator('select[name=combobox]').evaluate((node) => {
    node.value = 'Beta'
    node.dispatchEvent(new Event('change', { bubbles: true }))
  })
  assert.equal(
    await form.evaluate((node) => new FormData(node).get('combobox')),
    'Alpha',
  )
  await configure({
    disabled: true,
    required: true,
    override: false,
    readonly: true,
  })
  await expect(checkbox).toBeEnabled()
  await expect(checkbox).not.toHaveAttribute('aria-invalid', 'true')
  await expect(checkbox).not.toHaveAttribute('required', '')
  await configure({
    disabled: false,
    readonly: false,
    required: false,
    invalid: false,
    override: undefined,
    accept: false,
  })
  await checkbox.focus()
  await checkbox.press('Space')
  await expect(checkbox).toBeChecked()
  assert.equal((await read()).requests.at(-1).family, 'checkbox')
  await configure({ accept: true })
  await checkbox.press('Space')
  await expect(checkbox).not.toBeChecked()
  await select.click()
  await page.getByRole('option', { name: 'Beta', exact: true }).click()
  assert.equal(
    await form.evaluate((node) => new FormData(node).get('select')),
    'Beta',
  )
  await combo.fill('Be')
  await page.getByRole('option', { name: 'Beta', exact: true }).click()
  assert.equal(
    await form.evaluate((node) => new FormData(node).get('combobox')),
    'Beta',
  )
  await form.getByRole('radio', { name: 'Radio Beta' }).focus()
  await form.getByRole('radio', { name: 'Radio Beta' }).press('Space')
  assert.equal(
    await form.evaluate((node) => new FormData(node).get('radio')),
    'Beta',
  )
  await uncontrolled.focus()
  await uncontrolled.press('ArrowRight')
  assert.equal(
    await form.evaluate((node) => new FormData(node).get('uncontrolled')),
    'Beta',
  )
  await uncontrolled.press('ArrowRight')
  assert.equal(
    await form.evaluate((node) => new FormData(node).get('uncontrolled')),
    'Beta',
  )
  // Native reset runs its default DOM action as well as reset listeners.
  await configure({ accept: false })
  await form.evaluate((node) => node.reset())
  for (const name of ['select', 'combobox'])
    assert.equal(
      await form.evaluate((node, name) => new FormData(node).get(name), name),
      'Beta',
    )
  await expect(combo).toHaveValue('Beta')
  await configure({ accept: true })
  await form.evaluate((node) => node.reset())
  for (const name of ['select', 'combobox'])
    assert.equal(
      await form.evaluate((node, name) => new FormData(node).get(name), name),
      '',
    )
  await expect(combo).toHaveValue('')
  await page.evaluate(() => {
    window.retainedCompoundInput = document.getElementById('compound-checkbox')
  })
  await configure({ live: false })
  const stopped = await read()
  await page.evaluate(() => window.retainedCompoundInput.click())
  assert.deepEqual((await read()).requests, stopped.requests)
}
