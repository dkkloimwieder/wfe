import { describe, expect, it } from 'vitest'
import { project } from '../../examples/wamn-generator/projection'
import type { Metadata } from '../../examples/wamn-generator/projection'
const source: Metadata = {
  operation: 'platform-fixture:widget/query@2.1.0',
  rowId: 'id',
  columns: Object.entries({
    code: 'text',
    createdAt: 'timestamptz',
    editVersion: 'int64',
    id: 'uuid',
    makerId: 'uuid',
    note: 'text',
  }).map(([id, type]) => ({
    id,
    type,
    label: id,
    revision: id === 'editVersion',
  })),
  fields: [
    { id: 'code', label: 'Code' },
    { id: 'note', label: 'Note' },
  ],
  choices: [
    { value: 'priority', label: 'Priority' },
    { value: 'standard', label: 'Standard' },
  ],
  title: 'Widgets',
  formTitle: 'Edit widget',
  refreshLabel: 'Refresh',
}
describe('isolated WAMN metadata projection', () => {
  it('maps both metadata variants with stable identities and explicit order', () => {
    const first = project(source)
    const second = project({
      ...source,
      title: 'Review',
      fields: [...source.fields].reverse(),
      columns: [...source.columns].reverse(),
    })
    expect(first.form.fields.map((field) => field.field)).toEqual([
      'code',
      'note',
    ])
    expect(second.form.fields.map((field) => field.field)).toEqual([
      'note',
      'code',
    ])
    expect(second.columnOrder).toEqual([
      ...first.columnOrder.filter((id) => id !== 'actions').reverse(),
      'actions',
    ])
    expect(second.layout.panels).toEqual(first.layout.panels)
    expect(second.table.id).toBe(first.table.id)
    expect(first.layout.columns).toBe(1)
    expect(first.layout.panels.map((panel) => panel.view)).toEqual(['records'])
    expect(first.editorLayout.panels.map((panel) => panel.view)).toEqual([
      'editor',
    ])
  })
  for (const [name, change] of Object.entries({
    operation: { operation: 'other' },
    key: { rowId: 'note' },
    unknownColumn: {
      columns: source.columns.map((column) =>
        column.id === 'note' ? { ...column, id: 'unknown' } : column,
      ),
    },
    columnType: {
      columns: source.columns.map((column) => ({ ...column, type: 'object' })),
    },
    revision: {
      columns: source.columns.map((column) => ({ ...column, revision: false })),
    },
    duplicateColumn: {
      columns: [...source.columns.slice(0, -1), source.columns[0]!],
    },
    missingColumn: { columns: source.columns.slice(1) },
    nestedField: {
      fields: [
        { id: 'value.line[].widgetId', label: 'Nested' },
        source.fields[0]!,
      ],
    },
    duplicateField: { fields: [source.fields[0]!, source.fields[0]!] },
    unknownChoice: {
      choices: [{ value: 'unknown', label: 'Unknown' }, source.choices[0]!],
    },
    duplicateChoice: { choices: [source.choices[0]!, source.choices[0]!] },
  }))
    it(`rejects unsupported ${name}`, () => {
      expect(() => project({ ...source, ...change })).toThrow(/^WAMN adapter:/)
    })
})
