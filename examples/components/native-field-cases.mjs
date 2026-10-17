import {
  choiceControl,
  selectValue,
  expectValue,
  choiceOptions,
} from '../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'

export async function nativeFieldCases({ page, url, record, press, settle }) {
  const open = () => page.goto(`${url}?fields=1`)
  const input = () =>
    page.getByRole('textbox', { name: 'Account name', exact: true })
  const read = () => page.evaluate(() => window.nativeFieldFixture.read())
  const configure = async (next) => {
    await page.evaluate(
      (next) => window.nativeFieldFixture.configure(next),
      next,
    )
    await settle()
  }
  await record(
    'fields: shared Select composition preserves accepted values and named form submission',
    async () => {
      await open()
      const control = choiceControl(page, {
        name: 'Shared choice',
        exact: true,
      })
      const submitted = () =>
        page.evaluate(() =>
          new FormData(document.querySelector('[data-select-field-form]')).get(
            'shared-choice',
          ),
        )
      assert.equal(await submitted(), 'alpha')
      assert.equal(await control.getAttribute('id'), 'shared-account-name')
      assert.equal(await control.getAttribute('data-required'), '')
      assert.equal(
        await page
          .getByText('Shared choice', { exact: true })
          .getAttribute('for'),
        'shared-account-name',
      )
      assert.equal(
        await control.getAttribute('aria-describedby'),
        'shared-choice-help extra-help',
      )
      const options = await choiceOptions(control)
      assert.equal(options.at(-1).disabled, true)
      await control.focus()
      await press('ArrowDown')
      await press('End')
      await press('Enter')
      await expectValue(control, 'beta')
      assert.equal(await submitted(), 'beta')
      await configure({ accept: false })
      await selectValue(control, 'alpha')
      await expectValue(control, 'beta')
      assert.equal(await submitted(), 'beta')
      await configure({ choice: 'alpha', invalid: true })
      await expectValue(control, 'alpha')
      assert.equal(await control.getAttribute('aria-invalid'), 'true')
      assert.equal(
        await control.getAttribute('aria-describedby'),
        'shared-choice-help shared-choice-error extra-help',
      )
      await configure({ readonly: true, id: 'changed-account', help: false })
      await expectValue(control, 'alpha')
      assert.equal(await control.getAttribute('id'), 'shared-changed-account')
      assert.equal(
        await page
          .getByText('Shared choice', { exact: true })
          .getAttribute('for'),
        'shared-changed-account',
      )
      assert.equal(
        await control.getAttribute('aria-describedby'),
        'shared-choice-error extra-help',
      )
      assert.equal(await control.getAttribute('aria-disabled'), 'true')
      await control.focus()
      await press('ArrowDown')
      await press('b')
      assert.equal(await page.getByRole('listbox').count(), 0)
      await expectValue(control, 'alpha')
      assert.equal(await submitted(), 'alpha')
      await configure({ readonly: false })
      await configure({ disabled: true })
      assert.equal(await control.isDisabled(), true)
      assert.equal(await submitted(), null)
    },
  )
  await record(
    'fields: button variants preserve keyboard actions and disabled form behavior',
    async () => {
      await open()
      const heights = []
      for (const variant of ['outline', 'filled', 'inverted', 'ghost']) {
        const button = page.getByRole('button', {
          name: `${variant} action`,
          exact: true,
        })
        assert.equal(await button.getAttribute('data-variant'), variant)
        assert.equal(await button.getAttribute('variant'), null)
        heights.push((await button.boundingBox()).height)
        await button.focus()
        await press('Enter')
        await press('Space')
      }
      assert.equal(new Set(heights).size, 1)
      assert.equal((await read()).actions, 8)
      assert.equal((await read()).submits, 0)
      await configure({ disabled: true })
      for (const variant of ['outline', 'filled', 'inverted', 'ghost']) {
        const button = page.getByRole('button', {
          name: `${variant} action`,
          exact: true,
        })
        assert.equal(await button.isDisabled(), true)
        await button.evaluate((node) => node.click())
      }
      assert.equal((await read()).actions, 8)
    },
  )
  await record(
    'fields: icon variants update without replacing the button or changing geometry',
    async () => {
      await open()
      const icon = page.getByRole('button', {
        name: 'Variant icon',
        exact: true,
      })
      const node = await icon.elementHandle()
      const original = await icon.boundingBox()
      for (const variant of ['filled', 'inverted', 'ghost', 'outline']) {
        await configure({ variant })
        assert.equal(await icon.getAttribute('data-variant'), variant)
        assert.deepEqual(await icon.boundingBox(), original)
        assert.equal(
          await node.evaluate(
            (node) =>
              node === document.querySelector('[aria-label="Variant icon"]'),
          ),
          true,
        )
      }
      for (const tone of ['accent', 'neutral']) {
        await configure({ tone })
        assert.equal(await icon.getAttribute('data-tone'), tone)
        assert.equal(await icon.getAttribute('tone'), null)
        assert.deepEqual(await icon.boundingBox(), original)
        assert.equal(await node.evaluate((node) => node.isConnected), true)
      }
      await icon.focus()
      assert.equal(
        await icon.evaluate((node) => getComputedStyle(node).outlineStyle),
        'solid',
      )
      await press('Enter')
      assert.equal((await read()).actions, 1)
      await node.dispose()
    },
  )
  await record(
    'fields: both button tones avoid hover underlines and retain forced-color borders',
    async () => {
      await open()
      for (const tone of ['neutral', 'accent']) {
        await configure({ tone })
        for (const variant of ['outline', 'filled', 'inverted', 'ghost']) {
          const button = page.getByRole('button', {
            name: `${variant} action`,
            exact: true,
          })
          assert.equal(await button.getAttribute('data-tone'), tone)
          assert.equal(await button.getAttribute('tone'), null)
          await page.mouse.move(0, 0)
          const before = await button.evaluate(
            (node) => getComputedStyle(node).backgroundColor,
          )
          await button.hover()
          if (variant === 'filled' || variant === 'inverted')
            assert.notEqual(
              await button.evaluate(
                (node) => getComputedStyle(node).backgroundColor,
              ),
              before,
            )
          assert.equal(
            await button.evaluate((node) =>
              getComputedStyle(node).textDecorationLine.includes('underline'),
            ),
            false,
          )
        }
      }
      await page.emulateMedia({ forcedColors: 'active' })
      try {
        for (const variant of ['outline', 'filled', 'inverted', 'ghost']) {
          const button = page.getByRole('button', {
            name: `${variant} action`,
            exact: true,
          })
          assert.equal(
            await button.evaluate(
              (node) => getComputedStyle(node).borderTopStyle,
            ),
            'solid',
          )
          assert.notEqual(
            await button.evaluate(
              (node) => getComputedStyle(node).borderTopColor,
            ),
            'rgba(0, 0, 0, 0)',
          )
        }
      } finally {
        await page.emulateMedia({ forcedColors: 'none' })
      }
    },
  )
  await record(
    'fields: native select preserves accepted values, rejected changes and field links',
    async () => {
      await open()
      const control = page.getByRole('combobox', {
        name: 'Native choice',
        exact: true,
      })
      assert.deepEqual(
        await control.evaluate((node) => [...node.classList].sort()),
        ['native-choice', 'ui-native-select'],
      )
      await control.selectOption('beta')
      await settle()
      assert.equal((await read()).choice, 'beta')
      assert.equal(await control.inputValue(), 'beta')
      await configure({ accept: false })
      await control.selectOption('alpha')
      await settle()
      assert.equal(await control.inputValue(), 'beta')
      await configure({ accept: true, preventChoice: true, invalid: true })
      assert.deepEqual(
        await control.evaluate((node) => [...node.classList].sort()),
        ['native-choice', 'native-invalid', 'ui-native-select'],
      )
      await control.evaluate((node) => {
        node.value = 'alpha'
      })
      await control.dispatchEvent('change', { bubbles: true, cancelable: true })
      await settle()
      assert.equal(await control.inputValue(), 'beta')
      assert.equal(await control.getAttribute('aria-invalid'), 'true')
      assert.equal(await control.getAttribute('required'), '')
      assert.equal(
        await control.getAttribute('aria-describedby'),
        'choice-help choice-error',
      )
      assert.equal(
        await page.evaluate(() =>
          new FormData(document.querySelector('form')).get('choice'),
        ),
        'beta',
      )
      await configure({ disabled: true })
      assert.equal(await control.isDisabled(), true)
    },
  )
  await record(
    'fields: labels follow explicit and changed control IDs and descriptions detach',
    async () => {
      await open()
      await page.getByText('Account name', { exact: true }).click()
      assert.equal(
        await input().evaluate((node) => node === document.activeElement),
        true,
      )
      assert.equal(
        await input().getAttribute('aria-describedby'),
        'name-help extra-help',
      )
      await configure({ invalid: true })
      assert.equal(await input().getAttribute('aria-invalid'), 'true')
      assert.equal(
        await input().getAttribute('aria-describedby'),
        'name-help name-error extra-help',
      )
      assert.equal(await page.locator('#name-error').isVisible(), true)
      await configure({ help: false, id: 'changed-id', invalid: false })
      assert.equal(await input().getAttribute('id'), 'changed-id')
      assert.equal(await input().getAttribute('aria-describedby'), 'extra-help')
      await page.getByText('Account name', { exact: true }).click()
      assert.equal(
        await input().evaluate((node) => node === document.activeElement),
        true,
      )
    },
  )
  await record(
    'fields: controlled input accepts external values and restores rejected text',
    async () => {
      await open()
      await input().fill('Accepted')
      assert.equal((await read()).text, 'Accepted')
      await configure({ text: 'External', accept: false })
      await input().fill('Rejected')
      assert.equal(await input().inputValue(), 'External')
      await page
        .getByRole('textbox', { name: 'Notes', exact: true })
        .fill('Updated notes')
      assert.equal((await read()).notes, 'Updated notes')
      await page
        .getByRole('textbox', { name: 'Uncontrolled', exact: true })
        .fill('Browser value')
      assert.equal(
        await page
          .getByRole('textbox', { name: 'Uncontrolled', exact: true })
          .inputValue(),
        'Browser value',
      )
    },
  )
  await record(
    'fields: standalone native change handlers commit on blur and restore rejected values',
    async () => {
      await open()
      const control = page.getByRole('textbox', {
        name: 'Commit on blur',
        exact: true,
      })
      await control.fill('Blur accepted')
      assert.equal(await control.inputValue(), 'Blur accepted')
      assert.equal((await read()).blurText, 'Blur initial')
      await input().focus()
      assert.equal((await read()).blurText, 'Blur accepted')
      await configure({ blurText: 'Blur external', accept: false })
      await control.fill('Blur rejected')
      assert.equal(await control.inputValue(), 'Blur rejected')
      await input().focus()
      assert.equal(await control.inputValue(), 'Blur external')
      assert.equal((await read()).blurText, 'Blur external')
    },
  )
  await record(
    'fields: button defaults avoid submission and Enter uses the native form',
    async () => {
      await open()
      await page
        .getByRole('button', { name: 'Local action', exact: true })
        .click()
      assert.equal((await read()).actions, 1)
      assert.equal((await read()).submits, 0)
      await page
        .getByRole('button', { name: 'Reset name', exact: true })
        .click()
      assert.equal((await read()).submits, 0)
      await input().focus()
      await press('Enter')
      assert.equal((await read()).submits, 1)
      await page
        .getByRole('button', { name: 'Submit form', exact: true })
        .click()
      assert.equal((await read()).submits, 2)
      assert.equal(
        await page.evaluate(() =>
          new FormData(document.querySelector('form')).get('name'),
        ),
        'Initial',
      )
    },
  )
  await record(
    'fields: disabled fieldsets and readonly fields retain native semantics',
    async () => {
      await open()
      const textStyles = () =>
        page.evaluate(() => {
          const properties = [
            'fontFamily',
            'fontSize',
            'lineHeight',
            'padding',
            'borderTopWidth',
            'borderTopStyle',
            'borderTopColor',
            'backgroundColor',
            'color',
          ]
          return ['#account-name', 'textarea'].map((selector) => {
            const style = getComputedStyle(document.querySelector(selector))
            return properties.map((property) => style[property])
          })
        })
      const [inputStyle, textareaStyle] = await textStyles()
      assert.deepEqual(textareaStyle, inputStyle)
      await configure({ readonly: true })
      const [readonlyInputStyle, readonlyTextareaStyle] = await textStyles()
      assert.deepEqual(readonlyTextareaStyle, readonlyInputStyle)
      assert.equal(await input().getAttribute('readonly'), '')
      assert.equal(await input().getAttribute('required'), '')
      await input().focus()
      await press('x')
      assert.equal(await input().inputValue(), 'Initial')
      await configure({ disabled: true })
      assert.equal(await input().isDisabled(), true)
      assert.equal(
        await page
          .getByRole('button', { name: 'Local action', exact: true })
          .isDisabled(),
        true,
      )
      assert.equal(
        await page.evaluate(() =>
          new FormData(document.querySelector('form')).has('name'),
        ),
        false,
      )
    },
  )
  await record(
    'fields: native callbacks and refs forward and listeners release on disposal',
    async () => {
      await open()
      assert.equal((await read()).refs, 2)
      assert.equal((await read()).refConnected, true)
      await input().focus()
      await press('a')
      await input().dispatchEvent('compositionend', { data: 'a' })
      assert.ok((await read()).keyups > 0)
      assert.equal((await read()).compositions, 1)
      await page.evaluate(() => {
        window.detachedField = document.querySelector('#account-name')
        window.nativeFieldFixture.stop()
      })
      const before = await read()
      assert.equal(before.cleanups, 1)
      assert.equal(before.refConnected, false)
      await page.evaluate(() => {
        window.detachedField.dispatchEvent(new Event('keyup'))
        window.detachedField.dispatchEvent(new Event('compositionend'))
      })
      assert.deepEqual(await read(), before)
    },
  )
}
