import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { createSignal, createStore, flush } from 'solid-js'
import { Gantt } from '../../packages/components/src/gantt/Gantt'
import type {
  GanttInterval,
  GanttRow,
} from '../../packages/components/src/gantt/types'

const range = {
  start: new Date('2026-10-01T00:00:00Z'),
  end: new Date('2026-11-01T00:00:00Z'),
}
const task = (id: string, rowId: string, label = id): GanttInterval => ({
  id,
  rowId,
  label,
  start: new Date('2026-10-03T00:00:00Z'),
  end: new Date('2026-10-07T00:00:00Z'),
})
const scrollToDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollTo',
)

beforeEach(() => {
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => null,
  })
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value() {},
  })
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  vi.stubGlobal('ResizeObserver', Observer)
  vi.stubGlobal('IntersectionObserver', Observer)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.classList.contains('ui-gantt-scroll')
        ? 480
        : Number.parseFloat(this.style.height) || 0
    },
  )
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(480)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value(this: HTMLElement, options: ScrollToOptions | number = {}) {
      if (typeof options !== 'number')
        this.scrollTop = options.top ?? this.scrollTop
      this.dispatchEvent(new Event('scroll'))
    },
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'elementFromPoint')
  Reflect.deleteProperty(document, 'getAnimations')
  Reflect.deleteProperty(Element.prototype, 'getAnimations')
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  if (scrollToDescriptor)
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', scrollToDescriptor)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
})

async function settled() {
  await Promise.resolve()
  flush()
  await Promise.resolve()
  flush()
}

test('hierarchy expansion proposes state and waits for caller adoption', async () => {
  const rows: GanttRow[] = [
    { id: 'parent', label: 'Parent' },
    { id: 'child', label: 'Child', parentId: 'parent' },
  ]
  const [expanded, setExpanded] = createSignal<string[]>([])
  const change = vi.fn()
  const h = render(() => (
    <Gantt
      rows={rows}
      intervals={[]}
      range={range}
      expandedIds={expanded()}
      onExpandedChange={change}
    />
  ))
  await settled()
  fireEvent.click(await h.findByRole('button', { name: 'Expand Parent' }))
  expect(change).toHaveBeenLastCalledWith(['parent'])
  expect(h.queryByText('Child')).toBeNull()
  setExpanded(['parent'])
  await settled()
  expect(await h.findByText('Child')).toBeTruthy()
  expect(
    h
      .getByRole('button', { name: 'Collapse Parent' })
      .getAttribute('aria-expanded'),
  ).toBe('true')
  expect(h.getByRole('table').getAttribute('aria-rowcount')).toBe('3')
})

test('selection stays controlled and supports additive selection', async () => {
  const [selected, setSelected] = createSignal<string[]>([])
  const change = vi.fn()
  const h = render(() => (
    <Gantt
      rows={[{ id: 'a', label: 'A' }]}
      intervals={[task('first', 'a', 'First'), task('second', 'a', 'Second')]}
      range={range}
      selectedIds={selected()}
      onSelectionChange={change}
    />
  ))
  await settled()
  const first = await h.findByRole('button', { name: /^First,/ })
  fireEvent.click(first)
  expect(change).toHaveBeenLastCalledWith(['first'])
  expect(first.getAttribute('aria-pressed')).toBe('false')
  setSelected(['first'])
  flush()
  expect(first.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(h.getByRole('button', { name: /^Second,/ }), {
    ctrlKey: true,
  })
  expect(change).toHaveBeenLastCalledWith(['first', 'second'])
  fireEvent.click(first, { metaKey: true })
  expect(change).toHaveBeenLastCalledWith([])
})

test('same-ID accepted input changes update labels, range visibility and row membership', async () => {
  const [items, setItems] = createSignal([task('first', 'a', 'Original')])
  const [rows, setRows] = createSignal<GanttRow[]>([{ id: 'a', label: 'A' }])
  const h = render(() => (
    <Gantt rows={rows()} intervals={items()} range={range} />
  ))
  await settled()
  expect(await h.findByRole('button', { name: /^Original,/ })).toBeTruthy()
  setItems([task('first', 'a', 'Changed')])
  await settled()
  expect(h.queryByRole('button', { name: /^Original,/ })).toBeNull()
  expect(h.getByRole('button', { name: /^Changed,/ })).toBeTruthy()
  setItems([
    {
      ...task('first', 'a', 'Outside'),
      start: new Date('2026-12-01T00:00:00Z'),
      end: new Date('2026-12-02T00:00:00Z'),
    },
  ])
  await settled()
  expect(h.queryByRole('button', { name: /^Outside,/ })).toBeNull()
  setRows([{ id: 'b', label: 'Replacement' }])
  setItems([task('first', 'b', 'Moved')])
  await settled()
  expect(await h.findByText('Replacement')).toBeTruthy()
  expect(
    h
      .getByRole('button', { name: /^Moved,/ })
      .closest('[data-row]')
      ?.getAttribute('data-row'),
  ).toBe('b')
})

test('readonly intervals remain keyboard accessible for detail activation', async () => {
  const item = { ...task('first', 'a', 'Readonly record'), readOnly: true }
  const activate = vi.fn()
  const h = render(() => (
    <Gantt
      rows={[{ id: 'a', label: 'A' }]}
      intervals={[item]}
      range={range}
      onActivate={activate}
    />
  ))
  await settled()
  const bar = await h.findByRole('button', { name: /^Readonly record,/ })
  bar.focus()
  expect(document.activeElement).toBe(bar)
  fireEvent.keyDown(bar, { key: 'Enter' })
  expect(activate).toHaveBeenLastCalledWith(item)
})

test('empty and loading content retains a named schedule and accurate row count', async () => {
  const h = render(() => (
    <Gantt
      label="Delivery schedule"
      rows={[]}
      intervals={[]}
      range={range}
      loading
    />
  ))
  await settled()
  expect(
    h
      .getByRole('region', { name: 'Delivery schedule' })
      .getAttribute('aria-busy'),
  ).toBe('true')
  expect(
    h
      .getByRole('table', { name: 'Delivery schedule' })
      .getAttribute('aria-rowcount'),
  ).toBe('1')
  expect(h.getByText('NO ITEMS')).toBeTruthy()
  expect(h.container.querySelectorAll('[data-interval]')).toHaveLength(0)
})

test('ten thousand rows render only a bounded window and expose later data on scroll', async () => {
  const rows = Array.from({ length: 10000 }, (_, i) => ({
    id: String(i),
    label: `Row ${i}`,
  }))
  const intervals = rows.map((row) => task(row.id, row.id, `Record ${row.id}`))
  const h = render(() => (
    <Gantt rows={rows} intervals={intervals} range={range} rowHeight={36} />
  ))
  await settled()
  expect(await h.findByRole('button', { name: /^Record 0,/ })).toBeTruthy()
  expect(h.container.querySelectorAll('[data-row]').length).toBeLessThan(100)
  expect(h.container.querySelectorAll('[data-interval]').length).toBeLessThan(
    100,
  )
  const scroll = h.container.querySelector<HTMLElement>('.ui-gantt-scroll')!
  scroll.scrollTop = 36000
  fireEvent.scroll(scroll)
  await settled()
  await waitFor(() =>
    expect(h.container.querySelector('[data-row="1000"]')).not.toBeNull(),
  )
  expect(h.container.querySelector('[data-row="0"]')).toBeNull()
  expect(h.container.querySelectorAll('[data-row]').length).toBeLessThan(100)
  expect(h.getByRole('table').getAttribute('aria-rowcount')).toBe('10001')
})

test('a dense resource renders only visible interval lanes and reveals later lanes on scroll', async () => {
  const intervals = Array.from({ length: 1000 }, (_, i) =>
    task(String(i).padStart(4, '0'), 'dense', `Dense record ${i}`),
  )
  const h = render(() => (
    <Gantt
      rows={[{ id: 'dense', label: 'Dense resource' }]}
      rowHeight={36}
      intervals={intervals}
      range={range}
    />
  ))
  await settled()
  expect(
    await h.findByRole('button', { name: /^Dense record 0,/ }),
  ).toBeTruthy()
  expect(h.container.querySelectorAll('[data-interval]').length).toBeLessThan(
    100,
  )
  const scroll = h.container.querySelector<HTMLElement>('.ui-gantt-scroll')!
  scroll.scrollTop = 18000
  fireEvent.scroll(scroll)
  await settled()
  await waitFor(() =>
    expect(h.container.querySelector('[data-interval="0500"]')).not.toBeNull(),
  )
  expect(h.container.querySelector('[data-interval="0000"]')).toBeNull()
  expect(h.container.querySelectorAll('[data-interval]').length).toBeLessThan(
    100,
  )
})

test('editable intervals support keyboard selection without starting a move', async () => {
  const selection = vi.fn()
  const change = vi.fn()
  const h = render(() => (
    <Gantt
      rows={[{ id: 'a', label: 'A' }]}
      intervals={[task('first', 'a', 'First')]}
      range={range}
      onChange={change}
      onSelectionChange={selection}
    />
  ))
  await settled()
  const bar = await h.findByRole('button', { name: /^First,/ })
  fireEvent.keyDown(bar, { key: 's', code: 'KeyS' })
  expect(selection).toHaveBeenCalledWith(['first'])
  expect(change).not.toHaveBeenCalled()
})

test('range updates retain connector and grid nodes instead of remounting them', async () => {
  const [window, setWindow] = createSignal(range)
  const h = render(() => (
    <Gantt
      rows={[
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]}
      intervals={[task('first', 'a'), task('second', 'b')]}
      dependencies={[{ id: 'link', from: 'first', to: 'second' }]}
      range={window()}
    />
  ))
  await settled()
  const path = h.container.querySelector('.ui-gantt-dependencies path')!
  const grid = h.container.querySelector('.ui-gantt-gridline')!
  expect(path).not.toBeNull()
  const originalPath = path.getAttribute('d')
  setWindow({ start: new Date('2026-09-30'), end: new Date('2026-11-02') })
  await settled()
  expect(h.container.querySelector('.ui-gantt-dependencies path')).toBe(path)
  expect(h.container.querySelector('.ui-gantt-gridline')).toBe(grid)
  expect(path.getAttribute('d')).not.toBe(originalPath)
})

test('moving one interval does not reread unrelated interval geometry', async () => {
  let reads = 0
  const other = task('second', 'b')
  const watched = {
    ...other,
    get start() {
      reads++
      return other.start
    },
  }
  const h = render(() => (
    <Gantt
      rows={[
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]}
      intervals={[task('first', 'a', 'First'), watched]}
      range={range}
      onChange={() => {}}
    />
  ))
  await settled()
  const bar = h.getByRole('button', { name: /^First,/ })
  const item = bar.closest<HTMLElement>('.ui-gantt-item')!
  const left = item.style.left
  reads = 0
  fireEvent.keyDown(bar, { key: ' ', code: 'Space' })
  await settled()
  fireEvent.keyDown(bar, { key: 'ArrowRight', code: 'ArrowRight' })
  await settled()
  expect(item.style.left).not.toBe(left)
  expect(reads).toBe(0)
  fireEvent.keyDown(bar, { key: 'Escape', code: 'Escape' })
  await settled()
  expect(item.style.left).toBe(left)
})

test('interval-only parent updates retain row hierarchy and rendered row identity', async () => {
  const parentRead = vi.fn(() => undefined)
  const rows: GanttRow[] = [
    {
      id: 'a',
      label: 'A',
      get parentId() {
        return parentRead()
      },
    },
  ]
  const [data, setData] = createSignal({
    rows,
    intervals: [task('first', 'a', 'First')],
  })
  const h = render(() => (
    <Gantt rows={data().rows} intervals={data().intervals} range={range} />
  ))
  await settled()
  const row = h.container.querySelector('[data-row="a"]')
  const bar = h.container.querySelector('[data-interval="first"]')
  const reads = parentRead.mock.calls.length
  expect(reads).toBeGreaterThan(0)
  setData((current) => ({
    ...current,
    intervals: [{ ...current.intervals[0]!, label: 'Updated' }],
  }))
  await settled()
  expect(h.getByRole('button', { name: /^Updated,/ })).toBe(bar)
  expect(h.container.querySelector('[data-row="a"]')).toBe(row)
  expect(parentRead).toHaveBeenCalledTimes(reads)
})

test('accepted overlapping intervals update row and virtual extent when lane count changes', async () => {
  const first = task('first', 'a')
  const second = {
    ...task('second', 'a'),
    start: new Date('2026-10-09'),
    end: new Date('2026-10-12'),
  }
  const [intervals, setIntervals] = createSignal([
    first,
    second,
    task('following', 'b'),
  ])
  const h = render(() => (
    <Gantt
      rows={[
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]}
      intervals={intervals()}
      range={range}
      rowHeight={40}
    />
  ))
  await settled()
  const row = h.container.querySelector<HTMLElement>('[data-row="a"]')!
  const extent = h.container.querySelector<HTMLElement>(
    '.ui-gantt-body > div:not(.ui-gantt-dropzone)',
  )!
  expect(row.style.height).toBe('40px')
  expect(extent.style.height).toBe('80px')
  setIntervals([
    first,
    { ...second, start: first.start, end: first.end },
    task('following', 'b'),
  ])
  await settled()
  expect(row.style.height).toBe('80px')
  expect(extent.style.height).toBe('120px')
  expect(h.getByRole('button', { name: /^following,/ })).toBeTruthy()
  setIntervals([first, second, task('following', 'b')])
  await settled()
  expect(row.style.height).toBe('40px')
  expect(extent.style.height).toBe('80px')
})

test('same-reference row store parent changes still update visible hierarchy', async () => {
  const [rows, setRows] = createStore<GanttRow[]>([
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B', parentId: 'a' },
  ])
  const h = render(() => <Gantt rows={rows} intervals={[]} range={range} />)
  await settled()
  expect(h.queryByText('B')).toBeNull()
  setRows((draft) => {
    draft[1]!.parentId = undefined
  })
  await settled()
  expect(h.getByText('B')).toBeTruthy()
})
