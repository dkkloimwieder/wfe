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
    'gallery: gantt interval details explain dates and readonly state without interrupting edits',
    async () =>
      withCleanup(async () => {
        await open()
        const tooltip = page.getByRole('tooltip')
        const field = (name) =>
          tooltip
            .locator('dt')
            .filter({ hasText: new RegExp(`^${name}$`) })
            .locator('xpath=following-sibling::dd[1]')
        await interval().hover()
        await expect(tooltip).toBeVisible()
        await expect(tooltip.locator('strong')).toHaveText('Research')
        await expect(field('START')).toContainText('Jun 1, 2026')
        await expect(field('END')).toContainText('Jun 5, 2026')
        await expect(field('TIME ZONE')).toHaveText('UTC')
        await expect(field('PROGRESS')).toHaveText('100%')
        await expect(field('BASELINE START')).toContainText('Jun 1, 2026')
        await expect(field('BASELINE END')).toContainText('Jun 4, 2026')
        await expect(field('EDITING')).toHaveText('MOVABLE AND RESIZABLE')
        const tooltipId = await tooltip.getAttribute('id')
        expect(
          (await interval().getAttribute('aria-describedby')).split(/\s+/),
        ).toContain(tooltipId)
        expect(
          await interval().evaluate((node) =>
            node
              .getAttribute('aria-describedby')
              .split(/\s+/)
              .some((id) =>
                document
                  .getElementById(id)
                  ?.textContent.includes('Press Space or Enter'),
              ),
          ),
        ).toBe(true)

        const planning = host().locator('[data-interval="planning-summary"]')
        await planning.hover()
        await expect(planning).toHaveAccessibleName(/read only/i)
        await expect(tooltip.locator('strong')).toHaveText('Planning summary')
        await expect(field('EDITING')).toHaveText('READ ONLY')
        await expect(field('PROGRESS')).toHaveText('80%')
        for (const edge of ['start', 'end'])
          await expect(
            host().getByRole('button', {
              name: `Resize ${edge}: Planning summary`,
              exact: true,
            }),
          ).toHaveCount(0)
        await planning.press('Escape')
        await expect(tooltip).toHaveCount(0)
        await page.mouse.move(0, 0)
        await interval().focus()
        await expect(tooltip.locator('strong')).toHaveText('Research')
        await interval().press('Escape')
        await expect(tooltip).toHaveCount(0)
        await planning.focus()
        await interval().focus()
        await expect(tooltip.locator('strong')).toHaveText('Research')
        await interval().press('Space')
        const feedback = host().locator('.ui-dnd-sr[role="status"]')
        await expect(feedback).toHaveText(
          /Picked up Research\.|Research over Timeline\./,
        )
        await expect(tooltip).toHaveCount(0)
        await interval().press('ArrowRight')
        await interval().press('Escape')
        await expect(feedback).toHaveText('Moving Research canceled.')
        await expect(interval()).toBeFocused()
        await expect(tooltip).toHaveCount(0)
        await expect(host().locator('.gantt-example-summary')).toContainText(
          '0 edit requests',
        )

        const retainDetails = async () => {
          await planning.focus()
          await interval().focus()
          await expect(tooltip.locator('strong')).toHaveText('Research')
          await tooltip.evaluate((node) => {
            window.__ganttDetailReview = {
              tooltip: node,
              trigger: document.querySelector(
                '[data-interval="research-work"]',
              ),
            }
          })
        }
        const expectReleased = async () => {
          await expect(tooltip).toHaveCount(0)
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  !window.__ganttDetailReview.tooltip.isConnected &&
                  !window.__ganttDetailReview.trigger.isConnected,
              ),
            )
            .toBe(true)
          await page.evaluate(() => {
            delete window.__ganttDetailReview
          })
        }
        await retainDetails()
        await host()
          .getByRole('button', { name: /^Dataset / })
          .click()
        await page
          .getByRole('option', { name: '10,000 rows', exact: true })
          .click()
        await expect(interval()).toHaveCount(0)
        await expectReleased()
        await host()
          .getByRole('button', { name: /^Dataset / })
          .click()
        await page
          .getByRole('option', { name: 'Example schedule', exact: true })
          .click()
        await expect(interval()).toBeVisible()
        await retainDetails()
        await page.getByRole('link', { name: 'Buttons', exact: true }).click()
        await expect(host()).toHaveCount(0)
        await expectReleased()
        await expect(page).toHaveURL(/gallery=buttons(?:&|$)/)
      }, [
        {
          name: 'retained Gantt detail nodes',
          close: () =>
            page.evaluate(() => {
              delete window.__ganttDetailReview
            }),
        },
      ]),
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
    'gallery: active resize blocks unrelated hover and selection and releases on Escape',
    async () => {
      await open()
      const dataset = host().getByRole('button', { name: /^Dataset / })
      await dataset.evaluate((node) => {
        node.addEventListener(
          'pointerenter',
          () => {
            node.dataset.dragReviewEntered = 'true'
          },
          { once: true },
        )
      })
      const handle = host().getByRole('button', {
        name: 'Resize end: Research',
        exact: true,
      })
      const box = await handle.boundingBox()
      const other = await dataset.boundingBox()
      if (!box || !other)
        throw new Error('Expected mounted resize and dataset controls')
      const layer = page.locator('[data-dnd-cursor-layer]')
      try {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await expect(layer).toHaveCount(1)
        await page.mouse.move(
          other.x + other.width / 2,
          other.y + other.height / 2,
        )
        expect(
          await dataset.getAttribute('data-drag-review-entered'),
        ).toBeNull()
        expect(await dataset.evaluate((node) => node.matches(':hover'))).toBe(
          false,
        )
        expect(
          await page.evaluate(
            () =>
              !document.dispatchEvent(
                new Event('selectstart', { cancelable: true, bubbles: true }),
              ),
          ),
        ).toBe(true)
        await page.keyboard.press('Escape')
        await expect(layer).toHaveCount(0)
        await expect(host().locator('.gantt-example-summary')).toContainText(
          '0 edit requests',
        )
      } finally {
        await page.mouse.up()
      }
      expect(
        await page.evaluate(() =>
          document.dispatchEvent(
            new Event('selectstart', { cancelable: true, bubbles: true }),
          ),
        ),
      ).toBe(true)
      await page.mouse.move(0, 0)
      await dataset.hover()
      await expect(dataset).toHaveAttribute('data-drag-review-entered', 'true')
      await dataset.click()
      await expect(
        page.getByRole('option', { name: '10,000 rows', exact: true }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
    },
  )

  await record(
    'gallery: Escape cancels a resize without dismissing its parent dialog',
    async () => {
      await open()
      await host().evaluate((node) => {
        const dialog = document.createElement('dialog')
        dialog.dataset.dragReviewDialog = ''
        dialog.style.cssText =
          'width:90vw;height:90vh;max-width:none;max-height:none'
        node.before(dialog)
        dialog.append(node)
        dialog.showModal()
        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') dialog.dataset.escaped = 'true'
        })
      })
      const dialog = page.locator('[data-drag-review-dialog]')
      const handle = host().getByRole('button', {
        name: 'Resize end: Research',
        exact: true,
      })
      await handle.scrollIntoViewIfNeeded()
      const box = await handle.boundingBox()
      if (!box) throw new Error('Expected a resize handle inside the dialog')
      try {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await expect(dialog.locator('[data-dnd-cursor-layer]')).toHaveCount(1)
        await page.keyboard.press('Escape')
        await expect(page.locator('[data-dnd-cursor-layer]')).toHaveCount(0)
        await expect(dialog).toBeVisible()
        expect(await dialog.evaluate((node) => node.open)).toBe(true)
        expect(await dialog.getAttribute('data-escaped')).toBeNull()
        await expect(host().locator('.gantt-example-summary')).toContainText(
          '0 edit requests',
        )
      } finally {
        await page.mouse.up()
        await dialog.evaluate((node) => node.close())
      }
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
