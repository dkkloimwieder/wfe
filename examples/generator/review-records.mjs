import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import {
  choiceControl,
  selectValue,
} from '../shared/controls/select-review.mjs'

export async function reviewRecords({ page, report, record }) {
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
          Math.abs(
            geometry.grid.height - (geometry.main.height - geometry.padding),
          ) <= 2,
          'fill grid occupies the available main height',
        )
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
