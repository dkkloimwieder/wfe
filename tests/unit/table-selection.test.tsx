import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@solidjs/testing-library'
import { createRoot, createSignal, flush, onCleanup, For } from 'solid-js'
import {
  Table,
  TableRow,
  createTable,
  createTableSelection,
} from '@wfe/components/table'
import type { TableSelectionRange } from '@wfe/components/table'

afterEach(cleanup)
const cell = (row: string, column: string) => ({ row, column })
test('reverse ranges, whole axes and quoted copy use logical order without value reads while selecting', () => {
  const h = createRoot((dispose) => {
    const getText = vi.fn(({ row, column }) =>
      row === 'b' && column === 'y' ? 'tab\tline\n"quote"' : `${row}${column}`,
    )
    const selection = createTableSelection({
      rows: () => ['a', 'b', 'c'],
      columns: () => ['x', 'y', 'z'],
      getText,
    })
    return { selection, getText, dispose }
  })
  try {
    h.selection.select(cell('c', 'y'))
    flush()
    h.selection.select(cell('a', 'x'), true)
    flush()
    expect([h.selection.rowCount, h.selection.columnCount]).toEqual([3, 2])
    expect(h.getText).not.toHaveBeenCalled()
    expect(h.selection.copyText()).toBe(
      'ax\tay\nbx\t"tab\tline\n""quote"""\ncx\tcy',
    )
    h.selection.selectRow()
    flush()
    expect([h.selection.rowCount, h.selection.columnCount]).toEqual([3, 3])
    h.selection.select(cell('b', 'y'))
    flush()
    h.selection.selectColumn()
    flush()
    expect([h.selection.rowCount, h.selection.columnCount]).toEqual([3, 1])
    h.selection.selectAll()
    flush()
    expect([h.selection.rowCount, h.selection.columnCount]).toEqual([3, 3])
    h.selection.clear()
    flush()
    expect(h.selection.copyText()).toBeUndefined()
  } finally {
    h.dispose()
  }
})
test('semantic order changes invalidate a controlled range even when the application rejects clearing', () => {
  const h = createRoot((dispose) => {
    const [rows, setRows] = createSignal(['a', 'b', 'c'])
    const [value, setValue] = createSignal<TableSelectionRange | undefined>({
      anchor: cell('a', 'x'),
      focus: cell('c', 'x'),
    })
    const onChange = vi.fn()
    const selection = createTableSelection({
      rows,
      columns: () => ['x'],
      value,
      onChange,
      getText: (p) => p.row,
    })
    return { rows, setRows, setValue, onChange, selection, dispose }
  })
  try {
    flush()
    expect(h.selection.rowCount).toBe(3)
    h.setRows(['a', 'b', 'c'])
    flush()
    expect(h.selection.rowCount).toBe(3)
    expect(h.onChange).not.toHaveBeenCalled()
    h.setRows(['c', 'b', 'a'])
    flush()
    expect(h.selection.range).toBeUndefined()
    expect(h.selection.copyText()).toBeUndefined()
    expect(h.onChange.mock.calls).toEqual([[undefined]])
    h.selection.select(cell('b', 'x'))
    flush()
    flush()
    expect(h.selection.range).toBeUndefined()
    h.setValue(h.onChange.mock.calls[1]![0])
    flush()
    expect(h.selection.copyText()).toBe('b')
  } finally {
    h.dispose()
  }
})
test('selection rejects missing IDs and empty axes, and bounds keyboard movement', () => {
  const h = createRoot((dispose) => {
    const [rows, setRows] = createSignal(['a', 'b'])
    const selection = createTableSelection({
      rows,
      columns: () => ['x', 'y'],
      getText: (p) => p.row + p.column,
    })
    return { selection, setRows, dispose }
  })
  try {
    h.selection.select(cell('missing', 'x'))
    flush()
    expect(h.selection.range).toBeUndefined()
    h.selection.move(0, 0)
    flush()
    h.selection.move(20, 20, true)
    flush()
    expect(h.selection.copyText()).toBe('ax\tay\nbx\tby')
    h.setRows([])
    flush()
    h.selection.selectAll()
    flush()
    expect(h.selection.range).toBeUndefined()
  } finally {
    h.dispose()
  }
})
test('virtual rows paint when mounted, preserve owners and copy offscreen data only on request', async () => {
  let mounts = 0,
    disposals = 0,
    selection!: ReturnType<typeof createTableSelection>,
    tableNode!: HTMLTableElement
  const [start, setStart] = createSignal(0),
    getText = vi.fn((p) => p.row + p.column)
  const records = {
    a: { x: 'ax', y: 'ay' },
    b: { x: 'bx', y: 'by' },
    c: { x: 'cx', y: 'cy' },
  }
  const h = render(() => {
    const table = createTable({
      source: {
        ids: () => ['a', 'b', 'c'],
        get: (id) => records[id as keyof typeof records],
      },
      columns: [
        { id: 'x', accessorKey: 'x' },
        { id: 'y', accessorKey: 'y' },
      ],
    })
    selection = createTableSelection({
      rows: () => table.getRowIds(),
      columns: () => table.getVisibleColumns().map((c) => c.id),
      getText,
    })
    function Row(props: { id: string }) {
      mounts++
      onCleanup(() => disposals++)
      return <TableRow table={table} id={props.id} />
    }
    return (
      <Table
        table={table}
        selection={selection}
        elementRef={(node) => {
          tableNode = node
        }}
        renderBody={() => (
          <For each={table.getRowIds().slice(start(), start() + 1)}>
            {(id) => <Row id={id} />}
          </For>
        )}
      />
    )
  })
  flush()
  const original = tableNode.querySelector('td')
  selection.select(cell('a', 'x'))
  flush()
  selection.select(cell('c', 'y'), true)
  flush()
  expect(tableNode.querySelectorAll('[data-cell-selection]')).toHaveLength(2)
  expect(tableNode.querySelector('td')).toBe(original)
  expect(mounts).toBe(1)
  expect(getText).not.toHaveBeenCalled()
  setStart(2)
  flush()
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(
    tableNode.querySelector('[data-selection-edges~="bottom"]'),
  ).not.toBeNull()
  expect(selection.copyText()).toBe('ax\tay\nbx\tby\ncx\tcy')
  expect(getText).toHaveBeenCalledTimes(6)
  expect(mounts).toBe(2)
  expect(disposals).toBe(1)
  tableNode.focus()
  const clipboard = { setData: vi.fn() }
  const event = new Event('copy', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: clipboard })
  tableNode.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  expect(clipboard.setData).toHaveBeenCalledWith(
    'text/plain',
    'ax\tay\nbx\tby\ncx\tcy',
  )
  h.unmount()
  expect(disposals).toBe(2)
  expect(tableNode.hasAttribute('data-table-selection')).toBe(false)
  const detached = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
  })
  tableNode.dispatchEvent(detached)
  expect(selection.range).toBeDefined()
})
test('native editor copy and projection failures leave the clipboard untouched', () => {
  let selection!: ReturnType<typeof createTableSelection>,
    tableNode!: HTMLTableElement
  const h = render(() => {
    const table = createTable({
      source: { ids: () => ['a'], get: () => ({ x: 'value' }) },
      columns: [{ id: 'x', accessorKey: 'x' }],
    })
    selection = createTableSelection({
      rows: () => ['a'],
      columns: () => ['x'],
      getText: () => {
        throw new Error('unavailable')
      },
    })
    return (
      <Table
        table={table}
        selection={selection}
        elementRef={(node) => {
          tableNode = node
        }}
        renderCell={() => <input aria-label="Editor" value="native" />}
      />
    )
  })
  flush()
  selection.select(cell('a', 'x'))
  flush()
  const clipboard = { setData: vi.fn() }
  function copy(target: Element) {
    const event = new Event('copy', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: clipboard })
    target.dispatchEvent(event)
    return event
  }
  const input = h.getByRole('textbox')
  ;(input as HTMLElement).focus()
  expect(copy(input).defaultPrevented).toBe(false)
  tableNode.focus()
  copy(tableNode)
  expect(clipboard.setData).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(selection.range).toBeDefined()
})

test('uncontrolled commands compose synchronously and reveal follows accepted focus', () => {
  const h = createRoot((dispose) => {
    const onReveal = vi.fn()
    const selection = createTableSelection({
      rows: () => ['a', 'b'],
      columns: () => ['x', 'y'],
      getText: (p) => p.row + p.column,
      onReveal,
    })
    return { selection, onReveal, dispose }
  })
  try {
    h.selection.move(1, 0)
    expect(h.selection.copyText()).toBe('ax')
    h.selection.select(cell('b', 'y'), true)
    expect(h.selection.copyText()).toBe('ax\tay\nbx\tby')
    h.selection.selectRow()
    expect(h.selection.columnCount).toBe(2)
    expect(h.onReveal).not.toHaveBeenCalled()
    flush()
    expect(h.onReveal.mock.calls).toEqual([[cell('b', 'y')]])
    h.selection.clear()
    expect(h.selection.copyText()).toBeUndefined()
  } finally {
    h.dispose()
  }
})
test('rejected controlled requests never reveal and broad accessors cannot revive obsolete ranges', () => {
  const h = createRoot((dispose) => {
    const [rows, setRows] = createSignal(['a', 'b'])
    const [value, setValue] = createSignal<TableSelectionRange>()
    const [unrelated, setUnrelated] = createSignal(0)
    const onChange = vi.fn(),
      onReveal = vi.fn()
    const selection = createTableSelection({
      rows,
      columns: () => ['x'],
      value: () => {
        unrelated()
        return value()
      },
      onChange,
      onReveal,
      getText: (p) => p.row,
    })
    return {
      selection,
      setRows,
      setValue,
      setUnrelated,
      onChange,
      onReveal,
      dispose,
    }
  })
  try {
    flush()
    h.selection.move(1, 0)
    flush()
    expect(h.onReveal).not.toHaveBeenCalled()
    h.setValue(h.onChange.mock.calls[0]![0])
    flush()
    expect(h.onReveal.mock.calls).toEqual([[cell('a', 'x')]])
    h.selection.move(1, 0)
    flush()
    expect(h.onReveal).toHaveBeenCalledTimes(1)
    h.setRows(['b', 'a'])
    flush()
    expect(h.selection.range).toBeUndefined()
    const requests = h.onChange.mock.calls.length
    h.setUnrelated(1)
    flush()
    expect(h.selection.range).toBeUndefined()
    expect(h.selection.copyText()).toBeUndefined()
    expect(h.onChange).toHaveBeenCalledTimes(requests)
  } finally {
    h.dispose()
  }
})
test('large logical selections do not read records before copy', () => {
  const h = createRoot((dispose) => {
    const rows = Array.from({ length: 100_000 }, (_, index) => String(index))
    const getText = vi.fn((p) => p.row)
    const selection = createTableSelection({
      rows: () => rows,
      columns: () => ['x'],
      getText,
    })
    return { selection, getText, dispose }
  })
  try {
    h.selection.selectAll()
    expect(h.selection.rowCount).toBe(100_000)
    expect(h.selection.cellState(cell('99999', 'x'))?.edges).toContain('bottom')
    expect(h.getText).not.toHaveBeenCalled()
  } finally {
    h.dispose()
  }
})
test('pointerup uses its final coordinates and disposal cancels a queued drag frame', () => {
  let selection!: ReturnType<typeof createTableSelection>,
    node!: HTMLTableElement
  const h = render(() => {
    const table = createTable({
      source: { ids: () => ['a', 'b'], get: () => ({ x: 'value' }) },
      columns: [{ id: 'x', accessorKey: 'x' }],
    })
    selection = createTableSelection({
      rows: () => ['a', 'b'],
      columns: () => ['x'],
      getText: (p) => p.row,
    })
    return (
      <Table
        table={table}
        selection={selection}
        elementRef={(value) => {
          node = value
        }}
      />
    )
  })
  flush()
  const cells = [...node.querySelectorAll('td')],
    frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 0,
    captured = false
  const request = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      const id = ++nextFrame
      frames.set(id, callback)
      return id
    })
  const cancel = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation((id) => {
      frames.delete(id)
    })
  Object.defineProperties(node, {
    setPointerCapture: {
      value: () => {
        captured = true
      },
      configurable: true,
    },
    hasPointerCapture: { value: () => captured, configurable: true },
    releasePointerCapture: {
      value: () => {
        captured = false
      },
      configurable: true,
    },
  })
  const rectangle = vi
    .spyOn(node, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(0, 0, 400, 400))
  Object.defineProperty(document, 'elementFromPoint', {
    value: (x: number) => (x > 200 ? cells[1] : cells[0]),
    configurable: true,
  })
  function pointer(type: string, target: Element, x: number) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.assign(event, {
      pointerId: 1,
      isPrimary: true,
      pointerType: 'mouse',
      button: 0,
      clientX: x,
      clientY: 100,
    })
    target.dispatchEvent(event)
  }
  try {
    pointer('pointerdown', cells[0]!, 100)
    pointer('pointermove', node, 110)
    expect(frames.size).toBe(1)
    pointer('pointerup', node, 300)
    expect(selection.range?.focus).toEqual(cell('b', 'x'))
    expect(frames.size).toBe(0)
    expect(captured).toBe(false)
    pointer('pointerdown', cells[0]!, 100)
    pointer('pointermove', node, 150)
    expect(frames.size).toBe(1)
    h.unmount()
    expect(frames.size).toBe(0)
    expect(captured).toBe(false)
  } finally {
    request.mockRestore()
    cancel.mockRestore()
    rectangle.mockRestore()
    delete (document as unknown as { elementFromPoint?: unknown })
      .elementFromPoint
  }
})

test('unrelated binding updates retain listeners, mirror and accepted range', () => {
  const listener = vi.spyOn(HTMLElement.prototype, 'addEventListener')
  const [width, setWidth] = createSignal(300)
  let node!: HTMLTableElement,
    selection!: ReturnType<typeof createTableSelection>
  const h = render(() => {
    const table = createTable({
      source: { ids: () => ['a'], get: () => ({ x: 'value' }) },
      columns: [{ id: 'x', accessorKey: 'x' }],
    })
    selection = createTableSelection({
      rows: () => ['a'],
      columns: () => ['x'],
      getText: () => 'value',
    })
    const bindings = () => ({
      table,
      selection,
      width: width(),
      elementRef: (element: HTMLTableElement) => {
        node = element
      },
    })
    return <Table {...bindings()} />
  })
  flush()
  node.focus()
  selection.select(cell('a', 'x'))
  flush()
  const before = listener.mock.calls.filter(([name]) => name === 'copy').length
  const native = document.getSelection()?.getRangeAt(0)
  setWidth(500)
  flush()
  expect(listener.mock.calls.filter(([name]) => name === 'copy')).toHaveLength(
    before,
  )
  expect(node.hasAttribute('data-native-cell-selection')).toBe(true)
  expect(document.getSelection()?.getRangeAt(0)).toBe(native)
  expect(selection.copyText()).toBe('value')
  h.unmount()
  listener.mockRestore()
})
