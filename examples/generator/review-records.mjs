import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import {
  choiceControl,
  selectValue,
} from '../shared/controls/select-review.mjs'

export async function reviewRecords({ page, report, record }) {
  await record(
    'named form groups respond to panel width and clamp field spans',
    async () => {
      const form = page.locator('form')
      const details = form.getByRole('group', {
        name: 'Record details',
        exact: true,
      })
      const preferences = form.getByRole('group', {
        name: 'Preferences',
        exact: true,
      })
      await expect(preferences).toBeVisible()
      await expect(details).toHaveAccessibleDescription('Identity and quantity')
      await expect(details.getByLabel('Name', { exact: true })).toHaveCount(1)
      const geometry = () =>
        form.evaluate((node) => {
          const box = (selector) => {
            const element = node.querySelector(selector)
            const rect = element.getBoundingClientRect()
            return {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              right: rect.right,
              span: getComputedStyle(element).gridColumn,
            }
          }
          return {
            record: box('[data-generator-group="record"]'),
            preferences: box('[data-generator-group="preferences"]'),
            active: box('[data-generator-field="active"]'),
            alerts: box('[data-generator-field="alerts"]'),
            notes: box('[data-generator-field="notes"]'),
            name: box('[data-generator-field="name"]'),
            category: box('[data-generator-field="category"]'),
            quantity: box('[data-generator-field="quantity"]'),
            overflow: node.scrollWidth > node.clientWidth,
          }
        })
      // Widen the example panel while keeping the desktop viewport unchanged.
      await page.evaluate(() => window.generatorFixture.columns(1))
      await page.evaluate(() => window.generatorFixture.formColumns(1))
      let boxes = await geometry()
      assert.equal(boxes.record.x, boxes.preferences.x)
      assert.ok(boxes.preferences.y > boxes.record.y)
      assert.equal(boxes.active.y, boxes.alerts.y)
      assert.ok(boxes.alerts.x > boxes.active.x)
      assert.equal(boxes.notes.span, 'span 2')
      assert.ok(boxes.notes.width <= 480)
      assert.equal(boxes.name.span, '1 / -1')
      assert.ok(boxes.name.width <= 480)
      assert.equal(boxes.overflow, false)
      await page.evaluate(() => window.generatorFixture.fieldColumns(3))
      boxes = await geometry()
      assert.equal(boxes.category.y, boxes.quantity.y)
      assert.equal(boxes.name.span, '1 / -1')
      assert.ok(boxes.name.width <= 480)
      assert.equal(boxes.notes.span, 'span 2')
      assert.ok(boxes.notes.width <= 480)
      assert.equal(boxes.notes.x, boxes.active.x)
      assert.ok(boxes.notes.y > boxes.active.y)
      await page.evaluate(() => window.generatorFixture.fieldColumns(2))
      await page.evaluate(() => window.generatorFixture.formColumns(2))
      boxes = await geometry()
      assert.equal(boxes.record.y, boxes.preferences.y)
      assert.ok(boxes.preferences.x > boxes.record.x)
      // A narrow panel on a wide viewport must stack its own fields.
      await page.evaluate(() => window.generatorFixture.columns(2))
      boxes = await geometry()
      assert.equal(boxes.active.x, boxes.alerts.x)
      assert.ok(boxes.alerts.y > boxes.active.y)
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 })
        boxes = await geometry()
        assert.equal(boxes.record.x, boxes.preferences.x)
        assert.equal(boxes.active.x, boxes.alerts.x)
        assert.equal(boxes.notes.width, boxes.active.width)
        assert.equal(boxes.overflow, false)
        assert.ok(boxes.record.right <= width)
        assert.ok(boxes.preferences.right <= width)
      }
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )

  await record(
    'custom numeric fields retain optional empty semantics and block incomplete drafts',
    async () => {
      const quantity = page
        .locator('form')
        .getByRole('textbox', { name: 'Quantity', exact: true })
      await expect(quantity).toHaveValue('')
      await quantity.fill('3.50')
      await expect(quantity).toHaveValue('3.50')
      await quantity.fill('-')
      await quantity.press('Enter')
      await expect(quantity).toBeFocused()
      const snapshot = await page.evaluate(() =>
        window.generatorFixture.snapshot(),
      )
      assert.equal(snapshot.values.quantity, 3.5)
      assert.equal(snapshot.submitted, 0)
      await quantity.press('Escape')
      await expect(quantity).toHaveValue('3.5')
      await quantity.fill('')
      assert.equal(
        (await page.evaluate(() => window.generatorFixture.snapshot())).values
          .quantity,
        undefined,
      )
    },
  )
  await record(
    'numeric drafts retain focus and selection when fields and panels move',
    async () => {
      const quantity = page
        .locator('form')
        .getByRole('textbox', { name: 'Quantity', exact: true })
      for (const text of ['4.50', '4.']) {
        await quantity.fill('4.5')
        await quantity.fill(text)
        await quantity.evaluate((node) => {
          node.focus()
          node.setSelectionRange(1, 2, 'backward')
          window.numericReorderNode = node
        })
        for (const reversed of [true, false]) {
          await page.evaluate((value) => {
            window.generatorFixture.recordOrder(value)
          }, reversed)
          await expect(quantity).toBeFocused()
          await expect(quantity).toHaveValue(text)
          assert.deepEqual(
            await quantity.evaluate((node) => ({
              same: node === window.numericReorderNode,
              start: node.selectionStart,
              end: node.selectionEnd,
              direction: node.selectionDirection,
            })),
            { same: true, start: 1, end: 2, direction: 'backward' },
          )
          assert.equal(
            (await page.evaluate(() => window.generatorFixture.snapshot()))
              .values.quantity,
            4.5,
          )
        }
        if (text === '4.') {
          await quantity.press('Enter')
          await expect(quantity).toBeFocused()
          assert.equal(
            (await page.evaluate(() => window.generatorFixture.snapshot()))
              .submitted,
            0,
          )
          await quantity.press('Escape')
          await expect(quantity).toHaveValue('4.5')
        }
      }
      await quantity.fill('')
      assert.equal(
        (await page.evaluate(() => window.generatorFixture.snapshot())).values
          .quantity,
        undefined,
      )
    },
  )
  await record('two-column layout stacks on narrow screens', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    const panels = await page
      .locator('[data-generator-panel]')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          x: node.getBoundingClientRect().x,
          y: node.getBoundingClientRect().y,
          width: node.getBoundingClientRect().width,
        })),
      )
    assert.ok(
      panels.every((panel) => panel.x >= 0 && panel.x + panel.width <= 390),
    )
    assert.equal(panels[0].x, panels[1].x)
    assert.ok(panels[1].y > panels[0].y)
    await page.setViewportSize({ width: 1280, height: 900 })
  })
  await record(
    'accepted text, select, checkbox and switch use shared controls',
    async () => {
      await page
        .locator('form')
        .getByLabel('Name', { exact: true })
        .fill('Edited record')
      await selectValue(
        choiceControl(page.locator('form'), {
          name: 'Category',
          exact: true,
        }),
        'b',
      )
      await page.getByText('Active', { exact: true }).click()
      await expect(
        page.getByRole('checkbox', { name: 'Active' }),
      ).not.toBeChecked()
      await page.getByRole('switch', { name: 'Alerts' }).press('Space')
      await expect(page.getByRole('switch', { name: 'Alerts' })).toBeChecked()
      assert.equal(
        (await page.evaluate(() => window.generatorFixture.snapshot())).values
          .category,
        'b',
      )
    },
  )
  await record('optional custom field and explicit submission', async () => {
    await page.locator('form').getByLabel('Quantity', { exact: true }).fill('4')
    await page
      .locator('form')
      .getByLabel('Name', { exact: true })
      .press('Enter')
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.generatorFixture.snapshot()))
            .submitted,
      )
      .toBe(1)
    await page.locator('form').getByLabel('Name', { exact: true }).fill('')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(
      page.locator('form').getByLabel('Name', { exact: true }),
    ).toHaveAttribute('aria-invalid', 'true')
    for (const label of ['Active', 'Alerts']) {
      const control = page.getByRole(
        label === 'Active' ? 'checkbox' : 'switch',
        { name: label },
      )
      await expect(control).toHaveAttribute('aria-invalid', 'true')
      assert.equal(
        await control.evaluate((node) =>
          node
            .getAttribute('aria-describedby')
            .split(' ')
            .map((id) => document.getElementById(id)?.textContent)
            .some((text) => text?.startsWith('Review ')),
        ),
        true,
      )
    }
  })
  await record(
    'relabel, reorder, aliases, row values and callbacks preserve local state',
    async () => {
      await page
        .locator('form')
        .getByLabel('Name', { exact: true })
        .fill('Draft preserved')
      await page.getByLabel('Cell note').fill('Cell preserved')
      await page.getByRole('button', { name: 'Extra', exact: true }).click()
      await page.locator('form').getByLabel('Name', { exact: true }).focus()
      await page.evaluate(() => {
        window.generatorServerNodes = [
          ...document.querySelectorAll(
            '#root input, #root textarea, #root table',
          ),
        ]
        window.generatorFixture.revise()
      })
      await expect(
        page.locator('form').getByLabel('Record name', { exact: true }),
      ).toBeFocused()
      await expect(
        page.locator('form').getByLabel('Record name', { exact: true }),
      ).toHaveValue('Draft preserved')
      await expect(page.getByLabel('Cell note')).toHaveValue('Cell preserved')
      await expect(page.locator('[data-generator-amount]')).toHaveText('7')
      await expect(page.locator('[data-generator-amount]')).toHaveAttribute(
        'data-row-id',
        'record-0',
      )
      await expect(page.locator('[data-generator-amount]')).toHaveAttribute(
        'data-record-name',
        'Updated row',
      )
      await expect(page.locator('tbody td').first()).toHaveAttribute(
        'data-column',
        'quantity',
      )
      assert.equal(
        await page.evaluate(() =>
          window.generatorServerNodes.every((node) => node.isConnected),
        ),
        true,
      )
      await page.getByRole('button', { name: 'Extra', exact: true }).click()
      const snapshot = await page.evaluate(() =>
        window.generatorFixture.snapshot(),
      )
      assert.deepEqual(snapshot.calls, [1, 2])
      assert.equal(snapshot.lifecycle.quantityMounts, 1)
      assert.equal(snapshot.lifecycle.cellMounts, 1)
    },
  )
  await record('layout stays within narrow viewport', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    )
    const panels = await page
      .locator('[data-generator-panel]')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          x: node.getBoundingClientRect().x,
          width: node.getBoundingClientRect().width,
        })),
      )
    assert.ok(
      panels.every((panel) => panel.x >= 0 && panel.x + panel.width <= 390),
    )
  })
  await record(
    'fill panels keep result height for empty, two and forty rows',
    async () => {
      report.geometry = { wide: [], narrow: [] }
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.evaluate(() => window.generatorFixture.columns(2))
      let height
      for (const count of [0, 2, 40]) {
        await page.evaluate(
          (value) => window.generatorFixture.rows(value),
          count,
        )
        await expect(page.locator('tbody tr')).toHaveCount(count)
        const geometry = await page.evaluate(() => {
          const main = document.querySelector('.ui-dashboard-main')
          const grid = document.querySelector('.ui-dashboard-grid')
          const panel = document.querySelector(
            '[data-generator-panel="records-panel"]',
          )
          const editor = document.querySelector(
            '[data-generator-panel="editor-panel"]',
          )
          const results = document.querySelector('.table-scroll')
          const bounds = (node) => {
            const rect = node.getBoundingClientRect()
            return {
              x: rect.x,
              y: rect.y,
              height: rect.height,
              bottom: rect.bottom,
            }
          }
          const mainStyle = getComputedStyle(main)
          return {
            main: bounds(main),
            grid: bounds(grid),
            panel: bounds(panel),
            editor: bounds(editor),
            form: bounds(document.querySelector('form')),
            results: bounds(results),
            padding:
              parseFloat(mainStyle.paddingTop) +
              parseFloat(mainStyle.paddingBottom),
            scrolls: results.scrollHeight > results.clientHeight,
          }
        })
        report.geometry.wide.push({ count, ...geometry })

        assert.ok(
          Math.abs(geometry.panel.height - geometry.grid.height) <= 2,
          'fill panel occupies the grid height',
        )
        assert.ok(
          geometry.form.bottom <= geometry.editor.bottom + 1,
          'adjacent form is not clipped',
        )
        if (height === undefined) height = geometry.results.height
        else
          assert.ok(
            Math.abs(height - geometry.results.height) <= 1,
            'result count does not resize the table',
          )
        if (count === 40) assert.equal(geometry.scrolls, true)
      }
      await page.evaluate(() => {
        window.generatorFixture.rows(1)
        window.generatorFixture.fill(false)
      })
      const natural = await page.evaluate(() => {
        const main = document.querySelector('.ui-dashboard-main')
        const style = getComputedStyle(main)
        return {
          grid: document
            .querySelector('.ui-dashboard-grid')
            .getBoundingClientRect().height,
          available:
            main.getBoundingClientRect().height -
            parseFloat(style.paddingTop) -
            parseFloat(style.paddingBottom),
        }
      })
      assert.ok(
        natural.grid < natural.available - 1,
        'disabling fill restores content height',
      )
      report.geometry.natural = natural
      await page.evaluate(() => window.generatorFixture.fill(true))
      await page.setViewportSize({ width: 390, height: 844 })
      let narrowHeight
      for (const count of [0, 2, 40]) {
        await page.evaluate(
          (value) => window.generatorFixture.rows(value),
          count,
        )
        await expect(page.locator('tbody tr')).toHaveCount(count)
        const result = await page.locator('.table-scroll').evaluate((node) => ({
          height: node.getBoundingClientRect().height,
          minimum:
            node.querySelector('thead').getBoundingClientRect().height +
            (node.querySelector('tbody tr')?.getBoundingClientRect().height ??
              parseFloat(
                getComputedStyle(node).getPropertyValue('--ui-row-height'),
              )),
        }))
        report.geometry.narrow.push({ count, ...result })
        assert.equal(
          await page.evaluate(
            () =>
              document.querySelector('form').getBoundingClientRect().bottom <=
              document
                .querySelector('[data-generator-panel="editor-panel"]')
                .getBoundingClientRect().bottom +
                1,
          ),
          true,
          'narrow form stays inside its panel',
        )
        assert.ok(
          result.height > result.minimum,
          'narrow results retain room for the header and a record',
        )
        if (narrowHeight === undefined) narrowHeight = result.height
        else
          assert.ok(
            Math.abs(narrowHeight - result.height) <= 1,
            'narrow result count does not resize the table',
          )
      }
      await page.evaluate(() => window.generatorFixture.rows(1))
      const narrow = await page
        .locator('[data-generator-panel]')
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            x: node.getBoundingClientRect().x,
            width: node.getBoundingClientRect().width,
          })),
        )
      assert.ok(
        narrow.every((panel) => panel.x >= 0 && panel.x + panel.width <= 390),
      )
      assert.equal(
        await page.evaluate(() => {
          const form = document.querySelector('form').getBoundingClientRect()
          const panel = document
            .querySelector('[data-generator-panel="editor-panel"]')
            .getBoundingClientRect()
          return form.bottom <= panel.bottom + 1
        }),
        true,
      )
    },
  )
  await record('removed views and disposed cells clean up once', async () => {
    await page.evaluate(() => window.generatorFixture.remove())
    await expect(
      page.locator('[data-generator-panel="editor-panel"]'),
    ).toHaveCount(0)
    assert.equal(
      (await page.evaluate(() => window.generatorFixture.snapshot())).lifecycle
        .quantityDisposals,
      1,
    )
    await page.evaluate(() => window.generatorFixture.stop())
    const lifecycle = (
      await page.evaluate(() => window.generatorFixture.snapshot())
    ).lifecycle
    assert.equal(lifecycle.cellDisposals, lifecycle.cellMounts)
    await expect(page.locator('#root input, #root table')).toHaveCount(0)
  })
}
