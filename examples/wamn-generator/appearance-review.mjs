import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewAppearance({ page, record }) {
  await record(
    'WAMN preview shares blue outlines and layered surfaces',
    async () => {
      await expect(page.locator('.wamn-page')).toHaveCSS(
        'background-color',
        'rgb(233, 236, 239)',
      )
      const panels = page.locator('.ui-dashboard-panel')
      for (const panel of await panels.all()) {
        await expect(panel).toHaveCSS('background-color', 'rgb(252, 252, 253)')
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
        '.ui-dashboard-header .ui-button, form .ui-button, .table-controls-toggle',
      )
      for (const action of await actions.all()) {
        await expect(action).toHaveAttribute('data-variant', 'outline')
        await expect(action).toHaveCSS('color', 'rgb(28, 126, 214)')
        await expect(action).toHaveCSS('border-top-color', 'rgb(28, 126, 214)')
      }
    },
  )
  await record(
    'WAMN preview keeps actions reachable on phones and short screens',
    async () => {
      const toggle = page.getByRole('button', {
        name: 'Table controls',
        exact: true,
      })
      const main = page.locator('.ui-dashboard-main')
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
        await note.click({ trial: true })
        await expect(note).toBeInViewport()
        await save.click({ trial: true })
        await expect(save).toBeInViewport()
        for (const action of await page
          .locator('.ui-dashboard-header button')
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
          geometry.content > geometry.width,
          `${width}x${height}: long records stay inside a horizontal table scroller`,
        )
        assert.ok(
          geometry.height >= 100,
          `${width}x${height}: the table retains a readable viewport`,
        )
        await scroll.evaluate((node) => {
          node.scrollLeft = node.scrollWidth
        })
        assert.ok(await scroll.evaluate((node) => node.scrollLeft > 0))
        await scroll.evaluate((node) => {
          node.scrollLeft = 0
        })
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        )
        if (width === 320 && height === 360) {
          assert.ok(
            await main.evaluate(
              (node) => node.scrollHeight > node.clientHeight,
            ),
          )
        }
      }
      await page.setViewportSize({ width: 1280, height: 900 })
      await main.evaluate((node) => {
        node.scrollTop = 0
      })
    },
  )
}
