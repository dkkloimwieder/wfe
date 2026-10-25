import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function reviewSelection(page, test) {
  const cell = (row, column) =>
    page.locator(`tr[data-row="${row}"] td[data-column="${column}"]`)
  const select = async (row, column) => cell(row, column).click()
  const copied = async () => {
    await page.keyboard.press('Control+c')
    return page.evaluate(() => navigator.clipboard.readText())
  }
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await test('Cell rectangles use full-cell shading, native range and exact normal clipboard copy', async () => {
    // The case before leaves a narrow viewport. Mount at the wide size and
    // wait two frames, so the drag measures the settled wide layout.
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.evaluate(() => window.readOnlyFixture.start())
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    )
    const first = await cell('a', 'category').boundingBox(),
      last = await cell('c', 'name').boundingBox()
    await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2)
    await page.mouse.down()
    await page.mouse.move(last.x + last.width / 2, last.y + last.height / 2, {
      steps: 4,
    })
    await page.mouse.up()
    await expect(page.locator('td[data-cell-selection]')).toHaveCount(6)
    await expect(cell('a', 'category')).toHaveAttribute(
      'data-selection-active',
      '',
    )
    await expect(cell('c', 'name')).toHaveAttribute(
      'data-selection-edges',
      /bottom.*right/,
    )
    await expect(page.locator('table')).toHaveAttribute(
      'data-native-cell-selection',
      '',
    )
    assert.equal(await page.evaluate(() => getSelection().isCollapsed), false)
    assert.equal(await copied(), 'West\tDesk\nEast\tLamp\nWest\tChair')
    await cell('b', 'category').click({ button: 'right' })
    // A right-click inside the owned DOM range preserves normal browser Copy.
    assert.equal(await page.evaluate(() => getSelection().isCollapsed), false)
    assert.equal(await copied(), 'West\tDesk\nEast\tLamp\nWest\tChair')
    await page.screenshot({ path: '/tmp/wfe-cell-selection-rectangle.png' })
  })
  await test('Keyboard ranges and whole row/column selection preserve exact cell boundaries', async () => {
    await select('b', 'name')
    await page.keyboard.press('Shift+ArrowDown')
    await page.keyboard.press('Shift+ArrowRight')
    assert.equal(await copied(), 'Lamp\t7\nChair\t12')
    await page.keyboard.press('Shift+Space')
    assert.equal(await copied(), 'East\tLamp\t7\nWest\tChair\t12')
    await select('a', 'amount')
    await page.keyboard.press('Control+Space')
    assert.equal(await copied(), '42\n7\n12')
    await page.keyboard.press('Control+a')
    assert.equal(
      await copied(),
      'West\tDesk\t42\nEast\tLamp\t7\nWest\tChair\t12',
    )
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-cell-selection]')).toHaveCount(0)
    assert.equal(await page.evaluate(() => getSelection().isCollapsed), true)
  })
  await test('Empty values copy normally while native editors retain their own selection and clipboard', async () => {
    await page.evaluate(() =>
      window.readOnlyFixture.replace([
        { id: 'a', values: { category: '', name: 'Desk', amount: 42 } },
      ]),
    )
    await select('a', 'category')
    assert.equal(await page.evaluate(() => getSelection().isCollapsed), false)
    assert.equal(await copied(), '')
    await select('a', 'name')
    await page.evaluate(() => {
      const input = document.createElement('input')
      input.id = 'native-selection-editor'
      input.value = 'native editor'
      document
        .querySelector('tr[data-row="a"] td[data-column="amount"]')
        .append(input)
    })
    const input = page.locator('#native-selection-editor')
    await input.focus()
    await input.evaluate((n) => n.setSelectionRange(0, 6))
    await expect(page.locator('table')).not.toHaveAttribute(
      'data-native-cell-selection',
      '',
    )
    assert.equal(await copied(), 'native')
    await page.evaluate(() => {
      const p = document.createElement('p')
      p.id = 'outside-selection'
      p.textContent = 'Outside text'
      document.querySelector('main').prepend(p)
      const range = document.createRange()
      range.selectNodeContents(p)
      getSelection().removeAllRanges()
      getSelection().addRange(range)
    })
    assert.equal(await copied(), 'Outside text')
  })
  await test('Refocus restores the native range and copy failures preserve the clipboard', async () => {
    await page.evaluate(() => window.readOnlyFixture.start())
    await select('a', 'name')
    assert.equal(await copied(), 'Desk')
    await page
      .getByRole('button', { name: 'Table controls', exact: true })
      .focus()
    await expect(page.locator('table')).not.toHaveAttribute(
      'data-native-cell-selection',
      '',
    )
    await page.locator('table').focus()
    await expect(page.locator('table')).toHaveAttribute(
      'data-native-cell-selection',
      '',
    )
    await page.evaluate(() => window.readOnlyFixture.setCopyFailure(true))
    assert.equal(await copied(), 'Desk')
    await expect(page.locator('table')).not.toHaveAttribute(
      'data-native-cell-selection',
      '',
    )
    await page.evaluate(() => window.readOnlyFixture.setCopyFailure(false))
  })
  await test('Virtual windows retain logical ranges and copy unmounted rows without extra owners', async () => {
    await page.evaluate(() => window.readOnlyFixture.start(true))
    await expect(cell('r0', 'name')).toBeVisible()
    await page.evaluate(() =>
      window.readOnlyFixture.select(
        { row: 'r0', column: 'name' },
        { row: 'r500', column: 'amount' },
      ),
    )
    await expect(cell('r500', 'amount')).toBeVisible()
    assert.ok((await page.locator('tr[data-row]').count()) < 40)
    await page
      .locator('table')
      .evaluate((node) => node.focus({ preventScroll: true }))
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    )
    const before = await page.evaluate(() => window.readOnlyFixture.stats())
    assert.equal(before.copyReads, 0)
    const value = await copied()
    assert.equal(value.split('\n').length, 501)
    assert.equal(value.split('\n')[0], 'Name 0\t0')
    assert.equal(value.split('\n').at(-1), 'Name 500\t500')
    const after = await page.evaluate(() => window.readOnlyFixture.stats())
    assert.equal(after.mounts, before.mounts)
    assert.equal(after.cells, before.cells)
    assert.equal(after.copyReads, 1002)
    await page.evaluate(() => window.readOnlyFixture.scrollTo('r250'))
    await expect(cell('r250', 'name')).toBeVisible()
    await expect(cell('r250', 'name')).toHaveAttribute(
      'data-cell-selection',
      '',
    )
    assert.equal((await copied()).split('\n').length, 501)
    await page.screenshot({ path: '/tmp/wfe-cell-selection-virtual.png' })
    await page.evaluate(() => window.readOnlyFixture.stop())
  })
  await test('Virtual keyboard focus reveals its row and horizontal cell after mounting', async () => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.evaluate(() => window.readOnlyFixture.start(true))
    await select('r0', 'category')
    for (let index = 0; index < 20; index++)
      await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(cell('r20', 'amount')).toHaveAttribute(
      'data-selection-active',
      '',
    )
    const bounds = await cell('r20', 'amount').evaluate((node) => {
      const cell = node.getBoundingClientRect(),
        viewport = node.closest('.table-scroll').getBoundingClientRect(),
        header = node
          .closest('table')
          .querySelector('thead')
          .getBoundingClientRect()
      return {
        left: cell.left,
        right: cell.right,
        top: cell.top,
        bottom: cell.bottom,
        viewportLeft: viewport.left,
        viewportRight: viewport.right,
        viewportBottom: viewport.bottom,
        headerBottom: header.bottom,
      }
    })
    assert.ok(bounds.left >= bounds.viewportLeft)
    assert.ok(bounds.right <= bounds.viewportRight + 1)
    assert.ok(bounds.top >= bounds.headerBottom - 1)
    assert.ok(bounds.bottom <= bounds.viewportBottom + 1)
    assert.equal(await copied(), '20')
    await page.evaluate(() => window.readOnlyFixture.stop())
    await page.setViewportSize({ width: 1280, height: 900 })
  })
  await test('Ordinary keyboard selection stays below the fixed header at the upper scroll boundary', async () => {
    await page.evaluate(() => {
      window.readOnlyFixture.start()
      window.readOnlyFixture.replace(
        Array.from({ length: 100 }, (_, index) => ({
          id: `r${index}`,
          values: {
            category: `Category ${index}`,
            name: `Name ${index}`,
            amount: index,
          },
        })),
      )
      document.querySelector('.table-workspace').style.height = '400px'
    })
    await select('r0', 'category')
    for (let index = 0; index < 20; index++)
      await page.keyboard.press('ArrowDown')
    const documentScroll = await page.evaluate(() => window.scrollY)
    for (let index = 0; index < 20; index++) {
      await page.keyboard.press('ArrowUp')
      const bounds = await page
        .locator('td[data-selection-active]')
        .evaluate((node) => ({
          top: node.getBoundingClientRect().top,
          headerBottom: node
            .closest('table')
            .querySelector('thead')
            .getBoundingClientRect().bottom,
        }))
      assert.ok(bounds.top >= bounds.headerBottom - 1)
      assert.equal(await page.evaluate(() => window.scrollY), documentScroll)
    }
    await page.evaluate(() => window.readOnlyFixture.stop())
  })
  await test('Sort and column visibility invalidate old ranges, and disposal releases the native range', async () => {
    await page.evaluate(() => window.readOnlyFixture.start())
    await select('a', 'name')
    await page
      .getByRole('button', { name: 'Sort by Name', exact: true })
      .click()
    await expect(page.locator('[data-cell-selection]')).toHaveCount(0)
    await select('a', 'name')
    await page.getByText('Display columns', { exact: true }).click()
    const group = page.getByRole('group', {
      name: 'Visible columns',
      exact: true,
    })
    await group.getByText('Name', { exact: true }).click()
    await expect(page.locator('[data-cell-selection]')).toHaveCount(0)
    await select('b', 'amount')
    assert.equal(await page.evaluate(() => getSelection().isCollapsed), false)
    await page.evaluate(() => window.readOnlyFixture.stop())
    assert.equal(await page.locator('#root').textContent(), '')
    assert.equal(await page.evaluate(() => getSelection().isCollapsed), true)
  })
}
