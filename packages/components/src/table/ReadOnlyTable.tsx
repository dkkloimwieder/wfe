import { Icon } from '../components/Icon'
import {
  For,
  Show,
  createMemo,
  createStore,
  createUniqueId,
  onCleanup,
  untrack,
} from 'solid-js'
import { Checkbox } from '../components/Checkbox'
import { Button } from '../components/NativeFields'
import { SelectField } from '../components/Select'
import { createTableFilterDraft } from './createTableFilterDraft'
import type { TableFilterCriteria } from './createTableFilterDraft'
import { TableSort } from './TableSort'
import { Table, TableRow } from './Table'
import {
  TableDetailToggle,
  TableDetailRow,
  useTableDetail,
} from './TableDetails'
import type { TableRowDetails } from './TableDetails'
import type { TableSelection } from './createTableSelection'
import type { TableColumnAlignment, TableColumnAlignments } from './Table'
import { TableControlSection, TableWorkspace } from './TableWorkspace'
import type { TableWorkspaceProps, TableControlsHandle } from './TableWorkspace'
import { TableFilter } from './TableFilter'
import { TableDateFilter } from './TableDateFilter'
import { TableColumnFilter } from './TableColumnFilter'
import type {
  TableColumnFilterConfig,
  TableColumnFilterValue,
} from './TableColumnFilter'
import type { TableDateRange } from './TableDateFilter'
import { TableGrouping } from './TableGrouping'
import { TableColumnMove, moveColumn } from './TableColumnMove'
import type { JSX } from '@solidjs/web'
import type { NativeCell, NativeColumn, NativeTable } from './engine'

export type TableFilterConfig =
  TableColumnFilterConfig | { kind: 'boolean' | 'date-range' }

/** Full display features over an application-owned table, without editing state. */
export function ReadOnlyTable<T, M>(
  props: {
    table: NativeTable<T, M>
    selection?: TableSelection
    rowDetails?: TableRowDetails
    columnAlignment?: TableColumnAlignments
    onColumnAlignmentChange?: (
      id: string,
      alignment: TableColumnAlignment,
    ) => void
    controlsResizable?: boolean
    controlsSize?: number
    defaultControlsSize?: number
    onControlsSizeChange?: (size: number) => void
    controlsPlacement?: TableWorkspaceProps['controlsPlacement']
    controlsCollapsed?: boolean
    defaultControlsCollapsed?: boolean
    onControlsCollapsedChange?: (collapsed: boolean) => void
    title?: string
    controls?: {
      sorting?: boolean
      filtering?: boolean
      search?: boolean
      grouping?: boolean
      columnReordering?: boolean
    }
    /** Persistent application actions beside the table controls toggle. */
    toolbarActions?: JSX.Element
    actions?: JSX.Element
    configuration?: JSX.Element
    formatting?: JSX.Element
    /** Receives criteria on refresh, including unchanged criteria for reloading. */
    onApplyFilters?: (criteria: TableFilterCriteria) => void
    label?: (column: NativeColumn<T, M>) => string
    filter?: (column: NativeColumn<T, M>) => TableFilterConfig | undefined
    filterKind?: (
      column: NativeColumn<T, M>,
    ) => 'text' | 'boolean' | 'date-range'
    groupable?: (id: string) => boolean
    renderCell?: (cell: NativeCell<T, M>) => JSX.Element
    formatValue?: (value: unknown, column: NativeColumn<T, M>) => JSX.Element
    formatSummary?: (value: unknown, column: NativeColumn<T, M>) => JSX.Element
  } & Pick<Parameters<typeof Table<T, M>>[0], 'width' | 'headerEnd'>,
) {
  const isDetail = useTableDetail()
  const [localAlignment, setLocalAlignment] = createStore<
    Record<string, TableColumnAlignment | undefined>
  >({})
  const alignment = () => props.columnAlignment ?? localAlignment
  const changeAlignment = (id: string, value: string) => {
    if (value !== 'left' && value !== 'center' && value !== 'right') return
    if (props.columnAlignment === undefined)
      setLocalAlignment((draft) => {
        draft[id] = value
      })
    props.onColumnAlignmentChange?.(id, value)
  }
  const initialDetailRenderer = untrack(() => props.rowDetails?.render)
  const details = createMemo(() => {
    const value = props.rowDetails
    if (value?.render !== initialDetailRenderer)
      throw new Error('Remount the table to replace its row detail renderer.')
    return value
  })
  const detailPrefix = createUniqueId()
  let alive = true
  onCleanup(() => {
    alive = false
  })
  function DataRow(row: { id: string }) {
    const id = untrack(() => row.id)
    const contentId = `${detailPrefix}-detail-${Array.from(id)
      .map((char) => char.codePointAt(0)!.toString(16))
      .join('-')}`
    let toggle: HTMLButtonElement | undefined
    const available = () =>
      Boolean(details()) && (details()?.canExpand?.(id) ?? true)
    const expanded = () => available() && Boolean(details()?.expanded(id))
    return (
      <TableRow
        table={table}
        id={id}
        columnAlignment={alignment()}
        renderCell={props.renderCell}
        formatValue={props.formatValue}
        leading={() => (
          <Show when={details()}>
            <td class="sub-table-control">
              <Show when={available()}>
                <TableDetailToggle
                  rowId={id}
                  contentId={contentId}
                  expanded={expanded()}
                  disabled={details()?.disabled?.(id)}
                  label={details()?.label?.(id, expanded())}
                  onExpandedChange={(next) =>
                    details()?.onExpandedChange(id, next)
                  }
                  ref={(node) => {
                    toggle = node
                  }}
                />
              </Show>
            </td>
          </Show>
        )}
        detail={() => (
          <TableDetailRow
            id={contentId}
            rowId={id}
            expanded={expanded()}
            columnSpan={table.getVisibleColumns().length + 1}
            restoreFocus={() =>
              alive ? (toggle?.isConnected ? toggle : tableElement) : undefined
            }
          >
            {initialDetailRenderer?.(id)}
          </TableDetailRow>
        )}
      />
    )
  }
  const table = props.table
  const filters = createTableFilterDraft(table, {
    get onApply() {
      return props.onApplyFilters
    },
  })
  let tableElement: HTMLTableElement | undefined
  const selectAndFocus = (operation: () => void) => {
    operation()
    tableElement?.focus({ preventScroll: true })
  }
  let filterControls: HTMLDivElement | undefined
  let workspaceControls: TableControlsHandle | undefined
  const label = (column: NativeColumn<T, M>) =>
    props.label?.(column) ?? String(column.columnDef?.header ?? column.id)
  const processing = () => !table.options.manualProcessing
  const filtering = () =>
    Boolean(props.onApplyFilters) ||
    (processing() && !table.options.manualFiltering)
  const movable = createMemo(() =>
    table
      .getVisibleColumns()
      .filter(
        (column) =>
          !column.getIsPinned() && !table.state.grouping.includes(column.id),
      )
      .map((column) => column.id),
  )
  function FilterApplyControl() {
    let button: HTMLButtonElement | undefined
    onCleanup(() => {
      const document = button?.ownerDocument
      if (!isDetail || !document || document.activeElement !== button) return
      const target = button
        ?.closest('.table-workspace')
        ?.querySelector<HTMLElement>('.table-scroll table')
      queueMicrotask(() => {
        if (target?.isConnected && document.activeElement === document.body)
          target.focus({ preventScroll: true })
      })
    })
    return (
      <Button
        ref={(node) => {
          button = node
        }}
        aria-label={isDetail ? 'Apply filters' : 'Refresh results'}
        title={isDetail ? 'Apply filters' : 'Apply filters and refresh results'}
        class="table-refresh"
        onClick={() => {
          const invalid = filterControls?.querySelector<HTMLElement>(
            '[aria-invalid="true"]:not(:disabled)',
          )
          if (invalid) workspaceControls?.focus(invalid)
          else filters.apply({ refresh: !isDetail })
        }}
      >
        <Icon
          class="table-controls-icon"
          name={isDetail ? 'check' : 'refresh'}
        />
      </Button>
    )
  }
  return (
    <TableWorkspace
      class="table-component"
      controlsRef={(handle) => {
        workspaceControls = handle
      }}
      controlsResizable={props.controlsResizable}
      controlsSize={props.controlsSize}
      defaultControlsSize={props.defaultControlsSize}
      onControlsSizeChange={props.onControlsSizeChange}
      controlsPlacement={props.controlsPlacement}
      controlsCollapsed={props.controlsCollapsed}
      defaultControlsCollapsed={props.defaultControlsCollapsed}
      onControlsCollapsedChange={props.onControlsCollapsedChange}
      label={props.title ?? 'Read-only table'}
      footer={
        <>
          {table.getFilteredRowIds().length}/{table.getSourceIds().length}{' '}
          records
          <Show when={props.selection?.range}>
            {' '}
            · {props.selection!.rowCount} × {props.selection!.columnCount}{' '}
            selected
          </Show>
        </>
      }
      resultsHeader={
        <span data-ui-text="system">{props.title ?? 'Read-only records'}</span>
      }
      controlsHeader={
        <>
          <Show when={props.toolbarActions} keyed>
            {(actions) => actions}
          </Show>
          <div class="table-filter-actions">
            <Show when={!isDetail || filters.changed}>
              <FilterApplyControl />
            </Show>
            <Show when={filters.changed}>
              <span data-ui-text="system">Unapplied changes</span>
            </Show>
          </div>
        </>
      }
      controls={
        <>
          <Show
            when={
              props.controls?.filtering !== false ||
              props.controls?.search !== false
            }
          >
            <TableControlSection
              title="Filters"
              defaultOpen
              summary={`${table.state.columnFilters.length + (table.state.globalFilter ? 1 : 0)} active`}
            >
              <Show when={props.controls?.filtering !== false}>
                <div
                  class="column-filters"
                  ref={(node) => {
                    filterControls = node
                  }}
                  role="region"
                  aria-label="Column filters"
                >
                  <For each={table.getColumns()}>
                    {(column) => {
                      const configuration = () => props.filter?.(column)
                      const kind = () =>
                        configuration()?.kind ?? props.filterKind?.(column)
                      const advanced = () => {
                        const value = configuration()
                        return value &&
                          value.kind !== 'boolean' &&
                          value.kind !== 'date-range'
                          ? (value as TableColumnFilterConfig)
                          : undefined
                      }
                      const disabled = () =>
                        !filtering() ||
                        (!props.onApplyFilters && !column.columnDef?.filterFn)
                      return (
                        <Show
                          when={advanced()}
                          fallback={
                            <Show
                              when={kind() === 'date-range'}
                              fallback={
                                <TableFilter
                                  kind={
                                    kind() === 'boolean' ? 'boolean' : 'text'
                                  }
                                  label={label(column)}
                                  clearLabel={`Clear ${label(column)} filter`}
                                  value={String(
                                    filters.getValue(column.id) ?? '',
                                  )}
                                  disabled={disabled()}
                                  onValueChange={(value) =>
                                    filters.setValue(
                                      column.id,
                                      value === ''
                                        ? undefined
                                        : kind() === 'boolean'
                                          ? value === 'true'
                                          : value,
                                    )
                                  }
                                />
                              }
                            >
                              <TableDateFilter
                                label={label(column)}
                                startLabel={`${label(column)} start`}
                                endLabel={`${label(column)} end`}
                                clearStartLabel={`Clear ${label(column)} start`}
                                clearEndLabel={`Clear ${label(column)} end`}
                                value={
                                  filters.getValue(column.id) as
                                    TableDateRange | undefined
                                }
                                disabled={disabled()}
                                onValueChange={(value) =>
                                  filters.setValue(column.id, value)
                                }
                              />
                            </Show>
                          }
                        >
                          {(config) => (
                            <TableColumnFilter
                              label={label(column)}
                              clearLabel={`Clear ${label(column)} filter`}
                              config={config()}
                              value={
                                filters.getValue(column.id) as
                                  TableColumnFilterValue | undefined
                              }
                              disabled={disabled()}
                              onValueChange={(value) =>
                                filters.setValue(column.id, value)
                              }
                            />
                          )}
                        </Show>
                      )
                    }}
                  </For>
                </div>
              </Show>
              <Show when={props.controls?.search !== false}>
                <div class="toolbar">
                  <TableFilter
                    label="Search all columns"
                    clearLabel="Clear search"
                    search
                    value={filters.globalFilter}
                    disabled={!filtering()}
                    onValueChange={(value) => filters.setGlobalFilter(value)}
                  />
                </div>
              </Show>
            </TableControlSection>
          </Show>
          <Show when={props.controls?.grouping !== false}>
            <TableControlSection
              title="Grouping"
              defaultOpen
              summary={`${table.state.grouping.length} levels`}
            >
              <TableGrouping
                table={table}
                disabled={!processing() || table.options.manualGrouping}
                label={(id) => label(table.getColumn(id)!)}
                groupable={(id) => props.groupable?.(id) ?? true}
              />
            </TableControlSection>
          </Show>
          <TableControlSection
            title="Display columns"
            summary={`${table.getVisibleColumns().length} visible`}
          >
            <fieldset class="display-fields">
              <legend>Visible columns</legend>
              <For each={table.getColumns()}>
                {(column) => (
                  <div class="column-display-option">
                    <Checkbox
                      class="check-option"
                      checked={column.getIsVisible()}
                      disabled={column.columnDef?.enableHiding === false}
                      onChange={(checked) => column.toggleVisibility(checked)}
                    >
                      <Checkbox.Input />
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Label>{label(column)}</Checkbox.Label>
                    </Checkbox>
                    <SelectField
                      data-ui-text="system"
                      label={`${label(column)} alignment`}
                      choices={[
                        { value: 'left', label: 'Left' },
                        { value: 'center', label: 'Center' },
                        { value: 'right', label: 'Right' },
                      ]}
                      value={alignment()[column.id] ?? 'left'}
                      onValueChange={(value) =>
                        changeAlignment(column.id, value)
                      }
                    />
                  </div>
                )}
              </For>
            </fieldset>
          </TableControlSection>
          <Show when={props.selection} keyed>
            {(selection) => (
              <TableControlSection title="Selection">
                <p>
                  Drag cells or use Shift and arrow keys to extend the
                  selection.
                </p>
                <div class="table-selection-actions">
                  <Button onClick={() => selectAndFocus(selection.selectRow)}>
                    Select rows
                  </Button>
                  <Button
                    onClick={() => selectAndFocus(selection.selectColumn)}
                  >
                    Select columns
                  </Button>
                  <Button onClick={() => selectAndFocus(selection.selectAll)}>
                    Select all
                  </Button>
                  <Button onClick={() => selectAndFocus(selection.clear)}>
                    Clear selection
                  </Button>
                </div>
              </TableControlSection>
            )}
          </Show>
          <Show when={props.formatting} keyed>
            {(formatting) => (
              <TableControlSection title="Formatting" defaultOpen>
                {formatting}
              </TableControlSection>
            )}
          </Show>
          <Show when={props.actions} keyed>
            {(actions) => (
              <TableControlSection title="Actions" defaultOpen>
                {actions}
              </TableControlSection>
            )}
          </Show>
          <Show when={props.configuration} keyed>
            {(configuration) => (
              <TableControlSection title="Configuration">
                {configuration}
              </TableControlSection>
            )}
          </Show>
        </>
      }
    >
      <div
        class="table-scroll"
        tabindex={props.selection ? -1 : 0}
        role="region"
        aria-label={`${props.title ?? 'Read-only records'} results`}
      >
        <Table
          table={table}
          leading={
            details()
              ? {
                  width: 'var(--ui-table-header-size, 24.5px)',
                  header: () => (
                    <th scope="col" class="sub-table-control">
                      <span class="sr-only">Details</span>
                    </th>
                  ),
                  group: () => <td class="sub-table-control" />,
                }
              : undefined
          }
          renderRow={
            initialDetailRenderer ? (id) => <DataRow id={id} /> : undefined
          }
          selection={props.selection}
          elementRef={(node) => {
            tableElement = node
          }}
          width={props.width}
          headerEnd={props.headerEnd}
          columnAlignment={alignment()}
          accessibleLabel={props.title ?? 'Read-only records'}
          grouped={
            processing() &&
            !table.options.manualGrouping &&
            table.state.grouping.length > 0
          }
          label={label}
          groupLabel={(id) => label(table.getColumn(id)!)}
          renderCell={props.renderCell}
          formatValue={props.formatValue}
          formatSummary={props.formatSummary}
          header={(column) => (
            <>
              <Show
                when={
                  props.controls?.columnReordering !== false &&
                  movable().includes(column.id)
                }
              >
                <TableColumnMove
                  id={column.id}
                  label={label(column)}
                  ids={movable()}
                  onMove={(destination) =>
                    table.setColumnOrder((old) => [
                      ...moveColumn(
                        [
                          ...new Set([
                            ...old,
                            ...table.getColumns().map((item) => item.id),
                          ]),
                        ],
                        column.id,
                        destination,
                      ),
                    ])
                  }
                />
              </Show>
              <Show
                when={props.controls?.sorting !== false}
                fallback={<span class="column-title">{label(column)}</span>}
              >
                <TableSort
                  label={label(column)}
                  sorted={column.getIsSorted()}
                  disabled={
                    !processing() ||
                    table.options.manualSorting ||
                    !column.columnDef?.sortFn
                  }
                  onSort={(multi) => column.toggleSorting(undefined, multi)}
                />
              </Show>
            </>
          )}
        />
        <Show when={!table.getFilteredRowIds().length}>
          <p>
            {table.getSourceIds().length
              ? 'No records match your search or filters.'
              : 'No records yet.'}
          </p>
        </Show>
      </div>
    </TableWorkspace>
  )
}
