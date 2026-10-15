import { render } from '@solidjs/web'
import { OBSERVE, action, createSignal, createStore, flush } from 'solid-js'
import {
  Button,
  Checkbox,
  Field,
  FieldError,
  Input,
  Label,
  NativeSelect,
  uiScope,
} from '@wfe/components'
import {
  DashboardGrid,
  DashboardPanel,
  DashboardShell,
} from '@wfe/components/layout'
import { createTable, ReadOnlyTable } from '@wfe/components/table'
import type {
  NativeSource,
  TableDateRange,
  TableFilterConfig,
  TableColumnFilterValue,
} from '@wfe/components/table'
import { nativeEvents } from '@wfe/components/events'
import '@wfe/components/styles.css'
import './style.css'

type RecordData = {
  id: string
  name: string
  region: string
  active: boolean
  created: string
  status: string
  amount: number | null
  tags: string[]
  notes: string | null
}
function records(count: number): Map<string, RecordData> {
  return new Map(
    Array.from({ length: count }, (_, index) => {
      const id = `record-${index + 1}`
      return [
        id,
        {
          id,
          name: `Record ${index + 1}`,
          region: index % 2 ? 'East' : 'West',
          active: index % 2 === 0,
          status: ['Open', 'Closed', 'Archived', 'Open'][index % 4]!,
          amount: [0, 12.5, null, -3.25][index % 4]!,
          tags: [
            ['Priority', 'Internal'],
            ['External'],
            [],
            ['Priority', 'External'],
          ][index % 4]!,
          notes: [null, 'Ready to review', '', 'Follow up'][index % 4]!,
          created: new Date(Date.UTC(2026, 0, 1 + (index % 365)))
            .toISOString()
            .slice(0, 10),
        },
      ]
    }),
  )
}
function createRecordsData() {
  const [rows, setRows] = createStore<Record<string, RecordData | undefined>>(
    Object.fromEntries(records(8)),
    { shallow: true, name: 'dashboard.records' },
  )
  return {
    ids: () => Object.keys(rows),
    get: (id: string) => rows[id],
    replace: (count: number) =>
      setRows(() => Object.fromEntries(records(count))),
    add: (record: RecordData) =>
      setRows((draft) => {
        draft[record.id] = record
      }),
  }
}
const choice = (values: string[]) =>
  values.map((value) => ({ value, label: value }))
const filterConfigurations: Record<string, TableFilterConfig> = {
  active: { kind: 'boolean' },
  created: { kind: 'date-range' },
  name: { kind: 'text' },
  region: { kind: 'select', choices: choice(['West', 'East']), exclude: true },
  status: {
    kind: 'multi-select',
    choices: choice(['Open', 'Closed', 'Archived']),
    exclude: true,
  },
  amount: { kind: 'number-range', empty: true },
  tags: {
    kind: 'tags',
    choices: choice(['Priority', 'Internal', 'External']),
    empty: true,
    exclude: true,
  },
  notes: { kind: 'text', empty: true },
}
function matchFilter(value: unknown, filter: unknown) {
  const term = filter as TableColumnFilterValue
  const empty =
    value == null || value === '' || (Array.isArray(value) && !value.length)
  if (term.operator === 'empty') return empty
  if (term.operator === 'not-empty') return !empty
  if (empty) return false
  if (term.operator === 'between')
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      (term.min === undefined || value >= term.min) &&
      (term.max === undefined || value <= term.max)
    )
  if ('values' in term) {
    const values = Array.isArray(value) ? value : [String(value)]
    if (term.operator === 'all')
      return term.values.every((selected) => values.includes(selected))
    const matches = term.values.some((selected) => values.includes(selected))
    return term.operator === 'not-in' ? !matches : matches
  }
  if (!('value' in term)) return false
  const text = String(value).toLowerCase()
  const query = term.value.toLowerCase()
  if (term.operator === 'equals') return text === query
  if (term.operator === 'starts-with') return text.startsWith(query)
  if (term.operator === 'not-contains') return !text.includes(query)
  return text.includes(query)
}
const textColumn = {
  filterFn: matchFilter,
  sortFn: (a: unknown, b: unknown) =>
    String(a ?? '').localeCompare(String(b ?? ''), undefined, {
      numeric: true,
    }),
}
const displayValue = (value: unknown) =>
  Array.isArray(value) ? value.join(', ') : String(value ?? '')
let applyFilter: ((id: string, value: unknown) => void) | undefined
let release: (() => void) | undefined
let replaceRows: ((count: number) => void) | undefined
let capture:
  ReturnType<NonNullable<typeof OBSERVE>['diagnostics']['capture']> | undefined
const events: unknown[] = []
// eslint-disable-next-line require-yield -- Use the qualified synchronous disposal path.
const disposeRoot = action(function* () {
  release?.()
})
function stop() {
  disposeRoot()
  flush()
  release = undefined
  replaceRows = undefined
  applyFilter = undefined
}
function createRecordsTable(source: NativeSource<RecordData>) {
  const table = createTable<RecordData>({
    source,
    globalFilterFn: (value, query) =>
      displayValue(value).toLowerCase().includes(query.toLowerCase()),
    columns: [
      {
        ...textColumn,
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        enableHiding: false,
      },
      { ...textColumn, id: 'region', header: 'Region', accessorKey: 'region' },
      {
        id: 'active',
        header: 'Active',
        accessorKey: 'active',
        filterFn: (value, filter) => value === filter,
        sortFn: (a, b) => Number(a) - Number(b),
      },
      {
        id: 'created',
        header: 'Created',
        accessorKey: 'created',
        filterFn: (value, filter) => {
          const range = filter as TableDateRange
          return (
            typeof value === 'string' &&
            (!range.start || value >= range.start) &&
            (!range.end || value <= range.end)
          )
        },
        sortFn: (a, b) => String(a).localeCompare(String(b)),
      },
      { ...textColumn, id: 'status', header: 'Status', accessorKey: 'status' },
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'amount',
        filterFn: matchFilter,
        sortFn: (a, b) => Number(a) - Number(b),
        sortMissing: 'last',
      },
      {
        ...textColumn,
        id: 'tags',
        header: 'Tags',
        accessorKey: 'tags',
        getGroupingValue: (record) => record.tags.join(', ') || undefined,
      },
      {
        ...textColumn,
        id: 'notes',
        header: 'Notes',
        accessorKey: 'notes',
        getGroupingValue: (record) => record.notes || undefined,
      },
    ],
  })
  applyFilter = (id, value) => table.getColumn(id)?.setFilterValue(value)
  return table
}
function TablePage() {
  const rows = createRecordsData()
  replaceRows = rows.replace
  const table = createRecordsTable(rows)
  return (
    <main
      {...uiScope()}
      data-ui-portal-root=""
      class="table-page"
      aria-label="Records workspace"
    >
      <ReadOnlyTable
        table={table}
        title="Records"
        filter={(column) => filterConfigurations[column.id]}
        formatValue={displayValue}
        actions={<RecordActions />}
      />
    </main>
  )
}
function RecordActions() {
  return (
    <div class="buttons" aria-label="Example data">
      <Button onClick={() => replaceRows?.(0)}>Empty results</Button>
      <Button onClick={() => replaceRows?.(2)}>Two records</Button>
      <Button onClick={() => replaceRows?.(8)}>Eight records</Button>
      <Button onClick={() => replaceRows?.(500)}>500 records</Button>
    </div>
  )
}
function Dashboard() {
  const rows = createRecordsData()
  const [name, setName] = createSignal('')
  const [region, setRegion] = createSignal('West')
  const [active, setActive] = createSignal(true)
  const [invalid, setInvalid] = createSignal(false)
  const [status, setStatus] = createSignal(
    'Ready. Changes stay in this example.',
  )
  const [section, setSection] = createSignal('Records')
  let nextId = 0
  replaceRows = rows.replace
  const table = createRecordsTable(rows)
  function save(event: SubmitEvent) {
    event.preventDefault()
    const accepted = name().trim()
    setInvalid(!accepted)
    if (!accepted) {
      setStatus('Enter a record name.')
      return
    }
    const id = `created-${++nextId}`
    rows.add({
      id,
      name: accepted,
      region: region(),
      active: active(),
      created: new Date().toISOString().slice(0, 10),
      status: 'Open',
      amount: 0,
      tags: [],
      notes: null,
    })
    setStatus(`Saved ${accepted}.`)
    setName('')
  }
  return (
    <DashboardShell
      header={<h1>Workspace</h1>}
      mainLabel="Records workspace"
      scroll="content"
      navigation={({ close }) => (
        <div class="dashboard-navigation">
          <Button
            aria-current={section() === 'Records' ? 'page' : undefined}
            onClick={() => {
              setSection('Records')
              setStatus('Records selected.')
              close()
            }}
          >
            Records
          </Button>
          <Button
            aria-current={section() === 'Activity' ? 'page' : undefined}
            onClick={() => {
              setSection('Activity')
              setStatus(
                'Activity selected. This example keeps the records view open.',
              )
              close()
            }}
          >
            Activity
          </Button>
        </div>
      )}
    >
      <DashboardGrid class="dashboard-workspace">
        <DashboardPanel fill id="records-panel">
          <ReadOnlyTable
            table={table}
            title="Records"
            filter={(column) => filterConfigurations[column.id]}
            formatValue={displayValue}
            actions={<RecordActions />}
          />
        </DashboardPanel>
        <div class="dashboard-sidebar">
          <DashboardPanel>
            <h2>Add record</h2>
            <form
              novalidate
              ref={nativeEvents<HTMLFormElement>({ submit: save })}
            >
              <Field required invalid={invalid()}>
                <Label>Record name</Label>
                <Input value={name()} onValueChange={setName} />
                <FieldError>Enter a record name.</FieldError>
              </Field>
              <Field>
                <Label>Region</Label>
                <NativeSelect value={region()} onValueChange={setRegion}>
                  <option>West</option>
                  <option>East</option>
                </NativeSelect>
              </Field>
              <Checkbox checked={active()} onChange={setActive}>
                <Checkbox.Input />
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Label>Active record</Checkbox.Label>
              </Checkbox>
              <Button type="submit">Save record</Button>
            </form>
          </DashboardPanel>
          <DashboardPanel>
            <h2>Activity</h2>
            <p role="status" id="application-status">
              {status()}
            </p>
            <p>{rows.ids().length} records in application memory.</p>
          </DashboardPanel>
        </div>
      </DashboardGrid>
    </DashboardShell>
  )
}
function start() {
  stop()
  events.push(...(capture?.stop() ?? []))
  capture = OBSERVE?.diagnostics.capture()
  release = render(
    new URLSearchParams(location.search).has('composition')
      ? Dashboard
      : TablePage,
    document.getElementById('root')!,
  )
  flush()
}
const api = {
  start,
  stop,
  setFilter: (id: string, value: unknown) => {
    applyFilter?.(id, value)
    flush()
  },
  replaceRows: (count: number) => {
    replaceRows?.(count)
    flush()
  },
  diagnostics: () => {
    events.push(...(capture?.stop() ?? []))
    return events.splice(0)
  },
}
declare global {
  interface Window {
    dashboardFixture: typeof api
  }
}
window.dashboardFixture = api
start()
