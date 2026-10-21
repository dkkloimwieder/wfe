import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush } from 'solid-js'
import { createTable, TablePagination } from '@wfe/components/table'
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
  expect(document.activeElement).toBe(forward)
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
            status: 'More records available',
            pageSize: { value: 2, options: [2, 5], onValueChange() {} },
          },
        }}
      />
    )
  })
  const forward = h.getByRole('button', { name: 'Next page' })
  expect(forward.closest('[role=status]')).toBeNull()
  expect(h.container.querySelectorAll('tr[data-row]')).toHaveLength(3)
  fireEvent.click(forward)
  expect(next).toHaveBeenCalledTimes(1)
  expect(refresh).not.toHaveBeenCalled()
  expect(h.container.querySelectorAll('tr[data-row]')).toHaveLength(3)
  setIds([])
  flush()
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
