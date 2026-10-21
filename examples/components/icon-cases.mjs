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
  await record(
    'icons: neutral triangle directions and native caret variants',
    async () => {
      await page.goto(`${url}?icons=1`)
      await page.waitForFunction(() => Boolean(window.iconFixture))
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate((dir) => window.iconFixture.configure({ dir }), dir)
        const triangles = await page
          .locator('[data-glyphs] .ui-direction-triangle')
          .evaluateAll((nodes) =>
            nodes.map((node) => {
              const matrix = node.transform.baseVal.consolidate().matrix
              const tip = new DOMPoint(9.5, 9).matrixTransform(matrix)
              const base = new DOMPoint(1.625, 9).matrixTransform(matrix)
              const rect = node.getBoundingClientRect()
              return {
                x: tip.x - base.x,
                y: tip.y - base.y,
                width: rect.width,
                height: rect.height,
                stroke: getComputedStyle(node).stroke,
                strokeWidth: getComputedStyle(node).strokeWidth,
              }
            }),
          )
        assert.equal(triangles.length, 3)
        assert.ok(triangles[0].y > 4 && Math.abs(triangles[0].x) < 0.01)
        assert.ok(triangles[1].x > 4 && Math.abs(triangles[1].y) < 0.01)
        assert.ok(triangles[2].x < -4 && Math.abs(triangles[2].y) < 0.01)
        assert.ok(Math.abs(triangles[0].width - 6) < 0.01)
        assert.ok(Math.abs(triangles[0].height - 4.2) < 0.01)
        for (const triangle of triangles) {
          assert.equal(triangle.stroke, 'rgb(0, 0, 0)')
          assert.equal(triangle.strokeWidth, '1px')
        }
        for (const label of ['Native multiple', 'Native list']) {
          await expect(page.getByLabel(label)).toHaveCSS(
            'background-image',
            'none',
          )
        }
        const positions = await page
          .getByLabel('Native caret')
          .evaluate((node) => getComputedStyle(node).backgroundPosition)
        assert.notEqual(positions, '0% 0%')
        assert.ok(positions.includes(dir === 'rtl' ? '6px' : '100%'))
        await expect(page.getByLabel('Native caret')).toHaveCSS(
          'background-size',
          '3px 4.2px, 3px 4.2px, 6px 1px',
        )
      }
      for (const zoom of [1, 1.25, 1.5]) {
        await page
          .locator('main')
          .evaluate((node, zoom) => (node.style.zoom = String(zoom)), zoom)
        await page.screenshot({ path: `/tmp/wfe-triangles-${zoom}.png` })
      }
      await page.locator('main').evaluate((node) => (node.style.zoom = ''))
      await page.emulateMedia({ forcedColors: 'active' })
      await expect(page.getByLabel('Native caret')).toHaveCSS(
        'background-image',
        'none',
      )
      await expect(page.getByLabel('Native caret')).toHaveCSS(
        'appearance',
        'auto',
      )
      const automatic = page.locator('[data-default-select] button')
      assert.deepEqual(
        await automatic.evaluate((node) => {
          const style = getComputedStyle(node, '::after')
          return [
            style.content,
            style.width,
            style.height,
            style.backgroundColor,
            style.forcedColorAdjust,
          ]
        }),
        ['""', '6px', '4.1875px', 'rgb(0, 0, 0)', 'none'],
      )
      assert.equal(
        await page
          .locator('[data-slot-select] button')
          .evaluate((node) => getComputedStyle(node, '::after').content),
        'none',
      )
      await page.screenshot({ path: '/tmp/wfe-triangles-forced.png' })
      await expect(
        page.locator('[data-glyphs] .ui-direction-triangle').first(),
      ).toHaveCSS('stroke', 'rgb(0, 0, 0)')
      await page.emulateMedia({ forcedColors: 'none' })
    },
  )
}
