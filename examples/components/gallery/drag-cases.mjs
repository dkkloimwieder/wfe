import { expect } from '@playwright/test'

export async function galleryDragCases({ page, url, record }) {
  await record(
    'gallery: board lanes scroll inside a bounded preview and keep actions reachable',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${url}?gallery=kanban`)
      const host = page.locator('.gallery-example-host')
      const stage = page.getByRole('region', {
        name: 'Preview viewport',
        exact: true,
      })
      const lane = host.getByRole('region', { name: 'Planned', exact: true })
      const items = lane.locator('.ui-kanban-items')
      const initialCount = await lane.locator('[data-issue]').count()
      await host
        .getByRole('button', { name: 'Add sample issues', exact: true })
        .click()
      await expect
        .poll(() => lane.locator('[data-issue]').count())
        .toBeGreaterThan(initialCount)
      await expect
        .poll(() =>
          items.evaluate(
            (node) =>
              node.clientHeight > 0 && node.scrollHeight > node.clientHeight,
          ),
        )
        .toBe(true)
      await expect
        .poll(() =>
          host.evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
        )
        .toBe(true)
      await expect
        .poll(() =>
          stage.evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
        )
        .toBe(true)
      await items.evaluate((node) => {
        node.scrollTop = node.scrollHeight
      })
      await expect
        .poll(() => items.evaluate((node) => node.scrollTop))
        .toBeGreaterThan(0)
      await lane
        .locator('[data-issue]')
        .last()
        .getByRole('button', { name: /^Actions for / })
        .click()
      await expect(
        page.getByRole('menuitem', { name: 'Move to Done', exact: true }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
    },
  )
  await record(
    'gallery: generic drag menu requests preserve application rejection',
    async () => {
      await page.goto(`${url}?gallery=drag-and-drop`)
      const host = page.locator('.gallery-example-host')
      const location = host.locator('[data-document-location]')
      await host.getByRole('button', { name: 'Assign to', exact: true }).click()
      await page
        .getByRole('menuitem', { name: 'Assign to Library', exact: true })
        .click()
      await expect(location).toHaveText('Library')
      await host.getByText('Reject requests', { exact: true }).click()
      await host.getByRole('button', { name: 'Assign to', exact: true }).click()
      await page
        .getByRole('menuitem', { name: 'Assign to Archive', exact: true })
        .click()
      await expect(location).toHaveText('Library')
      await expect(
        host.getByText('The example rejected the assignment.', { exact: true }),
      ).toBeVisible()
      await host.getByText('Disable movement', { exact: true }).click()
      await expect(
        host.getByRole('button', { name: 'Move draft document', exact: true }),
      ).toBeDisabled()
      await expect(
        host.getByRole('button', { name: 'Assign to', exact: true }),
      ).toBeDisabled()
    },
  )
  await record(
    'gallery: generic keyboard targets and sortable menu share controlled requests',
    async () => {
      await page.goto(`${url}?gallery=drag-and-drop`)
      const host = page.locator('.gallery-example-host')
      const handle = host.getByRole('button', {
        name: 'Move draft document',
        exact: true,
      })
      await handle.focus()
      await handle.press('Space')
      await expect(host.locator('.ui-dnd-sr[role=status]').first()).toHaveText(
        'Picked up Draft document.',
      )
      await handle.press('ArrowDown')
      await handle.press('Escape')
      await expect(host.locator('[data-document-location]')).toHaveText(
        'Unassigned',
      )
      await handle.press('Space')
      await expect(handle).toHaveAttribute('data-dragging', '')
      await handle.press('ArrowDown')
      await handle.press('Space')
      await expect(host.locator('[data-document-location]')).not.toHaveText(
        'Unassigned',
      )
      const list = host.locator('[data-agenda-item]')
      await host
        .locator('[data-agenda-item="Plan"]')
        .getByRole('button', { name: 'Move', exact: true })
        .click()
      await page
        .getByRole('menuitem', { name: 'Move to end', exact: true })
        .click()
      await expect
        .poll(() =>
          list.evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute('data-agenda-item')),
          ),
        )
        .toEqual(['Write', 'Review', 'Plan'])
    },
  )
}
