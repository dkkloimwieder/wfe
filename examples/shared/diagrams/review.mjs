import { expect } from '@playwright/test'
async function expectNodesSeparated(root) {
  await expect
    .poll(() =>
      root.locator('[data-diagram-node]').evaluateAll((nodes) => {
        const boxes = nodes.map((node) => node.getBoundingClientRect())
        return boxes.every((a, index) =>
          boxes
            .slice(index + 1)
            .every(
              (b) =>
                a.right <= b.left + 0.5 ||
                b.right <= a.left + 0.5 ||
                a.bottom <= b.top + 0.5 ||
                b.bottom <= a.top + 0.5,
            ),
        )
      }),
    )
    .toBe(true)
}

export async function reviewDiagram(page, kind) {
  const root = page.locator(`[data-diagram-example="${kind}"]`)
  const firstName = kind === 'workflow' ? 'Request received' : 'Accounts'
  const secondName = kind === 'workflow' ? 'Review request' : 'Orders'
  const canvas = root.locator('.ui-diagram-surface')
  await canvas.scrollIntoViewIfNeeded()
  await expect(canvas).toBeVisible()
  await expectNodesSeparated(root)
  const labels = root.locator('.ui-diagram-edge-label')
  const edgeCount = kind === 'workflow' ? 4 : 3
  if (kind === 'erd') {
    await expect(labels).toHaveCount(edgeCount)
    await root.getByText('Show connection labels', { exact: true }).click()
    await expect(labels).toHaveCount(0)
    await expect(root.locator('[data-diagram-edge]')).toHaveCount(edgeCount)
    await root.getByText('Show connection labels', { exact: true }).click()
    await expect(labels).toHaveCount(edgeCount)
  } else {
    await expect(labels).toHaveCount(0)
    const arms = root.locator(
      '[data-diagram-node="review"] [data-diagram-port-label]',
    )
    await expect(arms).toHaveText(['Eligible', 'More evidence'])
    for (const arm of await root.locator('[data-diagram-port-label]').all()) {
      expect(
        await arm.evaluate((label) => {
          const node = label
            .closest('[data-diagram-node]')
            .getBoundingClientRect()
          const box = label.getBoundingClientRect()
          return (
            box.left >= node.left &&
            box.right <= node.right &&
            box.top >= node.top &&
            box.bottom <= node.bottom
          )
        }),
      ).toBe(true)
    }
    const sources = await root
      .locator(
        '[data-diagram-edge="accepted"] .ui-diagram-edge-line, [data-diagram-edge="changes"] .ui-diagram-edge-line',
      )
      .evaluateAll((paths) =>
        paths.map((path) => path.getAttribute('d').split('L')[0]),
      )
    expect(sources[0]).not.toBe(sources[1])
  }
  const connection = root.locator('.ui-diagram-edge-line').first()
  await root.getByRole('button', { name: 'Curved', exact: true }).click()
  await expect(connection).toHaveAttribute('d', /C/)
  await root.getByRole('button', { name: 'Straight', exact: true }).click()
  await expect(connection).not.toHaveAttribute('d', /C|Q/)
  await root.getByRole('button', { name: 'Elbow', exact: true }).click()
  await expect(connection).not.toHaveAttribute('d', /C/)
  // A live CSS radius override must reroute corners without replacing nodes.
  const retainedNode = await root
    .locator('[data-diagram-node]')
    .first()
    .elementHandle()
  await root.locator('.ui-diagram').evaluate(async (node) => {
    node.style.setProperty('--ui-radius', '0px')
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
  })
  const squarePath = await connection.getAttribute('d')
  await root
    .locator('.ui-diagram')
    .evaluate((node) => node.style.setProperty('--ui-radius', '18px'))
  await expect.poll(() => connection.getAttribute('d')).not.toBe(squarePath)
  expect(await retainedNode.evaluate((node) => node.isConnected)).toBe(true)
  await root
    .locator('.ui-diagram')
    .evaluate((node) => node.style.removeProperty('--ui-radius'))
  if (kind === 'erd') {
    const card = root.locator('[data-diagram-node]').first()
    const body = card.locator('.ui-diagram-node-content')
    const originalHeight = await card.evaluate((node) => node.offsetHeight)
    await body.evaluate((node) => {
      const extra = document.createElement('div')
      extra.dataset.extraFields = ''
      extra.style.height = '240px'
      extra.textContent = 'Additional entity fields'
      node.append(extra)
    })
    await expect
      .poll(() => card.evaluate((node) => node.offsetHeight))
      .toBeGreaterThan(originalHeight)
    await expectNodesSeparated(root)
    await expect
      .poll(() =>
        body.evaluate((node) => node.scrollHeight <= node.clientHeight),
      )
      .toBe(true)
    await body.locator('[data-extra-fields]').evaluate((node) => node.remove())
    await expect
      .poll(() => card.evaluate((node) => node.offsetHeight))
      .toBe(originalHeight)
    for (const content of await root
      .locator('.ui-diagram-node-content')
      .all()) {
      expect(
        await content.evaluate(
          (node) => node.scrollHeight <= node.clientHeight,
        ),
      ).toBe(true)
    }
  }
  const note = root.getByRole('textbox', { name: 'Diagram analysis note' })
  await note.fill('Keep my inspection note')
  const world = root.locator('.ui-diagram-world')
  const sourceLayout = await root
    .locator('[data-diagram-node]')
    .evaluateAll((nodes) =>
      nodes.map((n) => [
        n.dataset.diagramNode,
        n.style.left,
        n.style.top,
        n.style.width,
        n.style.height,
      ]),
    )
  const first = root.getByRole('button', {
    name: `Inspect ${firstName}`,
    exact: true,
  })
  await first.click()
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  await expect(root.locator('[data-diagram-detail]')).toContainText(
    'Revision 1',
  )
  const retainedLayoutNode = await root
    .locator('[data-diagram-node]')
    .first()
    .elementHandle()
  const positions = () =>
    root
      .locator('[data-diagram-node]')
      .evaluateAll((nodes) =>
        nodes.map((node) => [node.style.left, node.style.top]),
      )
  const automaticPositions = await positions()
  await root.getByRole('button', { name: 'Manual layout', exact: true }).click()
  await expect.poll(positions).not.toEqual(automaticPositions)
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  await root
    .getByRole('button', { name: 'Automatic layout', exact: true })
    .click()
  await expect.poll(positions).toEqual(automaticPositions)
  await expectNodesSeparated(root)
  expect(await retainedLayoutNode.evaluate((node) => node.isConnected)).toBe(
    true,
  )
  await expect(note).toHaveValue('Keep my inspection note')
  const nodeBox = await first.boundingBox()
  const fixedView = await world.getAttribute('style')
  await page.mouse.move(
    nodeBox.x + nodeBox.width / 2,
    nodeBox.y + nodeBox.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    nodeBox.x + nodeBox.width / 2 + 30,
    nodeBox.y + nodeBox.height / 2 + 25,
    { steps: 5 },
  )
  await page.mouse.up()
  await expect(world).toHaveAttribute('style', fixedView)
  await first.press('Delete')
  await first.press('ArrowRight')
  await expect(root.locator('[data-diagram-node]')).toHaveCount(
    kind === 'workflow' ? 5 : 4,
  )
  await root.getByText('Reject selection changes', { exact: true }).click()
  const second = root.getByRole('button', {
    name: `Inspect ${secondName}`,
    exact: true,
  })
  await second.click()
  await expect(root.locator('p[role=status]')).toContainText('Rejected')
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  await expect(second).toHaveAttribute('aria-pressed', 'false')
  await root.getByText('Reject selection changes', { exact: true }).click()
  await second.focus()
  await second.press('Enter')
  await expect(second).toHaveAttribute('aria-pressed', 'true')
  const stableNode = await root
    .locator('[data-diagram-node]')
    .first()
    .elementHandle()
  await root.getByRole('button', { name: 'Refresh diagram records' }).click()
  await expect(root.locator('[data-diagram-detail]')).toContainText(
    'Revision 2',
  )
  expect(
    await root
      .locator('[data-diagram-node]')
      .first()
      .evaluate((n, old) => n === old, stableNode),
  ).toBe(true)
  await expect(note).toHaveValue('Keep my inspection note')
  await root.getByRole('button', { name: 'Fit diagram', exact: true }).click()
  const fit = await world.getAttribute('style')
  await root.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(world).not.toHaveAttribute('style', fit)
  const zoomed = await world.getAttribute('style')
  await canvas.focus()
  await canvas.press('ArrowRight')
  await expect(world).not.toHaveAttribute('style', zoomed)
  await canvas.press('Home')
  await expect(world).toHaveAttribute('style', fit)
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + 10, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + 55, box.y + 35, { steps: 5 })
  await page.mouse.up()
  await expect(world).not.toHaveAttribute('style', fit)
  await root.getByRole('button', { name: 'Fit diagram' }).click()
  expect(
    await root
      .locator('[data-diagram-node]')
      .evaluateAll((nodes) =>
        nodes.map((n) => [
          n.dataset.diagramNode,
          n.style.left,
          n.style.top,
          n.style.width,
          n.style.height,
        ]),
      ),
  ).toEqual(sourceLayout)
  const edge = root.locator('[data-diagram-edge]').first()
  await edge.focus()
  await edge.press('Enter')
  await expect(edge).toHaveAttribute('aria-pressed', 'true')
  await expect(root.locator('p[role=status]')).toContainText('Accepted edge')
  if (kind === 'erd')
    await expect(edge).toHaveAttribute(
      'aria-label',
      /Accounts \/ id → Orders \/ account_id/,
    )
  await edge.press('Delete')
  await expect(root.locator('[data-diagram-edge]')).toHaveCount(
    kind === 'workflow' ? 4 : 3,
  )
  await reviewEdgeForeground(root, edge)
  await root
    .getByText('Diagram records and relationships', { exact: true })
    .click()
  await expect(
    root
      .locator('.ui-diagram-description ul')
      .first()
      .getByRole('button', { name: firstName, exact: true }),
  ).toBeVisible()
  await root
    .locator('.ui-diagram-description ul')
    .first()
    .getByRole('button', { name: firstName, exact: true })
    .click()
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  const original = page.viewportSize()
  await page.setViewportSize({ width: 390, height: 900 })
  await canvas.scrollIntoViewIfNeeded()
  await root.getByRole('button', { name: 'Fit diagram' }).click()
  await expect
    .poll(() =>
      canvas.evaluate((el) => {
        const box = el.getBoundingClientRect()
        return [...el.querySelectorAll('[data-diagram-node]')].every((node) => {
          const bounds = node.getBoundingClientRect()
          return (
            bounds.left >= box.left &&
            bounds.right <= box.right &&
            bounds.top >= box.top &&
            bounds.bottom <= box.bottom
          )
        })
      }),
    )
    .toBe(true)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await root.getByText('Empty diagram', { exact: true }).click()
  await expect(
    root.getByText('No diagram records', { exact: true }),
  ).toBeVisible()
  await expect(root.locator('[data-diagram-node]')).toHaveCount(0)
  await root.getByText('Empty diagram', { exact: true }).click()
  await expect(first).toBeVisible()
  await expect(note).toHaveValue('Keep my inspection note')
  if (original) await page.setViewportSize(original)
  if (kind === 'workflow') await reviewLargeWorkflow(page, root)
}

async function reviewLargeWorkflow(page, root) {
  await root
    .getByRole('button', { name: 'Large workflow', exact: true })
    .click()
  await expect(root.locator('[data-diagram-node]')).toHaveCount(45)
  await expect(root.locator('[data-diagram-edge]')).toHaveCount(77)
  await expect(root.locator('[data-workflow-summary]')).toContainText(
    '45 stages · 77 connections',
  )
  await expect(root.locator('.ui-diagram-edge-label')).toHaveCount(0)
  await expectNodesSeparated(root)
  const canvas = root.locator('.ui-diagram-surface')
  await canvas.scrollIntoViewIfNeeded()
  await root.getByRole('button', { name: 'Fit diagram', exact: true }).click()
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const view = element.getBoundingClientRect()
        return [...element.querySelectorAll('[data-diagram-node]')].every(
          (node) => {
            const box = node.getBoundingClientRect()
            return (
              box.left >= view.left &&
              box.right <= view.right &&
              box.top >= view.top &&
              box.bottom <= view.bottom
            )
          },
        )
      }),
    )
    .toBe(true)
  const zoom = root.locator('output[aria-label="Diagram zoom"]')
  for (
    let count = 0;
    count < 20 && parseInt(await zoom.textContent()) < 85;
    count++
  ) {
    await root.getByRole('button', { name: 'Zoom in', exact: true }).click()
  }
  const inventory = root.locator('[data-diagram-node="inventory"]')
  const inspect = inventory.getByRole('button', {
    name: 'Inspect Resolve inventory',
  })
  await inspect.focus()
  await inspect.press('Enter')
  await expect(inspect).toHaveAttribute('aria-pressed', 'true')
  await expect(root.locator('[data-diagram-detail]')).toContainText(
    'Choose a supply path',
  )
  await expect(inventory.locator('[data-diagram-port-label]')).toHaveText([
    'In stock',
    'Backorder',
    'Substitute',
    'Partial stock',
    'Unavailable',
  ])
  expect(
    await inventory.evaluate((node) => {
      const bounds = node.getBoundingClientRect()
      const view = node.closest('.ui-diagram-surface').getBoundingClientRect()
      return (
        bounds.left >= view.left &&
        bounds.right <= view.right &&
        bounds.top >= view.top &&
        bounds.bottom <= view.bottom
      )
    }),
  ).toBe(true)
  for (const id of ['classify', 'payment', 'fulfillment', 'dispatch']) {
    await expect(
      root.locator(`[data-diagram-node="${id}"] [data-diagram-port-label]`),
    ).toHaveCount(4)
  }
  await expect(
    root.locator('[data-diagram-edge="payment-retry-to-authorize"]'),
  ).toHaveCount(1)
  const connection = root.locator(
    '[data-diagram-edge="inventory-to-backorder"]',
  )
  await reviewEdgeForeground(root, connection)
  await connection.focus()
  await connection.press('Enter')
  await expect(root.locator('[data-diagram-detail]')).toContainText(
    'Backorder: Resolve inventory',
  )
  await inspect.focus()
  await inspect.press('Enter')
  const retained = await inventory.elementHandle()
  const detail = await root.locator('[data-diagram-detail]').textContent()
  await root.getByRole('button', { name: 'Refresh diagram records' }).click()
  await expect(root.locator('[data-diagram-detail]')).not.toHaveText(detail)
  for (const name of ['Manual layout', 'Automatic layout']) {
    await root.getByRole('button', { name, exact: true }).click()
    await expectNodesSeparated(root)
    await expect(inspect).toHaveAttribute('aria-pressed', 'true')
    expect(await retained.evaluate((node) => node.isConnected)).toBe(true)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await root.getByText('Empty diagram', { exact: true }).click()
  await expect(root.locator('[data-diagram-node]')).toHaveCount(0)
  await root.getByText('Empty diagram', { exact: true }).click()
  await expect(root.locator('[data-diagram-node]')).toHaveCount(45)
  await root
    .getByRole('button', { name: 'Simple workflow', exact: true })
    .click()
  await expect(root.locator('[data-diagram-node]')).toHaveCount(5)
  await expect(root.locator('[data-diagram-edge]')).toHaveCount(4)
  await expect(
    root.getByRole('textbox', { name: 'Diagram analysis note' }),
  ).toHaveValue('Keep my inspection note')
}

async function reviewEdgeForeground(root, edge) {
  const zoom = root.locator('output[aria-label="Diagram zoom"]')
  for (
    let count = 0;
    count < 20 && parseInt(await zoom.textContent()) < 85;
    count++
  ) {
    await root.getByRole('button', { name: 'Zoom in', exact: true }).click()
  }
  const node = root.locator('[data-diagram-node]').first()
  const title = node.locator('.ui-diagram-node-title')
  await title.focus()
  await title.press('Enter')
  await edge.focus()
  await root.locator('.ui-diagram-surface').scrollIntoViewIfNeeded()
  const retained = await edge.elementHandle()
  const style = await node.getAttribute('style')
  const point = await edge.locator('.ui-diagram-edge-line').evaluate((path) => {
    const view = path.closest('.ui-diagram-surface').getBoundingClientRect()
    const candidates = []
    for (let i = 1; i < 100; i++) {
      const length = (path.getTotalLength() * i) / 100
      const point = path.getPointAtLength(length)
      const screen = new DOMPoint(point.x, point.y).matrixTransform(
        path.getScreenCTM(),
      )
      const target = document.elementFromPoint(screen.x, screen.y)
      if (
        !target?.closest('.ui-diagram-surface') ||
        target.closest('[data-diagram-node]')
      )
        continue
      candidates.push({
        x: point.x,
        y: point.y,
        length,
        distance: Math.hypot(
          screen.x - (view.left + view.right) / 2,
          screen.y - (view.top + view.bottom) / 2,
        ),
      })
    }
    candidates.sort((a, b) => a.distance - b.distance)
    if (!candidates.length)
      throw new Error('The focused connection has no visible test point')
    return candidates[0]
  })
  await node.evaluate((element, point) => {
    element.style.left = `${point.x - element.offsetWidth / 2}px`
    element.style.top = `${point.y - 16}px`
  }, point)
  const hit = (offset = 0) =>
    edge.locator('.ui-diagram-edge-line').evaluate(
      (path, { offset, length }) => {
        const center = path.getPointAtLength(length)
        const before = path.getPointAtLength(Math.max(0, length - 0.25))
        const after = path.getPointAtLength(length + 0.25)
        const dx = after.x - before.x
        const dy = after.y - before.y
        const scale = Math.hypot(dx, dy) || 1
        const screen = new DOMPoint(
          center.x - (dy / scale) * offset,
          center.y + (dx / scale) * offset,
        ).matrixTransform(path.getScreenCTM())
        const target = document.elementFromPoint(screen.x, screen.y)
        return {
          node: target
            ?.closest('[data-diagram-node]')
            ?.getAttribute('data-diagram-node'),
          edge: target
            ?.closest('[data-diagram-edge]')
            ?.getAttribute('data-diagram-edge'),
          x: screen.x,
          y: screen.y,
        }
      },
      { offset, length: point.length },
    )
  try {
    const nodeId = await node.getAttribute('data-diagram-node')
    const edgeId = await edge.getAttribute('data-diagram-edge')
    expect((await hit()).node).toBe(nodeId)
    await root.getByText('Reject selection changes', { exact: true }).click()
    await edge.focus()
    await root.locator('.ui-diagram-surface').scrollIntoViewIfNeeded()
    await edge.press('Enter')
    await expect(edge).toHaveAttribute('aria-pressed', 'false')
    expect((await hit()).node).toBe(nodeId)
    await root.getByText('Reject selection changes', { exact: true }).click()
    await edge.focus()
    await root.locator('.ui-diagram-surface').scrollIntoViewIfNeeded()
    await edge.press('Enter')
    await expect(edge).toHaveAttribute('aria-pressed', 'true')
    await expect(edge).toBeFocused()
    expect(
      await retained.evaluate((element) => element === document.activeElement),
    ).toBe(true)
    expect((await hit()).edge).toBe(edgeId)
    const beside = await hit(4)
    expect(beside.node).toBe(nodeId)
    await edge.press('Escape')
    await expect(edge).toHaveAttribute('aria-pressed', 'false')
    expect((await hit()).node).toBe(nodeId)
  } finally {
    await node.evaluate((element, previous) => {
      if (previous === null) element.removeAttribute('style')
      else element.setAttribute('style', previous)
    }, style)
    await root.getByRole('button', { name: 'Fit diagram', exact: true }).click()
  }
}
