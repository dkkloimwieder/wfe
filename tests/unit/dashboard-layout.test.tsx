import { cleanup, fireEvent, render, within } from '@solidjs/testing-library'
import { Show, createContext, createSignal, flush, useContext } from 'solid-js'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ActivityList, DashboardHeaderActions, TileRow } from '@wfe/components'
import {
  DashboardGrid,
  DashboardPanel,
  DashboardShell,
  EntryPanel,
} from '@wfe/components/layout'
import type { ActivityListItem, EntryPanelProps } from '@wfe/components/layout'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('shell waits for the first observed layout before measuring its width', () => {
  let deliver: ((entry: ResizeObserverEntry) => void) | undefined
  const observed = vi.fn()
  const disconnected = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        deliver = (entry) => callback([entry], this)
      }
      observe = observed
      unobserve = vi.fn()
      disconnect = disconnected
    },
  )
  using measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
  const h = render(() => <DashboardShell title="Shell">Content</DashboardShell>)
  const shell = h.container.firstElementChild!
  expect(observed).toHaveBeenCalledWith(shell, { box: 'border-box' })
  expect(measure).not.toHaveBeenCalled()
  expect(shell.hasAttribute('data-ui-responsive-ready')).toBe(false)

  deliver?.({
    target: shell,
    borderBoxSize: [{ inlineSize: 500, blockSize: 400 }],
    contentBoxSize: [],
    contentRect: new DOMRect(),
    devicePixelContentBoxSize: [],
  })
  expect(measure).not.toHaveBeenCalled()
  expect(shell.hasAttribute('data-ui-responsive-ready')).toBe(true)
  expect(shell.hasAttribute('data-navigation-drawer')).toBe(true)
  h.unmount()
  expect(disconnected).toHaveBeenCalledOnce()
})

test('shell resolves media breakpoints without a ResizeObserver', () => {
  vi.stubGlobal('ResizeObserver', undefined)
  const h = render(() => <DashboardShell title="Shell">Content</DashboardShell>)
  expect(
    h.container.firstElementChild?.hasAttribute('data-ui-responsive-ready'),
  ).toBe(true)
})

test('shell titles, custom headers and actions stay reactive independently of main padding', () => {
  const [title, setTitle] = createSignal('Dashboard')
  const [flushMain, setFlushMain] = createSignal(false)
  const [showAction, setShowAction] = createSignal(true)
  const h = render(() => (
    <DashboardShell
      title={title()}
      header={<span>Custom header</span>}
      headerActions={showAction() && <button>Export</button>}
      mainPadding={flushMain() ? 'none' : undefined}
    >
      <input aria-label="Draft" />
    </DashboardShell>
  ))
  const header = within(h.getByRole('banner'))
  const heading = header.getByRole('heading', { level: 1, name: 'Dashboard' })
  expect(heading.tabIndex).toBe(-1)
  expect(header.getByText('Custom header')).toBeTruthy()
  expect(header.getByRole('button', { name: 'Export' })).toBeTruthy()
  const draft = h.getByRole('textbox', { name: 'Draft' })
  draft.focus()
  setTitle('Records')
  setFlushMain(true)
  setShowAction(false)
  flush()
  expect(header.getByRole('heading', { name: 'Records' })).toBe(heading)
  expect(header.queryByRole('button', { name: 'Export' })).toBeNull()
  expect(h.container.firstElementChild?.getAttribute('data-main-padding')).toBe(
    'none',
  )
  expect(h.container.firstElementChild?.getAttribute('data-scroll')).toBe(
    'main',
  )
  expect(document.activeElement).toBe(draft)
})

test('nested actions use the nearest shell, keep page context, and leave when the page unmounts', () => {
  const PageContext = createContext('Fallback')
  const [showPage, setShowPage] = createSignal(true)
  const [showInline, setShowInline] = createSignal(true)
  const onClick = vi.fn()
  function PageAction() {
    const label = useContext(PageContext)
    return (
      <button
        onClick={() => {
          onClick(label)
        }}
      >
        {label}
      </button>
    )
  }
  const h = render(() => (
    <>
      <DashboardShell id="outer-shell" title="Outer">
        <DashboardHeaderActions>
          <button>Outer action</button>
        </DashboardHeaderActions>
        <DashboardShell id="inner-shell" title="Inner" mainAs="section">
          <Show when={showPage()}>
            <PageContext value="Inner page action">
              <DashboardHeaderActions>
                <PageAction />
              </DashboardHeaderActions>
            </PageContext>
          </Show>
        </DashboardShell>
      </DashboardShell>
      <DashboardHeaderActions>
        {showInline() && <button>Inline action</button>}
      </DashboardHeaderActions>
    </>
  ))
  flush()
  const outer = h.getByRole('button', { name: 'Outer action' })
  const inner = h.getByRole('button', { name: 'Inner page action' })
  expect(outer.closest('header')?.parentElement?.id).toBe('outer-shell')
  expect(inner.closest('header')?.parentElement?.id).toBe('inner-shell')
  expect(
    h.getByRole('button', { name: 'Inline action' }).closest('header'),
  ).toBe(null)
  setShowInline(false)
  flush()
  expect(h.queryByRole('button', { name: 'Inline action' })).toBeNull()
  fireEvent.click(inner)
  expect(onClick).toHaveBeenCalledWith('Inner page action')
  setShowPage(false)
  flush()
  expect(inner.isConnected).toBe(false)
  expect(outer.isConnected).toBe(true)
  setShowPage(true)
  flush()
  expect(h.getAllByRole('button', { name: 'Inner page action' })).toHaveLength(
    1,
  )
  h.unmount()
  expect(h.queryByRole('button', { name: 'Inner page action' })).toBeNull()
})

test('panel metadata labels the panel and the footer is optional', () => {
  const [visible, setVisible] = createSignal(true)
  const h = render(() => (
    <DashboardPanel
      role="group"
      title="History"
      titleAs="h3"
      description="Three recent deliveries."
      headerEnd={<span>Connected</span>}
      footer={visible() && <button>Clear</button>}
    >
      <input aria-label="Draft" />
    </DashboardPanel>
  ))
  const panel = h.getByRole('group', { name: 'History' })
  const heading = within(panel).getByRole('heading', { level: 3 })
  const description = within(panel).getByText('Three recent deliveries.')
  const end = within(panel).getByText('Connected')
  const draft = within(panel).getByRole('textbox')
  const action = within(panel).getByRole('button', { name: 'Clear' })
  expect(panel.getAttribute('aria-labelledby')).toBe(heading.id)
  expect(panel.getAttribute('aria-describedby')).toBe(description.id)
  expect(end.closest('.ui-dashboard-panel-header')).toBe(
    heading.closest('.ui-dashboard-panel-header'),
  )
  expect(panel.lastElementChild?.contains(action)).toBe(true)
  draft.focus()
  setVisible(false)
  flush()
  expect(panel.querySelector('.ui-dashboard-panel-footer')).toBeNull()
  expect(panel.lastElementChild).toBe(draft)
  expect(document.activeElement).toBe(draft)
})

test('activity items keep input order, timestamps, and optional tone', () => {
  const first: ActivityListItem = {
    actor: 'Alex',
    time: '10:23 UTC',
    dateTime: '10:23Z',
    text: 'Enabled the endpoint.',
  }
  const second: ActivityListItem = {
    actor: 'Billing service',
    time: '10:25 UTC',
    text: <strong>Delivery failed.</strong>,
    tone: 'error',
  }
  const [items, setItems] = createSignal([first, second])
  const h = render(() => <ActivityList items={items()} aria-label="History" />)
  const list = within(h.getByRole('list', { name: 'History' }))
  const rows = list.getAllByRole('listitem')
  expect(rows[0]?.querySelector('time')?.getAttribute('datetime')).toBe(
    '10:23Z',
  )
  expect(rows[0]?.querySelector('[data-tone]')).toBeNull()
  expect(rows[1]?.querySelector('time')).toBeNull()
  expect(within(rows[1]!).getByText('10:25 UTC')).toBeTruthy()
  expect(rows[1]?.querySelector('[data-tone="error"]')?.textContent).toBe(
    'Billing service',
  )
  expect(rows[1]?.querySelector('strong')?.textContent).toBe('Delivery failed.')
  setItems([second, first])
  flush()
  expect(list.getAllByRole('listitem')).toEqual([rows[1], rows[0]])
  setItems([])
  flush()
  expect(list.queryByRole('listitem')).toBeNull()
})

test('DashboardGrid accepts reactive minimum widths and layout gaps with caller styles', () => {
  const [width, setWidth] = createSignal<string | undefined>('22rem')
  const h = render(() => (
    <DashboardGrid
      role="group"
      minPanelWidth={width()}
      gap="layout"
      style="align-items: start"
    >
      <span>Panel</span>
    </DashboardGrid>
  ))
  const grid = h.getByRole('group')
  expect(grid.getAttribute('data-gap')).toBe('layout')
  expect(grid.style.getPropertyValue('--ui-panel-min-width')).toBe('22rem')
  expect(grid.style.alignItems).toBe('start')
  setWidth('27rem')
  flush()
  expect(grid.style.getPropertyValue('--ui-panel-min-width')).toBe('27rem')
  setWidth(undefined)
  flush()
  expect(grid.style.getPropertyValue('--ui-panel-min-width')).toBe('')
  expect(grid.style.alignItems).toBe('start')
})

test('TileRow updates responsive columns without remounting focused tiles', () => {
  const [wide, setWide] = createSignal(4)
  const h = render(() => (
    <TileRow columns={{ narrow: 1, medium: 2, wide: wide() }}>
      <button>Tile</button>
    </TileRow>
  ))
  const tile = h.getByRole('button', { name: 'Tile' })
  const columns = tile.parentElement!
  expect(columns.style.getPropertyValue('--_ui-grid-narrow-columns')).toBe('1')
  expect(columns.style.getPropertyValue('--_ui-grid-medium-columns')).toBe('2')
  expect(columns.style.getPropertyValue('--_ui-grid-wide-columns')).toBe('4')
  tile.focus()
  setWide(3)
  flush()
  expect(columns.style.getPropertyValue('--_ui-grid-wide-columns')).toBe('3')
  expect(document.activeElement).toBe(tile)
})

test('EntryPanel preserves its surface and contents across sizes', () => {
  const [size, setSize] = createSignal<EntryPanelProps['size']>()
  const h = render(() => (
    <EntryPanel size={size()} role="group" aria-label="Endpoint">
      <input aria-label="URL" />
    </EntryPanel>
  ))
  const panel = h.getByRole('group', { name: 'Endpoint' })
  const input = h.getByRole('textbox', { name: 'URL' })
  expect(panel.getAttribute('data-size')).toBe('viewport')
  input.focus()
  setSize('content')
  flush()
  expect(panel.getAttribute('data-size')).toBe('content')
  expect(document.activeElement).toBe(input)
  expect(
    input.parentElement?.classList.contains('ui-entry-panel-surface'),
  ).toBe(true)
  setSize('container')
  flush()
  expect(panel.getAttribute('data-size')).toBe('container')
  expect(document.activeElement).toBe(input)
})

test('EntryPanel uses a semantic heading as its group name', () => {
  const [title, setTitle] = createSignal('Billing')
  const h = render(() => (
    <>
      <EntryPanel size="content" role="group" title={title()} titleAs="h3">
        <button>Continue</button>
      </EntryPanel>
      <EntryPanel title="Review">Record details</EntryPanel>
    </>
  ))
  const group = h.getByRole('group', { name: 'Billing' })
  expect(
    group.contains(h.getByRole('heading', { name: 'Billing', level: 3 })),
  ).toBe(true)
  expect(group.contains(h.getByRole('button', { name: 'Continue' }))).toBe(true)
  expect(h.getByRole('heading', { name: 'Review', level: 2 })).toBeDefined()
  setTitle('Invoicing')
  flush()
  expect(h.getByRole('group', { name: 'Invoicing' })).toBe(group)
  expect(group.hasAttribute('title')).toBe(false)
})
