import { galleryFormCases } from './form-cases.mjs'
import { galleryLoadingCases } from './loading-cases.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
const catalog = [
  ['everything', 'Everything form'],
  ['fields', 'Fields'],
  ['buttons', 'Buttons'],
  ['choices', 'Select and combobox'],
  ['booleans', 'Checkbox, switch and radio'],
  ['numbers', 'Numbers'],
  ['dates', 'Date and datetime'],
  ['files', 'File selection'],
  ['tabs', 'Tabs'],
  ['breadcrumbs', 'Breadcrumbs'],
  ['collapsible', 'Collapsible'],
  ['accordion', 'Accordion'],
  ['resizable', 'Resizable panes'],
  ['overlays', 'Popover, menu and tooltip'],
  ['dialogs', 'Dialogs and confirmations'],
  ['display', 'Display and status'],
  ['table', 'Table'],
]
export async function galleryCases({ page, url, record, settle }) {
  await galleryLoadingCases({ page, url, record })
  await galleryFormCases({ page, url, record })
  const preview = () => page.frameLocator('.gallery-frame')
  const ready = async () => {
    await expect(preview().locator('.gallery-preview')).toBeVisible()
    const navigation = page.getByRole('navigation', {
      name: 'Component catalog',
    })
    if (await navigation.isVisible()) {
      for (const section of await navigation.locator('details').all()) {
        if (!(await section.evaluate((node) => node.open)))
          await section.locator('summary').click()
      }
    }
  }
  const name = () =>
    preview().getByRole('textbox', { name: 'Name', exact: true })
  await record(
    'gallery: all examples share control sizing across light and dark modes',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      for (const scheme of [1, 2]) {
        for (const [id] of catalog) {
          await page.goto(`${url}?gallery=${id}&scheme=${scheme}`)
          await expect(preview().locator('.gallery-preview')).toBeVisible()
          const heights = await preview()
            .locator(
              '.ui-button:not(.column-sort, .column-move, .header-rename)',
            )
            .evaluateAll((nodes) =>
              nodes
                .map((node) => node.getBoundingClientRect().height)
                .filter(Boolean),
            )
          for (const height of heights)
            assert.equal(height, 32, `${id}: button height in scheme ${scheme}`)
          if (id === 'display') {
            const skeletons = await preview()
              .locator('.ui-skeleton')
              .evaluateAll((nodes) =>
                nodes.map((node) => ({
                  fill: getComputedStyle(node).backgroundColor,
                  panel: getComputedStyle(
                    node.closest('.gallery-example-panel'),
                  ).backgroundColor,
                  height: node.getBoundingClientRect().height,
                })),
              )
            assert.equal(skeletons.length, 3)
            for (const skeleton of skeletons) {
              assert.notEqual(skeleton.fill, skeleton.panel)
              assert.ok(skeleton.height >= 32)
            }
          }
          if (id === 'table') {
            for (const label of await preview()
              .locator('.table-filter > label')
              .all()) {
              await expect(label).toHaveCSS('line-height', '12px')
              await expect(label).toHaveCSS('font-weight', '400')
              await expect(label.locator('..')).toHaveCSS('row-gap', '8px')
            }
          }
          if (id === 'choices') {
            const fields = preview().locator('form > .ui-field')
            await expect(fields).toHaveCount(2)
            const geometry = await fields.evaluateAll((nodes) =>
              nodes.map((node) => {
                const label = node
                  .querySelector('.ui-label')
                  .getBoundingClientRect()
                const control = node
                  .querySelector('.popup-trigger, .choice-control')
                  .getBoundingClientRect()
                return {
                  height: control.height,
                  labelGap: control.top - label.bottom,
                }
              }),
            )
            assert.deepEqual(geometry, [
              { height: 32, labelGap: 8 },
              { height: 32, labelGap: 8 },
            ])
            const actionGap = await preview()
              .locator('.example-actions')
              .evaluate((node) => {
                const buttons = node.querySelectorAll('button')
                return (
                  buttons[1].getBoundingClientRect().left -
                  buttons[0].getBoundingClientRect().right
                )
              })
            assert.equal(actionGap, 8)
          }
        }
      }
    },
  )
  await record(
    'gallery: platform shell has breadcrumbs, an empty footer and collapsible catalog sections',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${url}?gallery=fields`)
      await expect(preview().locator('.gallery-preview')).toBeVisible()
      const navigation = page.getByRole('navigation', {
        name: 'Component catalog',
      })
      const forms = navigation
        .locator('details')
        .filter({ has: page.locator('summary', { hasText: /^Forms$/ }) })
      const components = navigation
        .locator('details')
        .filter({ has: page.locator('summary', { hasText: /^Components$/ }) })
      await expect(navigation.locator('details')).toHaveCount(4)
      await expect(navigation.locator('details[open]')).toHaveCount(1)
      await expect(forms).toHaveAttribute('open', '')
      await expect(
        page.getByRole('navigation', { name: 'Gallery location' }),
      ).toContainText('Gallery/Forms/Fields')
      await expect(page.locator('.ui-dashboard-footer')).toBeEmpty()
      await expect(page.locator('.ui-dashboard-footer')).toBeVisible()
      assert.equal(
        await navigation
          .getByRole('button', { name: 'Appearance', exact: true })
          .count(),
        0,
      )
      await name().fill('Retained section draft')
      const frame = await page.locator('.gallery-frame').elementHandle()
      await forms.locator('summary').focus()
      await page.keyboard.press('Enter')
      await expect(forms).not.toHaveAttribute('open')
      await expect(
        navigation.getByRole('link', { name: 'Fields', exact: true }),
      ).toBeHidden()
      await expect(name()).toHaveValue('Retained section draft')
      assert.equal(
        await frame.evaluate(
          (node) => node === document.querySelector('.gallery-frame'),
        ),
        true,
      )
      await components.locator('summary').click()
      await navigation
        .getByRole('link', { name: 'Buttons', exact: true })
        .click()
      await expect(
        page.getByRole('navigation', { name: 'Gallery location' }),
      ).toContainText('Gallery/Components/Buttons')
      await page.goBack()
      await expect(forms).toHaveAttribute('open', '')
      await expect(
        page.getByRole('heading', { name: 'Fields', exact: true }),
      ).toBeFocused()
      const boundaries = await page.evaluate(() => {
        const box = (selector) =>
          document.querySelector(selector).getBoundingClientRect()
        const header = box('.ui-dashboard-header'),
          navigation = box('.ui-dashboard-navigation'),
          toolbar = box('.gallery-toolbar'),
          stage = box('.gallery-stage'),
          footer = box('.ui-dashboard-footer')
        return [
          toolbar.top - header.bottom,
          stage.top - toolbar.bottom,
          stage.left - navigation.right,
          footer.top - stage.bottom,
        ]
      })
      for (const gap of boundaries)
        assert.ok(Math.abs(gap) <= 1, `Unexpected gallery pane gap: ${gap}`)
      const footer = await page.locator('.ui-dashboard-footer').boundingBox()
      assert.ok(Math.abs(footer.y + footer.height - 900) <= 1)
      await expect(preview().locator('.gallery-preview')).toBeVisible()
      await page.screenshot({ path: '/tmp/wfe-gallery-layout-wide.png' })
      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      )
      await page
        .getByRole('button', { name: 'Components', exact: true })
        .click()
      await expect(navigation.locator('details')).toHaveCount(4)
      await page.screenshot({ path: '/tmp/wfe-gallery-layout-phone.png' })
      await page.keyboard.press('Escape')
      await expect(
        page.getByRole('button', { name: 'Components', exact: true }),
      ).toBeFocused()
    },
  )
  await record(
    'gallery: every example is reachable through native links and browser history',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${url}?gallery=fields`)
      await ready()
      await expect(
        page.getByRole('link', { name: 'Fields', exact: true }),
      ).toHaveAttribute('aria-current', 'page')
      const historyLength = await page.evaluate(() => history.length)
      const originalFrame = await page.locator('.gallery-frame').elementHandle()
      await page.evaluate(() => {
        window.galleryObserveModifiedClick = (event) => {
          window.galleryModifiedClick = {
            control: event.ctrlKey,
            button: event.button,
            prevented: event.defaultPrevented,
            href: event.target.closest('a')?.href,
          }
          // Observe after the gallery handler, then contain browser transport.
          event.preventDefault()
        }
        document.addEventListener('click', window.galleryObserveModifiedClick)
      })
      try {
        await page
          .getByRole('link', { name: 'Buttons', exact: true })
          .click({ modifiers: ['Control'] })
      } finally {
        await page.evaluate(() =>
          document.removeEventListener(
            'click',
            window.galleryObserveModifiedClick,
          ),
        )
      }
      const observed = await page.evaluate(() => window.galleryModifiedClick)
      const destination = new URL(observed.href)
      assert.deepEqual(
        { ...observed, href: undefined },
        {
          control: true,
          button: 0,
          prevented: false,
          href: undefined,
        },
      )
      assert.equal(new URL(page.url()).searchParams.get('gallery'), 'fields')
      assert.equal(await page.evaluate(() => history.length), historyLength)
      assert.equal(
        await originalFrame.evaluate(
          (node) => node === document.querySelector('.gallery-frame'),
        ),
        true,
      )
      assert.equal(destination.origin, new URL(page.url()).origin)
      assert.equal(destination.searchParams.get('gallery'), 'buttons')
      const tab = await page.context().browser().newPage()
      const diagnostics = []
      tab.on('pageerror', (error) => diagnostics.push(String(error)))
      tab.on('console', (message) => {
        if (
          ['warning', 'error'].includes(message.type()) &&
          !message.text().startsWith('[HOT_SCOPE_TIME]')
        )
          diagnostics.push(message.text())
      })
      try {
        await tab.goto(destination.href)
        await expect(
          tab
            .frameLocator('.gallery-frame')
            .getByRole('group', { name: 'accent buttons', exact: true }),
        ).toBeVisible()
        assert.deepEqual(diagnostics, [])
      } finally {
        await tab.close()
      }
      for (const [id, label] of catalog) {
        await page.getByRole('link', { name: label, exact: true }).click()
        await expect(page.locator('.gallery-frame')).toHaveAttribute(
          'title',
          `${label} preview`,
        )
        await ready()
        await expect(
          page.getByRole('link', { name: label, exact: true }),
        ).toHaveAttribute('aria-current', 'page')
        assert.equal(new URL(page.url()).searchParams.get('gallery'), id)
      }
      await page.goBack()
      await ready()
      await expect(
        page.getByRole('link', { name: 'Display and status', exact: true }),
      ).toHaveAttribute('aria-current', 'page')
      await page.goForward()
      await ready()
      await expect(preview().getByRole('table')).toBeVisible()
      await page.goto(
        `${url}?gallery=fields&state=readonly&viewport=phone&scheme=2`,
      )
      await expect(name()).toHaveAttribute('readonly', '')
      assert.equal(
        await preview()
          .locator('body')
          .evaluate(() => innerWidth),
        320,
      )
      await page.goto(`${url}?galleryPreview=fields`)
      await expect(
        page.getByRole('textbox', { name: 'Name', exact: true }),
      ).toHaveValue('Sample record')
      await expect(page.locator('.gallery-preview')).toHaveCSS(
        'background-color',
        'rgb(252, 252, 253)',
      )
      assert.equal(await page.locator('.gallery-shell').count(), 0)
      await page.goto(`${url}?galleryPreview=booleans&state=disabled`)
      await expect(
        page.getByRole('checkbox', { name: 'Include details', exact: true }),
      ).toBeDisabled()
    },
  )
  await record(
    'gallery: recipes interact and reused examples receive semantic state changes',
    async () => {
      await page.goto(`${url}?gallery=fields`)
      await ready()
      await preview()
        .getByRole('button', { name: /^Status / })
        .click()
      await preview()
        .getByRole('option', { name: 'Closed', exact: true })
        .click()
      await expect(
        preview().getByRole('button', { name: /^Status / }),
      ).toContainText('Closed')
      await page
        .getByRole('link', { name: 'Date and datetime', exact: true })
        .click()
      await ready()
      await preview()
        .getByRole('button', { name: 'Open Date calendar', exact: true })
        .click()
      await expect(preview().getByRole('grid')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(preview().getByRole('grid')).not.toBeVisible()
      await page
        .getByRole('link', { name: 'Dialogs and confirmations', exact: true })
        .click()
      await ready()
      await preview()
        .getByRole('button', { name: 'Open dialog', exact: true })
        .click()
      await expect(
        preview().getByRole('dialog', { name: 'Record information' }),
      ).toBeVisible()
      await preview()
        .getByRole('button', { name: 'Dismiss', exact: true })
        .click()
      await expect(preview().getByRole('dialog')).not.toBeVisible()
      for (const action of ['Cancel', 'Confirm']) {
        await preview()
          .getByRole('button', { name: 'Open confirmation', exact: true })
          .click()
        await expect(
          preview().getByRole('alertdialog', { name: 'Confirm action' }),
        ).toBeVisible()
        await preview()
          .getByRole('button', { name: action, exact: true })
          .click()
        await expect(preview().getByRole('alertdialog')).not.toBeVisible()
      }
      await page.getByRole('link', { name: 'Table', exact: true }).click()
      await ready()
      await preview()
        .getByRole('button', { name: 'Sort by Name', exact: true })
        .click()
      await expect(preview().locator('th[data-column="name"]')).toHaveAttribute(
        'aria-sort',
        'ascending',
      )
      const controls = preview().getByRole('button', {
        name: 'Table controls',
        exact: true,
      })
      const expanded = await controls.getAttribute('aria-expanded')
      await controls.click()
      await expect(controls).toHaveAttribute(
        'aria-expanded',
        expanded === 'true' ? 'false' : 'true',
      )
      await page
        .getByRole('link', { name: 'Checkbox, switch and radio', exact: true })
        .click()
      await ready()
      const check = preview().getByRole('checkbox', {
        name: 'Include details',
        exact: true,
      })
      const state = (value) =>
        page
          .getByRole('group', { name: 'Example state' })
          .getByRole('button', { name: value, exact: true })
          .click()
      await state('disabled')
      await expect(check).toBeDisabled()
      await state('readonly')
      await expect(check).toBeEnabled()
      const before = await check.isChecked()
      await preview().locator('[data-control="checkbox"]').click()
      assert.equal(await check.isChecked(), before)
      await state('invalid')
      await expect(check).toHaveAttribute('aria-invalid', 'true')
      await state('normal')
      await preview().locator('[data-control="checkbox"]').click()
      assert.equal(await check.isChecked(), !before)
      await page
        .getByRole('link', { name: 'Select and combobox', exact: true })
        .click()
      await ready()
      const select = preview().getByRole('button', {
        name: /Selected category/,
      })
      await state('disabled')
      await expect(select).toBeDisabled()
      await state('normal')
      await select.click()
      await preview()
        .getByRole('option', { name: 'Gamma', exact: true })
        .click()
      await expect(select).toContainText('Gamma')
    },
  )
  await record(
    'gallery: appearance, real viewport widths and semantic states preserve drafts and nodes',
    async () => {
      await page.goto(`${url}?gallery=fields`)
      await ready()
      const draft = name()
      await draft.fill('Retained gallery draft')
      const retained = await draft.elementHandle()
      const frame = await page.locator('.gallery-frame').elementHandle()
      assert.equal(
        await page
          .locator('.gallery-shell')
          .evaluate((node) => getComputedStyle(node).backgroundColor),
        'rgb(252, 252, 253)',
      )
      assert.equal(
        await preview()
          .locator('.gallery-preview')
          .evaluate((node) => getComputedStyle(node).backgroundColor),
        'rgb(252, 252, 253)',
      )
      assert.equal(
        await page
          .getByRole('button', { name: 'Appearance', exact: true })
          .evaluate((node) => getComputedStyle(node).color),
        'rgb(25, 113, 194)',
      )
      for (const state of ['disabled', 'readonly', 'invalid', 'normal']) {
        await page
          .getByRole('group', { name: 'Example state' })
          .getByRole('button', { name: state, exact: true })
          .click()
        if (state === 'disabled') await expect(draft).toBeDisabled()
        if (state === 'readonly')
          await expect(draft).toHaveAttribute('readonly', '')
        if (state === 'invalid')
          await expect(draft).toHaveAttribute('aria-invalid', 'true')
        if (state === 'normal') await expect(draft).toBeEditable()
      }
      await page
        .getByRole('button', { name: 'Appearance', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Dark surfaces', exact: true })
        .click()
      await expect(preview().locator('.gallery-preview')).toHaveCSS(
        'background-color',
        'rgb(27, 27, 27)',
      )
      await page
        .getByRole('button', { name: 'Violet accent', exact: true })
        .click()
      await page.getByRole('button', { name: 'Depth 1', exact: true }).click()
      await page
        .getByRole('button', { name: 'Content Surface 3', exact: true })
        .click()
      await expect(draft).toHaveValue('Retained gallery draft')
      assert.equal(
        await retained.evaluate(
          (node) => node === document.querySelector('input'),
        ),
        true,
      )
      assert.equal(
        await frame.evaluate(
          (node) => node === document.querySelector('.gallery-frame'),
        ),
        true,
      )
      await page
        .getByRole('button', { name: 'Phone · 320px', exact: true })
        .click()
      await expect
        .poll(() =>
          preview()
            .locator('body')
            .evaluate(() => innerWidth),
        )
        .toBe(320)
      await page.goBack()
      await expect
        .poll(() =>
          preview()
            .locator('body')
            .evaluate(() => innerWidth),
        )
        .toBeGreaterThan(320)
      await expect(draft).toHaveValue('Retained gallery draft')
      await page.goForward()
      await expect
        .poll(() =>
          preview()
            .locator('body')
            .evaluate(() => innerWidth),
        )
        .toBe(320)
      const direct = await page
        .getByRole('link', { name: 'Direct link', exact: true })
        .getAttribute('href')
      assert.equal(new URL(direct, page.url()).searchParams.get('accent'), '4')
      await page
        .getByRole('button', { name: 'Appearance', exact: true })
        .click()
      await page.setViewportSize({ width: 320, height: 844 })
      await settle()
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      assert.equal(
        await preview()
          .locator('body')
          .evaluate(() => innerWidth),
        320,
      )
      assert.equal(
        await page
          .locator('.gallery-stage')
          .evaluate(
            (node) => node.scrollWidth === Math.max(node.clientWidth, 320),
          ),
        true,
      )
      await page
        .getByRole('button', { name: 'Components', exact: true })
        .click()
      await page
        .getByRole('link', { name: 'File selection', exact: true })
        .click()
      await ready()
      await expect(
        page.getByRole('navigation', { name: 'Component catalog' }),
      ).not.toBeVisible()
      await expect(
        page.getByRole('heading', { name: 'File selection', exact: true }),
      ).toBeFocused()
      await page
        .getByRole('button', { name: 'Components', exact: true })
        .click()
      await page.keyboard.press('Escape')
      await expect(
        page.getByRole('button', { name: 'Components', exact: true }),
      ).toBeFocused()
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )
  await record(
    'gallery: message guards, replaced frames and parent disposal keep one listener owner',
    async () => {
      await page.addInitScript(() => {
        if (window.parent !== window) return
        const listeners = { message: new Set(), popstate: new Set() }
        const add = window.addEventListener,
          remove = window.removeEventListener
        window.addEventListener = function (type, listener, ...rest) {
          listeners[type]?.add(listener)
          return add.call(this, type, listener, ...rest)
        }
        window.removeEventListener = function (type, listener, ...rest) {
          listeners[type]?.delete(listener)
          return remove.call(this, type, listener, ...rest)
        }
        window.galleryListenerCounts = () => ({
          message: listeners.message.size,
          popstate: listeners.popstate.size,
        })
      })
      await page.goto(`${url}?gallery=fields`)
      await ready()
      const counts = await page.evaluate(() => window.galleryListenerCounts())
      await preview()
        .locator('.gallery-preview')
        .evaluate(() => {
          const config = {
            scheme: 2,
            accent: 8,
            depth: 3,
            layers: { canvas: 2, pane: 2, content: 2 },
            state: 'disabled',
          }
          window.dispatchEvent(
            new MessageEvent('message', {
              source: window,
              origin: location.origin,
              data: { type: 'wfe-gallery-config', config },
            }),
          )
          window.dispatchEvent(
            new MessageEvent('message', {
              source: parent,
              origin: 'https://wrong.example',
              data: { type: 'wfe-gallery-config', config },
            }),
          )
          window.dispatchEvent(
            new MessageEvent('message', {
              source: parent,
              origin: location.origin,
              data: {
                type: 'wfe-gallery-config',
                config: { ...config, scheme: -1 },
              },
            }),
          )
        })
      await expect(name()).toBeEditable()
      await expect(preview().locator('.gallery-preview')).toHaveCSS(
        'background-color',
        'rgb(252, 252, 253)',
      )
      await page.locator('.gallery-frame').evaluate((node) => {
        window.retiredGalleryFrame = node.contentWindow
      })
      for (const label of ['Buttons', 'Fields', 'Tabs', 'Fields']) {
        await page.getByRole('link', { name: label, exact: true }).click()
        await ready()
      }
      assert.deepEqual(
        await page.evaluate(() => window.galleryListenerCounts()),
        counts,
      )
      const stale = await page.evaluate(() => {
        const current = document.querySelector('.gallery-frame').contentWindow
        const post = current.postMessage
        let requests = 0
        current.postMessage = function (...args) {
          requests++
          return post.apply(this, args)
        }
        window.dispatchEvent(
          new MessageEvent('message', {
            source: window.retiredGalleryFrame,
            origin: location.origin,
            data: { type: 'wfe-gallery-ready' },
          }),
        )
        window.dispatchEvent(
          new MessageEvent('message', {
            source: current,
            origin: 'https://wrong.example',
            data: { type: 'wfe-gallery-ready' },
          }),
        )
        current.postMessage = post
        return requests
      })
      assert.equal(stale, 0)
      const disposed = await page.evaluate(() => {
        window.galleryFixture.stop()
        window.dispatchEvent(new Event('popstate'))
        window.dispatchEvent(
          new MessageEvent('message', {
            source: window.retiredGalleryFrame,
            origin: location.origin,
            data: { type: 'wfe-gallery-ready' },
          }),
        )
        return {
          counts: window.galleryListenerCounts(),
          frames: document.querySelectorAll('iframe').length,
        }
      })
      assert.deepEqual(disposed.counts, {
        message: counts.message - 1,
        popstate: counts.popstate - 1,
      })
      assert.equal(disposed.frames, 0)
    },
  )
}
