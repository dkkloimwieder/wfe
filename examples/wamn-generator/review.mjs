import { reviewInline } from './inline-review.mjs'
import { reviewAppearance } from './appearance-review.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import { selectValue } from '../shared/controls/select-review.mjs'
export async function reviewServer(page, name) {
  await expect(
    page
      .locator('form')
      .getByLabel(name === 'original' ? 'Operator note' : 'Service note', {
        exact: true,
      }),
  ).toHaveValue('Widget 0')
  await expect(
    page
      .locator('form')
      .getByLabel(name === 'original' ? 'Widget code' : 'Handling class', {
        exact: true,
      }),
  ).toHaveCount(1)
  await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
  await expect(page.locator('[data-wamn-screen=editor]')).toBeHidden()
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.locator('table')).toContainText('9007199254740993')
}
export async function review({ page, record }) {
  await reviewAppearance({ page, record })
  const rowId = (index) =>
    page.evaluate(
      (index) => window.generatorFixture.snapshot().rows[index].id,
      index,
    )
  const rowAction = async (action, index = 0) =>
    page.getByRole('button', {
      name: `${action} ${await rowId(index)}`,
      exact: true,
    })
  const back = async () => {
    if (await page.locator('[data-wamn-screen=records]').isHidden())
      await page
        .getByRole('button', { name: 'Back to records', exact: true })
        .click()
  }
  const edit = async () => {
    if (await page.locator('[data-wamn-screen=editor]').isHidden()) {
      await back()
      await (await rowAction('Edit')).click()
    }
  }
  const state = () => page.evaluate(() => window.generatorFixture.snapshot())
  const note = () => page.locator('form textarea')
  const phase = (value) =>
    expect.poll(async () => (await state()).phase).toBe(value)
  const refresh = () =>
    page.getByRole('button', { name: /^(Refresh|Reload) widgets$/ })
  const save = () =>
    page.getByRole('button', { name: 'Save widget', exact: true })
  await record(
    'WAMN direct record links load the target and invalid links keep the table',
    async () => {
      const target = await rowId(1)
      const linkedContext = await page
        .context()
        .browser()
        .newContext({
          viewport: { width: 1280, height: 900 },
        })
      const linked = await linkedContext.newPage()
      const errors = []
      await linked.addInitScript(() => {
        window.historyListeners = new Set()
        const add = window.addEventListener
        const remove = window.removeEventListener
        window.addEventListener = function (name, listener, options) {
          if (name === 'popstate') window.historyListeners.add(listener)
          return add.call(this, name, listener, options)
        }
        window.removeEventListener = function (name, listener, options) {
          if (name === 'popstate') window.historyListeners.delete(listener)
          return remove.call(this, name, listener, options)
        }
      })
      linked.on('pageerror', (error) => errors.push(error.message))
      linked.on('console', (message) => {
        if (message.type() === 'warning' || message.type() === 'error')
          errors.push(message.text())
      })
      try {
        for (const screen of ['editor', 'details', 'invalid']) {
          const url = new URL(page.url())
          url.searchParams.set(
            'screen',
            screen === 'invalid' ? 'editor' : screen,
          )
          url.searchParams.set(
            'record',
            screen === 'invalid' ? 'missing' : target,
          )
          await linked.goto(url.href)
          const visible = screen === 'invalid' ? 'records' : screen
          await expect(
            linked.locator(`[data-wamn-screen=${visible}]`),
          ).toBeVisible()
          if (screen === 'editor') {
            await expect(linked.locator('form textarea')).toHaveValue(
              'Widget 1',
            )
            await linked
              .getByRole('button', { name: 'Back to records', exact: true })
              .click()
            await linked
              .getByRole('button', { name: `Edit ${target}`, exact: true })
              .click()
            const depth = await linked.evaluate(
              () => history.state.wamnNavigation.position,
            )
            await linked.reload()
            await expect(
              linked.locator('[data-wamn-screen=editor]'),
            ).toBeVisible()
            await expect(linked.locator('form textarea')).toHaveValue(
              'Widget 1',
            )
            assert.equal(
              await linked.evaluate(
                () => history.state.wamnNavigation.position,
              ),
              depth,
            )
            await linked.goBack()
            await expect(
              linked.locator('[data-wamn-screen=records]'),
            ).toBeVisible()
            await linked.goForward()
            await expect(
              linked.locator('[data-wamn-screen=editor]'),
            ).toBeVisible()
          }
          if (screen === 'details')
            await expect(linked.locator('.record-details')).toContainText(
              target,
            )
          if (screen === 'invalid')
            await expect(linked.getByRole('alert')).toContainText('record URL')
          assert.equal(
            await linked.evaluate(() => window.historyListeners.size),
            1,
          )
          await linked.evaluate(() => {
            window.generatorFixture.stop()
            window.dispatchEvent(new PopStateEvent('popstate'))
          })
          assert.equal(
            await linked.evaluate(() => window.historyListeners.size),
            0,
          )
          assert.deepEqual(
            (
              await linked.evaluate(() => window.generatorFixture.diagnostics())
            ).filter((event) => event.code !== 'HOT_SCOPE_TIME'),
            [],
          )
        }
        assert.deepEqual(errors, [])
      } finally {
        await linkedContext.close()
      }
    },
  )
  await record(
    'WAMN browser Back and Forward restore records and preserve the draft',
    async () => {
      const second = await rowId(1)
      const initialUrl = page.url()
      const sent = (await state()).sent.length
      await (await rowAction('Edit', 1)).click()
      await expect(page).toHaveURL(
        (url) =>
          url.searchParams.get('screen') === 'editor' &&
          url.searchParams.get('record') === second,
      )
      await note().fill('Draft across browser history')
      await page.goBack()
      await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
      await expect(page).toHaveURL(initialUrl)
      await expect(await rowAction('Edit', 1)).toBeFocused()
      await page.goForward()
      await expect(page.locator('[data-wamn-screen=editor]')).toBeVisible()
      await expect(note()).toHaveValue('Draft across browser history')
      assert.equal(
        await page
          .locator('[data-wamn-screen=editor]')
          .evaluate((node) => node.contains(document.activeElement)),
        true,
      )
      assert.equal((await state()).selectedId, second)
      assert.equal((await state()).sent.length, sent)
      await page.goBack()
      await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
      await (await rowAction('View')).click()
      await expect
        .poll(async () => (await state()).inspectedRecord?.id)
        .toBe(await rowId(0))
      await page.goBack()
      await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
      await page.goForward()
      await expect(page.locator('[data-wamn-screen=details]')).toBeVisible()
      await expect(page).toHaveURL(
        (url) =>
          url.searchParams.get('screen') === 'details' &&
          url.searchParams.get('record') !== second,
      )
      await expect
        .poll(async () => (await state()).inspectedRecord?.id)
        .toBe(await rowId(0))
      assert.equal((await state()).selectedId, second)
      await page.goBack()
      await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
      await (await rowAction('Edit', 1)).click()
      await expect(note()).toHaveValue('Draft across browser history')
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
    },
  )
  await record(
    'WAMN history branches reject older editing targets without replacing entries',
    async () => {
      await page.evaluate(() => {
        window.savedHistoryReplace = history.replaceState
        history.replaceState = () => {
          throw new Error('Navigation must not replace history')
        }
      })
      try {
        await (await rowAction('Edit')).click()
        await back()
        await (await rowAction('Edit', 1)).click()
        await page.goBack()
        await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
        // A new branch replaces the discarded forward path at the same depth.
        await (await rowAction('Edit', 1)).click()
        await note().fill('Guarded history draft')
        await page.goBack()
        await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
        const tableUrl = page.url()
        await page.goBack()
        await expect(page).toHaveURL(tableUrl)
        await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
        await expect
          .poll(async () => (await state()).status)
          .toMatch(/Save or cancel/)
        assert.equal((await state()).selectedId, await rowId(1))
        await expect(note()).toHaveValue('Guarded history draft')
        await page.goForward()
        await expect(page.locator('[data-wamn-screen=editor]')).toBeVisible()
        await expect(note()).toHaveValue('Guarded history draft')
        await page.getByRole('button', { name: 'Cancel', exact: true }).click()
        await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
      } finally {
        await page.evaluate(() => {
          history.replaceState = window.savedHistoryReplace
        })
      }
    },
  )
  await record(
    'WAMN screen navigation preserves drafts and owners until explicit Cancel',
    async () => {
      await page.evaluate(() => {
        window.adapterNodes = [
          ...document.querySelectorAll('#root textarea, #root table'),
        ]
      })
      await edit()
      assert.equal(
        await page
          .locator('[data-wamn-screen=editor]')
          .evaluate((node) => node.contains(document.activeElement)),
        true,
      )
      await note().fill('Draft across screens')
      const sent = (await state()).sent.length
      await back()
      await expect(note()).toHaveValue('Draft across screens')
      await edit()
      await expect(note()).toHaveValue('Draft across screens')
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
      await expect(note()).toHaveValue('Widget 0')
      await expect(await rowAction('Edit')).toBeFocused()
      assert.equal((await state()).sent.length, sent)
      assert.equal(
        await page.evaluate(() =>
          window.adapterNodes.every((node) => node.isConnected),
        ),
        true,
      )
    },
  )
  await record(
    'WAMN table controls use application-owned collapse state',
    async () => {
      const toggle = page.getByRole('button', {
        name: 'Table controls',
        exact: true,
      })
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    },
  )
  await record('WAMN query and View use generated wire bindings', async () => {
    await refresh().click()
    await expect
      .poll(async () => (await state()).status)
      .toBe('Widgets refreshed')
    assert.equal((await state()).sent.at(-1).path, '/widget/query')
    assert.deepEqual((await state()).sent.at(-1).item, { limit: 2 })
    await (await rowAction('View')).click()
    await expect.poll(async () => (await state()).status).toMatch(/^Opened /)
    assert.equal((await state()).sent.at(-1).path, '/widget/get')
    assert.equal((await state()).sent.at(-1).item.id, await rowId(0))
    await back()
  })
  await record(
    'WAMN query rejects duplicate rows and read refusals without replacing records',
    async () => {
      const original = (await state()).rows
      for (const fault of ['duplicate', 'refuse']) {
        await page.evaluate(
          (value) => window.generatorFixture.fault('/widget/query', value),
          fault,
        )
        await refresh().click()
        await expect.poll(async () => (await state()).busy).toBe(false)
        assert.notEqual((await state()).status, 'Widgets refreshed')
        assert.deepEqual((await state()).rows, original)
      }
      await refresh().click()
      await expect
        .poll(async () => (await state()).status)
        .toBe('Widgets refreshed')
    },
  )
  await record(
    'WAMN form updates exact revision and maps typed choices and values',
    async () => {
      await edit()
      await note().fill('Saved through generic form')
      await selectValue(
        page.locator('form [aria-haspopup="listbox"]'),
        'priority',
      )
      await save().click()
      await phase('success')
      const sent = (await state()).sent.at(-1)
      assert.equal(sent.path, '/widget/update')
      assert.equal(sent.item.expected_edit_version, '9007199254740993')
      assert.deepEqual(sent.item.change, {
        code: 'priority',
        note: 'Saved through generic form',
      })
      assert.equal(typeof sent.item.request_id, 'string')
      await expect(page.locator('table')).toContainText('9007199254740994')
      await expect(page.locator('table')).toContainText(
        'Saved through generic form',
      )
    },
  )
  await record(
    'WAMN refusals remain form errors and permit retry',
    async () => {
      await page.evaluate(() =>
        window.generatorFixture.fault('/widget/update', 'refuse'),
      )
      await edit()
      await note().fill('Retry draft')
      await save().click()
      await phase('rejected')
      await expect(page.locator('form [role="alert"]')).toBeVisible()
      assert.equal((await state()).rows[0].note, 'Saved through generic form')
      await save().click()
      await phase('success')
      await expect(page.locator('table')).toContainText('Retry draft')
    },
  )
  await record(
    'WAMN metadata changes preserve draft, focus and mounted nodes',
    async () => {
      await edit()
      await note().fill('Preserved local draft')
      await note().focus()
      const initialName = await page.locator('form').getAttribute('aria-label')
      await page.evaluate(
        (name) => {
          window.adapterNodes = [
            ...document.querySelectorAll(
              '#root textarea, #root table, #root form [aria-haspopup="listbox"]',
            ),
          ]
          window.generatorFixture.variant(name)
        },
        initialName === 'update' ? 'review' : 'original',
      )
      await expect(note()).toBeFocused()
      await expect(note()).toHaveValue('Preserved local draft')
      assert.equal(
        await page.evaluate(() =>
          window.adapterNodes.every((node) => node.isConnected),
        ),
        true,
      )
      const expected = initialName === 'update' ? 'note' : 'code'
      await expect(page.locator('tbody td').first()).toHaveAttribute(
        'data-column',
        expected,
      )
      const before = (await state()).sent.length
      await refresh().click()
      await expect
        .poll(async () => (await state()).status)
        .toBe('Save or reset the draft before reading')
      assert.equal((await state()).sent.length, before)
      await page
        .getByRole('button', { name: 'Reset draft', exact: true })
        .click()
      await expect(note()).toHaveValue('Retry draft')
    },
  )
  await record('WAMN held query cannot overwrite a newer draft', async () => {
    await page.evaluate(() =>
      window.generatorFixture.fault('/widget/query', 'hold'),
    )
    const settled = (await state()).lifecycle.readsSettled
    const count = (await state()).sent.length
    await refresh().click()
    await expect.poll(async () => (await state()).sent.length).toBe(count + 1)
    await edit()
    await note().fill('New draft while reading')
    await page.evaluate(() => window.generatorFixture.release())
    await expect
      .poll(async () => (await state()).lifecycle.readsSettled)
      .toBe(settled + 1)
    await expect(note()).toHaveValue('New draft while reading')
    await page.getByRole('button', { name: 'Reset draft', exact: true }).click()
  })
  await record(
    'WAMN cancellation ignores late update publication',
    async () => {
      const settled = (await state()).lifecycle.writesSettled
      await edit()
      await note().fill('Server can commit a cancelled request')
      await page.evaluate(() => {
        window.generatorFixture.fault('/widget/update', 'hold')
        window.generatorFixture.submit()
      })
      await phase('submitting')
      await page.evaluate(() => {
        window.generatorFixture.cancel()
        window.generatorFixture.release()
      })
      await expect
        .poll(async () =>
          page.evaluate(() => window.generatorFixture.outcome()?.status),
        )
        .toBe('cancelled')
      await expect
        .poll(async () => (await state()).lifecycle.writesSettled)
        .toBe(settled + 1)
      assert.equal((await state()).rows[0].note, 'Retry draft')
      await page
        .getByRole('button', { name: 'Reset draft', exact: true })
        .click()
      await refresh().click()
      await expect
        .poll(async () => (await state()).status)
        .toBe('Widgets refreshed')
      await expect(note()).toHaveValue('Server can commit a cancelled request')
    },
  )
  await record(
    'WAMN row actions inspect and edit the exact second record without losing another draft',
    async () => {
      await back()
      const first = await rowId(0)
      const second = await rowId(1)
      const sort = page.getByRole('button', { name: /^Sort by Created at$/i })
      await sort.click()
      await sort.click()
      await expect(page.locator('th[data-column=createdAt]')).toHaveAttribute(
        'aria-sort',
        'descending',
      )
      await page
        .getByRole('button', { name: 'Move Widget code column', exact: true })
        .press('Home')
      await expect(
        page.locator('[data-row-action=view]').first(),
      ).toHaveAttribute('data-row-id', second)
      await (await rowAction('View', 1)).press('Enter')
      await expect
        .poll(async () => (await state()).inspectedRecord?.id)
        .toBe(second)
      await expect(page.locator('[data-wamn-screen=details]')).toContainText(
        'Widget 1',
      )
      await expect(
        page.locator(
          '[data-wamn-screen=details] input, [data-wamn-screen=details] textarea',
        ),
      ).toHaveCount(0)
      assert.equal((await state()).sent.at(-1).item.id, second)
      const revision = (await state()).rows[1].editVersion
      await page
        .getByRole('button', { name: 'Edit record', exact: true })
        .click()
      await expect(note()).toHaveValue('Widget 1')
      await note().fill('Saved second record')
      await save().click()
      await phase('success')
      const sent = (await state()).sent.at(-1)
      assert.equal(sent.item.id, second)
      assert.equal(sent.item.expected_edit_version, revision)
      assert.equal((await state()).rows[1].note, 'Saved second record')
      assert.equal(
        (await state()).rows[0].note,
        'Server can commit a cancelled request',
      )
      await note().fill('Second record draft')
      await back()
      await (await rowAction('Edit', 0)).click()
      await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
      assert.equal((await state()).selectedId, second)
      assert.equal((await state()).values.note, 'Second record draft')
      await (await rowAction('View', 0)).click()
      await expect
        .poll(async () => (await state()).inspectedRecord?.id)
        .toBe(first)
      assert.equal((await state()).selectedId, second)
      assert.equal((await state()).values.note, 'Second record draft')
      await back()
      await (await rowAction('Edit', 1)).press('Space')
      await expect(note()).toHaveValue('Second record draft')
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await (await rowAction('Edit', 0)).click()
      await expect(note()).toHaveValue('Server can commit a cancelled request')
      await back()
    },
  )
  await record(
    'WAMN inspection ignores an older response and clears a refused target',
    async () => {
      const second = await rowId(1)
      const settled = (await state()).lifecycle.readsSettled
      await page.evaluate(() =>
        window.generatorFixture.fault('/widget/get', 'hold'),
      )
      await (await rowAction('View', 0)).click()
      await back()
      await (await rowAction('View', 1)).click()
      await expect
        .poll(async () => (await state()).inspectedRecord?.id)
        .toBe(second)
      await page.evaluate(() => window.generatorFixture.release())
      await expect
        .poll(async () => (await state()).lifecycle.readsSettled)
        .toBe(settled + 2)
      assert.equal((await state()).inspectedRecord.id, second)
      await back()
      await page.evaluate(() =>
        window.generatorFixture.fault('/widget/get', 'refuse'),
      )
      await (await rowAction('View', 0)).click()
      await expect.poll(async () => (await state()).busy).toBe(false)
      assert.equal((await state()).inspectedRecord, undefined)
      await expect(page.locator('[data-wamn-screen=details] dl')).toHaveCount(0)
      await expect(
        page.getByRole('button', { name: 'Edit record', exact: true }),
      ).toBeDisabled()
      await back()
    },
  )
  await record(
    'WAMN missing inspection clears busy and mismatched reads never publish',
    async () => {
      const first = await rowId(0)
      const before = await state()
      await page.evaluate(() =>
        window.generatorFixture.fault('/widget/get', 'hold'),
      )
      await (await rowAction('View', 0)).click()
      await expect.poll(async () => (await state()).busy).toBe(true)
      await page.evaluate(() => window.generatorFixture.open('missing'))
      await expect.poll(async () => (await state()).busy).toBe(false)
      assert.equal((await state()).inspectedRecord, undefined)
      await page.evaluate(() => window.generatorFixture.release())
      await expect
        .poll(async () => (await state()).lifecycle.readsSettled)
        .toBe(before.lifecycle.readsSettled + 1)
      assert.equal((await state()).inspectedRecord, undefined)
      await back()
      await page.evaluate(() =>
        window.generatorFixture.patch(0, {
          id: '00000000-0000-4000-8000-999999999999',
        }),
      )
      await (await rowAction('View', 0)).click()
      await expect.poll(async () => (await state()).busy).toBe(false)
      assert.equal((await state()).inspectedRecord, undefined)
      await expect(page.locator('[data-wamn-screen=details]')).toContainText(
        'read returned a different record',
      )
      await back()
      await refresh().click()
      await expect.poll(async () => (await state()).busy).toBe(false)
      assert.deepEqual((await state()).rows, before.rows)
      await page.evaluate(
        (id) => window.generatorFixture.patch(0, { id }),
        first,
      )
    },
  )
  await record(
    'WAMN pending target guard and late cancellation preserve the next editor',
    async () => {
      await back()
      await (await rowAction('Edit', 0)).click()
      const before = await state()
      await page.evaluate(() =>
        window.generatorFixture.fault('/widget/update', 'hold'),
      )
      await save().click()
      await phase('submitting')
      await back()
      await (await rowAction('Edit', 1)).click()
      await expect(page.locator('[data-wamn-screen=records]')).toBeVisible()
      assert.equal((await state()).selectedId, before.selectedId)
      await (await rowAction('Edit', 0)).click()
      await expect(
        page.getByRole('button', { name: 'Cancel', exact: true }),
      ).toBeFocused()
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await (await rowAction('Edit', 1)).click()
      await expect(note()).toHaveValue('Saved second record')
      await page.evaluate(() => window.generatorFixture.release())
      await expect
        .poll(async () => (await state()).lifecycle.writesSettled)
        .toBe(before.lifecycle.writesSettled + 1)
      assert.deepEqual((await state()).rows[0], before.rows[0])
      assert.equal((await state()).selectedId, await rowId(1))
      await expect(note()).toHaveValue('Saved second record')
      await back()
      await (await rowAction('Edit', 0)).click()
      await back()
    },
  )
  await reviewInline({ page, record })
  await record(
    'WAMN adapter stays within narrow viewport and disposes held requests',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      const settled = (await state()).lifecycle.writesSettled
      await edit()
      await note().fill('Disposed update')
      await page.evaluate(() => {
        window.generatorFixture.fault('/widget/update', 'hold')
        window.generatorFixture.submit()
      })
      await phase('submitting')
      await page.evaluate(() => window.generatorFixture.stop())
      await expect
        .poll(async () =>
          page.evaluate(() => window.generatorFixture.outcome()?.status),
        )
        .toBe('disposed')
      await expect
        .poll(async () => (await state()).lifecycle.writesSettled)
        .toBe(settled + 1)
      assert.equal((await state()).lifecycle.disposals, 1)
      const disposedStatus = (await state()).status
      assert.equal(
        await page.evaluate(() => window.generatorFixture.beginEdit('missing')),
        false,
      )
      assert.equal((await state()).status, disposedStatus)
      assert.equal(
        (await state()).rows[0].note,
        'Server can commit a cancelled request',
      )
      await expect(
        page.locator('#root input, #root textarea, #root table'),
      ).toHaveCount(0)
    },
  )
}
