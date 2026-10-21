import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function reviewResizable(page, api) {
  const configure = (next) =>
    page.evaluate(
      ({ api, next }) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.resizable
          : window.resizableFixture
        ).configure(next),
      { api, next },
    )
  const read = () =>
    page.evaluate(
      (api) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.resizable
          : window.resizableFixture
        ).read(),
      api,
    )
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)),
        ),
    )
  const root = page.locator('#resizable-review')
  const handle = root.getByRole('separator')
  const value = async () => Number(await handle.getAttribute('aria-valuenow'))
  const start = async (target = handle) => {
    await target.scrollIntoViewIfNeeded()
    await target.evaluate((node) =>
      node.addEventListener(
        'pointerdown',
        (event) => {
          window.resizePointerId = event.pointerId
        },
        { once: true },
      ),
    )
    const box = await target.boundingBox()
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    await expect(target).toHaveAttribute('data-resizing', '')
    return point
  }
  const finish = async () => {
    await page.mouse.up()
    await settle()
  }
  const drag = async (target, dx, dy) => {
    const point = await start(target)
    await page.mouse.move(point.x + dx, point.y + dy, { steps: 3 })
    await finish()
  }
  await settle()
  assert.deepEqual(await read(), {
    requests: [],
    tableRequests: [],
    collapseRequests: [],
  })
  await root.evaluate((node) => {
    node.hidden = true
  })
  await expect(root).not.toBeVisible()
  await root.evaluate((node) => {
    node.hidden = false
  })
  await expect(root).toBeVisible()
  await page.locator('#resize-navigation').fill('Retained pane draft')
  for (const [id, edge] of [
    ['resize-navigation', 'end'],
    ['resize-content', 'start'],
  ]) {
    const input = page.locator(`#${id}`)
    const box = await input.boundingBox()
    await input.click({
      position: { x: edge === 'end' ? box.width - 2 : 2, y: box.height / 2 },
    })
    await expect(input).toBeFocused()
    await expect(handle).not.toHaveAttribute('data-resizing')
  }

  await root.evaluate((node) => {
    window.retainedResizeNodes = [
      node,
      ...node.querySelectorAll('input,.ui-resizable-pane,.ui-resize-handle'),
    ]
  })
  await handle.dblclick()
  await expect(handle).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('#resize-navigation')).not.toBeVisible()
  await expect(handle).toBeFocused()
  const closedRequests = (await read()).requests.length
  await handle.press('End')
  await handle.press('ArrowRight')
  const closedBox = await handle.boundingBox()
  await page.mouse.move(
    closedBox.x + closedBox.width / 2,
    closedBox.y + closedBox.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    closedBox.x + closedBox.width / 2 + 20,
    closedBox.y + closedBox.height / 2,
  )
  await page.mouse.up()
  await expect(handle).not.toHaveAttribute('data-resizing')
  assert.equal((await read()).requests.length, closedRequests)
  await handle.press('Enter')
  await expect(handle).toHaveAttribute('aria-valuenow', '35')
  await expect(page.locator('#resize-navigation')).toBeVisible()
  await configure({ acceptCollapse: false })
  await handle.dblclick()
  await expect(handle).toHaveAttribute('aria-valuenow', '35')
  await configure({ acceptCollapse: true })
  await root.getByRole('button', { name: 'Navigation choice' }).click()
  await expect(page.getByRole('listbox')).toBeVisible()
  await configure({ paneCollapsed: true })
  await expect(handle).toBeFocused()
  await expect(page.getByRole('listbox')).not.toBeVisible()
  await handle.press('Enter')
  await handle.focus()
  await page.keyboard.press('ArrowRight')
  await expect(handle).toHaveAttribute('aria-valuenow', '36')
  await expect(handle).toBeFocused()
  await page.keyboard.press('Shift+ArrowLeft')
  await expect(handle).toHaveAttribute('aria-valuenow', '26')
  await page.keyboard.press('Home')
  await expect(handle).toHaveAttribute('aria-valuenow', '20')
  await page.keyboard.press('End')
  await expect(handle).toHaveAttribute('aria-valuenow', '80')
  await configure({ size: 35 })
  const jitterSize = await value()
  const jitterRequests = (await read()).requests.length
  for (const clickCount of [1, 2]) {
    const box = await handle.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down({ clickCount })
    await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height / 2)
    await page.mouse.up({ clickCount })
  }
  await expect(handle).toHaveAttribute('aria-valuenow', '0')
  assert.equal((await read()).requests.length, jitterRequests)
  await handle.press('Enter')
  assert.equal(await value(), jitterSize)
  let point = await start()
  await page.mouse.move(point.x + 25, point.y)
  await expect.poll(value).toBeGreaterThan(35)
  const middle = await value()
  await page.mouse.move(point.x + 70, point.y)
  await expect.poll(value).toBeGreaterThan(middle)
  await finish()
  const draggedSize = await value()
  const afterDragBox = await handle.boundingBox()
  await page.mouse.move(
    afterDragBox.x + afterDragBox.width / 2,
    afterDragBox.y + afterDragBox.height / 2,
  )
  await page.mouse.down({ clickCount: 2 })
  await page.mouse.up({ clickCount: 2 })
  assert.equal(await value(), draggedSize)
  await handle.dblclick()
  await expect(handle).toHaveAttribute('aria-valuenow', '0')
  await handle.press('Enter')
  assert.equal(await value(), draggedSize)
  await configure({ size: 35, accept: false })
  point = await start()
  await page.mouse.move(point.x + 30, point.y)
  const rejected = (await read()).requests.length
  await expect(handle).toHaveAttribute('aria-valuenow', '35')
  await page.mouse.move(point.x + 60, point.y)
  await expect(handle).not.toHaveAttribute('data-resizing')
  assert.equal((await read()).requests.length, rejected)
  await finish()
  await configure({ accept: true })
  point = await start()
  await configure({ size: 50 })
  await expect(handle).not.toHaveAttribute('data-resizing')
  const replaced = (await read()).requests.length
  await page.mouse.move(point.x + 40, point.y)
  await finish()
  assert.equal((await read()).requests.length, replaced)
  await expect(handle).toHaveAttribute('aria-valuenow', '50')
  // Root padding must not change the percentage denominator.
  await root.evaluate((node) => {
    node.style.padding = '16px'
  })
  await configure({ size: 35 })
  const extent = await root.evaluate((node) =>
    [...node.querySelectorAll(':scope > .ui-resizable-pane')].reduce(
      (sum, pane) => sum + pane.getBoundingClientRect().width,
      0,
    ),
  )
  await drag(handle, 50, 0)
  assert.ok(Math.abs((await value()) - (35 + (50 / extent) * 100)) < 0.05)
  await root.evaluate((node) => {
    node.style.padding = ''
  })
  await configure({ size: 35, dir: 'rtl' })
  await drag(handle, 40, 0)
  assert.ok((await value()) < 35)
  const rtlSize = await value()
  await handle.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(value).toBe(Math.round((rtlSize + 1) * 10000) / 10000)
  await configure({ dir: 'ltr', orientation: 'vertical', size: 35 })
  await expect(handle).toHaveAttribute('aria-orientation', 'horizontal')
  await drag(handle, 0, 20)
  assert.ok((await value()) > 35)
  await configure({ orientation: 'horizontal', size: 35 })
  // Every cancellation leaves the last accepted value and stops requests.
  for (const reason of [
    'blur',
    'visibility',
    'lost',
    'cancel',
    'escape',
    'disabled',
    'geometry',
  ]) {
    point = await start()
    if (reason === 'lost') {
      await page.mouse.move(point.x + 1, point.y)
      await settle()
    }
    const before = (await read()).requests.length
    if (reason === 'blur')
      await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    if (reason === 'visibility')
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          value: true,
        })
        document.dispatchEvent(new Event('visibilitychange'))
        delete document.hidden
      })
    if (reason === 'lost')
      await handle.evaluate((node) =>
        node.releasePointerCapture(window.resizePointerId),
      )
    if (reason === 'cancel')
      await handle.dispatchEvent('pointercancel', {
        pointerId: await page.evaluate(() => window.resizePointerId),
      })
    if (reason === 'escape') await page.keyboard.press('Escape')
    if (reason === 'disabled') await configure({ disabled: true })
    if (reason === 'geometry')
      await root.evaluate((node) => {
        node.style.padding = '12px'
      })
    await page.mouse.move(point.x + 30, point.y)
    await expect(handle, reason).not.toHaveAttribute('data-resizing')
    assert.equal((await read()).requests.length, before, reason)
    await finish()
    await configure({ disabled: false })
    await root.evaluate((node) => {
      node.style.padding = ''
    })
  }
  // Preserve a final coordinate even when no move event carried that point.
  await configure({ size: 35 })
  point = await start()
  await handle.dispatchEvent('pointerup', {
    pointerId: await page.evaluate(() => window.resizePointerId),
    clientX: point.x + 25,
    clientY: point.y,
    buttons: 0,
  })
  await expect.poll(value).toBeGreaterThan(35)
  await finish()
  assert.equal(
    await page.evaluate(() =>
      window.retainedResizeNodes.every((node) => node.isConnected),
    ),
    true,
  )
  await expect(page.locator('#resize-navigation')).toHaveValue(
    'Retained pane draft',
  )
  const workspace = page.locator('.resize-review-workspace')
  const tableHandle = workspace.getByRole('separator')
  const panel = workspace.locator('.table-workspace-controls')
  const results = workspace.locator('.table-workspace-results')
  await page.locator('#resize-table-filter').fill('Retained criteria draft')
  await workspace.evaluate((node) => {
    window.retainedResizeTableNodes = [
      ...node.querySelectorAll(
        'input,.table-scroll,.table-workspace-controls,.table-workspace-results,tbody tr',
      ),
    ]
    node.querySelector('.table-scroll').scrollTop = 50
  })
  const assertTableFill = async () => {
    const sizes = await workspace.locator('.table-scroll').evaluate((node) => ({
      viewport: node.clientWidth,
      table: node.querySelector('table').getBoundingClientRect().width,
    }))
    assert.ok(
      Math.abs(sizes.table - sizes.viewport) <= 1,
      JSON.stringify(sizes),
    )
  }
  await assertTableFill()
  const originalHeight = (await workspace.boundingBox()).height
  const widthBefore = (await panel.boundingBox()).width
  await drag(tableHandle, 40, 0)
  assert.ok((await panel.boundingBox()).width > widthBefore + 30)
  for (const placement of ['right', 'top', 'left']) {
    await configure({ placement })
    await settle()
    const before = await panel.boundingBox()
    await drag(
      tableHandle,
      placement === 'right' ? -25 : placement === 'left' ? 25 : 0,
      placement === 'top' ? 15 : 0,
    )
    const after = await panel.boundingBox()
    assert.ok(
      placement === 'top'
        ? after.height > before.height + 10
        : after.width > before.width + 15,
      placement,
    )
    assert.equal((await workspace.boundingBox()).height, originalHeight)
    assert.equal(
      await workspace
        .locator('.table-scroll')
        .evaluate((node) => node.scrollTop),
      50,
    )
    const ratio = await panel.evaluate((node) => {
      const other = node.parentElement.querySelector('.table-workspace-results')
      return node.parentElement.dataset.controlsPlacement === 'top'
        ? (node.getBoundingClientRect().height /
            (node.getBoundingClientRect().height +
              other.getBoundingClientRect().height)) *
            100
        : (node.getBoundingClientRect().width /
            (node.getBoundingClientRect().width +
              other.getBoundingClientRect().width)) *
            100
    })
    assert.ok(
      Math.abs(
        Number(await tableHandle.getAttribute('aria-valuenow')) - ratio,
      ) < 0.1,
    )
    await assertTableFill()
    const expandedSize = await tableHandle.getAttribute('aria-valuenow')
    const retainedRequests = (await read()).tableRequests.length
    await tableHandle.dblclick()
    await expect(panel).not.toBeVisible()
    await assertTableFill()
    await expect(tableHandle).toBeFocused()
    await expect(tableHandle).toHaveAttribute('aria-valuenow', '0')
    await tableHandle.press('Home')
    await tableHandle.press('ArrowRight')
    assert.equal((await read()).tableRequests.length, retainedRequests)
    await tableHandle.dblclick()
    await expect(panel).toBeVisible()
    await expect(tableHandle).toHaveAttribute('aria-valuenow', expandedSize)
    await tableHandle.press('Enter')
    await expect(panel).not.toBeVisible()
    await workspace
      .getByRole('button', { name: 'Table controls', exact: true })
      .click()
    await expect(panel).toBeVisible()
    await expect(tableHandle).toHaveAttribute('aria-valuenow', expandedSize)
  }
  await tableHandle.focus()
  await configure({ collapsed: true })
  await expect(tableHandle).toBeFocused()
  await expect(tableHandle).toBeVisible()
  await expect(tableHandle).toHaveAttribute('aria-valuenow', '0')
  assert.ok(
    (await results.boundingBox()).width >
      (await workspace.boundingBox()).width - 10,
  )
  await configure({ collapsed: false })
  await tableHandle.focus()
  await page.setViewportSize({ width: 320, height: 844 })
  await settle()
  await expect(tableHandle).not.toBeVisible()
  await expect(
    workspace.getByRole('button', { name: 'Table controls', exact: true }),
  ).toBeFocused()
  await workspace
    .getByRole('button', { name: 'Table controls', exact: true })
    .click()
  await expect(panel).toBeVisible()
  const mobileWidth = await workspace.evaluate((node) => node.clientWidth)
  assert.ok(
    Math.abs(
      (await panel.boundingBox()).width - Math.min(widthBefore, mobileWidth),
    ) < 3,
  )
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1280, height: 720 })
  await settle()
  await expect(page.locator('#resize-table-filter')).toHaveValue(
    'Retained criteria draft',
  )
  assert.equal(
    await page.evaluate(() =>
      window.retainedResizeTableNodes.every((node) => node.isConnected),
    ),
    true,
  )
  await tableHandle.focus()
  await configure({ resizable: false })
  await expect(
    workspace.getByRole('button', { name: 'Table controls', exact: true }),
  ).toBeFocused()
  await expect(tableHandle).not.toBeVisible()
  await configure({ resizable: true })
  await expect(tableHandle).toBeVisible()
}
