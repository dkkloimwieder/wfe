import type { JSX } from '@solidjs/web'
import { createSignal, flush, onCleanup } from 'solid-js'
import { createTable, ReadOnlyTable } from '@wfe/components/table'

const records = Array.from({ length: 8 }, (_, index) => ({
  id: `page-record-${index + 1}`,
  name: `Record ${index + 1}`,
}))

export const paginationLifecycle = {
  hold: (_value: boolean) => {},
  accept: () => {},
  reject: () => {},
  unknownTotal: () => {},
  empty: () => {},
  read: () => ({ requests: 0, pending: false }),
}

/** Mock application code. Only this example chooses pages and accepts responses. */
export function PagedRecords(
  props: { embedded?: boolean; toolbarActions?: JSX.Element } = {},
) {
  const [page, setPage] = createSignal({
    index: 0,
    size: 3,
    rows: records.slice(0, 3),
  })
  const [pending, setPending] = createSignal(false)
  const [knownTotal, setKnownTotal] = createSignal(true)
  let alive = true
  let hold = false
  let requests = 0
  let response: (() => void) | undefined
  function accept() {
    const apply = response
    response = undefined
    if (alive && apply) apply()
  }
  function request(index: number, size: number) {
    if (!alive || pending()) return
    requests++
    setPending(true)
    response = () => {
      setPage({
        index,
        size,
        rows: records.slice(index * size, (index + 1) * size),
      })
      setPending(false)
    }
    if (!hold) queueMicrotask(accept)
  }
  paginationLifecycle.hold = (value) => {
    hold = value
  }
  paginationLifecycle.accept = () => {
    accept()
    flush()
  }
  paginationLifecycle.reject = () => {
    response = undefined
    if (alive) setPending(false)
    flush()
  }
  paginationLifecycle.unknownTotal = () => {
    if (alive) setKnownTotal(false)
    flush()
  }
  paginationLifecycle.empty = () => {
    if (alive) setPage({ ...page(), rows: [] })
    flush()
  }
  paginationLifecycle.read = () => ({ requests, pending: pending() })
  onCleanup(() => {
    alive = false
    response = undefined
  })
  const table = createTable({
    source: {
      ids: () => page().rows.map((row) => row.id),
      get: (id) => page().rows.find((row) => row.id === id),
    },
    columns: [{ id: 'name', header: 'Name', accessorKey: 'name' }],
    manualProcessing: true,
  })
  return (
    <section
      id="paged-records"
      style={{
        height: props.embedded ? undefined : '32rem',
        flex: props.embedded ? '1' : undefined,
        display: 'flex',
        'flex-direction': 'column',
        'min-width': 0,
        'min-height': 0,
      }}
    >
      <ReadOnlyTable
        table={table}
        toolbarActions={props.toolbarActions}
        title="Paged records"
        defaultControlsCollapsed
        controls={{
          sorting: false,
          filtering: false,
          search: false,
          grouping: false,
        }}
        onApplyFilters={() => request(page().index, page().size)}
        pagination={{
          get totalRows() {
            return knownTotal() ? records.length : undefined
          },
          get hasPrevious() {
            return page().index > 0
          },
          get hasNext() {
            return (page().index + 1) * page().size < records.length
          },
          get pending() {
            return pending()
          },
          get status() {
            return `Page ${page().index + 1}${knownTotal() ? ` of ${Math.ceil(records.length / page().size)}` : ''}`
          },
          onPrevious: () => request(page().index - 1, page().size),
          onNext: () => request(page().index + 1, page().size),
          pageSize: {
            get value() {
              return page().size
            },
            options: [3, 6],
            onValueChange: (size) => request(0, size),
          },
        }}
      />
    </section>
  )
}
