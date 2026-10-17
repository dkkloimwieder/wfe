import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function iconCases({ page, url, record, settle }) {
  await record(
    'icons: shared glyph dimensions, decoration and checkbox focus',
    async () => {
      await page.goto(`${url}?icons=1`)
      await page.waitForFunction(() => Boolean(window.iconFixture))
      const glyphs = page.locator('[data-glyphs] svg')
      assert.equal(await glyphs.count(), 10)
      assert.deepEqual(
        await glyphs.evaluateAll((nodes) =>
          nodes.map((node) => ({
            hidden: node.getAttribute('aria-hidden'),
            focusable: node.getAttribute('focusable'),
            tabindex: node.getAttribute('tabindex'),
            pointer: getComputedStyle(node).pointerEvents,
            width: node.getBoundingClientRect().width,
            height: node.getBoundingClientRect().height,
          })),
        ),
        Array.from({ length: 10 }, () => ({
          hidden: 'true',
          focusable: 'false',
          tabindex: null,
          pointer: 'none',
          width: 16,
          height: 16,
        })),
      )
      const checkbox = page.getByRole('checkbox', { name: 'Mixed checkbox' })
      await checkbox.focus()
      await page.keyboard.press('Space')
      await expect(checkbox).toBeFocused()
      assert.equal(await page.locator('svg:focus').count(), 0)
    },
  )
  await record(
    'icons: explicit select slots replace automatic carets in both directions',
    async () => {
      await page.goto(`${url}?icons=1`)
      await page.waitForFunction(() => Boolean(window.iconFixture))
      const slot = page.locator('[data-slot-select]')
      const trigger = slot.locator('button.popup-trigger')
      const automatic = page.locator('[data-default-select] button')
      for (const dir of ['ltr', 'rtl']) {
        for (const content of ['default', 'custom', 'empty']) {
          await page.evaluate((value) => window.iconFixture.configure(value), {
            dir,
            content,
          })
          await settle()
          await expect(trigger).toHaveCSS('background-image', 'none')
          assert.notEqual(
            await automatic.evaluate(
              (n) => getComputedStyle(n).backgroundImage,
            ),
            'none',
          )
          assert.equal(
            await trigger.evaluate((n) => getComputedStyle(n).paddingInlineEnd),
            await automatic.evaluate(
              (n) =>
                getComputedStyle(n)
                  .getPropertyValue('--ui-input-padding-x')
                  .trim() || '6px',
            ),
          )
          assert.equal(
            await slot.locator('.ui-choice-icon svg').count(),
            content === 'default' ? 1 : 0,
          )
          assert.equal(
            await page.locator('.choice-toggle .ui-choice-icon svg').count(),
            content === 'default' ? 1 : 0,
          )
          if (content === 'custom')
            assert.equal(
              await slot.locator('[data-custom-icon]').textContent(),
              'Custom',
            )
          if (content === 'empty')
            assert.equal(
              await slot.locator('.ui-choice-icon').textContent(),
              '',
            )
        }
      }
    },
  )
}
