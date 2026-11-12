import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Tree, type TreeNode } from '@wfe/components/tree'
const nodes: readonly TreeNode[] = [
  {
    id: 'root',
    label: 'Root',
    children: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta', disabled: true },
    ],
  },
  { id: 'z', label: 'Zulu' },
]
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
function fixture() {
  const [value, setValue] = createSignal<readonly string[]>(['a'])
  const [expanded, setExpanded] = createSignal<readonly string[]>(['root'])
  const [records, setRecords] = createSignal(nodes)
  const [multiple, setMultiple] = createSignal(false)
  const [dir, setDir] = createSignal<'ltr' | 'rtl'>('ltr')
  const select = vi.fn<(ids: readonly string[]) => void>()
  const expand = vi.fn<(ids: readonly string[]) => void>()
  const view = render(() => (
    <Tree
      label="Files"
      nodes={records()}
      selected={value()}
      expanded={expanded()}
      multiple={multiple()}
      dir={dir()}
      onSelectionChange={select}
      onExpandedChange={expand}
    />
  ))
  flush()
  return {
    ...view,
    setValue,
    setExpanded,
    setRecords,
    setMultiple,
    setDir,
    select,
    expand,
    item: (name: string) => view.getByRole('treeitem', { name }),
  }
}
test('selection requests leave accepted IDs and DOM intact until the application accepts', () => {
  const f = fixture()
  const alpha = f.item('Alpha')
  const zulu = f.item('Zulu')
  fireEvent.click(zulu)
  flush()
  expect(f.select).toHaveBeenCalledWith(['z'])
  expect(alpha.getAttribute('aria-selected')).toBe('true')
  expect(zulu.getAttribute('aria-selected')).toBe('false')
  f.setValue(['z'])
  f.setRecords(structuredClone(nodes))
  flush()
  expect(f.item('Zulu')).toBe(zulu)
  expect(zulu.getAttribute('aria-selected')).toBe('true')
  expect(
    f.container.querySelectorAll('[role="treeitem"][tabindex="0"]'),
  ).toHaveLength(1)
})
test('expansion requests are controlled and collapsed children leave the tree', () => {
  const f = fixture()
  const root = f.item('Root')
  fireEvent.keyDown(root, { key: 'ArrowLeft' })
  flush()
  expect(f.expand).toHaveBeenCalledWith([])
  expect(root.getAttribute('aria-expanded')).toBe('true')
  f.setExpanded([])
  flush()
  expect(f.queryByRole('treeitem', { name: 'Alpha' })).toBeNull()
  expect(root.getAttribute('aria-expanded')).toBe('false')
  expect(f.item('Zulu').hasAttribute('aria-expanded')).toBe(false)
})
test('multiple selection uses stable IDs and disabled nodes cannot change selection', () => {
  const f = fixture()
  f.setMultiple(true)
  flush()
  fireEvent.keyDown(f.item('Zulu'), { key: ' ' })
  flush()
  expect(f.select).toHaveBeenLastCalledWith(['a', 'z'])
  fireEvent.keyDown(f.item('Alpha'), { key: 'Enter' })
  flush()
  expect(f.select).toHaveBeenLastCalledWith([])
  const count = f.select.mock.calls.length
  fireEvent.click(f.item('Beta'))
  flush()
  expect(f.select).toHaveBeenCalledTimes(count)
})
test('arrow navigation separates focus from selection and supports right-to-left expansion', () => {
  const f = fixture()
  const root = f.item('Root')
  root.focus()
  fireEvent.keyDown(root, { key: 'ArrowRight' })
  flush()
  expect(document.activeElement).toBe(f.item('Alpha'))
  fireEvent.keyDown(f.item('Alpha'), { key: 'ArrowDown' })
  flush()
  expect(document.activeElement).toBe(f.item('Beta'))
  expect(f.select).not.toHaveBeenCalled()
  f.setDir('rtl')
  flush()
  fireEvent.keyDown(root, { key: 'ArrowRight' })
  flush()
  expect(f.expand).toHaveBeenCalledWith([])
})
test('composition and nested button keys do not trigger tree selection', () => {
  const f = fixture()
  const root = f.item('Root')
  fireEvent.keyDown(root, { key: 'Enter', isComposing: true })
  fireEvent.keyDown(f.getByRole('button', { name: 'Collapse Root' }), {
    key: 'Enter',
  })
  expect(f.select).not.toHaveBeenCalled()
})
test('empty trees remain focusable and dispose pending type-ahead state', () => {
  vi.useFakeTimers()
  const f = fixture()
  f.item('Root').focus()
  fireEvent.keyDown(f.item('Root'), { key: 'z' })
  flush()
  expect(document.activeElement).toBe(f.item('Zulu'))
  f.setRecords([])
  flush()
  expect(f.getByRole('tree').getAttribute('tabindex')).toBe('0')
  f.unmount()
  vi.runAllTimers()
  expect(f.container.querySelector('[role="tree"]')).toBeNull()
})
