import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { chromium, expect } from '@playwright/test'
import { choiceControl } from '../shared/controls/select-review.mjs'

const hydration = process.argv.includes('--hydration')
const suffix = process.env.BENCH_DEVELOPMENT
  ? '-dev'
  : process.env.BENCH_DISTRIBUTION
    ? '-package'
    : ''
const directory = `.dist${hydration ? '-hydration' : ''}${suffix}`
const assets = fileURLToPath(new URL(`${directory}/`, import.meta.url))
let render
if (hydration) {
  for (const server of [true, false])
    execFileSync(
      'pnpm',
      [
        'exec',
        'vite',
        'build',
        '--config',
        'examples/shell/vite.hydration.config.ts',
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, HYDRATION_SERVER: server ? '1' : '' },
      },
    )
  render = (
    await import(
      pathToFileURL(
        assets.replace(
          `.dist-hydration${suffix}/`,
          `.dist-hydration-server${suffix}/`,
        ) + 'server.js',
      ).href
    )
  ).render
}
const report = { directory, hydration, cases: [], errors: [], warnings: [] }
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://shell.example')
    if (url.pathname === '/favicon.ico') {
      response.writeHead(204).end()
      return
    }
    response.setHeader(
      'Content-Type',
      url.pathname.endsWith('.js')
        ? 'text/javascript'
        : url.pathname.endsWith('.css')
          ? 'text/css'
          : 'text/html',
    )
    if (url.pathname === '/' && render) {
      const template = await readFile(assets + 'hydration.html', 'utf8')
      response.end(
        template.replace(
          '<div id="root"></div>',
          `<div id="root" data-ssr="true">${await render(url.href)}</div><script>window.shellServerNodes={shells:Array.from(document.querySelectorAll('.ui-dashboard'),node=>({node,id:node.id,heading:node.querySelector('h1'),headingId:node.querySelector('h1')?.id,navigationId:node.querySelector('.ui-dashboard-navigation')?.id})),heading:document.querySelector('h1'),input:document.querySelector('[data-generator-field="name"] input')};if(new URLSearchParams(location.search).has('prefocus'))window.shellServerNodes.input?.focus()</script>`,
        ),
      )
    } else
      response.end(
        await readFile(
          assets +
            (url.pathname === '/' ? 'index.html' : url.pathname.slice(1)),
        ),
      )
  } catch (error) {
    response.writeHead(500).end(String(error))
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
page.setDefaultTimeout(8000)
page.on('pageerror', (error) => report.errors.push(String(error)))
page.on('console', (message) => {
  if (
    ['error', 'warning'].includes(message.type()) &&
    !message.text().startsWith('[HOT_SCOPE_TIME]')
  )
    report.warnings.push(message.text())
})
const settle = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )
async function run(name, fn) {
  await fn()
  report.cases.push(name)
  console.log('PASS', name)
}
const base =
  process.env.BENCH_URL ?? `http://127.0.0.1:${server.address().port}/`
const heading = page.getByRole('heading', { level: 1 })
const nav = page.getByRole('navigation', {
  name: 'Primary navigation',
  exact: true,
})
const menu = (name) => nav.getByRole('link', { name, exact: true })
const audience = choiceControl(page, { name: 'Audience', exact: true })
async function choose(name) {
  await audience.click()
  await settle()
  await page.getByRole('option', { name, exact: true }).click()
  await settle()
}
let failure
try {
  await page.goto(
    base + '?qualification=1&page=record&prefocus=1&source=direct#details',
  )
  await expect(heading).toHaveText('Record detail')
  await settle()
  await run('server nodes and initial focus survive hydration', async () => {
    if (hydration)
      assert.ok(
        await page.evaluate(
          () =>
            window.shellServerNodes.heading === document.querySelector('h1') &&
            window.shellServerNodes.input ===
              document.querySelector('[data-generator-field="name"] input') &&
            document.activeElement === window.shellServerNodes.input,
        ),
      )
    else await expect(heading).not.toBeFocused()
    assert.equal(await page.locator('main').count(), 1)
    const href = new URL(await menu('Overview').getAttribute('href'), base)
    assert.equal(href.searchParams.get('source'), 'direct')
    assert.equal(href.hash, '#details')
    await expect(
      page.getByRole('navigation', { name: 'Breadcrumbs' }),
    ).toContainText('Record detail')
  })
  await run(
    'same-route metadata updates retain drafts and page owners',
    async () => {
      const input = page.getByRole('textbox', { name: 'Name', exact: true })
      await input.fill('Retained draft')
      await input.evaluate((node) => {
        window.shellInput = node
      })
      const before = await page.evaluate(() => ({
        ...window.shellFixture.lifecycle,
      }))
      await page.evaluate(() => window.shellFixture.refreshMetadata())
      await settle()
      await expect(input).toHaveValue('Retained draft')
      await expect(input).toBeFocused()
      assert.ok(await input.evaluate((node) => node === window.shellInput))
      assert.deepEqual(
        await page.evaluate(() => window.shellFixture.lifecycle),
        before,
      )
    },
  )
  await run('rejected requests preserve route and edited values', async () => {
    await page.evaluate(() => window.shellFixture.reject(true))
    await menu('Overview').click()
    await expect(heading).toHaveText('Record detail')
    await expect(
      page.getByRole('textbox', { name: 'Name', exact: true }),
    ).toHaveValue('Retained draft')
    await choose('Research')
    await expect(audience).toContainText('Operations')
    await expect(heading).toHaveText('Record detail')
    assert.deepEqual(await page.evaluate(() => window.shellFixture.requests), [
      { kind: 'route', id: 'overview' },
      { kind: 'audience', id: 'research' },
    ])
    await page.evaluate(() => window.shellFixture.reject(false))
  })
  await run(
    'native links preserve modified and already prevented clicks',
    async () => {
      const href = await menu('Overview').getAttribute('href')
      assert.equal(new URL(href, base).searchParams.get('page'), 'overview')
      const before = await page.evaluate(
        () => window.shellFixture.requests.length,
      )
      await menu('Overview').evaluate((node) => {
        for (const key of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
          const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            [key]: true,
          })
          let prevented
          node.addEventListener(
            'click',
            (received) => {
              prevented = received.defaultPrevented
              received.preventDefault()
            },
            { once: true },
          )
          node.dispatchEvent(event)
          if (prevented) throw new Error('Modified click was prevented')
        }
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        })
        event.preventDefault()
        node.dispatchEvent(event)
      })
      assert.equal(
        await page.evaluate(() => window.shellFixture.requests.length),
        before,
      )
    },
  )
  await run(
    'accepted route changes focus the heading and preserve Back and Forward',
    async () => {
      await menu('Overview').click()
      await expect(heading).toHaveText('Overview')
      await expect(heading).toBeFocused()
      await expect(page).toHaveURL(/page=overview/)
      await expect(page).toHaveTitle('Overview | Workspace')
      await page.goBack()
      await expect(heading).toHaveText('Record detail')
      await expect(heading).toBeFocused()
      await expect(
        page.getByRole('textbox', { name: 'Name', exact: true }),
      ).toHaveValue('Retained draft')
      await page.goForward()
      await expect(heading).toHaveText('Overview')
      await expect(heading).toBeFocused()
    },
  )
  await run(
    'two audiences expose all six routes with one request per activation',
    async () => {
      await menu('Records').click()
      await expect(page.getByRole('table')).toBeVisible()
      await expect(
        page.getByRole('table').getByRole('img', { name: 'Yes', exact: true }),
      ).toHaveCount(1)
      await expect(
        page.getByRole('table').getByRole('img', { name: 'No', exact: true }),
      ).toHaveCount(1)
      await menu('Record detail').click()
      await expect(page.getByRole('form')).toBeVisible()
      await menu('Overview').click()
      const before = await page.evaluate(
        () => window.shellFixture.requests.length,
      )
      await choose('Research')
      await expect(heading).toHaveText('Observations')
      await expect(heading).toBeFocused()
      assert.equal(
        await page.evaluate(() => window.shellFixture.requests.length),
        before + 1,
      )
      await expect(menu('Observations')).toHaveAttribute('aria-current', 'page')
      await expect(menu('Records')).toHaveCount(0)
      await menu('Observation detail').click()
      await expect(heading).toHaveText('Observation detail')
      await page
        .getByRole('navigation', { name: 'Breadcrumbs' })
        .getByRole('link', { name: 'Observations', exact: true })
        .click()
      await expect(heading).toHaveText('Observations')
      await menu('Findings').click()
      await expect(heading).toHaveText('Findings')
      await expect(heading).toBeFocused()
    },
  )
  await run(
    'table and standalone form fill the available main panel',
    async () => {
      await menu('Observations').click()
      const geometry = await page.evaluate(() => {
        const main = document.querySelector('main').getBoundingClientRect()
        const table = document
          .querySelector('.table-workspace')
          .getBoundingClientRect()
        return {
          main: { width: main.width, height: main.height },
          table: { width: table.width, height: table.height },
          overflow: document.documentElement.scrollWidth > innerWidth,
        }
      })
      assert.ok(geometry.table.width >= geometry.main.width - 2)
      assert.ok(geometry.table.height >= geometry.main.height - 2)
      assert.equal(geometry.overflow, false)
      await page.screenshot({ path: '/tmp/wfe-shell-wide.png', fullPage: true })
      await menu('Observation detail').click()
    },
  )
  await run(
    'narrow drawer preserves rejected navigation then closes and focuses accepted navigation',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await settle()
      const toggle = page.getByRole('button', {
        name: 'Navigation',
        exact: true,
      })
      await expect(nav).not.toBeVisible()
      await toggle.click()
      await expect(nav).toBeVisible()
      await page.evaluate(() => window.shellFixture.reject(true))
      await menu('Findings').click()
      await expect(nav).toBeVisible()
      await expect(menu('Findings')).toBeFocused()
      await expect(heading).toHaveText('Observation detail')
      await page.evaluate(() => window.shellFixture.reject(false))
      await menu('Findings').click()
      await expect(heading).toHaveText('Findings')
      await expect(nav).not.toBeVisible()
      await expect(heading).toBeFocused()
      await toggle.click()
      await menu('Findings').click()
      await expect(nav).not.toBeVisible()
      await expect(heading).toBeFocused()
      await toggle.click()
      await menu('Findings').press('Escape')
      await expect(nav).not.toBeVisible()
      await expect(toggle).toBeFocused()
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      await page.screenshot({
        path: '/tmp/wfe-shell-phone.png',
        fullPage: true,
      })
    },
  )
  await run(
    'pending focus and late application callbacks stay inert after disposal',
    async () => {
      await page.evaluate(() => {
        const fixture = window.shellFixture
        fixture.accept('observations')
        fixture.stop()
        fixture.accept('findings')
      })
      await settle()
      await expect(page.locator('#root')).toBeEmpty()
      const lifecycle = await page.evaluate(() => window.shellFixture.lifecycle)
      assert.equal(lifecycle.mounts, lifecycle.disposals)
      assert.equal(lifecycle.listeners, 1)
      assert.equal(lifecycle.removals, 1)
      const before = await page.evaluate(() => ({
        current: window.shellFixture.current(),
        requests: window.shellFixture.requests.length,
        popEvents: window.shellFixture.lifecycle.popEvents,
      }))
      await page.evaluate(() =>
        window.dispatchEvent(new PopStateEvent('popstate')),
      )
      assert.deepEqual(
        await page.evaluate(() => ({
          current: window.shellFixture.current(),
          requests: window.shellFixture.requests.length,
          popEvents: window.shellFixture.lifecycle.popEvents,
        })),
        before,
      )
    },
  )
  await run(
    'custom header and navigation hydrate with application-owned content',
    async () => {
      await page.setViewportSize({ width: 1100, height: 800 })
      await page.goto(base + '?qualification=1&custom-chrome=1&page=record')
      await expect(heading).toHaveText('Custom workspace')
      await expect(
        page.getByRole('textbox', { name: 'Workspace note' }),
      ).toBeVisible()
      await expect(
        page.getByRole('navigation', { name: 'Breadcrumbs' }),
      ).toHaveCount(0)
      await expect(audience).toHaveCount(0)
      await expect(nav.getByLabel('Navigation state')).toHaveText(
        'desktop / expanded',
      )
      await settle()
      if (hydration)
        assert.ok(
          await page.evaluate(
            () =>
              window.shellServerNodes.heading === document.querySelector('h1'),
          ),
        )
    },
  )
  await run(
    'header overrides retain page drafts and leave route focus with the application',
    async () => {
      const input = page.getByRole('textbox', { name: 'Name', exact: true })
      await input.fill('Chrome-independent draft')
      await input.evaluate((node) => {
        window.shellInput = node
      })
      await page.evaluate(() => window.shellFixture.setHeader(false))
      await expect(heading).toHaveText('Record detail')
      await expect(audience).toBeVisible()
      await expect(input).toBeFocused()
      await heading.evaluate((node) => {
        window.staleShellHeading = node
      })
      await page.evaluate(() => window.shellFixture.setHeader(true))
      await expect(heading).toHaveText('Custom workspace')
      assert.ok(await input.evaluate((node) => node === window.shellInput))
      await expect(input).toHaveValue('Chrome-independent draft')
      const note = page.getByRole('textbox', { name: 'Workspace note' })
      await note.fill('Retained header focus')
      await page.evaluate(() => window.shellFixture.accept('overview'))
      await expect(page.getByRole('main')).toHaveAccessibleName('Overview')
      await settle()
      await expect(note).toBeFocused()
      await expect(note).toHaveValue('Retained header focus')
      assert.ok(
        await page.evaluate(() => !window.staleShellHeading.isConnected),
      )
    },
  )
  await run(
    'navigation overrides replace defaults and false removes the pane and its owner',
    async () => {
      const before = await page.evaluate(() => ({
        ...window.shellFixture.chromeLifecycle,
      }))
      await page.evaluate(() => window.shellFixture.setNavigation('none'))
      await expect(nav).toHaveCount(0)
      await expect(
        page.getByRole('button', { name: 'Navigation', exact: true }),
      ).toHaveCount(0)
      assert.equal(
        await page.evaluate(
          () => window.shellFixture.chromeLifecycle.navigationDisposals,
        ),
        before.navigationDisposals + 1,
      )
      await page.evaluate(() => window.shellFixture.accept('record'))
      await settle()
      assert.equal(
        await page.evaluate(
          () => window.shellFixture.chromeLifecycle.navigationMounts,
        ),
        before.navigationMounts,
      )
      await page.evaluate(() => window.shellFixture.setNavigation('default'))
      await expect(menu('Records')).toBeVisible()
      await expect(
        nav.getByRole('button', { name: 'Open overview' }),
      ).toHaveCount(0)
      await page.evaluate(() => window.shellFixture.setNavigation('custom'))
      await expect(
        nav.getByRole('button', { name: 'Open overview' }),
      ).toBeVisible()
      await expect(menu('Records')).toHaveCount(0)
      assert.equal(
        await page.evaluate(
          () => window.shellFixture.chromeLifecycle.navigationMounts,
        ),
        before.navigationMounts + 1,
      )
    },
  )
  await run(
    'custom navigation receives live mobile controls and closes only on accepted route changes',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      const toggle = page.getByRole('button', {
        name: 'Navigation',
        exact: true,
      })
      await toggle.click()
      await expect(nav).toBeVisible()
      await expect(nav.getByLabel('Navigation state')).toHaveText(
        'mobile / expanded',
      )
      await nav.getByRole('button', { name: 'Close custom navigation' }).click()
      await expect(nav).not.toBeVisible()
      await toggle.click()
      await page.evaluate(() => window.shellFixture.reject(true))
      await nav.getByRole('button', { name: 'Open overview' }).click()
      await expect(nav).toBeVisible()
      await expect(page.getByRole('main')).toHaveAccessibleName('Record detail')
      await page.evaluate(() => window.shellFixture.reject(false))
      await nav.getByRole('button', { name: 'Open overview' }).click()
      await expect(page.getByRole('main')).toHaveAccessibleName('Overview')
      await expect(nav).not.toBeVisible()
      await expect(heading).not.toBeFocused()
      await toggle.click()
      await page.evaluate(() => window.shellFixture.setNavigation('none'))
      await expect(nav).toHaveCount(0)
      await expect(toggle).toHaveCount(0)
      await page.evaluate(() => window.shellFixture.setNavigation('custom'))
      await expect(nav).not.toBeVisible()
      await toggle.click()
      await expect(nav).toBeVisible()
      await page.evaluate(() => window.shellFixture.stop())
      await expect(page.locator('#root')).toBeEmpty()
      const lifecycle = await page.evaluate(
        () => window.shellFixture.chromeLifecycle,
      )
      assert.equal(lifecycle.navigationMounts, lifecycle.navigationDisposals)
    },
  )
  await run(
    'reused shell descriptions retain unique DOM identities through hydration and metadata updates',
    async () => {
      await page.setViewportSize({ width: 1100, height: 800 })
      await page.goto(base + '?qualification=1&duplicate-shells=1&page=record')
      await expect(page.locator('.ui-dashboard')).toHaveCount(2)
      await settle()
      const initial = await page.evaluate(() => {
        const shells = [...document.querySelectorAll('.ui-dashboard')]
        const ids = [...document.querySelectorAll('#root [id]')].map(
          (node) => node.id,
        )
        return {
          unique: new Set(ids).size === ids.length,
          valid: ids.every((id) => id.length > 0 && !/\s/.test(id)),
          identities: shells.map((node) => ({
            id: node.id,
            heading: node.querySelector('h1').id,
            navigation: node.querySelector('.ui-dashboard-navigation').id,
          })),
          navigationOwned: shells.every((node) => {
            const toggle = node.querySelector('.ui-dashboard-toggle')
            return node.contains(
              document.getElementById(toggle.getAttribute('aria-controls')),
            )
          }),
        }
      })
      assert.equal(initial.unique, true)
      assert.equal(initial.valid, true)
      assert.equal(initial.navigationOwned, true)
      if (hydration)
        assert.ok(
          await page.evaluate(
            () =>
              window.shellServerNodes.shells.length === 2 &&
              window.shellServerNodes.shells.every((entry, index) => {
                const node = document.querySelectorAll('.ui-dashboard')[index]
                return (
                  entry.node === node &&
                  entry.id === node.id &&
                  entry.heading === node.querySelector('h1') &&
                  entry.headingId === node.querySelector('h1').id &&
                  entry.navigationId ===
                    node.querySelector('.ui-dashboard-navigation').id
                )
              }),
          ),
        )
      await page.evaluate(() => window.shellFixture.refreshMetadata())
      await settle()
      assert.deepEqual(
        await page.locator('.ui-dashboard').evaluateAll((nodes) =>
          nodes.map((node) => ({
            id: node.id,
            heading: node.querySelector('h1').id,
            navigation: node.querySelector('.ui-dashboard-navigation').id,
          })),
        ),
        initial.identities,
      )
      await page.evaluate(() => window.shellFixture.stop())
      await expect(page.locator('#root')).toBeEmpty()
    },
  )
  await run(
    'translated shell messages hydrate and change without replacing focused drafts or routing',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(base + '?qualification=1&page=record&messages=1')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Record detail',
      )
      const input = page.getByRole('textbox', { name: 'Name', exact: true })
      const audience = page.getByRole('button', { name: /Audiencia/ })
      await expect(audience).toBeVisible()
      await expect(
        page.getByRole('navigation', { name: 'Ruta', exact: true }),
      ).toBeVisible()
      if (hydration)
        assert.equal(
          await input.evaluate(
            (node) => node === window.shellServerNodes.input,
          ),
          true,
        )
      const original = await input.elementHandle()
      await input.fill('Translated draft')
      const before = await page.evaluate(() => ({
        requests: [...window.shellFixture.requests],
        lifecycle: { ...window.shellFixture.lifecycle },
      }))
      await page.evaluate(() =>
        window.shellFixture.setMessages({
          audience: 'Public',
          breadcrumbs: 'Chemin',
          navigationLabel: 'Menu traduit',
          toggleLabel: 'Ouvrir',
          closeLabel: 'Fermer',
        }),
      )
      await expect(page.getByRole('button', { name: /Public/ })).toBeVisible()
      await expect(input).toBeFocused()
      await expect(input).toHaveValue('Translated draft')
      assert.equal(await original.evaluate((node) => node.isConnected), true)
      assert.deepEqual(
        await page.evaluate(() => ({
          requests: [...window.shellFixture.requests],
          lifecycle: { ...window.shellFixture.lifecycle },
        })),
        before,
      )
      await page.setViewportSize({ width: 390, height: 844 })
      const toggle = page.getByRole('button', { name: 'Ouvrir', exact: true })
      await toggle.click()
      await expect(
        page.getByRole('navigation', { name: 'Menu traduit', exact: true }),
      ).toBeVisible()
      await page
        .getByRole('link', { name: 'Overview', exact: true })
        .press('Escape')
      await expect(toggle).toBeFocused()
      await page.evaluate(() => window.shellFixture.stop())
      await expect(page.locator('#root')).toBeEmpty()
      await original.dispose()
    },
  )
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
} catch (error) {
  report.failure = String(error)
  failure = error
} finally {
  try {
    await writeFile(
      '/tmp/wfe-shell-last-dom.txt',
      await page.locator('body').ariaSnapshot(),
    )
    await mkdir('test-results/shell', { recursive: true })
    await writeFile(
      process.env.BENCH_OUTPUT ?? `test-results/shell/${directory}.json`,
      JSON.stringify(report, null, 2),
    )
  } catch (error) {
    failure ??= error
    console.error('Shell diagnostics failed:', error)
  } finally {
    try {
      await browser.close()
    } catch (error) {
      failure ??= error
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  }
}

if (failure) throw failure
