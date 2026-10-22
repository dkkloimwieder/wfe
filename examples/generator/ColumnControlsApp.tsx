import { Show, createSignal, onCleanup } from 'solid-js'
import { Button, FieldGroup, FormActions } from '@wfe/components'
import { createTable } from '@wfe/components/table'
import { TableView } from '@wfe/generator'
import type { CustomCellProps } from '@wfe/generator'
import type { NativeTableState } from '@wfe/components/table'

type ActionRow = {
  id: string
  name: string
  archived: boolean
  pending: boolean
}
type RowAction = 'open' | 'archive'

export function createColumnControlsApplication() {
  const [mode, setMode] = createSignal<'client' | 'sorting' | 'processing'>(
    'client',
  )
  const [enabled, setEnabled] = createSignal(true)
  const [sorting, setSorting] = createSignal<NativeTableState['sorting']>([])
  const [requests, setRequests] = createSignal(0)
  const [rows, setRows] = createSignal<ActionRow[]>([
    { id: 'b', name: 'Beta', archived: false, pending: false },
    { id: 'a', name: 'Alpha', archived: true, pending: true },
  ])
  const [calls, setCalls] = createSignal<
    { handler: string; action: RowAction; id: string; name: string }[]
  >([])
  const recordCall = (handler: string, action: RowAction, row: ActionRow) =>
    setCalls((previous) => [
      ...previous,
      { handler, action, id: row.id, name: row.name },
    ])
  const [handler, setHandler] = createSignal(
    () => (action: RowAction, row: ActionRow) => {
      recordCall('initial', action, row)
    },
  )
  const lifecycle = { mounts: 0, disposals: 0 }
  const updateRow = (id: string, patch: Partial<ActionRow>) =>
    setRows((previous) =>
      previous.map((row) => (row.id === id ? { ...row, ...patch, id } : row)),
    )
  const replaceHandler = () =>
    setHandler(() => (action: RowAction, row: ActionRow) => {
      recordCall('replacement', action, row)
    })
  const table = createTable({
    source: {
      ids: () => rows().map((row) => row.id),
      get: (id) => rows().find((row) => row.id === id)!,
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
    rows,
    calls,
    handler,
    lifecycle,
    updateRow,
    replaceHandler,
    mode,
    enabled,
    toggle: () => setEnabled((value) => !value),
    selectMode: (next: ReturnType<typeof mode>) => {
      setSorting([])
      setMode(next)
    },
    snapshot: () => ({
      sorting: sorting(),
      requests: requests(),
      calls: calls(),
      lifecycle: { ...lifecycle },
    }),
  }
}

export function ColumnControlsApp(props: {
  ready?: (app: ReturnType<typeof createColumnControlsApplication>) => void
}) {
  const app = createColumnControlsApplication()
  props.ready?.(app)
  const Actions = (props: CustomCellProps<ActionRow, unknown>) => {
    app.lifecycle.mounts++
    onCleanup(() => app.lifecycle.disposals++)
    return (
      <Show when={props.row.original}>
        {(row) => (
          <FormActions>
            <Button
              disabled={row().pending}
              aria-label={`${row().archived ? 'View' : 'Edit'} ${row().name}`}
              onClick={() => app.handler()('open', row())}
            >
              {row().archived ? 'View' : 'Edit'}
            </Button>
            <Show when={!row().archived}>
              <Button
                disabled={row().pending}
                aria-label={`Archive ${row().name}`}
                onClick={() => app.handler()('archive', row())}
              >
                Archive
              </Button>
            </Show>
          </FormActions>
        )}
      </Show>
    )
  }
  return (
    <>
      <FieldGroup title="Example controls">
        <FormActions>
          <Button onClick={() => app.selectMode('client')}>
            Client sorting
          </Button>
          <Button onClick={() => app.selectMode('sorting')}>
            Server sorting
          </Button>
          <Button onClick={() => app.selectMode('processing')}>
            Server processing
          </Button>
          <Button onClick={app.toggle}>Toggle name controls</Button>
          <Button
            onClick={() =>
              app.updateRow('b', { pending: !app.rows()[0]!.pending })
            }
          >
            Toggle Beta pending
          </Button>
          <Button
            onClick={() =>
              app.updateRow('b', { archived: !app.rows()[0]!.archived })
            }
          >
            Toggle Beta archived
          </Button>
          <Button onClick={app.replaceHandler}>Replace action callback</Button>
        </FormActions>
        <p role="status">
          {app.calls().length
            ? JSON.stringify(app.calls().at(-1))
            : 'Choose a row action to see the application callback.'}
        </p>
      </FieldGroup>
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
