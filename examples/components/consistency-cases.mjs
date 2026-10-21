import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import {
  choiceControl,
  selectValue,
} from '../shared/controls/select-review.mjs'
import { reviewCssProvenance } from '../shared/controls/css-review.mjs'

export async function consistencyCases({ page, url, record, settle }) {
  const open = (query = '') => page.goto(`${url}?consistency=1${query}`)
  const button = (name) => page.getByRole('button', { name, exact: true })
  const text = (name) =>
    page.getByRole('textbox', { name: `${name} text`, exact: true })
  const choice = (name) =>
    choiceControl(page, { name: `${name} choice`, exact: true })
  const configure = async (next) => {
    await page.evaluate(
      (next) => window.consistencyFixture.configure(next),
      next,
    )
    await settle()
  }
  const read = () => page.evaluate(() => window.consistencyFixture.read())
  await record(
    'consistency: browser styles match current source or distribution inputs and emitted assets',
    async () => {
      await open()
      await reviewCssProvenance(page, url)
    },
  )
  for (const dark of [false, true])
    for (const comfortable of [false, true]) {
      await record(
        `consistency: ${dark ? 'dark' : 'light'} ${comfortable ? 'comfortable' : 'compact'} table form and overlay controls retain focus and disabled states`,
        async () => {
          await open(
            `${dark ? '&dark=1' : ''}${comfortable ? '&comfortable=1' : ''}`,
          )
          await button('Open matrix popup').click()
          await expect(text('overlay')).toBeFocused()
          await expect(button('Close matrix popup')).toBeVisible()
          const texts = ['table', 'form', 'overlay'].map(text)
          const choices = ['table', 'form', 'overlay'].map(choice)
          const actions = ['table', 'form', 'overlay'].map((name) =>
            button(`${name} action`),
          )
          for (const control of [...texts, ...choices]) {
            await control.focus()
            await expect(control).toBeFocused()
          }
          await configure({ invalid: true, readonly: true })
          for (const control of choices) {
            await control.focus()
            await control.press('ArrowDown')
            await expect(page.getByRole('listbox')).toHaveCount(0)
          }
          await configure({ readonly: false, disabled: true })
          for (const control of [...texts, ...choices, ...actions])
            await expect(control).toBeDisabled()
          await configure({ disabled: false })
          await button('Close matrix popup').click()
          await expect(button('Open matrix popup')).toBeFocused()
        },
      )
    }
  await record(
    'consistency: application acceptance and rejection preserve equivalent table form and overlay values',
    async () => {
      await open()
      await button('Open matrix popup').click()
      await expect(text('overlay')).toBeFocused()
      for (const name of ['table', 'form', 'overlay']) {
        await text(name).fill(`Value ${name}`)
        for (const target of ['table', 'form', 'overlay'])
          await expect(text(target)).toHaveValue(`Value ${name}`)
        await selectValue(choice(name), 'beta')
        for (const target of ['table', 'form', 'overlay'])
          await expect(choice(target)).toHaveAttribute('data-value', 'beta')
        await configure({ choice: 'alpha' })
      }
      await configure({ accept: false })
      for (const name of ['table', 'form', 'overlay']) {
        await text(name).fill('Rejected')
        await expect(text(name)).toHaveValue('Value overlay')
        await selectValue(choice(name), 'beta')
        await expect(choice(name)).toHaveAttribute('data-value', 'alpha')
      }
      assert.equal((await read()).choice, 'alpha')
      await text('table').evaluate((node) => {
        node.dispatchEvent(
          new CompositionEvent('compositionstart', { bubbles: true }),
        )
        node.value = 'Composed'
        node.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            isComposing: true,
            data: 'Composed',
          }),
        )
      })
      await expect(text('table')).toHaveValue('Composed')
      assert.equal((await read()).text, 'Value overlay')
      await text('table').dispatchEvent('compositionend')
      await expect(text('table')).toHaveValue('Value overlay')
    },
  )
  await record(
    'consistency: all filter families expose choice menus and disabled state',
    async () => {
      await open()
      const pane = page.getByRole('region', { name: 'Filter families' })
      const triggers = pane.locator('.popup-trigger')
      assert.ok((await triggers.count()) >= 7)
      for (const trigger of await triggers.all()) {
        await trigger.click()
        await expect(page.getByRole('listbox')).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(trigger).toBeFocused()
      }
      const inputs = pane.locator('input:not([type="hidden"])')
      await configure({ disabled: true })
      for (const input of await inputs.all()) await expect(input).toBeDisabled()
      for (const trigger of await triggers.all())
        await expect(trigger).toBeDisabled()
    },
  )
  await record(
    'consistency: native parent keeps nested choices popover menu tooltip and modal accessible',
    async () => {
      await open('&dark=1')
      const hittable = (option) =>
        option.evaluate((node) => {
          const box = node.getBoundingClientRect()
          return node.contains(
            document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            ),
          )
        })
      await button('Filter Header choice').click()
      const header = page.locator('[data-header-filter-popup="matrix"]')
      await choiceControl(header, {
        name: 'Header selection',
        exact: true,
      }).click()
      const last = page.getByRole('option', { name: 'Gamma', exact: true })
      await expect.poll(() => hittable(last)).toBe(true)
      await last.click()
      await expect(page.getByRole('listbox')).toHaveCount(0)
      await button('Close Header choice filter').click()
      await button('Open native parent').click()
      const parent = page.locator('[data-native-parent]')
      assert.equal(
        await parent.evaluate((node) => node.matches(':popover-open')),
        true,
      )
      await selectValue(
        choiceControl(parent, { name: 'Native choice', exact: true }),
        'beta',
      )
      assert.equal((await read()).choice, 'beta')
      await page.keyboard.press('Escape')
      assert.equal(
        await parent.evaluate((node) => node.matches(':popover-open')),
        false,
      )
      for (const family of ['popover', 'menu', 'tooltip', 'dialog']) {
        await button('Open native parent').click()
        const trigger = button(
          family === 'tooltip' ? 'Nested help' : `Nested ${family}`,
        )
        if (family === 'tooltip') await trigger.hover()
        else await trigger.click()
        const content = page.locator(`[data-nested=${family}]`)
        await expect(content).toBeVisible()
        assert.equal(
          await content.evaluate((node) =>
            Boolean(node.closest('[data-native-parent]')),
          ),
          true,
          `${family} stays in the native top layer`,
        )
        if (family === 'popover' || family === 'dialog') {
          const nestedChoice = choiceControl(content, {
            name: family === 'dialog' ? 'Dialog choice' : 'Nested choice',
            exact: true,
          })
          await nestedChoice.click()
          await expect
            .poll(() =>
              hittable(
                page.getByRole('option', { name: 'Gamma', exact: true }),
              ),
            )
            .toBe(true)
          await page.keyboard.press('Escape')
          await expect(page.getByRole('listbox')).toHaveCount(0)
          await selectValue(
            choiceControl(content, {
              name: family === 'dialog' ? 'Dialog choice' : 'Nested choice',
              exact: true,
            }),
            'alpha',
          )
          await expect(content).toBeVisible()
          assert.equal(
            await parent.evaluate((node) => node.matches(':popover-open')),
            true,
          )
        }
        if (family === 'menu') {
          await page.keyboard.press('ArrowDown')
          await page
            .getByRole('menuitem', { name: 'Choose Beta', exact: true })
            .click()
          await expect(content).toHaveCount(0)
        } else {
          await page.keyboard.press('Escape')
          await expect(content).toHaveCount(0)
        }
        assert.equal(
          await parent.evaluate((node) => node.matches(':popover-open')),
          true,
          `${family} consumes the first Escape`,
        )
        if (family !== 'tooltip') await expect(trigger).toBeFocused()
        await button('Close native parent').click()
      }
    },
  )
  await record(
    'consistency: forced colors preserve keyboard focus across consumers',
    async () => {
      await page.emulateMedia({ forcedColors: 'active' })
      try {
        await open('&comfortable=1')
        await button('Open matrix popup').click()
        await expect(text('overlay')).toBeFocused()
        await page.keyboard.press('Tab')
        for (const name of ['table', 'form', 'overlay']) {
          await choice(name).focus()
          await expect(choice(name)).toBeFocused()
        }
        await configure({ mounted: false })
        await expect(
          page.locator('.ui-popover,.popup-content,[data-native-parent]'),
        ).toHaveCount(0)
      } finally {
        await page.emulateMedia({ forcedColors: 'none' })
      }
    },
  )
  await record(
    'consistency: disposal closes nested portals and detached controls cannot change accepted state',
    async () => {
      await open()
      await button('Open native parent').click()
      await button('Nested popover').click()
      const stale = await button('Nested popover').elementHandle()
      await page.evaluate(() => window.consistencyFixture.stop())
      await expect(
        page.locator('[data-nested],[data-native-parent]'),
      ).toHaveCount(0)
      const before = await read()
      await stale.evaluate((node) => node.click())
      await settle()
      assert.deepEqual(await read(), before)
      assert.equal(before.cleanups, 1)
      await stale.dispose()
    },
  )
}
