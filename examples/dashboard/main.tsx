import { render } from '@solidjs/web'
import { OBSERVE, action, createSignal, flush } from 'solid-js'
import {
  Button,
  Checkbox,
  Field,
  FieldError,
  Input,
  Label,
  NativeSelect,
} from '@wfe/components'
import {
  DashboardGrid,
  DashboardPanel,
  DashboardShell,
} from '@wfe/components/layout'
import { createTable, ReadOnlyTable } from '@wfe/components/table'
import { nativeEvents } from '@wfe/components/events'
import '@wfe/components/styles.css'
import './style.css'

type RecordData = { id: string; name: string; region: string; active: string }
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
          active: 'Yes',
        },
      ]
    }),
  )
}
const textColumn = {
  filterFn: (value: unknown, filter: unknown) =>
    String(value ?? '')
      .toLowerCase()
      .includes(String(filter).toLowerCase()),
  sortFn: (a: unknown, b: unknown) =>
    String(a ?? '').localeCompare(String(b ?? ''), undefined, {
      numeric: true,
    }),
}
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
}
function Dashboard() {
  const [rows, setRows] = createSignal(records(2))
  const [name, setName] = createSignal('')
  const [region, setRegion] = createSignal('West')
  const [active, setActive] = createSignal(true)
  const [invalid, setInvalid] = createSignal(false)
  const [status, setStatus] = createSignal(
    'Ready. Changes stay in this example.',
  )
  const [section, setSection] = createSignal('Records')
  let nextId = 0
  replaceRows = (count) => setRows(records(count))
  const table = createTable<RecordData>({
    source: { ids: () => [...rows().keys()], get: (id) => rows().get(id) },
    columns: [
      {
        ...textColumn,
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        enableHiding: false,
      },
      { ...textColumn, id: 'region', header: 'Region', accessorKey: 'region' },
      { ...textColumn, id: 'active', header: 'Active', accessorKey: 'active' },
    ],
  })
  function save(event: SubmitEvent) {
    event.preventDefault()
    const accepted = name().trim()
    setInvalid(!accepted)
    if (!accepted) {
      setStatus('Enter a record name.')
      return
    }
    const id = `created-${++nextId}`
    setRows(
      (old) =>
        new Map([
          ...old,
          [
            id,
            {
              id,
              name: accepted,
              region: region(),
              active: active() ? 'Yes' : 'No',
            },
          ],
        ]),
    )
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
          <div class="buttons" aria-label="Example data">
            <Button onClick={() => replaceRows?.(0)}>Empty results</Button>
            <Button onClick={() => replaceRows?.(2)}>Two records</Button>
            <Button onClick={() => replaceRows?.(500)}>500 records</Button>
          </div>
          <ReadOnlyTable table={table} title="Records" />
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
            <p>{rows().size} records in application memory.</p>
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
  release = render(Dashboard, document.getElementById('root')!)
  flush()
}
const api = {
  start,
  stop,
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
