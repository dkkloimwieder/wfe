import { reviewExampleSizing } from '../shared/appearance/sizing-review.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewAppearance({ page, record }) {
  await record(
    'WAMN preview shares blue outlines and layered surfaces',
    async () => {
      await expect(page.locator('.wamn-page')).toHaveCSS(
        'background-color',
        'rgb(252, 252, 253)',
      )
      const panels = page.locator('.ui-dashboard-panel:visible')
      for (const panel of await panels.all()) {
        await expect(panel).toHaveCSS('background-color', 'rgb(255, 255, 255)')
        assert.notEqual(
          await panel.evaluate((node) => getComputedStyle(node).boxShadow),
          'none',
        )
      }
      const headings = page.locator('thead .column-move, thead .column-sort')
      assert.ok(await headings.count())
      for (const heading of await headings.all()) {
        const textColor = await heading.evaluate(
          (node) => getComputedStyle(node.closest('th')).color,
        )
        await expect(heading).toHaveCSS('color', textColor)
        await heading.hover()
        await expect(heading).toHaveCSS('color', textColor)
      }
      await page.mouse.move(0, 0)
      const actions = page.locator(
        '.ui-dashboard-header:visible .ui-button, .table-controls-toggle, [data-row-action]',
      )
      for (const action of await actions.all()) {
        await expect(action).toHaveAttribute('data-variant', 'outline')
        await expect(action).toHaveCSS('color', 'rgb(25, 113, 194)')
        await expect(action).toHaveCSS('border-top-color', 'rgb(25, 113, 194)')
      }
    },
  )
  await record('WAMN editor shares the standard form sizing', async () => {
    await page.locator('[data-row-action=edit]').first().click()
    await reviewExampleSizing(page)
    await page
      .getByRole('button', { name: 'Back to records', exact: true })
      .click()
  })
  await record(
    'WAMN column resizing uses the native widths and keeps identifiers on one line',
    async () => {
      await page.evaluate(() => document.fonts.ready)
      const ids = page.locator(
        'tbody td[data-column="id"], tbody td[data-column="makerId"]',
      )
      for (const cell of await ids.all()) {
        await expect(cell).toHaveCSS('white-space', 'nowrap')
        assert.ok(
          await cell.evaluate((node) => node.scrollWidth <= node.clientWidth),
        )
      }
      for (const id of ['id', 'makerId', 'createdAt', 'editVersion']) {
        const spaces = await page
          .locator(`tbody td[data-column="${id}"]`)
          .evaluateAll((cells) =>
            cells.map((cell) => {
              const range = document.createRange()
              range.selectNodeContents(cell)
              const value = range.getBoundingClientRect()
              const box = cell.getBoundingClientRect()
              return {
                left: value.left - box.left,
                right: box.right - value.right,
                font: getComputedStyle(cell).font,
                width: value.width,
              }
            }),
          )
        assert.ok(spaces.length)
        for (const space of spaces) {
          assert.ok(space.left >= 7 && space.left <= 9)
          assert.ok(
            space.right >= 7 && space.right <= 14,
            `${id}: ${JSON.stringify(space)}`,
          )
        }
      }
      const handle = page.getByRole('separator', {
        name: 'Resize Widget code column',
        exact: true,
      })
      const start = Number(await handle.getAttribute('aria-valuenow'))
      const table = await page.locator('table').elementHandle()
      await handle.focus()
      await handle.press('ArrowRight')
      await expect(handle).toHaveAttribute('aria-valuenow', String(start + 10))
      await expect(page.locator('col[data-column-width=code]')).toHaveCSS(
        'width',
        `${start + 10}px`,
      )
      await handle.press('ArrowLeft')
      await handle.scrollIntoViewIfNeeded()
      const bounds = await handle.boundingBox()
      // The pinned Actions column covers the right half of the final grip.
      const resizeX = bounds.x + 2
      const resizeY = bounds.y + bounds.height / 2
      assert.ok(
        await handle.evaluate(
          (node, point) =>
            node.contains(document.elementFromPoint(point.x, point.y)),
          { x: resizeX, y: resizeY },
        ),
      )
      await page.mouse.move(resizeX, resizeY)
      await page.mouse.down()
      for (const delta of [10, 20, 30])
        await page.mouse.move(resizeX + delta, resizeY)
      await page.mouse.up()
      await expect(handle).toHaveAttribute('aria-valuenow', String(start + 30))
      await handle.press('ArrowLeft')
      await handle.press('ArrowLeft')
      await handle.press('ArrowLeft')
      await expect(handle).toHaveAttribute('aria-valuenow', String(start))
      assert.equal(
        await table.evaluate(
          (node) => node === document.querySelector('table'),
        ),
        true,
      )
      await table.dispose()
    },
  )
  await record(
    'WAMN preview keeps actions reachable on phones and short screens',
    async () => {
      const toggle = page.getByRole('button', {
        name: 'Table controls',
        exact: true,
      })
      const records = page.locator('[data-wamn-screen=records]')
      const editor = page.locator('[data-wamn-screen=editor]')
      const main = records.locator('.ui-dashboard-main')
      const note = page.locator('form textarea')
      const save = page.getByRole('button', {
        name: 'Save widget',
        exact: true,
      })
      for (const [width, height] of [
        [320, 360],
        [320, 568],
        [390, 844],
        [667, 375],
        [1280, 900],
      ]) {
        await page.setViewportSize({ width, height })
        await expect(editor).toBeHidden()
        const bounds = await main.boundingBox()
        const panel = await records.locator('.ui-dashboard-panel').boundingBox()
        assert.ok(
          Math.abs(panel.width - bounds.width) < 1,
          `${width}x${height}: records fill the main panel`,
        )
        assert.ok(Math.abs(panel.x - bounds.x) < 1)
        for (const action of await page
          .locator('[data-wamn-screen=records] .ui-dashboard-header button')
          .all()) {
          await action.click({ trial: true })
          await expect(action).toBeInViewport()
        }
        await toggle.click()
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')
        const controls = page.locator('.table-workspace-controls')
        await expect(controls).toBeVisible()
        await toggle.click()
        await expect(toggle).toHaveAttribute('aria-expanded', 'false')
        const scroll = page.locator('.table-scroll')
        await scroll.scrollIntoViewIfNeeded()
        const geometry = await scroll.evaluate((node) => ({
          width: node.clientWidth,
          content: node.scrollWidth,
          height: node.clientHeight,
        }))
        assert.ok(
          geometry.content >= geometry.width,
          `${width}x${height}: table content remains inside its scroll area`,
        )
        assert.ok(
          geometry.height >= 100,
          `${width}x${height}: the table retains a readable viewport`,
        )
        if (geometry.content > geometry.width) {
          await scroll.evaluate((node) => {
            node.scrollLeft = node.scrollWidth
          })
          assert.ok(await scroll.evaluate((node) => node.scrollLeft > 0))
        }
        await scroll.evaluate((node) => {
          node.scrollLeft = 0
        })
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        )
        await page.locator('[data-row-action=edit]').first().click()
        await expect(records).toBeHidden()
        await expect(editor).toBeVisible()
        await note.click({ trial: true })
        await expect(note).toBeInViewport()
        await save.click({ trial: true })
        await expect(save).toBeInViewport()
        await page
          .getByRole('button', { name: 'Back to records', exact: true })
          .click()
        await expect(records).toBeVisible()
        await expect(
          page.locator('[data-row-action=edit]').first(),
        ).toBeFocused()
      }
      await page.setViewportSize({ width: 1280, height: 900 })
      await main.evaluate((node) => {
        node.scrollTop = 0
      })
    },
  )
}
