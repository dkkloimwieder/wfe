import assert from 'node:assert/strict'

export async function choiceCases({ page, url, record, press, settle }) {
  const open = () => page.goto(`${url}?choices=1`)
  const select = () => page.getByRole('button', { name: /Selected category/ })
  const input = () => page.getByRole('combobox', { name: 'Find category' })
  const read = () => page.evaluate(() => window.choiceFixture.read())
  const configure = (next) =>
    page.evaluate((next) => window.choiceFixture.configure(next), next)

  await record(
    'choices: popup uses available height and reserves room for its footer',
    async () => {
      await page.setViewportSize({ width: 1280, height: 1000 })
      await open()
      await configure({
        options: Array.from({ length: 12 }, (_, i) => ({
          id: `item-${i}`,
          label: `Item ${i}`,
        })),
      })
      await select().click()
      await settle()
      const popup = page.locator('.popup-content').filter({
        has: page.getByRole('button', { name: 'More select options' }),
      })
      const measure = () =>
        popup.evaluate((node) => {
          const list = node.querySelector('.popup-listbox')
          const footer = node.querySelector('.choice-footer')
          return {
            scroll: list.scrollHeight,
            height: list.clientHeight,
            top: node.getBoundingClientRect().top,
            bottom: node.getBoundingClientRect().bottom,
            footerBottom: footer.getBoundingClientRect().bottom,
          }
        })
      const fitting = await measure()
      assert.ok(fitting.height > 0)
      assert.ok(fitting.scroll <= fitting.height + 1)
      await page.setViewportSize({ width: 1280, height: 400 })
      await configure({
        options: Array.from({ length: 100 }, (_, i) => ({
          id: `item-${i}`,
          label: `Item ${i}`,
        })),
      })
      await settle()
      const overflowing = await measure()
      assert.ok(overflowing.scroll > overflowing.height)
      assert.ok(overflowing.top >= 0 && overflowing.bottom <= 400)
      assert.ok(overflowing.footerBottom <= overflowing.bottom)
      await page.getByRole('option', { name: 'Item 0', exact: true }).focus()
      await page.keyboard.press('End')
      await settle()
      const last = page.getByRole('option', { name: 'Item 99', exact: true })
      assert.equal(await last.getAttribute('data-highlighted'), '')
      await page.keyboard.press('Escape')
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )
  await record(
    'choices: icon and text triggers fit their labels within a bounded compound field',
    async () => {
      await open()
      const trigger = page.locator('.choice-toggle').first()
      const geometry = await trigger.evaluate((node) => {
        node.append(document.createTextNode('Open choices'))
        node.parentElement.style.width = '300px'
        const label = document.createRange()
        label.selectNodeContents(node)
        const text = label.getBoundingClientRect()
        const button = node.getBoundingClientRect()
        const control = node.parentElement.getBoundingClientRect()
        return {
          textFits: text.left >= button.left && text.right <= button.right,
          fitsControl: button.right <= control.right,
        }
      })
      assert.deepEqual(geometry, { textFits: true, fitsControl: true })
    },
  )
  await record(
    'choices: opening focus does not overwrite immediate keyboard navigation',
    async () => {
      await open()
      await page.mouse.move(0, 0)
      await page.evaluate(() => {
        const trigger = document.querySelector(
          'button[aria-haspopup="listbox"]',
        )
        trigger.focus()
        const key = (key) => {
          document.activeElement.dispatchEvent(
            new KeyboardEvent('keydown', {
              key,
              bubbles: true,
              cancelable: true,
            }),
          )
          window.choiceFixture.configure({})
        }
        key('ArrowDown')
        key('Home')
        key('ArrowDown')
      })
      await settle()
      const gamma = page.getByRole('option', { name: 'Gamma', exact: true })
      assert.equal(await gamma.getAttribute('data-highlighted'), '')
      assert.equal(
        await gamma.evaluate((node) => node === document.activeElement),
        true,
      )
      await press('Enter')
      assert.equal((await read()).value, 'gamma')
      assert.equal(
        await select().evaluate((node) => node === document.activeElement),
        true,
      )
    },
  )
  await record(
    'choices: selection markers preserve option semantics and pointer targets',
    async () => {
      for (const { show, control } of [
        { show: () => select().click(), control: select },
        {
          show: async () => {
            await input().focus()
            await press('ArrowDown')
          },
          control: input,
        },
      ]) {
        await open()
        await show()
        const selected = page.getByRole('option', {
          name: 'Alpha',
          exact: true,
        })
        const marker = selected.locator('.custom-selection')
        const glyph = marker.locator('svg')
        assert.equal(await glyph.count(), 1)
        assert.equal(await glyph.getAttribute('aria-hidden'), 'true')
        assert.equal(await glyph.getAttribute('focusable'), 'false')
        assert.ok(
          await glyph
            .locator('path')
            .evaluate((path) => path.getBBox().width > 0),
        )
        assert.equal(await selected.getAttribute('aria-selected'), 'true')
        const hit = await marker.evaluate((node) => {
          const box = node.getBoundingClientRect()
          const option = node.closest('[role="option"]')
          const bounds = option.getBoundingClientRect()
          const target = document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          )
          return {
            visible: box.width > 0 && box.height > 0,
            contained:
              box.left >= bounds.left &&
              box.right <= bounds.right &&
              box.top >= bounds.top &&
              box.bottom <= bounds.bottom,
            targetsOption: target?.closest('[role="option"]') === option,
          }
        })
        assert.deepEqual(hit, {
          visible: true,
          contained: true,
          targetsOption: true,
        })
        const box = await marker.boundingBox()
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
        await settle()
        assert.equal((await read()).value, null)
        await press('Escape')
        assert.equal(await selected.count(), 0)
        assert.equal(
          await control().evaluate((node) => node === document.activeElement),
          true,
        )
      }
    },
  )
  await record(
    'choices: custom items select by pointer and disabled options reject changes',
    async () => {
      await open()
      await page.evaluate(() => {
        window.choiceNativeEvents = []
        document.querySelector('select').addEventListener('change', () => {
          window.choiceNativeEvents.push(
            new FormData(document.querySelector('form')).get('category'),
          )
        })
      })
      await select().click()
      assert.equal(
        await page
          .getByRole('option', { name: 'Gamma' })
          .getAttribute('data-custom-item'),
        'select',
      )
      await page.getByRole('option', { name: 'Beta' }).click({ force: true })
      assert.equal((await read()).value, 'alpha')
      await page.getByRole('option', { name: 'Gamma' }).click()
      assert.equal((await read()).value, 'gamma')
      assert.deepEqual(await page.evaluate(() => window.choiceNativeEvents), [
        'gamma',
      ])
      assert.equal(
        await page.evaluate(() =>
          new FormData(document.querySelector('form')).get('category'),
        ),
        'gamma',
      )
      await page.getByRole('button', { name: 'Clear selection' }).click()
      assert.equal((await read()).value, null)
      assert.deepEqual(await page.evaluate(() => window.choiceNativeEvents), [
        'gamma',
        '',
      ])
      assert.equal(
        await page.evaluate(() =>
          new FormData(document.querySelector('form')).get('category'),
        ),
        '',
      )
    },
  )
  await record(
    'choices: controlled search accepts external updates and restores rejected input',
    async () => {
      await open()
      await input().fill('server query')
      assert.equal((await read()).query, 'server query')
      assert.equal((await read()).value, 'alpha')
      assert.equal(
        await page.getByRole('option').count(),
        3,
        'caller options bypass local filtering',
      )
      await configure({ query: 'External', acceptSearch: false })
      assert.equal(await input().inputValue(), 'External')
      await input().fill('Rejected')
      assert.equal(await input().inputValue(), 'External')
      assert.equal((await read()).query, 'External')
      assert.equal((await read()).value, 'alpha')
    },
  )
  await record(
    'choices: keyboard skips disabled options and keeps value separate from search',
    async () => {
      await open()
      await input().focus()
      await press('ArrowDown')
      await press('ArrowDown')
      await press('Enter')
      assert.equal((await read()).value, 'gamma')
      assert.equal(await input().inputValue(), 'Gamma')
      await input().fill('Uncommitted query')
      await press('Escape')
      assert.equal((await read()).value, 'gamma')
      assert.equal((await read()).query, 'Uncommitted query')
    },
  )
  await record(
    'choices: option pages and late results retain controlled selection and submitted value',
    async () => {
      await open()
      const before = await read()
      await configure({ options: [{ id: 'delta', label: 'Delta' }] })
      assert.equal((await read()).value, 'alpha')
      assert.equal((await read()).changes, before.changes)
      assert.match(await select().textContent(), /Alpha/)
      assert.equal(await input().inputValue(), 'Alpha')
      assert.equal(
        await page.evaluate(() =>
          new FormData(document.querySelector('form')).get('category'),
        ),
        'alpha',
      )
      await configure({
        value: { id: 'remote', label: 'Remote label' },
        query: 'Remote label',
      })
      await configure({ options: [] })
      assert.equal((await read()).value, 'remote')
      assert.equal((await read()).changes, before.changes)
      assert.match(await select().textContent(), /Remote label/)
      assert.equal(await input().inputValue(), 'Remote label')
    },
  )
  await record(
    'choices: empty and loading content stays selectable through caller footer controls',
    async () => {
      await open()
      await configure({ options: [], loading: true })
      await input().fill('Request')
      await page
        .getByRole('status')
        .filter({ hasText: 'Loading results' })
        .waitFor()
      await configure({ loading: false })
      await page.getByRole('status').filter({ hasText: 'No results' }).waitFor()
      await page.getByRole('button', { name: 'More search options' }).click()
      assert.equal((await read()).pages, 1)
      assert.equal((await read()).value, 'alpha')
      await page.getByRole('option', { name: 'Delta' }).click()
      assert.equal((await read()).value, 'delta')
    },
  )
  await record(
    'choices: footer buttons are reachable by Tab and leave through normal control order',
    async () => {
      await open()
      await input().focus()
      await press('ArrowDown')
      await press('Tab')
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent),
        'More search options',
      )
      await press('Shift+Tab')
      assert.equal(
        await input().evaluate((node) => node === document.activeElement),
        true,
      )
      await press('ArrowDown')
      await press('Tab')
      await press('Enter')
      assert.equal((await read()).pages, 1)
      await press('Tab')
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent),
        'Clear selection',
      )
      await select().click()
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('role') === 'option',
      )
      await settle()
      await press('Tab')
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent),
        'More select options',
      )
      await press('Shift+Tab')
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('role')),
        'option',
      )
      await press('Escape')
      assert.equal(
        await select().evaluate((node) => node === document.activeElement),
        true,
      )
      await press('ArrowDown')
      await press('Tab')
      await press('Enter')
      assert.equal((await read()).pages, 2)
      assert.deepEqual((await read()).optionKeys, [
        'alpha',
        'beta',
        'gamma',
        'delta',
        'page-2',
      ])
      await press('Tab')
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('role')),
        'combobox',
        await page.evaluate(() => document.activeElement.outerHTML),
      )
    },
  )
  await record(
    'choices: labels and error descriptions remain linked and disabled controls close',
    async () => {
      await open()
      await configure({ invalid: true })
      for (const control of [select(), input()]) {
        assert.equal(await control.getAttribute('aria-invalid'), 'true')
        const descriptions = await control.getAttribute('aria-describedby')
        assert.ok(descriptions)
        for (const id of descriptions.split(' '))
          assert.equal(await page.locator(`[id="${id}"]`).count(), 1)
      }
      await input().focus()
      await press('ArrowDown')
      await configure({ disabled: true })
      assert.equal(await page.getByRole('listbox').count(), 0)
      assert.equal(await input().isDisabled(), true)
      assert.equal(await select().isDisabled(), true)
      assert.equal((await read()).value, 'alpha')
    },
  )
  await record(
    'choices: disposal removes open portals without changing application values',
    async () => {
      await open()
      await input().focus()
      await press('ArrowDown')
      assert.equal(await page.getByRole('listbox').count(), 1)
      await page.evaluate(() => window.choiceFixture.stop())
      assert.equal(await page.getByRole('listbox').count(), 0)
      assert.equal(await page.locator('#root').textContent(), '')
      assert.equal((await read()).cleanups, 1)
      assert.equal((await read()).changes, 0)
    },
  )
}
