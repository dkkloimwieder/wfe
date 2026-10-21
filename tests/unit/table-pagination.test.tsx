import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush, onCleanup } from 'solid-js'
import {
  createTable,
  TablePagination,
  TableWorkspace,
} from '@wfe/components/table'
import { TableView } from '@wfe/generator'

beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('page requests use current availability and callbacks without changing accepted status', () => {
  const [pending, setPending] = createSignal(false)
  const [previous, setPrevious] = createSignal(false)
  const [next, setNext] = createSignal(true)
  const [version, setVersion] = createSignal(1)
  const [status, setStatus] = createSignal('First page')
  const calls: string[] = []
  const h = render(() => (
    <TablePagination
      hasPrevious={previous()}
      hasNext={next()}
      pending={pending()}
      status={status()}
      onPrevious={() => calls.push(`previous:${version()}`)}
      onNext={() => calls.push(`next:${version()}`)}
    />
  ))
  const prev = h.getByRole('button', {
    name: 'Previous page',
  }) as HTMLButtonElement
  const forward = h.getByRole('button', {
    name: 'Next page',
  }) as HTMLButtonElement
  expect(prev.disabled).toBe(true)
  fireEvent.click(prev)
  fireEvent.click(forward)
  expect(calls).toEqual(['next:1'])
  expect(h.getByRole('status').textContent).toBe('First page')
  forward.focus()
  setVersion(2)
  setPrevious(true)
  setStatus('Second page')
  flush()
  expect(h.getByRole('button', { name: 'Next page' })).toBe(forward)
  expect(document.activeElement === forward).toBe(true)
  fireEvent.click(prev)
  expect(calls).toEqual(['next:1', 'previous:2'])
  setPending(true)
  flush()
  fireEvent.click(prev)
  fireEvent.click(forward)
  expect(calls).toHaveLength(2)
  expect(forward.disabled).toBe(true)
  setPending(false)
  setNext(false)
  flush()
  fireEvent.click(forward)
  expect(calls).toHaveLength(2)
  fireEvent.click(prev)
  expect(calls).toHaveLength(3)
  h.unmount()
  fireEvent.click(prev)
  expect(calls).toHaveLength(3)
})

test('generated pagination never slices accepted rows or refreshes filters', () => {
  const [ids, setIds] = createSignal(['a', 'b', 'c'])
  const [totalRows, setTotalRows] = createSignal<number | undefined>(12)
  const next = vi.fn(),
    refresh = vi.fn()
  const h = render(() => {
    const table = createTable({
      source: { ids, get: (id) => ({ name: id }) },
      columns: [{ id: 'name', accessorKey: 'name' }],
      manualProcessing: true,
    })
    return (
      <TableView
        description={{ id: 'paged', columns: { name: {} } }}
        bindings={{
          table,
          onApplyFilters: refresh,
          pagination: {
            hasPrevious: false,
            hasNext: true,
            onPrevious() {},
            onNext: next,
            get totalRows() {
              return totalRows()
            },
            status: 'More records available',
            pageSize: { value: 2, options: [2, 5], onValueChange() {} },
          },
        }}
      />
    )
  })
  const forward = h.getByRole('button', { name: 'Next page' })
  expect(forward.closest('[role=status]')).toBeNull()
  const summary = () =>
    h.container.querySelector('.table-workspace-summary > [role=status]')!
      .textContent
  expect(summary()).toBe('3/12')
  setTotalRows(undefined)
  flush()
  expect(summary()).toBe('3')
  expect(h.container.querySelectorAll('tr[data-row]')).toHaveLength(3)
  fireEvent.click(forward)
  expect(next).toHaveBeenCalledTimes(1)
  expect(refresh).not.toHaveBeenCalled()
  expect(h.container.querySelectorAll('tr[data-row]')).toHaveLength(3)
  setIds([])
  setTotalRows(0)
  flush()
  expect(summary()).toBe('0/0')
  expect(h.container.querySelectorAll('tr[data-row]')).toHaveLength(0)
  expect(h.getByRole('button', { name: 'Next page' })).toBe(forward)
})

for (const options of [[0], [1, 1], [1.5], [], [2]]) {
  test(`invalid page-size choices fail explicitly: ${JSON.stringify(options)}`, () => {
    const h = render(() => (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <TablePagination
          hasPrevious={false}
          hasNext={false}
          onPrevious={() => {}}
          onNext={() => {}}
          pageSize={{ value: 1, options, onValueChange() {} }}
        />
      </Errored>
    ))
    expect(h.getByRole('alert').textContent).toContain(
      'Table page size must be a positive integer',
    )
  })
}

test('callers omit built-in controls independently and keep their header actions', () => {
  const [controls, setControls] = createSignal(false)
  const [refresh, setRefresh] = createSignal(false)
  const action = vi.fn()
  const h = render(() => {
    const table = createTable({
      source: { ids: () => ['a'], get: (id) => ({ name: id }) },
      columns: [{ id: 'name', accessorKey: 'name' }],
    })
    return (
      <TableView
        description={{ id: 'optional-controls', columns: { name: {} } }}
        bindings={{
          table,
          get controlsEnabled() {
            return controls()
          },
          get refreshEnabled() {
            return refresh()
          },
          toolbarActions: () => <button onClick={action}>Invite</button>,
        }}
      />
    )
  })
  expect(h.queryByRole('button', { name: 'Table controls' })).toBeNull()
  expect(h.container.querySelector('.table-workspace-controls')).toBeNull()
  expect(h.queryByRole('button', { name: 'Refresh results' })).toBeNull()
  fireEvent.click(h.getByRole('button', { name: 'Invite' }))
  expect(action).toHaveBeenCalledTimes(1)
  setRefresh(true)
  flush()
  expect(h.getByRole('button', { name: 'Refresh results' })).toBeTruthy()
  expect(h.container.querySelector('.table-workspace-controls')).toBeNull()
  setControls(true)
  flush()
  expect(h.getByRole('button', { name: 'Table controls' })).toBeTruthy()
  expect(h.container.querySelector('.table-workspace-controls')).not.toBeNull()
  const actions = h.container.querySelector('.table-workspace-header-actions')!
  expect(
    Array.from(actions.querySelectorAll('button')).map(
      (button) => button.getAttribute('aria-label') ?? button.textContent,
    ),
  ).toEqual(['Table controls', 'Refresh results', 'Invite'])
  setControls(false)
  setRefresh(false)
  flush()
  expect(h.container.querySelector('.table-workspace-controls')).toBeNull()
  expect(h.queryByRole('button', { name: 'Refresh results' })).toBeNull()
})

test('disabled workspace controls never mount and release owned focus when removed', () => {
  const [enabled, setEnabled] = createSignal(false)
  const mounted = vi.fn()
  const disposed = vi.fn()
  const Content = () => {
    mounted()
    onCleanup(disposed)
    return <input aria-label="Control field" />
  }
  let handle: { focus: (target?: HTMLElement) => void } | undefined
  const h = render(() => (
    <TableWorkspace
      controlsEnabled={enabled()}
      controlsRef={(value) => {
        handle = value
      }}
      controls={<Content />}
    >
      <button>Result action</button>
    </TableWorkspace>
  ))
  expect(mounted).not.toHaveBeenCalled()
  setEnabled(true)
  flush()
  expect(mounted).toHaveBeenCalledTimes(1)
  h.getByRole('textbox').focus()
  setEnabled(false)
  flush()
  expect(h.queryByRole('textbox')).toBeNull()
  expect(disposed).toHaveBeenCalledTimes(1)
  expect(
    document.activeElement ===
      h.getByRole('region', { name: 'Table workspace' }),
  ).toBe(true)
  handle?.focus()
  flush()
  expect(h.container.querySelector('[data-controls-open]')).toBeNull()
  const outside = h.getByRole('button', { name: 'Result action' })
  setEnabled(true)
  flush()
  outside.focus()
  setEnabled(false)
  flush()
  expect(document.activeElement === outside).toBe(true)
  expect(mounted).toHaveBeenCalledTimes(2)
  expect(disposed).toHaveBeenCalledTimes(2)
})

test('removing mobile controls closes the drawer before the caller enables it again', async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }))
  const [enabled, setEnabled] = createSignal(true)
  const h = render(() => (
    <TableWorkspace
      controlsEnabled={enabled()}
      controls={<input aria-label="Mobile filter" />}
    >
      <button>Results</button>
    </TableWorkspace>
  ))
  flush()
  await Promise.resolve()
  flush()
  fireEvent.click(h.getByRole('button', { name: 'Table controls' }))
  flush()
  expect(h.container.querySelector('[data-controls-open]')).not.toBeNull()
  h.getByRole('textbox').focus()
  setEnabled(false)
  flush()
  expect(h.queryByRole('textbox')).toBeNull()
  expect(
    document.activeElement ===
      h.getByRole('region', { name: 'Table workspace' }),
  ).toBe(true)
  setEnabled(true)
  flush()
  expect(h.container.querySelector('[data-controls-open]')).toBeNull()
})

test.each([true, false])(
  'a later configuration panel measures and cleans up (observer: %s)',
  async (observerAvailable) => {
    const observed = new Set<Element>()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(node: Element) {
          observed.add(node)
        }
        unobserve(node: Element) {
          observed.delete(node)
        }
        disconnect() {
          observed.clear()
        }
      },
    )
    if (!observerAvailable) vi.stubGlobal('ResizeObserver', undefined)
    const [enabled, setEnabled] = createSignal(false)
    const h = render(() => (
      <TableWorkspace
        controlsEnabled={enabled()}
        controlsResizable
        controls={<input />}
      >
        <button>Results</button>
      </TableWorkspace>
    ))
    flush()
    await Promise.resolve()
    setEnabled(true)
    flush()
    const panel = h.container.querySelector('.table-workspace-controls')!
    expect(observed.has(panel)).toBe(observerAvailable)
    const results = h.container.querySelector('.table-workspace-results')!
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 400,
    } as DOMRect)
    vi.spyOn(results, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 400,
    } as DOMRect)
    await Promise.resolve()
    flush()
    expect(h.getByRole('separator').getAttribute('aria-valuenow')).toBe('20')
    setEnabled(false)
    flush()
    expect(observed.has(panel)).toBe(false)
    h.unmount()
    expect(observed.size).toBe(0)
  },
)
