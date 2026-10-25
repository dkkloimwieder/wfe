import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { withArtifactRun } from '../../scripts/artifacts.mjs'
import {
  attachDiagnostics,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  startStaticServer,
} from '../shared/browser/runner.mjs'

await withArtifactRun({ suite: 'drag-and-drop' }, async (artifacts) => {
  const directory = process.env.BENCH_DEVELOPMENT
    ? '.dist-dev'
    : process.env.BENCH_DISTRIBUTION
      ? '.dist-package'
      : '.dist'
  const report = { cases: [], errors: [], warnings: [] }
  let browser, server, detach
  try {
    server = await startStaticServer({
      assets: fileURLToPath(new URL(`${directory}/`, import.meta.url)),
    })
    browser = await launchBrowser({ chromium })
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    })
    detach = attachDiagnostics(page, report)
    await page.goto(server.url)
    const test = async (name, run) => {
      await run()
      report.cases.push(name)
      console.log(`PASS ${name}`)
    }
    const lane = (name) => page.getByRole('region', { name, exact: true })
    const card = (id) => page.locator(`[data-issue="${id}"]`)
    const reset = () =>
      page.getByRole('button', { name: 'Reset', exact: true }).click()
    const requestCount = () => page.locator('[data-move-requests]')
    await test('Move menu transfers an item into an empty lane', async () => {
      await card('outline')
        .getByRole('button', {
          name: 'Actions for Outline the release',
          exact: true,
        })
        .click()
      await page
        .getByRole('menuitem', { name: 'Move to Done', exact: true })
        .click()
      await expect(lane('Done').locator('[data-issue="outline"]')).toHaveCount(
        1,
      )
      await expect(requestCount()).toHaveAttribute('data-move-requests', '1')
    })
    await test('Application rejection leaves accepted order intact', async () => {
      await reset()
      await page.getByText('Reject moves', { exact: true }).click()
      await card('outline')
        .getByRole('button', {
          name: 'Actions for Outline the release',
          exact: true,
        })
        .click()
      await page
        .getByRole('menuitem', { name: 'Move to Done', exact: true })
        .click()
      await expect(
        lane('Planned').locator('[data-issue="outline"]'),
      ).toHaveCount(1)
      await expect(
        page.getByText('The example app rejected this move.', { exact: false }),
      ).toBeVisible()
      await page.getByText('Reject moves', { exact: true }).click()
    })
    await test('Keyboard moves and Escape cancels without changing records', async () => {
      const handle = card('outline')
      await handle.focus()
      await page.keyboard.press('Space')
      await expect(card('outline')).toHaveAttribute('data-dragging', '')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Escape')
      await expect(
        lane('Planned').locator('[data-issue="outline"]'),
      ).toHaveCount(1)
      await handle.focus()
      await page.keyboard.press('Space')
      await expect(card('outline')).toHaveAttribute('data-dragging', '')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Space')
      await expect(
        lane('Active').locator('[data-issue="outline"]'),
      ).toHaveCount(1)
      await expect(card('outline')).toBeFocused()
    })
    await test('Pointer release emits one final request and preserves source content', async () => {
      await reset()
      const before = Number(
        await requestCount().getAttribute('data-move-requests'),
      )
      const handle = await card('outline').boundingBox()
      const target = await lane('Done')
        .locator('.ui-kanban-items')
        .boundingBox()
      await page.mouse.move(
        handle.x + handle.width / 2,
        handle.y + handle.height / 2,
      )
      await page.mouse.down()
      await page.mouse.move(
        handle.x + handle.width / 2 + 15,
        handle.y + handle.height / 2,
        { steps: 5 },
      )
      await expect(card('outline')).toHaveAttribute('data-dragging', '')
      await page.mouse.move(target.x + target.width / 2, target.y + 80, {
        steps: 15,
      })
      await expect(lane('Done').locator('.ui-dnd-indicator')).toHaveCount(1)
      await expect(requestCount()).toHaveAttribute(
        'data-move-requests',
        String(before),
      )
      await page.mouse.up()
      await expect(lane('Done').locator('[data-issue="outline"]')).toHaveCount(
        1,
      )
      await expect(requestCount()).toHaveAttribute(
        'data-move-requests',
        String(before + 1),
      )
      await expect(page.locator('.ui-dnd-preview')).toHaveCount(0)
    })
    await test('Column order preserves cards and card keyboard moves follow visual lanes', async () => {
      await reset()
      const before = Number(
        await requestCount().getAttribute('data-move-requests'),
      )
      const originalCard = await card('outline').elementHandle()
      assert.ok(originalCard)
      try {
        const handle = page.getByRole('button', {
          name: 'Move column Planned',
          exact: true,
        })
        await handle.focus()
        await page.keyboard.press('Space')
        await expect(handle).toHaveAttribute('data-dragging', '')
        await page.keyboard.press('ArrowRight')
        await page.keyboard.press('Space')
        await expect(page.locator('.ui-kanban-column').nth(1)).toHaveAttribute(
          'aria-label',
          'Planned',
        )
        assert.equal(
          await card('outline').evaluate(
            (node, original) => node === original,
            originalCard,
          ),
          true,
          'Column reorder preserves existing card nodes',
        )
        for (const [key, destination] of [
          ['ArrowRight', 'Done'],
          ['ArrowLeft', 'Planned'],
        ]) {
          const cardHandle = card('outline')
          await cardHandle.focus()
          await page.keyboard.press('Space')
          await expect(card('outline')).toHaveAttribute('data-dragging', '')
          await page.keyboard.press(key)
          await page.keyboard.press('Space')
          await expect(
            lane(destination).locator('[data-issue="outline"]'),
          ).toHaveCount(1)
          await expect(card('outline')).toBeFocused()
        }
        await expect(requestCount()).toHaveAttribute(
          'data-move-requests',
          String(before + 3),
        )
        await reset()
      } finally {
        await originalCard.dispose()
      }
    })
    await test('Touch cancellation preserves records and touch release requests a move', async () => {
      const client = await page.context().newCDPSession(page)
      try {
        const handle = await card('outline').boundingBox()
        const point = {
          x: handle.x + handle.width / 2,
          y: handle.y + handle.height / 2,
        }
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [point],
        })
        await expect(card('outline')).toHaveAttribute('data-dragging', '')
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchCancel',
          touchPoints: [],
        })
        await expect(card('outline')).not.toHaveAttribute('data-dragging', '')
        await expect(
          lane('Planned').locator('[data-issue="outline"]'),
        ).toHaveCount(1)
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [point],
        })
        await expect(card('outline')).toHaveAttribute('data-dragging', '')
        const destination = await lane('Done')
          .locator('.ui-kanban-items')
          .boundingBox()
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: destination.x + 80, y: destination.y + 80 }],
        })
        await expect(lane('Done').locator('.ui-dnd-indicator')).toHaveCount(1)
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        })
        await expect(
          lane('Done').locator('[data-issue="outline"]'),
        ).toHaveCount(1)
        await reset()
      } finally {
        await client.detach()
      }
    })
    await test('Nested lane scrolling keeps the drag active and Escape cancels', async () => {
      await page
        .getByRole('button', { name: 'Add sample issues', exact: true })
        .click()
      const scroller = lane('Planned').locator('.ui-kanban-items')
      const box = await scroller.boundingBox()
      const handle = await card('outline').boundingBox()
      await page.mouse.move(
        handle.x + handle.width / 2,
        handle.y + handle.height / 2,
      )
      await page.mouse.down()
      await page.mouse.move(handle.x + 20, handle.y + 20, { steps: 3 })
      await expect(card('outline')).toHaveAttribute('data-dragging', '')
      await page.mouse.move(box.x + box.width / 2, box.y + box.height - 8, {
        steps: 10,
      })
      await expect
        .poll(() => scroller.evaluate((node) => node.scrollTop))
        .toBeGreaterThan(0)
      await page.keyboard.press('Escape')
      await page.mouse.up()
      await expect(
        lane('Planned').locator('[data-issue="outline"]'),
      ).toHaveCount(1)
      await expect(page.locator('.ui-dnd-preview')).toHaveCount(0)
      await reset()
    })
    await test('Pen input uses the shared pointer move contract', async () => {
      await reset()
      const client = await page.context().newCDPSession(page)
      try {
        const handle = await card('outline').boundingBox()
        const target = await lane('Done')
          .locator('.ui-kanban-items')
          .boundingBox()
        const x = handle.x + handle.width / 2,
          y = handle.y + handle.height / 2
        await client.send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x,
          y,
          button: 'left',
          buttons: 1,
          clickCount: 1,
          pointerType: 'pen',
        })
        await client.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: x + 12,
          y,
          button: 'left',
          buttons: 1,
          pointerType: 'pen',
        })
        await expect(card('outline')).toHaveAttribute('data-dragging', '')
        await client.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: target.x + 80,
          y: target.y + 80,
          button: 'left',
          buttons: 1,
          pointerType: 'pen',
        })
        await expect(lane('Done').locator('.ui-dnd-indicator')).toHaveCount(1)
        await client.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: target.x + 80,
          y: target.y + 80,
          button: 'left',
          buttons: 0,
          clickCount: 1,
          pointerType: 'pen',
        })
        await expect(
          lane('Done').locator('[data-issue="outline"]'),
        ).toHaveCount(1)
      } finally {
        await client.detach()
      }
    })
    await test('Details edit through shared Sheet and return focus', async () => {
      const open = card('outline').getByRole('button', {
        name: 'Edit Outline the release',
        exact: true,
      })
      const moves = await requestCount().getAttribute('data-move-requests')
      await open.click()
      await expect(card('outline')).not.toHaveAttribute('data-dragging', '')
      assert.equal(
        await page
          .getByRole('dialog')
          .evaluate((node) => !!node.closest('.ui-theme')),
        true,
      )
      await page
        .getByRole('textbox', { name: 'Title', exact: true })
        .fill('Outline the next release')
      await page.getByRole('button', { name: /^Tags(?: |$)/ }).click()
      await page.getByRole('option', { name: 'Design', exact: true }).click()
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect
        .poll(async () =>
          (
            await card('outline').getByRole('listitem').allTextContents()
          ).sort(),
        )
        .toEqual(['Design', 'Engineering'])
      await expect(requestCount()).toHaveAttribute('data-move-requests', moves)
      await expect(
        card('outline').getByRole('button', {
          name: 'Edit Outline the next release',
          exact: true,
        }),
      ).toBeFocused()
    })
    await test('Create and loading states keep records owned by the example app', async () => {
      await page
        .getByRole('button', { name: 'Create issue', exact: true })
        .click()
      await page
        .getByRole('textbox', { name: 'Title', exact: true })
        .fill('Created in the example')
      await page
        .getByRole('textbox', { name: 'Description', exact: true })
        .fill('This record is local example state.')
      await page.getByRole('button', { name: /^Tags(?: |$)/ }).click()
      await page
        .getByRole('option', { name: 'Accessibility', exact: true })
        .click()
      await page.getByRole('option', { name: 'Testing', exact: true }).click()
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(
        lane('Planned').getByRole('heading', {
          name: 'Created in the example',
          exact: true,
        }),
      ).toHaveCount(1)
      await expect(
        page
          .locator('[data-issue]')
          .filter({
            has: page.getByRole('heading', {
              name: 'Created in the example',
              exact: true,
            }),
          })
          .getByRole('listitem'),
      ).toHaveText(['Accessibility', 'Testing'])
      await page.getByText('Loading', { exact: true }).click()
      await expect(
        page.getByRole('group', { name: 'Issues', exact: true }),
      ).toHaveCount(0)
      await expect(
        page.getByRole('button', { name: 'Create issue', exact: true }),
      ).toBeDisabled()
      await page.getByText('Loading', { exact: true }).click()
      await expect(
        lane('Planned').getByRole('heading', {
          name: 'Created in the example',
          exact: true,
        }),
      ).toHaveCount(1)
    })
    await test('Read-only controls disable changes and small-screen menus reach all lanes', async () => {
      await page.getByText('Read only', { exact: true }).click()
      await expect(card('outline')).toHaveAttribute('aria-disabled', 'true')
      await page.getByText('Read only', { exact: true }).click()
      await page.setViewportSize({ width: 390, height: 844 })
      await reset()
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      await card('outline')
        .getByRole('button', {
          name: 'Actions for Outline the release',
          exact: true,
        })
        .click()
      await page
        .getByRole('menuitem', { name: 'Move to Done', exact: true })
        .click()
      await expect(lane('Done').locator('[data-issue="outline"]')).toHaveCount(
        1,
      )
    })
    await test('Narrow board edges scroll horizontally during a drag', async () => {
      await reset()
      const board = page.getByRole('group', { name: 'Issues', exact: true })
      await board.evaluate((node) => {
        node.scrollLeft = 0
      })
      const handle = await card('outline').boundingBox()
      const bounds = await board.boundingBox()
      await page.mouse.move(
        handle.x + handle.width / 2,
        handle.y + handle.height / 2,
      )
      await page.mouse.down()
      await page.mouse.move(handle.x + 20, handle.y + 20, { steps: 3 })
      await expect(card('outline')).toHaveAttribute('data-dragging', '')
      await page.mouse.move(bounds.x + bounds.width - 6, bounds.y + 80, {
        steps: 10,
      })
      await expect
        .poll(() => board.evaluate((node) => node.scrollLeft))
        .toBeGreaterThan(0)
      await page.keyboard.press('Escape')
      await page.mouse.up()
      await expect(page.locator('.ui-dnd-preview')).toHaveCount(0)
    })
    assert.deepEqual(report.errors, [])
    assert.deepEqual(report.warnings, [])
  } catch (error) {
    report.failure = errorText(error)
    report.failureDetails = errorDetails(error)
  } finally {
    const failed = await finalizeReport({
      report,
      output: artifacts.reportPath,
      cleanup: [
        { name: 'browser', close: () => browser?.close() },
        { name: 'listeners', close: () => detach?.() },
        { name: 'server', close: () => server?.close() },
      ],
    })
    if (failed) process.exitCode = 1
  }
})
