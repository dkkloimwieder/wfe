import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@solidjs/testing-library'
import { createSignal, flush, onCleanup } from 'solid-js'
import { Button } from '@wfe/components'
import { ReadOnlyTable, TableRow, createTable } from '@wfe/components/table'
import { VirtualRows } from '@wfe/components/virtual'
import type { VirtualWindow } from '@wfe/components/virtual'
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
test('table slots construct once, retain live controls and dispose one owner per slot', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
  const mounts = { actions: 0, configuration: 0, formatting: 0, toolbar: 0 },
    disposals = { ...mounts }
  const [enabled, setEnabled] = createSignal(true),
    [label, setLabel] = createSignal('Initial')
  let calls = 0
  function Slot(props: { kind: keyof typeof mounts }) {
    mounts[props.kind]++
    onCleanup(() => {
      disposals[props.kind]++
    })
    return (
      <Button onClick={() => calls++}>
        {props.kind}: {label()}
      </Button>
    )
  }
  const h = render(() => {
    const table = createTable({
      source: { ids: () => [], get: () => undefined },
      columns: [{ id: 'name', header: 'Name' }],
    })
    return (
      <ReadOnlyTable
        table={table}
        toolbarActions={enabled() ? <Slot kind="toolbar" /> : undefined}
        actions={enabled() ? <Slot kind="actions" /> : undefined}
        configuration={enabled() ? <Slot kind="configuration" /> : undefined}
        formatting={enabled() ? <Slot kind="formatting" /> : undefined}
      />
    )
  })
  expect(mounts).toEqual({
    actions: 1,
    configuration: 1,
    formatting: 1,
    toolbar: 1,
  })
  const button = h.getByRole('button', { name: 'actions: Initial' })
  setLabel('Updated')
  flush()
  expect(h.getByRole('button', { name: 'actions: Updated' })).toBe(button)
  fireEvent.click(button)
  expect(calls).toBe(1)
  setEnabled(false)
  flush()
  expect(disposals).toEqual({
    actions: 1,
    configuration: 1,
    formatting: 1,
    toolbar: 1,
  })
  expect(button.isConnected).toBe(false)
  fireEvent.click(button)
  expect(calls).toBe(1)
  setEnabled(true)
  flush()
  expect(mounts).toEqual({
    actions: 2,
    configuration: 2,
    formatting: 2,
    toolbar: 2,
  })
  cleanup()
  expect(disposals).toEqual({
    actions: 2,
    configuration: 2,
    formatting: 2,
    toolbar: 2,
  })
})

test('refresh stays available without filter controls and forwards unchanged criteria on every click', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
  const refresh = vi.fn()
  const [connected, setConnected] = createSignal(false)
  const h = render(() => {
    const table = createTable({
      source: { ids: () => [], get: () => undefined },
      columns: [{ id: 'name', header: 'Name' }],
      manualProcessing: true,
    })
    return (
      <ReadOnlyTable
        table={table}
        controls={{ filtering: false, search: false }}
        onApplyFilters={connected() ? refresh : undefined}
      />
    )
  })
  const button = h.getByRole('button', {
    name: 'Refresh results',
  }) as HTMLButtonElement
  expect(button.disabled).toBe(false)
  expect(button.hasAttribute('aria-disabled')).toBe(false)
  fireEvent.click(button)
  setConnected(true)
  flush()
  fireEvent.click(button)
  fireEvent.click(button)
  expect(refresh).toHaveBeenCalledTimes(2)
  expect(refresh.mock.calls[0]).toEqual(refresh.mock.calls[1])
  expect(refresh.mock.calls[0]![0].columnFilters).toEqual([])
  expect(button.disabled).toBe(false)
})

test('renderBody replaces the rows with virtual rows and keeps the header and controls', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
  const names = new Map(
    Array.from({ length: 100 }, (_, index) => [`r${index}`, `Row ${index}`]),
  )
  const [start, setStart] = createSignal(0)
  let mounts = 0
  const h = render(() => {
    const table = createTable({
      source: { ids: () => [...names.keys()], get: (id) => names.get(id) },
      columns: [
        { id: 'name', header: 'Name', accessorFn: (row: string) => row },
      ],
    })
    // A fixed window of ten 32px rows; the test moves it.
    const window: VirtualWindow<string> = {
      mode: 'fixed',
      getKeys: () => table.getRowIds().slice(start(), start() + 10),
      getStart: () => start() * 32,
      getEnd: () => (start() + 10) * 32,
      getTotalSize: () => names.size * 32,
      scrollToIndex: () => {},
    }
    return (
      <ReadOnlyTable
        table={table}
        title="Virtual"
        renderBody={() => (
          <VirtualRows
            window={window}
            layout="table"
            columns={() => 1}
            renderRow={(id) => {
              mounts++
              return <TableRow table={table} id={id} />
            }}
          />
        )}
      />
    )
  })
  const body = () =>
    [...h.container.querySelectorAll('tbody tr')]
      .map((row) => row.textContent)
      .filter(Boolean)
  expect(h.getByRole('columnheader', { name: /Name/ })).toBeTruthy()
  expect(h.getByRole('button', { name: 'Refresh results' })).toBeTruthy()
  expect(body()).toEqual(
    Array.from({ length: 10 }, (_, index) => `Row ${index}`),
  )
  expect(mounts).toBe(10)
  const spacers = h.container.querySelectorAll('tbody[aria-hidden="true"] td')
  expect((spacers[1] as HTMLElement).style.height).toBe(`${90 * 32}px`)
  setStart(5)
  flush()
  expect(body()[0]).toBe('Row 5')
  expect(body()).toHaveLength(10)
  // Five rows stay mounted; five new rows mount.
  expect(mounts).toBe(15)
  expect((spacers[0] as HTMLElement).style.height).toBe(`${5 * 32}px`)
})
