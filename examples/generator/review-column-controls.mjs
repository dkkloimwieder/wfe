import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

async function initial(page) {
  await expect(
    page.getByRole('button', { name: 'Edit Beta', exact: true }),
  ).toBeEnabled()
  await expect(
    page.getByRole('button', { name: 'Archive Beta', exact: true }),
  ).toBeEnabled()
  await expect(
    page.getByRole('button', { name: 'View Alpha', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Archive Alpha', exact: true }),
  ).toHaveCount(0)
  const view = page.locator('[data-generator-view="column-controls"]')
  await expect(
    view.getByRole('columnheader', { name: 'Actions', exact: true }),
  ).toHaveCount(1)
  await expect(
    view.getByRole('button', { name: 'Sort by Actions' }),
  ).toHaveCount(0)
  await expect(
    view
      .getByRole('region', { name: 'Column filters' })
      .getByLabel('Actions', { exact: true }),
  ).toHaveCount(0)
  await expect(
    view.getByRole('button', { name: 'Sort by Name', exact: true }),
  ).toBeEnabled()
  await expect(
    view
      .getByRole('region', { name: 'Column filters' })
      .getByLabel('Name', { exact: true }),
  ).toHaveCount(1)
}
export const columnControlChecks = {
  sizing: false,
  initial,
  server: initial,
  async review({ page, record }) {
    const view = page.locator('[data-generator-view="column-controls"]')
    const sort = view.getByRole('button', { name: 'Sort by Name', exact: true })
    const names = view.locator('tbody td[data-column="name"]')
    await record('column controls: client sorting orders records', async () => {
      await expect(names).toHaveText(['Beta', 'Alpha'])
      await sort.click()
      await expect(names).toHaveText(['Alpha', 'Beta'])
      await sort.click()
      await expect(names).toHaveText(['Beta', 'Alpha'])
      await sort.click()
      assert.deepEqual(
        (await page.evaluate(() => window.generatorFixture.snapshot())).sorting,
        [],
      )
    })
    for (const mode of ['Server sorting', 'Server processing']) {
      await record(
        `column controls: ${mode} updates state without sorting local rows`,
        async () => {
          await page.getByRole('button', { name: mode, exact: true }).click()
          const before = await page.evaluate(() =>
            window.generatorFixture.snapshot(),
          )
          await expect(sort).toBeEnabled()
          await sort.click()
          const after = await page.evaluate(() =>
            window.generatorFixture.snapshot(),
          )
          assert.deepEqual(after.sorting, [{ id: 'name', desc: false }])
          assert.equal(after.requests, before.requests + 1)
          await expect(names).toHaveText(['Beta', 'Alpha'])
          await expect(
            view.getByRole('button', { name: 'Sort by Actions' }),
          ).toHaveCount(0)
        },
      )
    }
    await record(
      'row actions follow live records and retain focus and current callbacks',
      async () => {
        const edit = page.getByRole('button', {
          name: 'Edit Beta',
          exact: true,
        })
        await edit.click()
        assert.deepEqual(
          (await page.evaluate(() => window.generatorFixture.snapshot())).calls,
          [{ handler: 'initial', action: 'open', id: 'b', name: 'Beta' }],
        )
        await edit.evaluate((node) => {
          node.focus()
          window.rowActionButton = node
        })
        await page.evaluate(() =>
          window.generatorFixture.rowActionState('b', {
            name: 'Beta revised',
            archived: true,
          }),
        )
        const viewAction = page.getByRole('button', {
          name: 'View Beta revised',
          exact: true,
        })
        await expect(viewAction).toBeFocused()
        await expect(viewAction).toHaveText('View')
        assert.equal(
          await viewAction.evaluate((node) => node === window.rowActionButton),
          true,
        )
        await expect(
          page.getByRole('button', {
            name: 'Archive Beta revised',
            exact: true,
          }),
        ).toHaveCount(0)
        await page.evaluate(() =>
          window.generatorFixture.replaceRowActionHandler(),
        )
        await expect(viewAction).toBeFocused()
        await viewAction.press('Enter')
        let snapshot = await page.evaluate(() =>
          window.generatorFixture.snapshot(),
        )
        assert.deepEqual(snapshot.calls.at(-1), {
          handler: 'replacement',
          action: 'open',
          id: 'b',
          name: 'Beta revised',
        })
        assert.equal(snapshot.calls.length, 2)
        await page.evaluate(() =>
          window.generatorFixture.rowActionState('b', { pending: true }),
        )
        await expect(viewAction).toBeDisabled()
        await viewAction.evaluate((node) => node.click())
        assert.equal(
          (await page.evaluate(() => window.generatorFixture.snapshot())).calls
            .length,
          2,
        )
        await page.evaluate(() =>
          window.generatorFixture.rowActionState('b', {
            name: 'Beta',
            pending: false,
            archived: false,
          }),
        )
        await expect(edit).toBeEnabled()
        assert.equal(
          await edit.evaluate((node) => node === window.rowActionButton),
          true,
        )
        await page
          .getByRole('button', { name: 'Archive Beta', exact: true })
          .click()
        snapshot = await page.evaluate(() => window.generatorFixture.snapshot())
        assert.deepEqual(snapshot.calls.at(-1), {
          handler: 'replacement',
          action: 'archive',
          id: 'b',
          name: 'Beta',
        })
        assert.equal(snapshot.lifecycle.mounts, 2)
        assert.equal(snapshot.lifecycle.disposals, 0)
        await expect(
          page.getByRole('button', { name: 'View Alpha', exact: true }),
        ).toBeDisabled()
      },
    )
    await record(
      'column controls: live flags omit controls and retain cells and application state',
      async () => {
        await names.first().evaluate((node) => {
          window.columnControlCell = node
        })
        await page.getByRole('button', { name: 'Toggle name controls' }).click()
        await expect(sort).toHaveCount(0)
        await expect(
          view
            .getByRole('region', { name: 'Column filters' })
            .getByLabel('Name', { exact: true }),
        ).toHaveCount(0)
        assert.deepEqual(
          (await page.evaluate(() => window.generatorFixture.snapshot()))
            .sorting,
          [{ id: 'name', desc: false }],
        )
        await page.getByRole('button', { name: 'Toggle name controls' }).click()
        await initial(page)
        assert.equal(
          await names
            .first()
            .evaluate((node) => node === window.columnControlCell),
          true,
        )
        await page.evaluate(() => window.generatorFixture.stop())
        await expect(page.locator('#root table')).toHaveCount(0)
        const lifecycle = (
          await page.evaluate(() => window.generatorFixture.snapshot())
        ).lifecycle
        assert.equal(lifecycle.disposals, lifecycle.mounts)
      },
    )
  },
}
