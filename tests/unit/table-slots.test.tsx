import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@solidjs/testing-library'
import { createSignal, flush, onCleanup } from 'solid-js'
import { Button } from '@wfe/components'
import { ReadOnlyTable, createTable } from '@wfe/components/table'
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
