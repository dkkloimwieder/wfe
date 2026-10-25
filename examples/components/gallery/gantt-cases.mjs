import { expect } from '@playwright/test'
import { withCleanup } from '../../shared/browser/runner.mjs'

export async function galleryGanttCases({ page, url, record }) {
  const host = () => page.locator('.gantt-example')
  const interval = () => host().locator('[data-interval="research-work"]')
  const details = () => host().locator('.gantt-example-summary p').last()
  async function open() {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${url}?gallery=gantt`)
    await expect(interval()).toBeVisible()
  }
  async function move(key = 'ArrowRight') {
    await interval().focus()
    await interval().press('Space')
    await interval().press(key)
    await interval().press('Space')
  }

  await record(
    'gallery: gantt hierarchy, selection and keyboard activation',
    async () => {
      await open()
      await interval().click()
      await expect(interval()).toHaveAttribute('aria-pressed', 'true')
      await interval().press('F2')
      await expect(details()).toContainText('Research:')
      await host()
        .getByRole('button', { name: 'Collapse Planning', exact: true })
        .click()
      await expect(interval()).toHaveCount(0)
      await host()
        .getByRole('button', { name: 'Expand Planning', exact: true })
        .click()
      await expect(interval()).toHaveAttribute('aria-pressed', 'true')
    },
  )

  await record(
    'gallery: gantt caller accepts and rejects keyboard date proposals',
    async () => {
      await open()
      await interval().focus()
      await interval().press('F2')
      const initial = await details().textContent()
      await move()
      await expect(host().locator('output')).toHaveText(
        'Accepted move for Research.',
      )
      await expect(details()).not.toHaveText(initial)
      await expect(interval()).toBeFocused()
      const accepted = await details().textContent()
      await host().getByText('Reject edits', { exact: true }).click()
      await move()
      await expect(host().locator('output')).toHaveText(
        'Rejected move for Research. Accepted dates stay unchanged.',
      )
      await expect(details()).toHaveText(accepted)
      await host().getByText('Read only', { exact: true }).click()
      await expect(
        host().getByRole('button', {
          name: 'Resize start: Research',
          exact: true,
        }),
      ).toHaveCount(0)
      await interval().press('Enter')
      await expect(details()).toHaveText(accepted)
    },
  )

  await record(
    'gallery: gantt pointer resize requests dates and Escape cancels keyboard edits',
    async () => {
      await open()
      await interval().focus()
      await interval().press('F2')
      const initial = await details().textContent()
      await interval().press('Space')
      await interval().press('ArrowRight')
      await interval().press('Escape')
      await expect(details()).toHaveText(initial)
      const handle = host().getByRole('button', {
        name: 'Resize end: Research',
        exact: true,
      })
      const box = await handle.boundingBox()
      if (!box) throw new Error('Expected the resize handle to be mounted')
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(
        box.x + box.width / 2 + 50,
        box.y + box.height / 2,
        { steps: 10 },
      )
      await page.mouse.up()
      await expect(host().locator('output')).toHaveText(
        'Accepted resize-end for Research.',
      )
      await expect(details()).not.toHaveText(initial)
    },
  )

  await record(
    'gallery: gantt trusted touch tap, long press move and cancellation',
    async () => {
      await open()
      await interval().focus()
      await interval().press('F2')
      const initial = await details().textContent()
      const client = await page.context().newCDPSession(page)
      const feedback = host().locator('.ui-dnd-sr[role="status"]')
      const touch = async (type, point) =>
        client.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: point ? [{ ...point, id: 1 }] : [],
        })
      const center = async () => {
        const box = await interval().boundingBox()
        if (!box) throw new Error('Expected the touch interval to be mounted')
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      }
      try {
        await touch('touchStart', await center())
        await touch('touchEnd')
        await expect(details()).toHaveText(initial)
        await expect(host().locator('.gantt-example-summary')).toContainText(
          '0 edit requests',
        )

        const point = await center()
        await touch('touchStart', point)
        await expect(feedback).toHaveText(
          /Picked up Research\.|Research over Timeline\./,
        )
        await touch('touchMove', { x: point.x + 40, y: point.y })
        await touch('touchEnd')
        await expect(host().locator('output')).toHaveText(
          'Accepted move for Research.',
        )
        await expect(details()).not.toHaveText(initial)
        const accepted = await details().textContent()
        const next = await center()
        await touch('touchStart', next)
        await expect(feedback).toHaveText(
          /Picked up Research\.|Research over Timeline\./,
        )
        await touch('touchMove', { x: next.x + 40, y: next.y })
        await touch('touchCancel')
        await expect(feedback).toHaveText('Moving Research canceled.')
        await expect(details()).toHaveText(accepted)
        await expect(host().locator('.gantt-example-summary')).toContainText(
          '1 edit requests',
        )
      } finally {
        await touch('touchCancel').catch(() => {})
        await client.detach()
      }
    },
  )

  await record(
    'gallery: gantt range requests and large data keep bounded mounted rows',
    async () => {
      await open()
      await host()
        .getByRole('button', { name: 'Next period', exact: true })
        .click()
      await expect(host().locator('output')).toContainText('Requested window:')
      await expect(host().locator('.gantt-example-summary')).toContainText(
        '1 window requests',
      )
      await host()
        .getByRole('button', { name: 'Initial window', exact: true })
        .click()
      await host()
        .getByRole('button', { name: /^Dataset / })
        .click()
      await page
        .getByRole('option', { name: '10,000 rows', exact: true })
        .click()
      await expect(host().locator('output')).toHaveText(
        "Loaded 10,000 rows into the example's local state.",
      )
      const rows = host().locator('.ui-gantt-row')
      await expect.poll(() => rows.count()).toBeGreaterThan(0)
      await expect.poll(() => rows.count()).toBeLessThan(100)
      const scroll = host().locator('.ui-gantt-scroll')
      await scroll.evaluate((node) => {
        node.scrollTop = node.scrollHeight
      })
      await expect(
        host().locator('[data-row="group-99-item-98"]'),
      ).toBeVisible()
      await expect.poll(() => rows.count()).toBeLessThan(100)
      const connectors = host().locator('.ui-gantt-dependencies')
      await expect
        .poll(() => connectors.locator('path').count())
        .toBeGreaterThan(0)
      await expect
        .poll(() =>
          scroll.evaluate((node) => {
            const svg = node.querySelector('.ui-gantt-dependencies')
            if (!svg) return false
            const bounds = svg.getBoundingClientRect()
            const viewport = node.getBoundingClientRect()
            return (
              node.scrollTop > 0 &&
              node.scrollHeight > node.clientHeight &&
              bounds.height > 0 &&
              bounds.height <= node.clientHeight &&
              bounds.width <= node.clientWidth &&
              bounds.top >= viewport.top - 1 &&
              bounds.bottom <= viewport.bottom + 1
            )
          }),
        )
        .toBe(true)
      await host().evaluate((node) => {
        const svg = node.querySelector('.ui-gantt-dependencies')
        const path = svg.querySelector('path')
        node.__ganttReviewNodes = {
          svg,
          path,
          geometry: path.getAttribute('d'),
          grid: node.querySelector('.ui-gantt-gridline'),
        }
      })
      await host()
        .getByRole('button', { name: 'Zoom out', exact: true })
        .click()
      await expect(host().locator('output')).toContainText('Requested window:')
      await expect
        .poll(() =>
          host().evaluate((node) => {
            const retained = node.__ganttReviewNodes
            return (
              retained.svg === node.querySelector('.ui-gantt-dependencies') &&
              retained.path.isConnected &&
              retained.grid.isConnected &&
              retained.grid === node.querySelector('.ui-gantt-gridline') &&
              retained.path.getAttribute('d') !== retained.geometry
            )
          }),
        )
        .toBe(true)
      await expect.poll(() => rows.count()).toBeLessThan(100)
      await host()
        .getByRole('button', { name: /^Dataset / })
        .click()
      await page
        .getByRole('option', { name: 'Example schedule', exact: true })
        .click()
      await expect(host().locator('output')).toHaveText(
        "Loaded 8 rows into the example's local state.",
      )
    },
  )

  await record(
    'gallery: gantt fits narrow viewports and keeps range controls usable',
    async () =>
      withCleanup(async () => {
        for (const viewport of [
          { width: 390, height: 844 },
          { width: 320, height: 740 },
        ]) {
          await page.setViewportSize(viewport)
          await page.goto(`${url}?gallery=gantt`)
          await expect(interval()).toBeVisible()
          const chart = host().locator('.ui-gantt')
          const contained = () =>
            chart.evaluate((node) => {
              const bounds = node.getBoundingClientRect()
              return (
                bounds.width > 0 &&
                bounds.height > 0 &&
                bounds.left >= -1 &&
                bounds.top >= -1 &&
                bounds.right <= window.innerWidth + 1 &&
                bounds.bottom <= window.innerHeight + 1
              )
            })
          await expect.poll(contained).toBe(true)
          for (const name of [
            'Next period',
            'Previous period',
            'Zoom in',
            'Zoom out',
          ]) {
            const control = chart.getByRole('button', { name, exact: true })
            await control.click()
            await expect(control).toBeFocused()
            await expect(host().locator('output')).toContainText(
              'Requested window:',
            )
          }
          await expect(host().locator('.gantt-example-summary')).toContainText(
            '4 window requests',
          )
          await host()
            .getByRole('button', { name: 'Initial window', exact: true })
            .click()
          await expect(host().locator('.gantt-example-summary')).toContainText(
            '5 window requests',
          )
          await expect(interval()).toBeVisible()
          await expect.poll(contained).toBe(true)
          await host()
            .getByRole('button', { name: 'Reset', exact: true })
            .click()
          await expect(host().locator('output')).toHaveText(
            "Loaded 8 rows into the example's local state.",
          )
          await expect(interval()).toBeVisible()
          await expect.poll(contained).toBe(true)
        }
      }, [
        {
          name: 'gallery viewport',
          close: () => page.setViewportSize({ width: 1280, height: 900 }),
        },
      ]),
  )
}
