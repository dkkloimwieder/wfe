import { FileInput } from '@wfe/components/file-input'
import assert from 'node:assert/strict'
import { createComponent, renderToString } from '@solidjs/web'
import { defineShell, ShellView } from '@wfe/shell'
import { Toast } from '@wfe/components'
import { Resizable } from '@wfe/components/resizable'
import {
  createTable as createNativeTable,
  nativeAggregations,
} from '@wfe/components/table'

const nativeOutput = await renderToString(() => {
  const table = createNativeTable({
    source: { ids: () => ['a'], get: () => ({ name: 'Native Ada' }) },
    columns: [{ id: 'name', accessorKey: 'name' }],
  })
  return String(table.createRowView('a').getVisibleCells()[0].getValue())
})
assert.equal(nativeOutput, 'Native Ada')
const nativeFeatures = await renderToString(() => {
  const records = {
    a: { color: 'red', score: 20 },
    b: { color: 'blue', score: 10 },
    c: { color: 'red', score: 30 },
  }
  const table = createNativeTable({
    source: { ids: () => ['a', 'b', 'c'], get: (id) => records[id] },
    columns: [
      { id: 'color', accessorKey: 'color' },
      {
        id: 'score',
        accessorKey: 'score',
        filterFn: (value, minimum) => value >= minimum,
        sortFn: (a, b) => a - b,
      },
    ],
    initialState: {
      globalFilter: 'red',
      columnFilters: [{ id: 'score', value: 15 }],
      sorting: [{ id: 'score', desc: true }],
    },
  })
  const score = table.getColumn('score')
  return `${table.getRowIds()}|${[...score.getFacetedUniqueValues().keys()]}|${score.getFacetedMinMaxValues()}`
})
assert.equal(nativeFeatures, 'c,a|20,30|20,30')
const nativeGroups = await renderToString(() => {
  const records = {
    a: { region: 'east', amount: 20 },
    b: { region: 'east', amount: 30 },
    c: { region: 'west', amount: 10 },
  }
  const table = createNativeTable({
    source: { ids: () => Object.keys(records), get: (id) => records[id] },
    columns: [
      { id: 'region', accessorKey: 'region' },
      {
        id: 'amount',
        accessorKey: 'amount',
        aggregationFn: nativeAggregations.sum,
      },
    ],
    initialState: { grouping: ['region'] },
  })
  return (
    table
      .getRootGroupKeys()
      .map((key) =>
        table
          .createGroupView(key)
          .getVisibleCells()
          .map((cell) => cell.getValue())
          .join(':'),
      )
      .join('|') + `|${table.getTotalValue('amount')}`
  )
})
assert.equal(nativeGroups, 'east:50|west:10|60')
const manualOutput = await renderToString(() => {
  const table = createNativeTable({
    source: { ids: () => ['partial'], get: () => ({ amount: 10 }) },
    columns: [
      {
        id: 'amount',
        accessorKey: 'amount',
        aggregationFn: nativeAggregations.sum,
      },
    ],
    manualProcessing: true,
    initialState: { globalFilter: 'missing', grouping: ['amount'] },
  })
  return `${table.getRowIds()}|${table.getRootGroupKeys().length}|${table.getTotalValue('amount')}`
})
assert.equal(manualOutput, 'partial|0|undefined')
console.log('Solid package imports and server cell rendering passed.')

const { createForm } = await import('@wfe/form')
let formCallbacks = 0
const formOutput = await renderToString(() => {
  const form = createForm({
    values: () => ({ title: 'Server record', quantity: 0, enabled: false }),
    defaults: () => ({ title: 'Server record', quantity: 0, enabled: false }),
    onValuesChange: () => {
      formCallbacks++
    },
    validate: () => {
      formCallbacks++
      return {}
    },
    onSubmit: () => {
      formCallbacks++
      return { ok: true }
    },
  })
  return `${form.values.title}|${form.values.quantity}|${form.values.enabled}|${form.phase}|${form.pending}|${form.dirty}`
})
assert.equal(formOutput, 'Server record|0|false|idle|false|false')
assert.equal(formCallbacks, 0)
console.log('Form package import and initial server state passed.')

const toastWarnings = []
const originalWarn = console.warn
let toastOutput
try {
  console.warn = (...args) => {
    toastWarnings.push(args.map(String).join(' '))
    originalWarn(...args)
  }
  toastOutput = await renderToString(() =>
    Toast({ open: true, persistent: true, children: 'Server notification' }),
  )
} finally {
  console.warn = originalWarn
}
assert.match(toastOutput, /ui-toast/)
assert.match(toastOutput, /Server notification/)
assert.deepEqual(
  toastWarnings,
  [],
  'Toast server rendering and disposal remain pure',
)
console.log('Toast server rendering and disposal passed.')

const { FormView, TableView, LayoutView } = await import('@wfe/generator')
const generatorWarnings = []
let generatorOutput
try {
  console.warn = (...args) => generatorWarnings.push(args.map(String).join(' '))
  generatorOutput = await renderToString(() => {
    const form = createForm({
      values: () => ({ title: 'Generated record' }),
      defaults: () => ({ title: 'Generated record' }),
      onValuesChange() {},
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    const table = createNativeTable({
      source: { ids: () => ['one'], get: () => ({ title: 'Generated row' }) },
      columns: [{ id: 'title', accessorKey: 'title' }],
    })
    return LayoutView({
      description: {
        id: 'generated',
        panels: [
          { id: 'editor', view: 'editor' },
          { id: 'records', view: 'records' },
        ],
      },
      bindings: {
        views: {
          editor: () =>
            FormView({
              description: {
                id: 'editor',
                fields: [
                  { field: 'title', label: 'Record title', control: 'text' },
                ],
              },
              bindings: { form },
            }),
          records: () =>
            TableView({
              description: {
                id: 'records',
                columns: { title: { label: 'Heading' } },
              },
              bindings: { table },
            }),
        },
      },
    })
  })
} finally {
  console.warn = originalWarn
}
assert.match(generatorOutput, /Generated record/)
assert.match(generatorOutput, /Generated row/)
assert.match(generatorOutput, /Record title/)
assert.deepEqual(generatorWarnings, [])
console.log('Generator public server rendering and disposal passed.')

const { DatePicker, DateTimePicker } = await import('@wfe/components')
let dateRequests = 0
const datesOutput = await renderToString(() =>
  DatePicker({
    label: 'Server date',
    value: '2024-02-29',
    dateFormat: 'dd/MM/yyyy',
    onValueChange() {
      dateRequests++
    },
  }),
)
assert.match(datesOutput, /29\/02\/2024/)
const explicitDateTime = await renderToString(() =>
  DateTimePicker({
    label: 'Server appointment',
    value: '2024-02-29T02:15:16.123Z',
    timeZone: 'America/New_York',
    name: 'appointment',
    onValueChange() {
      dateRequests++
    },
  }),
)
assert.match(explicitDateTime, /2024-02-28/)
assert.match(explicitDateTime, /21:15/)
assert.match(explicitDateTime, /2024-02-29T02:15:16.123Z/)
const browserDateTime = await renderToString(() =>
  DateTimePicker({
    label: 'Browser appointment',
    value: '2024-02-29T02:15Z',
    onValueChange() {
      dateRequests++
    },
  }),
)
assert.match(browserDateTime, /Browser timezone pending/)
assert.doesNotMatch(browserDateTime, /02:15/)
assert.equal(dateRequests, 0)
console.log(
  'Date and datetime server rendering stay deterministic and do not request changes.',
)

const { ValueDisplay, formatDisplayValue } = await import('@wfe/components')
const displayDate = await renderToString(() =>
  ValueDisplay({
    value: '2024-02-29',
    format: 'date',
    dateFormat: 'dd/MM/yyyy',
    timeZone: 'America/New_York',
  }),
)
assert.match(displayDate, /29\/02\/2024/)
const displayUtc = await renderToString(() =>
  ValueDisplay({ value: '2024-02-29T02:15Z', format: 'datetime' }),
)
assert.match(displayUtc, /2024-02-29 02:15/)
const displayBrowser = await renderToString(() =>
  ValueDisplay({
    value: '2024-02-29T02:15Z',
    format: 'datetime',
    timeZone: 'browser',
  }),
)
assert.doesNotMatch(displayBrowser, /02:15|2024/)
assert.equal(
  formatDisplayValue('2024-02-29T09:15-05:30', 'datetime-iso'),
  '2024-02-29T14:45:00.000Z',
)
console.log(
  'Read-only date and datetime presentation stay deterministic during server rendering.',
)

let resizeCallbacks = 0
const closedPane = await renderToString(() =>
  Resizable({
    primaryLabel: 'Filters',
    primary: 'Retained primary',
    children: 'Results',
    defaultCollapsed: true,
    defaultSize: 46,
    onCollapsedChange: () => resizeCallbacks++,
    onSizeChange: () => resizeCallbacks++,
  }),
)
assert.match(closedPane, /aria-valuenow="0"/)
assert.match(closedPane, /hidden(?:="")?/)
assert.match(closedPane, /Retained primary/)
assert.match(closedPane, /Results/)
assert.equal(resizeCallbacks, 0)
console.log(
  'Initially closed resizable panes retain server content without callback requests.',
)

let fileCallbacks = 0
const fileOutput = await renderToString(() =>
  FileInput({
    label: 'Attachments',
    files: [],
    required: true,
    onFilesChange: () => fileCallbacks++,
  }),
)
assert.match(fileOutput, /type="file"/)
assert.match(fileOutput, /No files selected/)
assert.match(fileOutput, /Choose file/)
assert.equal(fileCallbacks, 0)
console.log(
  'File selection server rendering stays empty and does not request changes.',
)

let contextViews = 0,
  footerViews = 0
const workspaceOutput = await renderToString(() =>
  LayoutView({
    description: {
      id: 'organization',
      title: 'ACME',
      panels: [],
      context: [{ id: 'context', view: 'context' }],
      footer: [{ id: 'footer', view: 'footer' }],
    },
    bindings: {
      views: {
        context: () => {
          contextViews++
          return 'Project menu'
        },
        footer: () => {
          footerViews++
          return 'Ready'
        },
      },
    },
  }),
)
assert.match(workspaceOutput, /Project menu/)
assert.match(workspaceOutput, /<footer\b/)
assert.equal(contextViews, 1)
assert.equal(footerViews, 1)
for (const present of [true, false]) {
  const output = await renderToString(() =>
    LayoutView({
      description: {
        id: 'empty-footer',
        panels: [],
        ...(present ? { footer: [] } : {}),
      },
      bindings: { views: {} },
    }),
  )
  assert.equal(/<footer\b/.test(output), present)
}
console.log(
  'Workspace regions render once and keep empty footers distinct from absent footers.',
)

const { Table: SelectionTable, createTableSelection } =
  await import('@wfe/components/table')
let selectionCopyReads = 0
const selectionOutput = await renderToString(() => {
  const table = createNativeTable({
    source: { ids: () => ['a', 'b'], get: (id) => ({ name: id }) },
    columns: [{ id: 'name', accessorKey: 'name' }],
  })
  const selection = createTableSelection({
    rows: () => table.getRowIds(),
    columns: () => ['name'],
    getText: ({ row }) => {
      selectionCopyReads++
      return row
    },
    defaultValue: {
      anchor: { row: 'a', column: 'name' },
      focus: { row: 'b', column: 'name' },
    },
  })
  return SelectionTable({
    table,
    selection,
    accessibleLabel: 'Selected server records',
  })
})
assert.equal(selectionCopyReads, 0)
assert.match(selectionOutput, /Selected server records/)
assert.match(
  selectionOutput.replace(/<!--[\s\S]*?-->/g, ''),
  /2 rows by 1 columns selected/,
)
assert.equal((selectionOutput.match(/aria-live="polite"/g) ?? []).length, 1)
assert.equal(selectionOutput.includes('data-native-cell-selection'), false)
console.log(
  'SSR table selection renders one status without DOM effects or copy reads',
)

let shellRequests = 0
const shellDescription = defineShell({
  id: 'server-shell',
  title: 'Workspace',
  audiences: [{ id: 'work', label: 'Work' }],
  routes: [{ id: 'records', label: 'Records & reports', view: 'records' }],
})
const shellOutput = await renderToString(() =>
  createComponent(ShellView, {
    description: shellDescription,
    bindings: {
      audience: () => 'work',
      route: () => 'records',
      href: () => '#records',
      views: { records: () => 'Page content' },
      onNavigate: () => {
        shellRequests++
      },
      onAudienceChange: () => {
        shellRequests++
      },
    },
  }),
)
assert.match(shellOutput, /Records &amp; reports/)
assert.match(shellOutput, /Page content/)
assert.match(shellOutput, /href="#records"/)
assert.match(shellOutput, /aria-current="page"/)
assert.equal(shellRequests, 0)
console.log(
  'Described shell renders public metadata and page content without navigation requests.',
)
