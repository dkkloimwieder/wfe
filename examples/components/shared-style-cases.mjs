import { choiceControl } from '../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function sharedStyleCases({ page, url, record, settle }) {
  const paint = (node) =>
    node.evaluate((node) => {
      const s = getComputedStyle(node)
      return Object.fromEntries(
        [
          'backgroundColor',
          'color',
          'borderTopColor',
          'borderRadius',
          'boxShadow',
          'opacity',
          'cursor',
          'outlineWidth',
          'outlineColor',
          'outlineStyle',
        ].map((key) => [key, s[key]]),
      )
    })
  const scope = async (theme = 'light', density = 'compact', roles = {}) => {
    await page.locator('main[data-ui]').evaluate(
      (node, { theme, density, roles }) => {
        node.dataset.uiTheme = theme
        node.dataset.uiDensity = density
        for (const [key, value] of Object.entries(roles))
          node.style.setProperty(key, value)
      },
      { theme, density, roles },
    )
    await settle()
  }
  const roles = {
    '--ui-control-hover': 'rgb(220, 232, 246)',
    '--ui-muted-surface': 'rgb(233, 235, 238)',
    '--ui-focus-ring': 'rgb(68, 102, 170)',
    '--ui-error': 'rgb(160, 32, 48)',
    '--ui-disabled-opacity': '0.6',
  }
  for (const theme of ['light', 'dark']) {
    for (const density of ['compact', 'comfortable']) {
      await record(
        `shared styles: ${theme} ${density} fields share hover, focus, invalid, readonly and disabled states`,
        async () => {
          await page.goto(
            `${url}?fields=1${density === 'comfortable' ? '&comfortable=1' : ''}`,
          )
          await scope(theme, density)
          assert.equal(
            (await paint(page.getByLabel('Account name', { exact: true })))
              .backgroundColor,
            theme === 'dark' ? 'rgb(23, 29, 39)' : 'rgb(255, 255, 255)',
          )
          assert.equal(
            await page
              .getByLabel('Account name', { exact: true })
              .evaluate((node) => getComputedStyle(node).paddingTop),
            density === 'comfortable' ? '8px' : '4px',
          )
          await scope(theme, density, roles)
          const fields = [
            page.getByLabel('Account name', { exact: true }),
            page.getByLabel('Notes', { exact: true }),
            page.getByLabel('Native choice', { exact: true }),
            choiceControl(page, { name: 'Shared choice', exact: true }),
          ]
          for (const field of fields) {
            await field.hover()
            assert.equal(
              (await paint(field)).backgroundColor,
              roles['--ui-control-hover'],
            )
            await field.focus()
            assert.equal(
              (await paint(field)).outlineColor,
              roles['--ui-focus-ring'],
            )
            assert.equal((await paint(field)).outlineWidth, '2px')
          }
          await page.evaluate(() =>
            window.nativeFieldFixture.configure({
              readonly: true,
              invalid: true,
            }),
          )
          await page.mouse.move(0, 0)
          for (const field of [fields[0], fields[1], fields[3]]) {
            const before = await paint(field)
            assert.equal(before.backgroundColor, roles['--ui-muted-surface'])
            await field.hover()
            assert.equal(
              (await paint(field)).backgroundColor,
              before.backgroundColor,
            )
          }
          for (const field of [fields[0], fields[2], fields[3]])
            assert.equal(
              (await paint(field)).borderTopColor,
              roles['--ui-error'],
            )
          await fields[3].focus()
          await page.keyboard.press('ArrowDown')
          await expect(page.getByRole('listbox')).toHaveCount(0)
          await page.evaluate(() =>
            window.nativeFieldFixture.configure({
              disabled: true,
              readonly: false,
            }),
          )
          for (const field of fields) {
            await expect(field).toBeDisabled()
            assert.equal((await paint(field)).opacity, '0.6')
            assert.equal((await paint(field)).cursor, 'default')
          }
        },
      )
    }
  }
  await record(
    'shared styles: readonly compound choices suppress hover and retain accepted values',
    async () => {
      await page.goto(`${url}?choices=1`)
      await scope('dark', 'compact', roles)
      await page.evaluate(() =>
        window.choiceFixture.configure({ readOnly: true }),
      )
      const input = page.getByRole('combobox', { name: 'Find category' })
      const trigger = page.getByRole('button', { name: 'Show categories' })
      for (const control of [input, trigger]) {
        await control.hover()
        assert.equal(
          (await paint(control)).backgroundColor,
          roles['--ui-muted-surface'],
        )
      }
      await expect(trigger).toBeDisabled()
      await input.focus()
      await input.press('ArrowDown')
      await expect(page.getByRole('listbox')).toHaveCount(0)
      assert.equal(await input.inputValue(), 'Alpha')
    },
  )
  await record(
    'shared styles: toggles share states without changing selection, shape or double fading',
    async () => {
      await page.goto(`${url}?booleans=1&comfortable=1`)
      await scope('dark', 'comfortable', roles)
      const controls = ['checkbox', 'switch', 'a'].map((name) =>
        page.locator(`[data-control="${name}"]`),
      )
      const baseline = await Promise.all(
        controls.map((control) => control.boundingBox()),
      )
      for (const control of controls) {
        await control.hover()
        assert.equal(
          (await paint(control)).backgroundColor,
          roles['--ui-control-hover'],
        )
      }
      const inputs = [
        page.getByRole('checkbox', { name: 'Include details', exact: true }),
        page.getByRole('switch', { name: 'Enable updates', exact: true }),
        page.getByRole('radio', { name: 'Plan A', exact: true }),
      ]
      await page.keyboard.press('Tab')
      for (let index = 0; index < inputs.length; index++) {
        await inputs[index].focus()
        assert.equal((await paint(controls[index])).outlineWidth, '2px')
        assert.equal(
          (await paint(controls[index])).outlineColor,
          roles['--ui-focus-ring'],
        )
      }
      await page.evaluate(() =>
        window.booleanFixture.configure({
          readOnly: true,
          invalid: true,
          switched: true,
        }),
      )
      for (const control of controls) {
        await control.hover()
        assert.equal((await paint(control)).borderTopColor, roles['--ui-error'])
      }
      assert.equal(
        (await paint(controls[0])).backgroundColor,
        roles['--ui-muted-surface'],
      )
      await expect(controls[1]).toHaveAttribute('data-checked', '')
      assert.equal(
        (await paint(controls[1])).backgroundColor,
        'rgb(38, 61, 93)',
      )
      assert.equal((await paint(controls[1])).borderRadius, '12px')
      assert.equal((await paint(controls[2])).borderRadius, '50%')
      await page.evaluate(() =>
        window.booleanFixture.configure({ readOnly: false, disabled: true }),
      )
      for (let i = 0; i < controls.length; i++) {
        assert.equal((await paint(controls[i])).opacity, '1')
        const root = controls[i].locator('..')
        assert.equal((await paint(root)).opacity, '0.6')
        const current = await controls[i].boundingBox()
        assert.equal(current.width, baseline[i].width)
        assert.equal(current.height, baseline[i].height)
      }
    },
  )
  await record(
    'shared styles: floating components share explicit surface roles and preserve family defaults',
    async () => {
      const surfaceRoles = {
        '--ui-popup-surface': 'rgb(240, 241, 244)',
        '--ui-popup-text': 'rgb(28, 32, 44)',
        '--ui-popup-border': 'rgb(88, 96, 112)',
        '--ui-popup-shadow': 'none',
      }
      const surfaces = [
        ['dialog-trigger', '.ui-dialog-content', true],
        ['sheet-trigger', '.ui-sheet', false],
        ['popover-trigger', '.ui-popover', false],
        ['menu-trigger', '.ui-menu', false],
        ['tooltip-trigger', '.ui-tooltip', false],
      ]
      for (const theme of ['light', 'dark']) {
        for (const [part, selector, hard] of surfaces) {
          await page.goto(`${url}?overlayButtons=1`)
          await scope(theme)
          const trigger = page.locator(`[data-button-part="${part}"]`)
          if (part === 'tooltip-trigger') await trigger.hover()
          else await trigger.click()
          const surface = page.locator(selector)
          await expect(surface).toBeVisible()
          const before = await paint(surface)
          if (part === 'sheet-trigger') assert.equal(before.boxShadow, 'none')
          else
            assert.ok(
              before.boxShadow.includes(hard ? '3px 3px 0px' : '0px 4px 16px'),
            )
          const geometry = await surface.boundingBox()
          await scope(theme, 'compact', surfaceRoles)
          const after = await paint(surface)
          assert.equal(
            after.backgroundColor,
            surfaceRoles['--ui-popup-surface'],
          )
          assert.equal(after.color, surfaceRoles['--ui-popup-text'])
          assert.equal(after.borderTopColor, surfaceRoles['--ui-popup-border'])
          assert.equal(after.boxShadow, 'none')
          assert.deepEqual(await surface.boundingBox(), geometry)
        }
        await page.goto(`${url}?fields=1`)
        await scope(theme, 'compact', surfaceRoles)
        await choiceControl(page, {
          name: 'Shared choice',
          exact: true,
        }).click()
        const popup = page.locator('.popup-content')
        await expect(popup).toBeVisible()
        assert.equal(
          (await paint(popup)).backgroundColor,
          surfaceRoles['--ui-popup-surface'],
        )
        assert.equal(
          (await paint(popup)).borderTopColor,
          surfaceRoles['--ui-popup-border'],
        )
        assert.equal((await paint(popup)).boxShadow, 'none')
        await page.keyboard.press('Escape')
        if (
          await page.evaluate(() => CSS.supports('appearance', 'base-select'))
        ) {
          const native = page.getByLabel('Native choice', { exact: true })
          const option = native.locator('option[value="beta"]')
          assert.equal(
            (await paint(option)).backgroundColor,
            surfaceRoles['--ui-popup-surface'],
          )
          assert.equal(
            (await paint(option)).color,
            surfaceRoles['--ui-popup-text'],
          )
        }
        await page.goto(`${url}?display=1`)
        await scope(theme, 'compact', surfaceRoles)
        await page.evaluate(() =>
          window.displayFixture.configure({ open: true }),
        )
        const toast = page.locator('.ui-toast').first()
        await expect(toast).toBeVisible()
        const after = await paint(toast)
        assert.equal(after.backgroundColor, surfaceRoles['--ui-popup-surface'])
        assert.equal(after.color, surfaceRoles['--ui-popup-text'])
        assert.equal(after.borderTopColor, surfaceRoles['--ui-popup-border'])
        assert.equal(after.boxShadow, 'none')
      }
    },
  )
  await record(
    'shared styles: forced colors retain visible field focus and invalid borders',
    async () => {
      await page.emulateMedia({ forcedColors: 'active' })
      try {
        await page.goto(`${url}?fields=1`)
        const input = page.getByLabel('Account name', { exact: true })
        await input.focus()
        const before = await paint(input)
        assert.equal(before.outlineWidth, '2px')
        assert.equal(before.outlineStyle, 'solid')
        await page.evaluate(() =>
          window.nativeFieldFixture.configure({ invalid: true }),
        )
        assert.notEqual((await paint(input)).borderTopColor, 'rgba(0, 0, 0, 0)')
        await input.press('Tab')
      } finally {
        await page.emulateMedia({ forcedColors: 'none' })
      }
    },
  )
  for (const theme of ['light', 'dark']) {
    for (const density of ['compact', 'comfortable']) {
      await record(
        `shared styles: ${theme} ${density} choice metadata matches native and boolean fields`,
        async () => {
          await page.goto(`${url}?classes=1`)
          await page.locator('#class-root').evaluate(
            (node, { theme, density }) => {
              node.dataset.uiTheme = theme
              node.dataset.uiDensity = density
            },
            { theme, density },
          )
          const part = (name) => page.locator(`[data-id-part="${name}"]`)
          const typography = (node) =>
            node.evaluate((node) => {
              const style = getComputedStyle(node)
              return Object.fromEntries(
                ['fontSize', 'fontWeight', 'textTransform', 'color'].map(
                  (key) => [key, style[key]],
                ),
              )
            })
          for (const [base, partName] of [
            ['ui-label', 'Label'],
            ['ui-help', 'Description'],
            ['ui-field-error', 'ErrorMessage'],
          ]) {
            const expected = await typography(
              page.locator(`[data-class-base="${base}"]`).first(),
            )
            assert.equal(
              expected.textTransform,
              partName === 'Label' ? 'uppercase' : 'none',
            )
            if (partName === 'Label') assert.equal(expected.fontWeight, '500')
            for (const family of ['Checkbox', 'Select', 'Combobox'])
              assert.deepEqual(
                await typography(part(family + '.' + partName)),
                expected,
                `${family} ${partName}`,
              )
          }
          assert.equal(
            (await typography(part('Select.Trigger'))).textTransform,
            'none',
          )
          assert.equal(
            (await typography(part('Combobox.Input'))).textTransform,
            'none',
          )
          await expect(part('Select.Trigger')).toContainText('Alpha')
          await expect(part('Combobox.Input')).toHaveValue('Alpha')
        },
      )
    }
  }
}
