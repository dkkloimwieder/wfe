import { expect, test } from 'vitest'
import { moveSortableItem } from '../../packages/components/src/sortable/move'
import type { SortableMove } from '../../packages/components/src/sortable/move'

const columns = () => [
  { id: 'first', label: 'First', items: ['a', 'b', 'c'] },
  { id: 'second', label: 'Second', items: ['d'] },
  { id: 'empty', label: 'Empty', items: [] as string[] },
]
const request = (destination: SortableMove['destination']): SortableMove => ({
  itemId: 'b',
  source: { containerId: 'first', index: 1 },
  destination,
})

test('reorders IDs without changing original arrays or unrelated containers', () => {
  const state = columns()
  const next = moveSortableItem(
    state,
    request({ containerId: 'first', beforeId: 'a' }),
  )
  expect(next[0]!.items).toEqual(['b', 'a', 'c'])
  expect(state[0]!.items).toEqual(['a', 'b', 'c'])
  expect(next[0]!.label).toBe('First')
  expect(next[1]).toBe(state[1])
  expect(next[2]).toBe(state[2])
})

test('moves between containers and into an empty destination', () => {
  for (const destination of ['second', 'empty']) {
    const state = columns()
    const next = moveSortableItem(
      state,
      request({ containerId: destination, beforeId: null }),
    )
    expect(next[0]!.items).toEqual(['a', 'c'])
    expect(next.find((item) => item.id === destination)!.items.at(-1)).toBe('b')
    expect(state[0]!.items).toEqual(['a', 'b', 'c'])
  }
})

test('no-op and stale requests retain the original reference', () => {
  const state = columns()
  for (const destination of [
    { containerId: 'first', beforeId: 'b' },
    { containerId: 'first', beforeId: 'c' },
    { containerId: 'missing', beforeId: null },
    { containerId: 'second', beforeId: 'missing' },
  ])
    expect(moveSortableItem(state, request(destination))).toBe(state)
  const stale = {
    ...request({ containerId: 'empty', beforeId: null }),
    source: { containerId: 'first', index: 0 },
  }
  expect(moveSortableItem(state, stale)).toBe(state)
})

test('ambiguous duplicate IDs are never moved and numeric IDs stay distinct', () => {
  const duplicate = columns()
  duplicate[1]!.items.push('b')
  expect(
    moveSortableItem(
      duplicate,
      request({ containerId: 'empty', beforeId: null }),
    ),
  ).toBe(duplicate)
  const state = [{ id: 0, items: [0, '0', 1] }]
  expect(
    moveSortableItem(state, {
      itemId: 0,
      source: { containerId: 0, index: 0 },
      destination: { containerId: 0, beforeId: null },
    })[0]!.items,
  ).toEqual(['0', 1, 0])
})
