import type { DatePickerMessages } from '../components/dateMessages'
import { resolveMessages } from '../internal/messages'
import { resolveTableMessages, type TableMessages } from './messages'
import { TablePagination } from './TablePagination'
import type { TablePaginationProps } from './TablePagination'
import { Icon } from '../components/Icon'
import {
  For,
  Show,
  createMemo,
  createEffect,
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
  TableFilterValue,
} from './TableColumnFilter'
import type { TableDateRange } from './TableDateFilter'
import { TableGrouping } from './TableGrouping'
import { TableColumnMove, moveColumn } from './TableColumnMove'
import type { JSX } from '@solidjs/web'
import type { NativeCell, NativeColumn, NativeTable } from './engine'

export type TableFilterConfig = TableColumnFilterConfig

/** Full display features over an application-owned table, without editing state. */
export function ReadOnlyTable<T, M>(
  props: {
    messages?: Partial<TableMessages>
    datePickerMessages?: Partial<DatePickerMessages>
    table: NativeTable<T, M>
    pagination?: TablePaginationProps
    selection?: TableSelection
    rowDetails?: TableRowDetails
    columnAlignment?: TableColumnAlignments
    onColumnAlignmentChange?: (
      id: string,
      alignment: TableColumnAlignment,
    ) => void
    /** Omit the title/actions bar and configuration pane, retaining column headings. */
    headerEnabled?: boolean
    /** Omit the summary and pagination. Defaults to false inside child tables. */
    footerEnabled?: boolean
    /** Omit the configuration button and panel. Defaults to false inside child tables. */
    controlsEnabled?: boolean
    /** Omit the refresh/apply button when false. */
    refreshEnabled?: boolean
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
    /** Omit sorting or filtering controls for a column when false. */
    sortable?: (column: NativeColumn<T, M>) => boolean
    filterable?: (column: NativeColumn<T, M>) => boolean
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
  const messages = resolveTableMessages(() => props.messages)
  const paginationMessages = resolveMessages(
    messages,
    () => props.pagination?.messages,
  )
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
                  messages={props.messages}
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
  const table = untrack(() => props.table)
  createEffect(
    () => props.table,
    (next) => {
      if (next !== table)
        throw new Error(
          'ReadOnlyTable: remount the table presentation to replace its table controller',
        )
    },
  )
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
    return (
      <Button
        aria-label={messages.refresh}
        title={messages.refreshHelp}
        class="table-refresh"
        onClick={() => {
          const invalid = filterControls?.querySelector<HTMLElement>(
            '[aria-invalid="true"]:not(:disabled)',
          )
          if (invalid) workspaceControls?.focus(invalid)
          else filters.apply({ refresh: true })
        }}
      >
        <Icon class="table-controls-icon" name="refresh" />
      </Button>
    )
  }
  return (
    <TableWorkspace
      messages={props.messages}
      class="table-component"
      controlsRef={(handle) => {
        workspaceControls = handle
      }}
      headerEnabled={props.headerEnabled}
      footerEnabled={props.footerEnabled ?? !isDetail}
      controlsEnabled={props.controlsEnabled ?? !isDetail}
      controlsResizable={props.controlsResizable}
      controlsSize={props.controlsSize}
      defaultControlsSize={props.defaultControlsSize}
      onControlsSizeChange={props.onControlsSizeChange}
      controlsPlacement={props.controlsPlacement}
      controlsCollapsed={props.controlsCollapsed}
      defaultControlsCollapsed={props.defaultControlsCollapsed}
      onControlsCollapsedChange={props.onControlsCollapsedChange}
      label={props.title ?? messages.readOnlyTable}
      footer={
        <>
          {props.pagination
            ? paginationMessages.pageRecordCount(
                table.getFilteredRowIds().length,
                props.pagination.totalRows,
              )
            : messages.recordCount(
                table.getFilteredRowIds().length,
                table.getSourceIds().length,
              )}
          <Show when={props.selection?.range}>
            {' '}
            ·{' '}
            {messages.selectionSummary(
              props.selection!.rowCount,
              props.selection!.columnCount,
            )}
          </Show>
        </>
      }
      footerActions={
        <Show when={props.pagination !== undefined}>
          <TablePagination
            {...props.pagination!}
            messages={paginationMessages}
          />
        </Show>
      }
      resultsHeader={
        <span data-ui-text="system">
          {props.title ?? messages.readOnlyRecords}
        </span>
      }
      controlsHeader={
        <>
          <div class="table-filter-actions">
            <Show when={props.refreshEnabled ?? !isDetail}>
              <FilterApplyControl />
            </Show>
            <Show when={filters.changed}>
              <span data-ui-text="system">{messages.unappliedChanges}</span>
            </Show>
          </div>
          <Show when={props.toolbarActions} keyed>
            {(actions) => actions}
          </Show>
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
              title={messages.filters}
              defaultOpen
              summary={messages.activeFilters(
                table.state.columnFilters.length +
                  (table.state.globalFilter ? 1 : 0),
              )}
            >
              <Show when={props.controls?.filtering !== false}>
                <div
                  class="column-filters"
                  ref={(node) => {
                    filterControls = node
                  }}
                  role="region"
                  aria-label={messages.columnFilters}
                >
                  <For
                    each={table
                      .getColumns()
                      .filter((column) => props.filterable?.(column) !== false)}
                  >
                    {(column) => {
                      const configuration = () => props.filter?.(column)
                      const kind = () =>
                        configuration()?.kind ?? props.filterKind?.(column)
                      const disabled = () =>
                        !filtering() ||
                        (!props.onApplyFilters && !column.columnDef?.filterFn)
                      return (
                        <Show
                          when={configuration()}
                          fallback={
                            <Show
                              when={kind() === 'date-range'}
                              fallback={
                                <TableFilter
                                  messages={props.messages}
                                  kind={
                                    kind() === 'boolean' ? 'boolean' : 'text'
                                  }
                                  label={label(column)}
                                  clearLabel={messages.clearFilter(
                                    label(column),
                                  )}
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
                                datePickerMessages={props.datePickerMessages}
                                messages={props.messages}
                                label={label(column)}
                                startLabel={messages.dateStart(label(column))}
                                endLabel={messages.dateEnd(label(column))}
                                clearStartLabel={messages.clearDateStart(
                                  label(column),
                                )}
                                clearEndLabel={messages.clearDateEnd(
                                  label(column),
                                )}
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
                              datePickerMessages={props.datePickerMessages}
                              messages={props.messages}
                              label={label(column)}
                              clearLabel={messages.clearFilter(label(column))}
                              config={config()}
                              value={
                                filters.getValue(column.id) as
                                  TableFilterValue | undefined
                              }
                              disabled={disabled()}
                              onValueChange={(
                                value: TableFilterValue | undefined,
                              ) => filters.setValue(column.id, value)}
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
                    messages={props.messages}
                    label={messages.search}
                    clearLabel={messages.clearSearch}
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
              title={messages.grouping}
              defaultOpen
              summary={messages.groupingCount(table.state.grouping.length)}
            >
              <TableGrouping
                messages={props.messages}
                table={table}
                disabled={!processing() || table.options.manualGrouping}
                label={(id) => label(table.getColumn(id)!)}
                groupable={(id) => props.groupable?.(id) ?? true}
              />
            </TableControlSection>
          </Show>
          <TableControlSection
            title={messages.displayColumns}
            summary={messages.visibleCount(table.getVisibleColumns().length)}
          >
            <fieldset class="display-fields">
              <legend>{messages.visibleColumns}</legend>
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
                      label={messages.alignment(label(column))}
                      choices={[
                        { value: 'left', label: messages.alignLeft },
                        { value: 'center', label: messages.alignCenter },
                        { value: 'right', label: messages.alignRight },
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
              <TableControlSection title={messages.selection}>
                <p>{messages.selectionHelp}</p>
                <div class="table-selection-actions">
                  <Button onClick={() => selectAndFocus(selection.selectRow)}>
                    {messages.selectRows}
                  </Button>
                  <Button
                    onClick={() => selectAndFocus(selection.selectColumn)}
                  >
                    {messages.selectColumns}
                  </Button>
                  <Button onClick={() => selectAndFocus(selection.selectAll)}>
                    {messages.selectAll}
                  </Button>
                  <Button onClick={() => selectAndFocus(selection.clear)}>
                    {messages.clearSelection}
                  </Button>
                </div>
              </TableControlSection>
            )}
          </Show>
          <Show when={props.formatting} keyed>
            {(formatting) => (
              <TableControlSection title={messages.formatting} defaultOpen>
                {formatting}
              </TableControlSection>
            )}
          </Show>
          <Show when={props.actions} keyed>
            {(actions) => (
              <TableControlSection title={messages.actions} defaultOpen>
                {actions}
              </TableControlSection>
            )}
          </Show>
          <Show when={props.configuration} keyed>
            {(configuration) => (
              <TableControlSection title={messages.configuration}>
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
        aria-label={messages.results(props.title ?? messages.readOnlyRecords)}
      >
        <Table
          messages={props.messages}
          table={table}
          leading={
            details()
              ? {
                  width: 'var(--ui-table-header-size, 24.5px)',
                  header: () => (
                    <th scope="col" class="sub-table-control">
                      <span class="sr-only">{messages.details}</span>
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
          accessibleLabel={props.title ?? messages.readOnlyRecords}
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
                  messages={props.messages}
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
                when={
                  props.controls?.sorting !== false &&
                  props.sortable?.(column) !== false
                }
                fallback={<span class="column-title">{label(column)}</span>}
              >
                <TableSort
                  messages={props.messages}
                  label={label(column)}
                  sorted={column.getIsSorted()}
                  disabled={
                    processing() &&
                    !table.options.manualSorting &&
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
              ? messages.noMatches
              : messages.noRecords}
          </p>
        </Show>
      </div>
    </TableWorkspace>
  )
}
