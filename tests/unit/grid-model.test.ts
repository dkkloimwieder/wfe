import { expect, test } from 'vitest'
import { createGridModel } from '../../packages/generator/src/gridModel'
import type { GridDescription } from '@wfe/generator'
const description = {
  id: 'capabilities',
  title: 'Capabilities',
  rows: [
    { id: 'a', label: 'Alpha', disabled: false },
    { id: 'b', label: 'Beta', disabled: true },
  ],
  columns: [
    { id: 'view', label: 'View', readOnly: true },
    { id: 'change', label: 'Change' },
  ],
} as const satisfies GridDescription

test('grid metadata preserves declared order and original entries without cell state', () => {
  const model = createGridModel(description)
  expect([...model.rows.keys()]).toEqual(['a', 'b'])
  expect([...model.columns.keys()]).toEqual(['view', 'change'])
  expect(model.rows.get('a')).toBe(description.rows[0])
  expect(model.columns.get('view')).toBe(description.columns[0])
  expect(createGridModel(JSON.parse(JSON.stringify(description)))).toEqual(
    model,
  )
})
test('empty grid axes are valid metadata', () => {
  expect(
    createGridModel({ id: 'empty', rows: [], columns: [] }).rows.size,
  ).toBe(0)
})
test.each([
  ['description', null],
  ['extra property', { ...description, permission: 'editor' }],
  ['ID', { ...description, id: '' }],
  ['title', { ...description, title: ' ' }],
  ['rows', { ...description, rows: {} }],
  ['columns', { ...description, columns: null }],
  ['row object', { ...description, rows: [null] }],
  ['row key', { ...description, rows: [{ id: ' ', label: 'Alpha' }] }],
  ['row label', { ...description, rows: [{ id: 'a', label: '' }] }],
  [
    'row flag',
    { ...description, rows: [{ id: 'a', label: 'Alpha', disabled: 'yes' }] },
  ],
  [
    'duplicate row',
    { ...description, rows: [description.rows[0], description.rows[0]] },
  ],
  [
    'row callback',
    { ...description, rows: [{ ...description.rows[0], onChange: () => {} }] },
  ],
  ['column object', { ...description, columns: [false] }],
  ['column key', { ...description, columns: [{ id: '', label: 'View' }] }],
  ['column label', { ...description, columns: [{ id: 'view', label: null }] }],
  [
    'column flag',
    { ...description, columns: [{ id: 'view', label: 'View', readOnly: 1 }] },
  ],
  [
    'duplicate column',
    {
      ...description,
      columns: [description.columns[0], description.columns[0]],
    },
  ],
  [
    'column rule',
    {
      ...description,
      columns: [{ ...description.columns[0], authorize: () => true }],
    },
  ],
])('rejects invalid grid %s', (_name, invalid) => {
  expect(() => createGridModel(invalid as unknown as GridDescription)).toThrow(
    /^Generator:/,
  )
})
