import { createSignal } from 'solid-js'
import { Button } from '@wfe/components'
import { createTable } from '@wfe/components/table'
import { TableView } from '@wfe/generator'
import type { NativeTableState } from '@wfe/components/table'

export function createColumnControlsApplication() {
  const [mode, setMode] = createSignal<'client' | 'sorting' | 'processing'>(
    'client',
  )
  const [enabled, setEnabled] = createSignal(true)
  const [sorting, setSorting] = createSignal<NativeTableState['sorting']>([])
  const [requests, setRequests] = createSignal(0)
  const rows = [
    { id: 'b', name: 'Beta' },
    { id: 'a', name: 'Alpha' },
  ]
  const table = createTable({
    source: {
      ids: () => rows.map((row) => row.id),
      get: (id) => rows.find((row) => row.id === id)!,
    },
    get columns() {
      return [
        {
          id: 'name',
          accessorKey: 'name' as const,
          sortFn:
            mode() === 'client'
              ? (a: unknown, b: unknown) => String(a).localeCompare(String(b))
              : undefined,
          filterFn: (value: unknown, query: unknown) =>
            String(value).includes(String(query)),
        },
        { id: 'actions', accessorFn: () => '' },
      ]
    },
    get manualSorting() {
      return mode() === 'sorting'
    },
    get manualProcessing() {
      return mode() === 'processing'
    },
    state: {
      get sorting() {
        return sorting()
      },
    },
    onSortingChange: (next) => {
      setSorting(next)
      setRequests((value) => value + 1)
    },
  })
  return {
    kind: 'column-controls' as const,
    table,
    mode,
    enabled,
    toggle: () => setEnabled((value) => !value),
    selectMode: (next: ReturnType<typeof mode>) => {
      setSorting([])
      setMode(next)
    },
    snapshot: () => ({ sorting: sorting(), requests: requests() }),
  }
}

export function ColumnControlsApp(props: {
  ready?: (app: ReturnType<typeof createColumnControlsApplication>) => void
}) {
  const app = createColumnControlsApplication()
  props.ready?.(app)
  const Actions = () => <Button onClick={() => undefined}>View</Button>
  return (
    <>
      <div class="ui-form-actions">
        <Button onClick={() => app.selectMode('client')}>Client sorting</Button>
        <Button onClick={() => app.selectMode('sorting')}>
          Server sorting
        </Button>
        <Button onClick={() => app.selectMode('processing')}>
          Server processing
        </Button>
        <Button onClick={app.toggle}>Toggle name controls</Button>
      </div>
      <TableView
        description={{
          id: 'column-controls',
          title: 'Column controls',
          columns: {
            name: {
              label: 'Name',
              sortable: app.enabled(),
              filterable: app.enabled(),
            },
            actions: {
              label: 'Actions',
              sortable: false,
              filterable: false,
              renderer: 'actions',
            },
          },
          controls: { search: false, grouping: false, columnReordering: false },
        }}
        bindings={{
          table: app.table,
          controlsCollapsed: false,
          cells: {
            actions: Actions,
          },
        }}
      />
    </>
  )
}
