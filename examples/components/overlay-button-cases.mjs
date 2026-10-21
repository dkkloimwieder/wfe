import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function overlayButtonCases({ page, url, record, settle }) {
  const open = (dark = false) =>
    page.goto(`${url}?overlayButtons=1${dark ? '&dark=1' : ''}`)
  const part = (name) => page.locator(`[data-button-part="${name}"]`)
  const read = () => page.evaluate(() => window.overlayButtonFixture.read())
  const configure = async (next) => {
    await page.evaluate(
      (next) => window.overlayButtonFixture.configure(next),
      next,
    )
    await settle()
  }
  async function sameButton(name, variant = 'outline', tone = 'default') {
    const control = part(name)
    await expect(control).toHaveClass(/ui-button/)
    await expect(control).toHaveAttribute('data-variant', variant)
    await expect(control).toHaveAttribute('data-tone', tone)
    assert.equal(await control.getAttribute('variant'), null)
    assert.equal(await control.getAttribute('tone'), null)
    assert.equal(await control.locator('button').count(), 0)
  }
  const variants = ['outline', 'filled', 'inverted', 'ghost']
  await record(
    'overlay buttons: default presentation and reactive variants match Button without replacing triggers',
    async () => {
      for (const dark of [false, true]) {
        await open(dark)
        const names = [
          'dialog-trigger',
          'alert-trigger',
          'sheet-trigger',
          'popover-trigger',
          'menu-trigger',
          'tooltip-trigger',
          'tooltip-link',
        ]
        const nodes = await Promise.all(
          names.map((name) => part(name).elementHandle()),
        )
        await page.mouse.move(0, 0)
        for (const name of names) await sameButton(name)
        const refs = (await read()).refs
        for (const tone of ['neutral', 'accent']) {
          for (const variant of variants) {
            await configure({ tone, variant })
            for (const name of names) await sameButton(name, variant, tone)
          }
        }
        assert.equal((await read()).refs, refs)
        for (let index = 0; index < names.length; index++) {
          assert.equal(
            await nodes[index].evaluate(
              (node, name) =>
                node === document.querySelector(`[data-button-part="${name}"]`),
              names[index],
            ),
            true,
          )
          await nodes[index].dispose()
        }
        await expect(part('dialog-trigger')).toHaveAttribute(
          'data-custom-button',
          '',
        )
        await expect(part('menu-trigger')).toHaveAttribute(
          'data-custom-button',
          '',
        )
      }
    },
  )
  await record(
    'overlay buttons: close and cancel parts share variants and keep refs and keyboard behavior',
    async () => {
      for (const [trigger, close, role, title] of [
        ['dialog-trigger', 'dialog-close', 'dialog', 'Button dialog'],
        ['alert-trigger', 'alert-cancel', 'alertdialog', 'Button confirmation'],
        ['sheet-trigger', 'sheet-close', 'dialog', 'Button sheet'],
        ['popover-trigger', 'popover-close', 'dialog', 'Button popover'],
      ]) {
        await open()
        await part(trigger).press('Enter')
        await expect(
          page.getByRole(role, { name: title, exact: true }),
        ).toBeVisible()
        const node = await part(close).elementHandle()
        const refs = (await read()).refs
        await page.mouse.move(0, 0)
        await sameButton(close)
        for (const variant of variants) {
          await configure({ variant, tone: 'accent' })
          await sameButton(close, variant, 'accent')
          assert.equal(
            await node.evaluate(
              (node, name) =>
                node === document.querySelector(`[data-button-part="${name}"]`),
              close,
            ),
            true,
          )
        }
        assert.equal((await read()).refs, refs)
        await expect(part(close)).toHaveAttribute('type', 'button')
        await part(close).press('Space')
        await expect(
          page.getByRole(role, { name: title, exact: true }),
        ).toBeHidden()
        await expect(part(trigger)).toBeFocused()
        assert.equal((await read()).submits, 0)
        if (trigger !== 'sheet-trigger')
          assert.equal(
            (await read()).clicks,
            trigger === 'alert-trigger' ? 1 : 2,
          )
        await node.dispose()
      }
    },
  )
  await record(
    'overlay buttons: disabled triggers and close actions suppress callbacks and retain the overlay',
    async () => {
      await open()
      await configure({ disabled: true, variant: 'filled', tone: 'accent' })
      for (const name of [
        'dialog-trigger',
        'alert-trigger',
        'popover-trigger',
        'menu-trigger',
        'tooltip-trigger',
      ]) {
        await expect(part(name)).toBeDisabled()
        await part(name).evaluate((node) => node.click())
      }
      assert.equal((await read()).clicks, 0)
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.getByRole('menu')).toHaveCount(0)
      await configure({ disabled: false })
      await part('dialog-trigger').click()
      await expect(part('dialog-close')).toBeVisible()
      await configure({ disabled: true })
      await expect(part('dialog-close')).toBeDisabled()
      await part('dialog-close').evaluate((node) => node.click())
      await expect(
        page.getByRole('dialog', { name: 'Button dialog' }),
      ).toBeVisible()
      assert.equal((await read()).clicks, 1)
      await configure({ disabled: false })
      await part('dialog-close').click()
      await expect(part('dialog-trigger')).toBeFocused()
      assert.equal((await read()).clicks, 2)
    },
  )
  await record(
    'overlay buttons: Tooltip defaults avoid form submission and preserve custom links and explicit submit',
    async () => {
      await open()
      await expect(part('tooltip-trigger')).toHaveAttribute('type', 'button')
      await part('tooltip-trigger').press('Enter')
      await part('tooltip-trigger').press('Space')
      assert.equal((await read()).clicks, 2)
      assert.equal((await read()).submits, 0)
      assert.equal(
        await part('tooltip-link').evaluate((node) => node.tagName),
        'A',
      )
      assert.equal(await part('tooltip-link').getAttribute('type'), null)
      await expect(part('tooltip-link')).toHaveAttribute('href', '#help')
      await part('tooltip-submit').press('Enter')
      assert.equal((await read()).submits, 1)
    },
  )
  await record(
    'overlay buttons: disposal releases composed event handlers',
    async () => {
      await open()
      const trigger = await part('dialog-trigger').elementHandle()
      const before = await read()
      await page.evaluate(() => window.overlayButtonFixture.stop())
      await trigger.evaluate((node) => node.click())
      const after = await read()
      assert.equal(after.cleanups, 1)
      assert.equal(after.clicks, before.clicks)
      assert.equal(await trigger.evaluate((node) => node.isConnected), false)
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await trigger.dispose()
    },
  )
}
