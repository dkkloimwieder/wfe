import { reviewFiles } from '../shared/controls/file-review.mjs'
import { reviewResizable } from '../shared/controls/resizable-review.mjs'
import { reviewAccordion } from '../shared/controls/accordion-review.mjs'
import { reviewBreadcrumbs } from '../shared/controls/breadcrumb-review.mjs'
import { reviewTabs } from '../shared/controls/tabs-review.mjs'
import { reviewNumber } from '../shared/controls/number-review.mjs'
import { reviewCollapsible } from '../shared/controls/collapsible-review.mjs'
import {
  reviewStructuredClasses,
  reviewDynamicIds,
  reviewChoiceMetadata,
  initialClassTokens,
} from '../shared/controls/class-review.mjs'
import { reviewCssProvenance } from '../shared/controls/css-review.mjs'
import {
  choiceControl,
  selectValue,
} from '../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'

const assets = fileURLToPath(
  new URL(
    process.env.BENCH_DISTRIBUTION ? '.dist-package/' : '.dist/',
    import.meta.url,
  ),
)
const report = { errors: [], warnings: [], serverWarnings: [], assertions: [] }
let browser
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname
    if (path === '/favicon.ico') return void response.writeHead(204).end()
    response.setHeader(
      'Content-Type',
      path.endsWith('.js')
        ? 'text/javascript'
        : path.endsWith('.css')
          ? 'text/css'
          : 'text/html',
    )
    response.end(
      await readFile(assets + (path === '/' ? 'index.html' : path.slice(1))),
    )
  } catch {
    response.writeHead(404).end()
  }
})
try {
  for (const ssr of [true, false]) {
    execFileSync(
      'pnpm',
      [
        'exec',
        'vite',
        'build',
        '--config',
        'examples/hydration/vite.config.ts',
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, HYDRATION_SERVER: ssr ? '1' : '' },
      },
    )
  }
  const { render } = await import(
    process.env.BENCH_DISTRIBUTION
      ? './.dist-server-package/server.js'
      : './.dist-server/server.js'
  )
  const originalWarn = console.warn
  let markup
  try {
    console.warn = (...args) => {
      report.serverWarnings.push(args.map(String).join(' '))
      originalWarn(...args)
    }
    markup = await render()
  } finally {
    console.warn = originalWarn
  }
  assert.deepEqual(report.serverWarnings, [])
  assert.match(markup, /Ada/)
  const template = await readFile(assets + 'index.html', 'utf8')
  assert.ok(
    template.includes('<!--ssr-->'),
    'Built HTML must retain the server markup placeholder',
  )
  assert.match(markup, /data-variant="filled"/)
  assert.match(markup, /data-tone="accent"/)
  const triggerMarkup = markup.match(
    /<button\b[^>]*\bid="adopt-trigger"[^>]*>/,
  )?.[0]
  assert.ok(triggerMarkup)
  assert.match(triggerMarkup, /data-variant="filled"/)
  assert.match(triggerMarkup, /data-tone="accent"/)
  assert.doesNotMatch(triggerMarkup, /\s(?:variant|tone)=/)
  const classMarkup = markup.match(/<div\b[^>]*\bid="class-root"[^>]*>/)?.[0]
  assert.ok(classMarkup, 'Render the shared class fixture on the server')
  for (const token of [...initialClassTokens, 'ui-card'])
    assert.ok(classMarkup.includes(token))
  assert.doesNotMatch(
    classMarkup,
    /\[object Object\]|undefined|true|false|caller-off/,
  )
  const html = template.replace('<!--ssr-->', markup)
  // Capture the original nodes before the deferred module attaches the client.
  await writeFile(
    assets + 'index.html',
    html.replace(
      '</body>',
      '<script>window.serverNodes = [document.querySelector("#name"), document.querySelector("#rename"), document.querySelector("#adopt-name"), document.querySelector("#adopt-check-input"), document.querySelector("#adopt-table tbody td"), document.querySelector("#adopt-trigger"), document.querySelector("#adopt-layout-header"), document.querySelector("#adopt-layout-draft"), document.querySelector("#adopt-table .table-workspace"), document.querySelector("#adopt-table .table-workspace-controls"), ...document.querySelectorAll("#adopt-filters select, #adopt-filters input"), ...document.querySelectorAll("#adopt-extra-filters input, #adopt-extra-filters select, #adopt-extra-filters [aria-haspopup=listbox]"), ...document.querySelectorAll("#adopt-value-formats [aria-haspopup=listbox]"), ...document.querySelectorAll("#adopt-table .table-filter-actions button, #adopt-table .column-filters input")]; window.serverFileNodes = [...document.querySelectorAll("[data-file-review] input, [data-file-review] button, [data-file-review] .ui-file-input")]; window.serverResizableNodes = [...document.querySelectorAll("[data-resizable-review] .ui-resizable, [data-resizable-review] .ui-resize-handle, [data-resizable-review] input, [data-resizable-review] .table-workspace-controls, [data-resizable-review] .table-workspace-results")]; window.serverAccordionNodes = [...document.querySelectorAll("[data-accordion-review] details, [data-accordion-review] summary, [data-accordion-review] input")]; window.serverBreadcrumbNodes = [...document.querySelectorAll("#breadcrumb-review, #breadcrumb-review a, #breadcrumb-review [aria-current]")]; window.serverTabNodes = [...document.querySelectorAll("[data-tabs-review] [role=tab], [data-tabs-review] [role=tabpanel], [data-tabs-review] input")]; window.serverClassNodes = [...document.querySelectorAll("[data-class-base]")]; window.serverNumberNodes = [...document.querySelectorAll("#number-review input")]; window.serverDisclosureNodes = [...document.querySelectorAll("[data-collapsible-review] details, [data-collapsible-review] summary, [data-collapsible-review] input")];</script></body>',
    ),
  )
  await new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', done)
  })
  browser = await chromium.launch({
    executablePath: process.env.BENCH_EXECUTABLE_PATH,
  })
  report.browser = browser.version()
  const page = await browser.newPage()
  page.on('pageerror', (error) => report.errors.push(error.stack))
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type()))
      report.warnings.push(message.text())
  })
  await Promise.race([
    page
      .goto(`http://127.0.0.1:${server.address().port}`)
      .then(() => page.waitForSelector('html[data-hydrated="true"]')),
    new Promise((_, reject) => page.once('pageerror', reject)),
  ])
  report.cssProvenance = await reviewCssProvenance(
    page,
    `http://127.0.0.1:${server.address().port}`,
  )
  assert.equal(
    await page.evaluate(() =>
      window.serverDisclosureNodes.every(
        (node, index) =>
          node ===
          document.querySelectorAll(
            '[data-collapsible-review] details, [data-collapsible-review] summary, [data-collapsible-review] input',
          )[index],
      ),
    ),
    true,
  )
  assert.equal(
    await page.evaluate(() =>
      window.serverNumberNodes.every(
        (node, index) =>
          node === document.querySelectorAll('#number-review input')[index],
      ),
    ),
    true,
  )
  assert.equal(
    await page.evaluate(
      () =>
        window.serverTabNodes.length > 0 &&
        window.serverTabNodes.every(
          (node, index) =>
            node ===
            document.querySelectorAll(
              '[data-tabs-review] [role=tab], [data-tabs-review] [role=tabpanel], [data-tabs-review] input',
            )[index],
        ),
    ),
    true,
  )
  assert.equal(
    await page.evaluate(
      () =>
        window.serverBreadcrumbNodes.length === 3 &&
        window.serverBreadcrumbNodes.every(
          (node, index) =>
            node ===
            document.querySelectorAll(
              '#breadcrumb-review, #breadcrumb-review a, #breadcrumb-review [aria-current]',
            )[index],
        ),
    ),
    true,
  )
  assert.equal(
    await page.evaluate(
      () =>
        window.serverAccordionNodes.length > 0 &&
        window.serverAccordionNodes.every(
          (node, index) =>
            node ===
            document.querySelectorAll(
              '[data-accordion-review] details, [data-accordion-review] summary, [data-accordion-review] input',
            )[index],
        ),
    ),
    true,
  )
  assert.equal(
    await page.evaluate(
      () =>
        window.serverResizableNodes.length > 0 &&
        window.serverResizableNodes.every(
          (node, index) =>
            node ===
            document.querySelectorAll(
              '[data-resizable-review] .ui-resizable, [data-resizable-review] .ui-resize-handle, [data-resizable-review] input, [data-resizable-review] .table-workspace-controls, [data-resizable-review] .table-workspace-results',
            )[index],
        ),
    ),
    true,
  )
  assert.equal(
    await page.evaluate(
      () =>
        window.serverFileNodes.length > 0 &&
        window.serverFileNodes.every(
          (node, index) =>
            node ===
            document.querySelectorAll(
              '[data-file-review] input, [data-file-review] button, [data-file-review] .ui-file-input',
            )[index],
        ),
    ),
    true,
  )
  await reviewFiles(page, 'hydration')
  report.assertions.push(
    'File selection retains server fields and attaches native picker, drop, validity and reset behavior',
  )
  await reviewResizable(page, 'hydration')
  report.assertions.push(
    'Resizable retains server panes, fields and table nodes across pointer/keyboard sizing and responsive layouts',
  )
  await reviewAccordion(page, 'hydration')
  report.assertions.push(
    'Accordion retains server nodes, drafts, grouped selection and native keyboard behavior',
  )
  await reviewBreadcrumbs(page, 'hydration')
  report.assertions.push(
    'Breadcrumbs preserves navigation, links and current-page nodes during hydration',
  )
  await reviewTabs(page, 'hydration')
  report.assertions.push(
    'Tabs preserves server nodes, labels, selection, keyboard and panel lifetimes',
  )
  await reviewNumber(page, 'hydration')
  report.assertions.push(
    'NumberInput preserves server nodes, finite canonical values, native validity, incomplete drafts and controlled echoes',
  )
  await reviewCollapsible(page, 'hydration')
  report.assertions.push(
    'Collapsible preserves server nodes, keyboard control, focus and retained drafts without callback echoes',
  )
  await reviewStructuredClasses(
    page,
    (value) =>
      page.evaluate(
        (value) => window.hydrationFixture.classes.configure(value),
        value,
      ),
    (enabled, nested) =>
      page.evaluate(
        ({ enabled, nested }) =>
          window.hydrationFixture.classes.configureMap(enabled, nested),
        { enabled, nested },
      ),
  )
  await reviewDynamicIds(page, (suffix) =>
    page.evaluate(
      (suffix) => window.hydrationFixture.classes.configureIds(suffix),
      suffix,
    ),
  )
  assert.equal(
    await page.evaluate(() =>
      window.serverClassNodes.every(
        (node, index) =>
          node === document.querySelectorAll('[data-class-base]')[index],
      ),
    ),
    true,
  )
  await reviewChoiceMetadata(page, (next) =>
    page.evaluate(
      (next) => window.hydrationFixture.classes.configureMetadata(next),
      next,
    ),
  )
  report.assertions.push(
    'Structured classes survive server rendering, hydration and reactive changes without replacing server nodes',
  )
  await expect(page.locator('#adopt-trigger')).toHaveAttribute(
    'data-variant',
    'filled',
  )
  await expect(page.locator('#adopt-trigger')).toHaveAttribute(
    'data-tone',
    'accent',
  )
  await page.setViewportSize({ width: 390, height: 800 })
  const navigationToggle = page.getByRole('button', {
    name: 'Navigation',
    exact: true,
  })
  await navigationToggle.press('Enter')
  await page
    .getByRole('navigation', { name: 'Primary navigation', exact: true })
    .getByRole('textbox', { name: 'Navigation draft', exact: true })
    .fill('Hydrated draft')
  await page.keyboard.press('Escape')
  await expect(navigationToggle).toBeFocused()
  const controlsToggle = page.locator('#adopt-table').getByRole('button', {
    name: 'Table controls',
    exact: true,
  })
  await controlsToggle.press('Enter')
  const controlsClose = page.locator('#adopt-table').getByRole('button', {
    name: 'Close table controls',
    exact: true,
  })
  await expect(controlsClose).toBeVisible()
  await controlsClose.focus()
  await page.keyboard.press('Escape')
  await expect(controlsToggle).toBeFocused()
  report.assertions.push(
    'Table controls retain their server nodes and attach drawer keyboard behavior',
  )
  await page.setViewportSize({ width: 1280, height: 900 })
  const desktopControls = page.locator('#adopt-table').getByRole('button', {
    name: 'Table controls',
    exact: true,
  })
  const controlsPane = page.locator('#adopt-table .table-workspace-controls')
  await expect(desktopControls).toHaveAttribute('aria-expanded', 'true')
  await desktopControls.press('Enter')
  await expect(controlsPane).toBeHidden()
  await expect(desktopControls).toBeFocused()
  await desktopControls.press('Space')
  await expect(controlsPane).toBeVisible()
  report.assertions.push(
    'The hydrated desktop controls collapse and reopen without replacing server nodes',
  )
  assert.equal(
    await page.locator('#adopt-layout-draft').inputValue(),
    'Hydrated draft',
  )
  report.assertions.push(
    'Dashboard header and navigation retain server nodes and attach keyboard behavior across narrow and desktop layouts',
  )
  assert.equal(await page.locator('#name').textContent(), 'Ada')
  assert.equal(
    await page.evaluate(() =>
      window.serverNodes.every(
        (node) =>
          node !== null &&
          node.isConnected &&
          document.getElementById('app').contains(node),
      ),
    ),
    true,
  )
  report.assertions.push(
    'Client attachment preserves native cell and button nodes and initial values',
  )
  await expect(
    page
      .locator('#adopt-formatted-boolean')
      .getByRole('img', { name: 'No', exact: true }),
  ).toHaveCount(1)
  await selectValue(
    choiceControl(page, { name: 'Hydrated boolean format', exact: true }),
    'boolean-text',
  )
  await selectValue(
    choiceControl(page, { name: 'Hydrated date format', exact: true }),
    'date-long',
  )
  await selectValue(
    choiceControl(page, { name: 'Hydrated number format', exact: true }),
    'number-decimal',
  )
  const pendingName = page
    .locator('#adopt-table')
    .getByRole('textbox', { name: 'Name', exact: true })
  const applyTable = page.getByRole('button', {
    name: 'Refresh results',
    exact: true,
  })
  await pendingName.fill('pending')
  await expect(page.locator('#applied-table-filters')).toHaveText('')
  assert.equal(
    await page.evaluate(() => window.hydrationFixture.lifecycle.applyChanges),
    0,
  )
  await applyTable.press('Enter')
  await expect(page.locator('#applied-table-filters')).toHaveText('pending')
  await expect(applyTable).toBeEnabled()
  assert.equal(
    await page.evaluate(() => window.hydrationFixture.lifecycle.applyChanges),
    1,
  )
  await applyTable.press('Enter')
  assert.equal(
    await page.evaluate(() => window.hydrationFixture.lifecycle.applyChanges),
    2,
  )
  await expect(page.locator('#applied-table-filters')).toHaveText('pending')
  report.assertions.push(
    'Hydrated server-owned filters remain pending until one Apply callback accepts their criteria',
  )
  await expect(page.locator('#adopt-formatted-boolean')).toHaveText('No')
  await expect(page.locator('#adopt-formatted-date')).toHaveText(
    'February 29, 2024',
  )
  await expect(page.locator('#adopt-formatted-number')).toHaveText('0.00')
  assert.equal(
    await page.evaluate(() => window.hydrationFixture.lifecycle.formatChanges),
    3,
  )
  report.assertions.push(
    'Formatting preserves server controls and applies display choices after hydration',
  )
  const booleanFilter = page.getByRole('checkbox', {
    name: 'Active filter',
    exact: true,
  })
  const dateStart = page.getByLabel('Created start', { exact: true })
  const dateEnd = page.getByLabel('Created end', { exact: true })
  await expect(booleanFilter).toHaveAttribute('aria-checked', 'false')
  await expect(dateStart).toHaveValue('2026-01-01')
  await expect(dateEnd).toHaveValue('2026-01-02')
  await booleanFilter.press('Space')
  await booleanFilter.press('Space')
  await booleanFilter.press('Space')
  await booleanFilter.press('Space')
  await dateStart.fill('2026-01-02')
  await page
    .getByRole('button', { name: 'Clear created end', exact: true })
    .click()
  await expect(dateEnd).toBeFocused()
  await expect(page.locator('#filter-values')).toHaveText('|2026-01-02|')
  assert.equal(
    await page.evaluate(() => window.hydrationFixture.lifecycle.filterChanges),
    6,
  )
  report.assertions.push(
    'Boolean and date filters preserve server controls and attach one listener per interaction',
  )
  const textMatch = page.getByRole('textbox', {
    name: 'Hydrated text',
    exact: true,
  })
  const statusMatch = page
    .getByRole('button', {
      name: /^Hydrated status(?:\s|$)/,
    })
    .and(page.locator(':not([data-ui-text="system"])'))
  const minimum = page.getByRole('spinbutton', {
    name: 'Hydrated amount minimum',
    exact: true,
  })
  await expect(textMatch).toHaveValue('Ada')
  await expect(statusMatch).toHaveText('Open')
  await expect(minimum).toHaveValue('0')
  await textMatch.fill('Grace')
  await minimum.fill('-3.25')
  await statusMatch.click()
  await page.getByRole('option', { name: 'Closed', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(statusMatch).toBeFocused()
  const values = JSON.parse(
    await page.locator('#extra-filter-values').textContent(),
  )
  assert.deepEqual(values, [
    { operator: 'contains', value: 'Grace' },
    { operator: 'in', values: ['Open', 'Closed'] },
    { operator: 'between', min: -3.25, max: 12.5 },
  ])
  assert.equal(
    await page.evaluate(() => window.hydrationFixture.lifecycle.filterChanges),
    9,
  )
  report.assertions.push(
    'Text, multiple choices, and numeric filters retain server controls and apply each change once',
  )
  await expect(page.locator('#rename')).toHaveAttribute(
    'data-variant',
    'filled',
  )
  await expect(page.locator('#rename')).toHaveAttribute('data-tone', 'accent')
  await page.locator('#rename').click()
  await expect(page.locator('#rename')).toHaveAttribute('data-tone', 'neutral')
  await expect(page.locator('#rename')).toHaveAttribute(
    'data-variant',
    'inverted',
  )
  await page.waitForFunction(
    () => document.getElementById('name').textContent === 'Grace',
  )
  assert.equal(
    await page.evaluate(() =>
      window.serverNodes.every(
        (node) =>
          node !== null &&
          node.isConnected &&
          document.getElementById('app').contains(node),
      ),
    ),
    true,
  )
  report.assertions.push('Hydrated event updates existing native cells')
  const nameInput = page.locator('#adopt-name').and(
    page.getByRole('textbox', {
      name: 'Record name',
      exact: true,
    }),
  )
  const checkbox = page.getByRole('checkbox', {
    name: 'Include record',
    exact: true,
  })
  const table = page.locator('#adopt-table tbody')
  await expect(nameInput).toHaveValue('Grace')
  await expect(checkbox).toBeChecked()
  await expect(table).toContainText('Grace')
  assert.equal(await nameInput.getAttribute('aria-describedby'), 'adopt-help')
  await page.evaluate(() =>
    window.hydrationFixture.configure({
      name: 'Parent update',
      checked: false,
    }),
  )
  await expect(nameInput).toHaveValue('Parent update')
  await expect(checkbox).not.toBeChecked()
  await expect(table).toContainText('Parent update')
  await nameInput.fill('Keyboard value')
  await checkbox.focus()
  await page.keyboard.press('Space')
  await expect(checkbox).toBeChecked()
  await expect(table).toContainText('Keyboard value')
  assert.equal(
    await page.evaluate(() => window.hydrationFixture.lifecycle.changes),
    2,
  )
  await page.getByRole('button', { name: 'View record', exact: true }).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', {
    name: 'Record preview',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Keyboard value')
  await expect(page.locator('#adopt-trigger')).toHaveAttribute(
    'data-variant',
    'inverted',
  )
  await expect(
    dialog.getByRole('button', { name: 'Dismiss', exact: true }),
  ).toHaveAttribute('data-variant', 'ghost')
  await expect(
    dialog.getByRole('button', { name: 'Dismiss', exact: true }),
  ).toHaveAttribute('data-tone', 'accent')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'View record', exact: true }),
  ).toBeFocused()
  assert.equal(
    await page.evaluate(() =>
      window.serverNodes.every((node) => node?.isConnected),
    ),
    true,
  )
  report.assertions.push(
    'Public fields, checkbox and Table retain server nodes, accept parent updates, and attach one listener per interaction',
  )
  report.assertions.push(
    'Hydrated dialog opens from Enter, closes from Escape, and restores trigger focus',
  )
  await pendingName.fill('discarded pending criteria')
  await expect(applyTable).toBeEnabled()
  await page.getByRole('button', { name: 'View record', exact: true }).click()
  await expect(dialog).toBeVisible()

  const cleanup = await page.evaluate(async () => {
    const fixture = window.hydrationFixture
    const filesBefore = fixture.lifecycle.files.read()
    const resizableBefore = fixture.lifecycle.resizable.read()
    const accordionBefore = fixture.lifecycle.accordion.read()
    const numberBefore = fixture.lifecycle.number.read()
    const disclosureBefore = fixture.lifecycle.collapsible.read()
    fixture.dispose()
    for (const node of window.serverFileNodes) {
      if (node.tagName === 'BUTTON' && node.type === 'button') node.click()
      node.dispatchEvent(new Event('change', { bubbles: true }))
    }
    for (const node of window.serverResizableNodes) {
      node.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
      )
      node.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          clientX: 500,
          buttons: 1,
          bubbles: true,
        }),
      )
    }
    window.dispatchEvent(new Event('blur'))
    for (const node of window.serverAccordionNodes) {
      node.click()
      node.dispatchEvent(new Event('toggle'))
      node.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      )
    }
    for (const node of window.serverNumberNodes) {
      node.value = '88'
      node.dispatchEvent(new InputEvent('input', { bubbles: true }))
      node.dispatchEvent(new FocusEvent('blur'))
      node.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    }
    for (const node of window.serverDisclosureNodes) {
      node.click()
      node.dispatchEvent(new Event('toggle'))
    }
    const reads = fixture.lifecycle.reads
    const changes = fixture.lifecycle.changes
    const filterChanges = fixture.lifecycle.filterChanges
    const formatChanges = fixture.lifecycle.formatChanges
    const applyChanges = fixture.lifecycle.applyChanges
    fixture.lifecycle.rename('After disposal')
    window.serverNodes[1].click()
    window.serverNodes[2].value = 'Detached input'
    window.serverNodes[2].dispatchEvent(new Event('input', { bubbles: true }))
    window.serverNodes[3].click()
    window.serverNodes[5].click()
    window.serverNodes[10].value = 'true'
    window.serverNodes[10].dispatchEvent(new Event('change', { bubbles: true }))
    window.serverNodes[11].value = '2026-02-01'
    window.serverNodes[11].dispatchEvent(new Event('input', { bubbles: true }))
    window.serverNodes[23].click()
    window.serverNodes[24].value = 'detached draft'
    window.serverNodes[24].dispatchEvent(new Event('input', { bubbles: true }))
    for (const node of window.serverNodes.slice(20))
      node.dispatchEvent(new Event('change', { bubbles: true }))
    for (const node of window.serverNodes.slice(13))
      node.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(done)),
    )
    return {
      filesBefore,
      filesAfter: fixture.lifecycle.files.read(),
      resizableBefore,
      resizableAfter: fixture.lifecycle.resizable.read(),
      accordionBefore,
      accordionAfter: fixture.lifecycle.accordion.read(),
      numberBefore,
      numberAfter: fixture.lifecycle.number.read(),
      disclosureBefore,
      disclosureAfter: fixture.lifecycle.collapsible.read(),
      cleanups: fixture.lifecycle.cleanups,
      reads,
      afterReads: fixture.lifecycle.reads,
      filterChanges,
      afterFilterChanges: fixture.lifecycle.filterChanges,
      formatChanges,
      afterFormatChanges: fixture.lifecycle.formatChanges,
      applyChanges,
      afterApplyChanges: fixture.lifecycle.applyChanges,
      changes,
      afterChanges: fixture.lifecycle.changes,
      portals: document.querySelectorAll('.ui-dialog-portal').length,
      blocked: document.querySelectorAll(
        '[inert], [aria-hidden="true"]:not(svg):not(path)',
      ).length,
      pointerEvents: document.body.style.pointerEvents,
      remainingNodes: document.querySelectorAll('#name, #rename').length,
      diagnostics: fixture.diagnostics(),
    }
  })
  assert.deepEqual(cleanup.filesAfter, cleanup.filesBefore)
  assert.deepEqual(cleanup.resizableAfter, cleanup.resizableBefore)
  assert.deepEqual(
    cleanup.accordionAfter.requests,
    cleanup.accordionBefore.requests,
  )
  assert.deepEqual(
    cleanup.accordionAfter.multipleRequests,
    cleanup.accordionBefore.multipleRequests,
  )
  assert.equal(cleanup.accordionAfter.cleanups, 1)
  assert.deepEqual(cleanup.numberAfter, cleanup.numberBefore)
  assert.deepEqual(cleanup.disclosureAfter, cleanup.disclosureBefore)
  assert.equal(cleanup.cleanups, 1)
  assert.equal(cleanup.remainingNodes, 0)
  assert.equal(cleanup.afterReads, cleanup.reads)
  assert.equal(cleanup.afterChanges, cleanup.changes)
  assert.equal(cleanup.afterFilterChanges, cleanup.filterChanges)
  assert.equal(cleanup.afterFormatChanges, cleanup.formatChanges)
  assert.equal(cleanup.afterApplyChanges, cleanup.applyChanges)
  assert.equal(cleanup.portals, 0)
  assert.equal(cleanup.blocked, 0)
  assert.equal(cleanup.pointerEvents, '')
  assert.deepEqual(cleanup.diagnostics, [])
  report.diagnostics = cleanup.diagnostics
  report.assertions.push(
    'Hydrated scope disposal stops cell reads after state changes or detached clicks; host removes markup',
  )
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
} catch (error) {
  report.failure = error.stack
  throw error
} finally {
  await browser?.close()
  if (server.listening) await new Promise((done) => server.close(done))
  const output = process.env.BENCH_OUTPUT ?? '/tmp/table-hydration.json'
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
}
