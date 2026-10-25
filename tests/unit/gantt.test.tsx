import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
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
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', Observer)
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
    <Gantt rows={rows} intervals={intervals} range={range} />
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
