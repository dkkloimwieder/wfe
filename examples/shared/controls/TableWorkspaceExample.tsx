import { Show, createMemo, createSignal } from 'solid-js'
import {
  Button,
  Dialog,
  DropdownMenu,
  Field,
  Icon,
  IconButton,
  Label,
  SelectField,
} from '@wfe/components'
import { iconFlag } from '@wfe/components/icons'
import { DashboardPanel } from '@wfe/components/layout'
import {
  ReadOnlyTable,
  TableColumnResize,
  TableHeaderFilter,
  createTable,
} from '@wfe/components/table'
import type {
  NativeColumnDef,
  TableColumnAlignments,
} from '@wfe/components/table'
import { scalarText } from '../scalarText'
import { localTableViews } from './tableViewStorage'

const products = [
  'Replacement keyboard',
  'Wireless mouse',
  'Monitor stand',
  'Power adapter',
  'USB-C cable',
  'Network switch',
]
const inventory = Array.from({ length: 28 }, (_, index) => ({
  id: String(index + 1),
  name: products[index % products.length]!,
  reference: `INVENTORYBATCHREFERENCE${2026000 + index}`,
  warehouse: index % 2 === 0 ? 'North' : 'South',
  quantity: (index * 7) % 23,
}))
type Item = (typeof inventory)[number]
const columns: readonly NativeColumnDef<Item>[] = [
  {
    id: 'name',
    header: 'Product',
    accessorKey: 'name',
    sortFn: (left, right) => scalarText(left).localeCompare(scalarText(right)),
    filterFn: (value, filter) =>
      scalarText(value)
        .toLowerCase()
        .includes(scalarText(filter).toLowerCase()),
  },
  { id: 'reference', header: 'Reference', accessorKey: 'reference' },
  { id: 'warehouse', header: 'Warehouse', accessorKey: 'warehouse' },
  {
    id: 'quantity',
    header: 'In stock',
    accessorKey: 'quantity',
    sortFn: (left, right) => Number(left) - Number(right),
  },
]

const inventoryViews = localTableViews('inventory', {
  initialViewId: 'inventory-all',
  systemViews: [
    { id: 'inventory-all', name: 'All items', state: { version: 1 } },
    {
      id: 'inventory-north',
      name: 'North warehouse',
      state: { version: 1, extraFilters: 'North' },
    },
    {
      id: 'inventory-top',
      name: 'Top controls',
      state: { version: 1, controls: { placement: 'top', collapsed: false } },
    },
  ],
})

export function TableWorkspaceExample(props: { onBack: () => void }) {
  const [views, setViews] = createSignal(false)
  return (
    <Show
      when={views()}
      fallback={
        <InventoryWorkspace
          onBack={props.onBack}
          onSwitch={() => setViews(true)}
        />
      }
    >
      <InventoryWorkspace
        viewsDemo
        onBack={props.onBack}
        onSwitch={() => setViews(false)}
      />
    </Show>
  )
}

function InventoryWorkspace(props: {
  onBack: () => void
  onSwitch: () => void
  viewsDemo?: boolean
}) {
  const [savedView, setSavedView] = createSignal('all')
  const [warehouse, setWarehouse] = createSignal('all')
  const [page, setPage] = createSignal(0)
  const [pageSize, setPageSize] = createSignal(20)
  const resetKey = createMemo(() => [savedView(), warehouse()])
  const [wrap, setWrap] = createSignal(false)
  const [fixedColumns, setFixedColumns] = createSignal(false)
  const [alignment, setAlignment] = createSignal<TableColumnAlignments>({
    quantity: 'right',
  })
  const [flagged, setFlagged] = createSignal<ReadonlySet<string>>(new Set())
  const [selected, setSelected] = createSignal<Record<string, boolean>>({})
  const [message, setMessage] = createSignal('')
  const [inspected, setInspected] = createSignal<Item>()
  let menuTrigger: HTMLButtonElement | undefined
  const table = createTable({
    source: {
      ids: () =>
        inventory
          .filter(
            (row) =>
              (savedView() === 'all' || row.quantity < 5) &&
              (warehouse() === 'all' || row.warehouse === warehouse()),
          )
          .map((row) => row.id),
      get: (id) => inventory[Number(id) - 1],
    },
    columns,
  })
  return (
    <DashboardPanel fill title="Inventory workspace" role="group">
      <ReadOnlyTable
        table={table}
        title="Inventory workspace"
        titleVisible={false}
        selection
        fill
        toolbarLayout="wrap"
        minWidth="38rem"
        columnWidths={{ name: '7rem', reference: '9rem', quantity: '7rem' }}
        columnAlignment={alignment()}
        onColumnAlignmentChange={(id, value) =>
          setAlignment((previous) => ({ ...previous, [id]: value }))
        }
        cellWrap={wrap() ? 'anywhere' : 'normal'}
        defaultControlsCollapsed={!props.viewsDemo}
        controls={{
          grouping: props.viewsDemo === true,
          columnVisibility: !fixedColumns(),
          alignment: !fixedColumns(),
          columnReordering: !fixedColumns(),
        }}
        sortable={(column) => Boolean(column.columnDef?.sortFn)}
        filterable={(column) => Boolean(column.columnDef?.filterFn)}
        filterMode="live"
        search={{
          label: 'Search inventory',
          placeholder: 'Product or reference',
        }}
        views={
          props.viewsDemo
            ? {
                ...inventoryViews,
                extraFilters: {
                  capture: warehouse,
                  normalize: (value) =>
                    value === 'North' || value === 'South' ? value : 'all',
                  restore: (value) =>
                    setWarehouse(typeof value === 'string' ? value : 'all'),
                },
                formatting: {
                  capture: () => ({
                    wrap: wrap(),
                    fixedColumns: fixedColumns(),
                  }),
                  restore: (value) => {
                    if (
                      value !== null &&
                      typeof value === 'object' &&
                      'wrap' in value
                    )
                      setWrap(value.wrap === true)
                    if (
                      value !== null &&
                      typeof value === 'object' &&
                      'fixedColumns' in value
                    )
                      setFixedColumns(value.fixedColumns === true)
                  },
                },
              }
            : undefined
        }
        savedViews={
          props.viewsDemo
            ? undefined
            : {
                choices: [
                  { value: 'all', label: 'All items' },
                  { value: 'low', label: 'Low stock' },
                ],
                value: savedView(),
                onChange: setSavedView,
              }
        }
        headerEnd={
          props.viewsDemo
            ? (column) => {
                if (column.id === 'name')
                  return (
                    <TableHeaderFilter
                      columnId={column.id}
                      columnLabel="Product"
                      label="Product"
                      value={scalarText(column.getFilterValue())}
                      onValueChange={(value) =>
                        column.setFilterValue(value || undefined)
                      }
                    />
                  )
                if (column.id !== 'quantity') return undefined
                return (
                  <>
                    <DropdownMenu>
                      <DropdownMenu.Trigger aria-label="Pin In stock">
                        <Icon name="controls" />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content>
                          <DropdownMenu.Item
                            onSelect={() => column.pin('start')}
                          >
                            Pin at start
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onSelect={() => column.pin('end')}>
                            Pin at end
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onSelect={() => column.pin(false)}>
                            Unpin
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu>
                    <TableColumnResize
                      label="In stock"
                      size={column.getSize()}
                      min={40}
                      max={500}
                      onSizeChange={column.setSize}
                    />
                  </>
                )
              }
            : undefined
        }
        extraFilters={
          <Field>
            <Label>Warehouse</Label>
            <SelectField
              label="Warehouse"
              choices={[
                { value: 'all', label: 'All warehouses' },
                { value: 'North', label: 'North' },
                { value: 'South', label: 'South' },
              ]}
              value={warehouse()}
              onValueChange={setWarehouse}
            />
          </Field>
        }
        filtersActive={savedView() !== 'all' || warehouse() !== 'all'}
        onClearFilters={() => {
          setSavedView('all')
          setWarehouse('all')
        }}
        emptyResults={(state) => (
          <>
            <p role="status">
              {state.filtered
                ? 'No items match your filters.'
                : 'No inventory yet.'}
            </p>
            <Show when={state.filtered}>
              <Button onClick={state.clearFilters}>
                Reset inventory filters
              </Button>
            </Show>
          </>
        )}
        leadingColumn={{
          label: 'Flag',
          width: '3rem',
          cell: (row) => (
            <IconButton
              aria-label={`Flag item ${row.id}`}
              aria-pressed={flagged().has(row.id) ? 'true' : 'false'}
              variant={flagged().has(row.id) ? 'filled' : 'ghost'}
              onClick={() =>
                setFlagged((old) => {
                  const next = new Set(old)
                  if (next.has(row.id)) next.delete(row.id)
                  else next.add(row.id)
                  return next
                })
              }
            >
              <Icon glyph={iconFlag} />
            </IconButton>
          ),
        }}
        clientPagination={{
          pageSizes: [20, 10, 30],
          page: page(),
          onPageChange: setPage,
          pageSize: pageSize(),
          onPageSizeChange: setPageSize,
          resetKey: resetKey(),
        }}
        rowSelection={{
          selected: selected(),
          onChange: setSelected,
          selectAll: 'page',
        }}
        renderRowActions={(row) => (
          <Button
            aria-label={`Check stock for item ${row.id}`}
            onClick={() =>
              setMessage(`${row.original?.quantity ?? 0} in stock`)
            }
          >
            Check stock
          </Button>
        )}
        rowActions={(row, { getMenuTrigger }) => [
          {
            label: 'Inspect item',
            onSelect: () => {
              menuTrigger = getMenuTrigger()
              setInspected(row.original)
            },
          },
        ]}
        bulkActions={
          <Button
            onClick={() =>
              setMessage(`${Object.keys(selected()).length} items selected`)
            }
          >
            Review selected
          </Button>
        }
        toolbarActions={
          <>
            <Button onClick={props.onBack}>Basic table</Button>
            <Button onClick={props.onSwitch}>
              {props.viewsDemo ? 'Workspace example' : 'Saved views example'}
            </Button>
            <Button
              aria-pressed={wrap() ? 'true' : 'false'}
              onClick={() => setWrap(!wrap())}
            >
              Wrap long tokens
            </Button>
            <Button
              aria-pressed={fixedColumns() ? 'true' : 'false'}
              onClick={() => setFixedColumns(!fixedColumns())}
            >
              Fixed columns
            </Button>
            <Show when={message()}>
              <output
                class="ui-help-text"
                style={{
                  margin: 0,
                  padding:
                    'var(--ui-control-padding-y) var(--ui-control-padding-x)',
                  background: 'var(--ui-surface)',
                }}
              >
                {message()}
              </output>
            </Show>
          </>
        }
      />
      <Dialog
        open={Boolean(inspected())}
        onOpenChange={(open) => {
          if (!open) setInspected(undefined)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content restoreFocus={() => menuTrigger}>
            <Dialog.Title>{inspected()?.name}</Dialog.Title>
            <Dialog.Description>{inspected()?.reference}</Dialog.Description>
            <Dialog.CloseButton aria-label="Close item">
              Close item
            </Dialog.CloseButton>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </DashboardPanel>
  )
}
