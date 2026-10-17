import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createRoot } from 'solid-js'
import { createTable, nativeAggregations } from '@wfe/components/table'
import * as components from '@wfe/components'

test('all public source, client, server, style, and type targets exist', async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL('../packages/components/package.json', import.meta.url),
      'utf8',
    ),
  )
  for (const entry of Object.values(manifest.exports)) {
    for (const file of typeof entry === 'string'
      ? [entry]
      : Object.values(entry)) {
      await access(new URL('../packages/components/' + file, import.meta.url))
    }
  }
  for (const name of [
    'Icon',
    'Input',
    'Calendar',
    'DatePicker',
    'Checkbox',
    'Select',
    'Combobox',
    'Dialog',
    'Popover',
    'Table',
    'ReadOnlyTable',
    'TableDateFilter',
    'TableColumnFilter',
    'TableWorkspace',
    'TableControlSection',
    'DashboardShell',
    'DashboardGrid',
    'DashboardPanel',
  ]) {
    assert.equal(typeof components[name], 'function', name)
  }
})

test('the public table entry reads application records without an adapter', () => {
  createRoot((dispose) => {
    const rows = {
      a: { name: 'Ada', amount: 2 },
      b: { name: 'Grace', amount: 3 },
    }
    const table = createTable({
      source: { ids: () => ['a', 'b'], get: (id) => rows[id] },
      columns: [
        { id: 'name', accessorKey: 'name' },
        {
          id: 'amount',
          accessorKey: 'amount',
          aggregationFn: nativeAggregations.sum,
        },
      ],
    })
    assert.deepEqual(table.getSourceIds(), ['a', 'b'])
    assert.equal(
      table.createRowView('a').getVisibleCells()[0].getValue(),
      'Ada',
    )
    dispose()
  })
})

test('form package exposes its built entry and declarations', async () => {
  const { createForm } = await import('@wfe/form')
  assert.equal(typeof createForm, 'function')
  const manifest = JSON.parse(
    await readFile(
      new URL('../packages/form/package.json', import.meta.url),
      'utf8',
    ),
  )
  for (const file of Object.values(manifest.exports['.'])) {
    await access(new URL('../packages/form/' + file, import.meta.url))
  }
})
