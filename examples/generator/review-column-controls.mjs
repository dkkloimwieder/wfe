import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

async function initial(page) {
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
      },
    )
  },
}
