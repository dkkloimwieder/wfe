import { columnLabel } from './columnLabel'
import type { DatePickerMessages } from '../components/dateMessages'
import { resolveMessages } from '../internal/messages'
import { ownsFocus } from '../internal/ownedFocus'
import { resolveTableMessages, type TableMessages } from './messages'
import { TablePagination } from './TablePagination'
import type { TablePaginationProps } from './TablePagination'
import { Icon } from '../components/Icon'
import {
  For,
  Show,
  createMemo,
  createEffect,
  createRenderEffect,
  createStore,
  createUniqueId,
  onCleanup,
  untrack,
} from 'solid-js'
import { Checkbox } from '../components/Checkbox'
import { Button } from '../components/NativeFields'
import { SelectField, type SelectChoice } from '../components/Select'
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
import {
  createTableSelection,
  type TableSelection,
} from './createTableSelection'
import type {
  TableColumnAlignment,
  TableColumnAlignments,
  TableEdge,
} from './Table'
import {
  createTableClientPagination,
  type TableClientPagination,
} from './createTableClientPagination'
import {
  TableRowActionMenu,
  TableRowCheckbox,
  changeTableRowSelection,
  isTableRowSelected,
  tableRowControlWidth,
  type TableLeadingColumn,
  type TableRowAction,
  type TableRowActionContext,
  type TableRowSelection,
} from './TableRowControls'
import { captureTableView, normalizeTableView } from './readOnlyTableViewState'
import {
  copyTableViewValue,
  type ReadOnlyTableViewsOptions,
  type TableViewState,
  type TableWorkspaceViewsOptions,
} from './tableViewState'
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
import {
  TableColumnMove,
  moveColumn,
  columnMoveDestination,
} from './TableColumnMove'
import { createSortable } from '../sortable'
import type { JSX } from '@solidjs/web'
import type { NativeCell, NativeColumn, NativeRow, NativeTable } from './engine'

export type TableFilterConfig = TableColumnFilterConfig
export type TableEmptyResults = {
  /** Applied table criteria or application filters reported through filtersActive. */
  filtered: boolean
  /** Reset table criteria and call onClearFilters for application filters. */
  clearFilters: () => void
}

/** Full display features over an application-owned table, without editing state. */
function textFilterValue(value: unknown): string {
  return typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number'
    ? String(value)
    : ''
}

export function ReadOnlyTable<T, M>(
  props: {
    messages?: Partial<TableMessages>
    datePickerMessages?: Partial<DatePickerMessages>
    table: NativeTable<T, M>
    pagination?: TablePaginationProps
    /** Local paging uses the standard body. Explicit pagination takes precedence. */
    clientPagination?: TableClientPagination
    /** True enables cell selection over the displayed rows and data columns. */
    selection?: TableSelection | true
    rowDetails?: TableRowDetails
    leadingColumn?: TableLeadingColumn<T>
    rowSelection?: TableRowSelection
    rowActions?: (
      row: NativeRow<T>,
      context: TableRowActionContext,
    ) => readonly TableRowAction[] | undefined
    /** Direct controls in the trailing actions cell, before the optional menu. */
    renderRowActions?: (row: NativeRow<T>) => JSX.Element
    bulkActions?: JSX.Element
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
    defaultControlsPlacement?: TableWorkspaceProps['defaultControlsPlacement']
    onControlsPlacementChange?: TableWorkspaceProps['onControlsPlacementChange']
    controlsCollapsed?: boolean
    defaultControlsCollapsed?: boolean
    onControlsCollapsedChange?: (collapsed: boolean) => void
    title?: string
    /** Hide the workspace title while keeping the accessible names. */
    titleVisible?: boolean
    class?: TableWorkspaceProps['class']
    fill?: boolean
    toolbarLayout?: TableWorkspaceProps['toolbarLayout']
    controls?: {
      sorting?: boolean
      filtering?: boolean
      search?: boolean
      grouping?: boolean
      columnReordering?: boolean
      columnVisibility?: boolean
      alignment?: boolean
    }
    /** Persistent application actions beside the table controls toggle. */
    toolbarActions?: JSX.Element
    actions?: JSX.Element
    configuration?: JSX.Element
    formatting?: JSX.Element
    filterMode?: 'staged' | 'live'
    search?: { label?: string; placeholder?: string }
    views?: ReadOnlyTableViewsOptions
    savedViews?: {
      choices: readonly SelectChoice[]
      value: string
      onChange: (value: string) => void
      label?: string
    }
    extraFilters?: JSX.Element
    /** Report filters that the application applies outside the table controller. */
    filtersActive?: boolean
    onClearFilters?: () => void
    emptyResults?: (state: TableEmptyResults) => JSX.Element
    /** Receives criteria as they apply, including unchanged criteria on refresh. */
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
  } & Pick<
    Parameters<typeof Table<T, M>>[0],
    | 'width'
    | 'minWidth'
    | 'columnWidths'
    | 'cellWrap'
    | 'headerEnd'
    | 'renderBody'
  >,
) {
  const messages = resolveTableMessages(() => props.messages)
  const paginationMessages = resolveMessages<Required<TableMessages>>(
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
  const savedViewId = `table-view-${createUniqueId()}`
  let alive = true
  onCleanup(() => {
    alive = false
  })
  const detailEdge: TableEdge = {
    width: 'var(--ui-table-header-size, 24.5px)',
    header: () => (
      <th scope="col" class="sub-table-control">
        <span class="sr-only">{messages.details}</span>
      </th>
    ),
    group: () => <td class="sub-table-control" />,
  }
  const leadingEdge: TableEdge = {
    get width() {
      return props.leadingColumn?.width ?? ''
    },
    header: () => (
      <th
        scope="col"
        class="table-row-control"
        aria-label={props.leadingColumn?.label}
      >
        {props.leadingColumn?.header ?? props.leadingColumn?.label}
      </th>
    ),
    group: () => <td class="table-row-control" />,
  }
  const selectionEdge: TableEdge = {
    width: tableRowControlWidth,
    header: () => <RowSelectionHeader />,
    group: () => <td class="table-row-control" />,
  }
  const actionsEdge: TableEdge = {
    get width() {
      // With auto table layout, a small preferred width keeps spare space in data columns.
      return props.renderRowActions ? 1 : tableRowControlWidth
    },
    get fitContent() {
      return Boolean(props.renderRowActions)
    },
    header: () => (
      <th scope="col" class="table-row-control">
        <span class="sr-only">{messages.actions}</span>
      </th>
    ),
    group: () => <td class="table-row-control" />,
  }
  const hasRowActions = () =>
    Boolean(props.rowActions || props.renderRowActions)
  const leadingColumns = createMemo(() => [
    ...(details() ? [detailEdge] : []),
    ...(props.rowSelection ? [selectionEdge] : []),
    ...(props.leadingColumn ? [leadingEdge] : []),
  ])
  function RowSelectionHeader() {
    const selectedCount = createMemo(() => {
      const selection = props.rowSelection
      return selection
        ? visibleRowIds().filter((id) => isTableRowSelected(selection, id))
            .length
        : 0
    })
    return (
      <th
        scope="col"
        class="table-row-control"
        aria-label={messages.rowSelection}
      >
        <Show when={props.rowSelection?.selectAll === 'page'}>
          <TableRowCheckbox
            label={messages.selectPageRows}
            disabled={!visibleRowIds().length}
            checked={
              selectedCount() > 0 && selectedCount() === visibleRowIds().length
            }
            indeterminate={
              selectedCount() > 0 && selectedCount() < visibleRowIds().length
            }
            onChange={(checked) => {
              if (props.rowSelection)
                changeTableRowSelection(
                  props.rowSelection,
                  visibleRowIds(),
                  checked,
                )
            }}
          />
        </Show>
      </th>
    )
  }
  function DataRow(row: { id: string }) {
    const id = untrack(() => row.id)
    const record = table.getRow(id)
    const contentId = `${detailPrefix}-detail-${Array.from(id)
      .map((char) => char.codePointAt(0)!.toString(16))
      .join('-')}`
    let toggle: HTMLButtonElement | undefined
    let menuTrigger: HTMLButtonElement | undefined
    const actionContext: TableRowActionContext = {
      getMenuTrigger: () =>
        menuTrigger?.isConnected ? menuTrigger : undefined,
    }
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
          <>
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
            <Show when={props.rowSelection}>
              {(selection) => (
                <td class="table-row-control">
                  <TableRowCheckbox
                    label={messages.selectRow(id)}
                    checked={isTableRowSelected(selection(), id)}
                    onChange={(checked) =>
                      changeTableRowSelection(selection(), [id], checked)
                    }
                  />
                </td>
              )}
            </Show>
            <Show when={props.leadingColumn}>
              {(column) => (
                <td class="table-row-control">{column().cell(record)}</td>
              )}
            </Show>
          </>
        )}
        trailing={() => (
          <Show when={hasRowActions()}>
            <td class="table-row-control">
              <div class="table-row-actions">
                {props.renderRowActions?.(record)}
                <Show when={props.rowActions}>
                  {(actions) => (
                    <TableRowActionMenu
                      rowId={id}
                      messages={messages}
                      actions={actions()(record, actionContext)}
                      triggerRef={(node) => {
                        menuTrigger = node
                      }}
                    />
                  )}
                </Show>
              </div>
            </td>
          </Show>
        )}
        detail={
          initialDetailRenderer &&
          (() => (
            <TableDetailRow
              id={contentId}
              rowId={id}
              expanded={expanded()}
              columnSpan={
                table.getVisibleColumns().length +
                leadingColumns().length +
                (hasRowActions() ? 1 : 0)
              }
              restoreFocus={() =>
                alive
                  ? toggle?.isConnected
                    ? toggle
                    : tableElement
                  : undefined
              }
            >
              {initialDetailRenderer(id)}
            </TableDetailRow>
          ))
        }
      />
    )
  }
  const renderDataRow = (id: string) => <DataRow id={id} />
  const table = untrack(() => props.table)
  const processing = () => !table.options.manualProcessing
  createEffect(
    () => props.table,
    (next) => {
      if (next !== table)
        throw new Error(
          'ReadOnlyTable: remount the table presentation to replace its table controller',
        )
    },
  )
  const live = () => props.filterMode === 'live'
  const refresh = () => props.refreshEnabled ?? (!isDetail && !live())
  const filters = createTableFilterDraft(table, {
    get live() {
      return live()
    },
    get onApply() {
      return props.onApplyFilters
    },
  })
  const filterCount = () =>
    table.state.columnFilters.length +
    (table.state.globalFilter.trim() ? 1 : 0) +
    (props.filtersActive ? 1 : 0)
  let emptyResultsElement: HTMLDivElement | undefined
  function clearFilters() {
    if (
      emptyResultsElement?.contains(
        emptyResultsElement.ownerDocument.activeElement,
      )
    )
      tableElement?.focus({ preventScroll: true })
    filters.clear()
    clientPaging.reset()
    props.onClearFilters?.()
  }
  const grouped = () =>
    processing() &&
    !table.options.manualGrouping &&
    table.state.grouping.length > 0
  const clientConfiguration = () =>
    props.pagination || props.renderBody ? undefined : props.clientPagination
  const clientPaging = createTableClientPagination(
    table,
    clientConfiguration,
    grouped,
    paginationMessages,
  )
  const pagination = () =>
    props.pagination ??
    (clientConfiguration() ? clientPaging.pagination : undefined)
  const visibleRowIds = createMemo(
    () => {
      if (!grouped()) return clientPaging.rows() ?? table.getRowIds()
      return (clientPaging.displayKeys() ?? table.getDisplayKeys()).flatMap(
        (key) => {
          const item = table.getDisplayItem(key)
          return item.kind === 'row' ? [item.id] : []
        },
      )
    },
    { lazy: true },
  )
  const localSelection = createMemo(() =>
    props.selection === true
      ? createTableSelection({
          rows: visibleRowIds,
          columns: () => table.getVisibleColumns().map(({ id }) => id),
          getText: ({ row, column }) =>
            String(table.getValue(row, column) ?? ''),
        })
      : undefined,
  )
  const selection = () =>
    props.selection === true ? localSelection() : props.selection
  let scrollElement: HTMLDivElement | undefined
  createRenderEffect(clientPaging.rows, (ids) => {
    if (ids && scrollElement) scrollElement.scrollTop = 0
  })
  let tableElement: HTMLTableElement | undefined
  const selectAndFocus = (operation: () => void) => {
    operation()
    tableElement?.focus({ preventScroll: true })
  }
  let filterControls: HTMLDivElement | undefined
  let workspaceControls: TableControlsHandle | undefined
  const label = (column: NativeColumn<T, M>) =>
    props.label?.(column) ?? columnLabel(column)
  const filtering = () =>
    Boolean(props.onApplyFilters) ||
    (processing() && !table.options.manualFiltering)
  const configuredViews = createMemo(() => props.views)
  const viewOptions = createMemo<TableWorkspaceViewsOptions | undefined>(() => {
    const configuration = configuredViews()
    if (!configuration) return
    return {
      get systemViews() {
        return configuredViews()?.systemViews
      },
      get initialViewId() {
        return configuredViews()?.initialViewId
      },
      storage: configuration.storage,
      capture() {
        const state = captureTableView(table, filters.criteria)
        if (!state) return
        const hooks = configuredViews()
        const extraFilters = copyTableViewValue(hooks?.extraFilters?.capture())
        const formatting = copyTableViewValue(hooks?.formatting?.capture())
        if (
          (hooks?.extraFilters && extraFilters === undefined) ||
          (hooks?.formatting && formatting === undefined)
        )
          return
        return {
          ...state,
          columnAlignment: Object.fromEntries(
            table.getColumns().map(({ id }) => [id, alignment()[id] ?? 'left']),
          ),
          pageSize: pagination()?.pageSize?.value,
          extraFilters,
          formatting,
        }
      },
      normalize(state, initial) {
        const next = normalizeTableView(state, initial, table.getColumns(), {
          filterRule: (column) => {
            if (
              props.controls?.filtering === false ||
              props.filterable?.(column) === false ||
              (!props.onApplyFilters && !column.columnDef?.filterFn)
            )
              return undefined
            const config = props.filter?.(column)
            const kind = config?.kind ?? props.filterKind?.(column)
            // A custom header can use its own JSON filter value.
            return kind || !props.headerEnd
              ? { kind: kind ?? 'text', config }
              : undefined
          },
          filterable: (column) =>
            Boolean(
              props.onApplyFilters ||
              !processing() ||
              table.options.manualFiltering ||
              column.columnDef?.filterFn,
            ),
          groupable: (id) => props.groupable?.(id) ?? true,
          groupSortable: (column) =>
            Boolean(
              !processing() ||
              table.options.manualGrouping ||
              column.columnDef?.sortFn,
            ),
          sortable: (column) =>
            props.sortable?.(column) !== false &&
            Boolean(
              !processing() ||
              table.options.manualSorting ||
              column.columnDef?.sortFn,
            ),
        })
        const pageSize = pagination()?.pageSize
        const size = next.pageSize
        const hooks = configuredViews()
        const extraFilters = next.extraFilters
        const formatting = next.formatting
        return {
          ...next,
          columnAlignment:
            props.columnAlignment && !props.onColumnAlignmentChange
              ? Object.fromEntries(
                  table
                    .getColumns()
                    .map(({ id }) => [id, alignment()[id] ?? 'left']),
                )
              : next.columnAlignment,
          pageSize: !pageSize
            ? undefined
            : size !== undefined && pageSize.options.includes(size)
              ? size
              : pageSize.options.includes(initial.pageSize ?? 0)
                ? initial.pageSize
                : pageSize.options[0],
          extraFilters:
            hooks?.extraFilters && extraFilters !== undefined
              ? hooks.extraFilters.normalize
                ? hooks.extraFilters.normalize(extraFilters)
                : extraFilters
              : undefined,
          formatting:
            hooks?.formatting && formatting !== undefined
              ? hooks.formatting.normalize
                ? hooks.formatting.normalize(formatting)
                : formatting
              : undefined,
        }
      },
      restore,
    }
  })
  function restore(state: TableViewState) {
    if (state.extraFilters !== undefined)
      configuredViews()?.extraFilters?.restore(state.extraFilters)
    if (state.formatting !== undefined)
      configuredViews()?.formatting?.restore(state.formatting)
    filters.restore({
      columnFilters: [...(state.columnFilters ?? [])],
      globalFilter: state.globalFilter ?? '',
    })
    table.setSorting([...(state.sorting ?? [])])
    table.setGrouping([...(state.grouping ?? [])])
    table.setGroupSorting([...(state.groupSorting ?? [])])
    table.setGroupExpanded({ ...state.groupExpanded })
    table.setColumnOrder([...(state.columnOrder ?? [])])
    table.setColumnVisibility({ ...state.columnVisibility })
    table.setColumnSizing({ ...state.columnSizing })
    table.setColumnPinning({
      start: [...(state.columnPinning?.start ?? [])],
      end: [...(state.columnPinning?.end ?? [])],
    })
    for (const [id, value] of Object.entries(state.columnAlignment ?? {}))
      if ((alignment()[id] ?? 'left') !== value) changeAlignment(id, value)
    const pageSize = pagination()?.pageSize
    if (state.pageSize !== undefined && state.pageSize !== pageSize?.value)
      pageSize?.onValueChange(state.pageSize)
    clientPaging.reset()
  }
  const viewWidths = createMemo(() => {
    if (!props.views) return props.columnWidths
    const sizing = table.state.columnSizing
    return Object.keys(sizing).length
      ? {
          ...props.columnWidths,
          ...Object.fromEntries(
            table
              .getColumns()
              .flatMap((column) =>
                Object.hasOwn(sizing, column.id)
                  ? [[column.id, column.getSize()]]
                  : [],
              ),
          ),
        }
      : props.columnWidths
  })
  const movable = createMemo(() =>
    table
      .getVisibleColumns()
      .filter(
        (column) =>
          !column.getIsPinned() && !table.state.grouping.includes(column.id),
      )
      .map((column) => column.id),
  )
  const columnSorting = createSortable({
    autoScroll: 'horizontal',
    get containers() {
      return [{ id: 'columns', items: movable() }]
    },
    orientation: 'horizontal',
    get disabled() {
      return props.controls?.columnReordering === false || movable().length < 2
    },
    onMove(move) {
      const destination = columnMoveDestination(movable(), move)
      if (destination) reorderColumn(String(move.itemId), destination)
    },
  })
  function reorderColumn(
    id: string,
    destination: Parameters<typeof moveColumn>[2],
  ) {
    table.setColumnOrder((old) => [
      ...moveColumn(
        [...new Set([...old, ...table.getColumns().map((item) => item.id)])],
        id,
        destination,
      ),
    ])
  }
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
  function BulkActions() {
    let element: HTMLDivElement | undefined
    onCleanup(() => {
      if (alive && tableElement?.isConnected && ownsFocus(element))
        tableElement.focus({ preventScroll: true })
    })
    return (
      <div
        class="table-bulk-actions"
        ref={(node) => {
          element = node
        }}
      >
        {props.bulkActions}
      </div>
    )
  }
  return (
    <TableWorkspace
      messages={props.messages}
      class={['table-component', props.class]}
      fill={props.fill}
      toolbarLayout={props.toolbarLayout}
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
      defaultControlsPlacement={props.defaultControlsPlacement}
      onControlsPlacementChange={props.onControlsPlacementChange}
      views={viewOptions()}
      controlsCollapsed={props.controlsCollapsed}
      defaultControlsCollapsed={props.defaultControlsCollapsed}
      onControlsCollapsedChange={props.onControlsCollapsedChange}
      label={props.title ?? messages.readOnlyTable}
      footer={
        <>
          {pagination()
            ? paginationMessages.pageRecordCount(
                clientPaging.rows()?.length ?? table.getFilteredRowIds().length,
                pagination()?.totalRows,
              )
            : messages.recordCount(
                table.getFilteredRowIds().length,
                table.getSourceIds().length,
              )}
          <Show when={selection()?.range}>
            {' '}
            ·{' '}
            {messages.selectionSummary(
              selection()!.rowCount,
              selection()!.columnCount,
            )}
          </Show>
        </>
      }
      footerActions={
        <Show when={pagination()}>
          <TablePagination {...pagination()!} messages={paginationMessages} />
        </Show>
      }
      resultsHeader={
        props.titleVisible !== false ? (
          <span data-ui-text="system">
            {props.title ?? messages.readOnlyRecords}
          </span>
        ) : undefined
      }
      controlsHeader={
        <>
          <Show when={!live() || refresh()}>
            <div class="table-filter-actions">
              <Show when={refresh()}>
                <FilterApplyControl />
              </Show>
              <Show when={!live() && filters.changed}>
                <span data-ui-text="system">{messages.unappliedChanges}</span>
              </Show>
            </div>
          </Show>
          <Show when={props.toolbarActions} keyed>
            {(actions) => actions}
          </Show>
          <Show
            when={
              props.rowSelection &&
              Object.values(props.rowSelection.selected).some(Boolean)
            }
          >
            <BulkActions />
          </Show>
        </>
      }
      controls={
        <>
          <Show
            when={
              props.controls?.filtering !== false ||
              props.controls?.search !== false ||
              (props.savedViews && !props.views) ||
              props.extraFilters != null ||
              props.onClearFilters
            }
          >
            <TableControlSection
              title={messages.filters}
              defaultOpen
              summary={messages.activeFilters(filterCount())}
            >
              <Show when={!props.views && props.savedViews}>
                {(views) => (
                  <div class="table-filter">
                    <label class="ui-label" for={savedViewId}>
                      {views().label ?? messages.savedViews}
                    </label>
                    <SelectField
                      id={savedViewId}
                      label={views().label ?? messages.savedViews}
                      choices={views().choices}
                      value={views().value}
                      onValueChange={(value) => {
                        views().onChange(value)
                        clientPaging.reset()
                      }}
                    />
                  </div>
                )}
              </Show>
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
                                  value={textFilterValue(
                                    filters.getValue(column.id),
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
                    label={props.search?.label ?? messages.search}
                    placeholder={props.search?.placeholder}
                    clearLabel={messages.clearSearch}
                    search
                    value={filters.globalFilter}
                    disabled={!filtering()}
                    onValueChange={(value) => filters.setGlobalFilter(value)}
                  />
                </div>
              </Show>
              {props.extraFilters}
              <Show when={props.onClearFilters || live()}>
                <div class="toolbar">
                  <Button onClick={clearFilters}>
                    {messages.clearFilters}
                  </Button>
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
          <Show
            when={
              props.controls?.columnVisibility !== false ||
              props.controls?.alignment !== false
            }
          >
            <TableControlSection
              title={messages.displayColumns}
              summary={messages.visibleCount(table.getVisibleColumns().length)}
            >
              <fieldset class="display-fields">
                <legend
                  class={
                    props.controls?.columnVisibility === false
                      ? 'sr-only'
                      : undefined
                  }
                >
                  {props.controls?.columnVisibility === false
                    ? messages.displayColumns
                    : messages.visibleColumns}
                </legend>
                <For each={table.getColumns()}>
                  {(column) => (
                    <div class="column-display-option">
                      <Show
                        when={props.controls?.columnVisibility !== false}
                        fallback={<span class="ui-label">{label(column)}</span>}
                      >
                        <Checkbox
                          class="check-option"
                          checked={column.getIsVisible()}
                          disabled={column.columnDef?.enableHiding === false}
                          onChange={(checked) =>
                            column.toggleVisibility(checked)
                          }
                        >
                          <Checkbox.Input />
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Checkbox.Label>{label(column)}</Checkbox.Label>
                        </Checkbox>
                      </Show>
                      <Show when={props.controls?.alignment !== false}>
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
                      </Show>
                    </div>
                  )}
                </For>
              </fieldset>
            </TableControlSection>
          </Show>
          <Show when={selection()} keyed>
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
        tabindex={selection() ? -1 : 0}
        ref={(node) => {
          scrollElement = node
        }}
        role="region"
        aria-label={messages.results(props.title ?? messages.readOnlyRecords)}
      >
        <Table
          messages={props.messages}
          table={table}
          leadingColumns={leadingColumns()}
          trailing={hasRowActions() ? actionsEdge : undefined}
          renderRow={
            leadingColumns().length || hasRowActions()
              ? renderDataRow
              : undefined
          }
          selection={selection()}
          elementRef={(node) => {
            tableElement = node
          }}
          width={props.width}
          minWidth={props.minWidth}
          columnWidths={viewWidths()}
          cellWrap={props.cellWrap}
          headerEnd={props.headerEnd}
          renderBody={props.renderBody}
          rowIds={clientPaging.rows()}
          displayKeys={clientPaging.displayKeys()}
          columnAlignment={alignment()}
          accessibleLabel={props.title ?? messages.readOnlyRecords}
          grouped={grouped()}
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
                  scope={columnSorting}
                  messages={props.messages}
                  id={column.id}
                  label={label(column)}
                  ids={movable()}
                  onMove={(destination) =>
                    reorderColumn(column.id, destination)
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
          <Show
            when={props.emptyResults}
            fallback={
              <p>
                {table.getSourceIds().length
                  ? messages.noMatches
                  : messages.noRecords}
              </p>
            }
          >
            {(render) => (
              <div
                class="table-results-empty"
                ref={(node) => {
                  emptyResultsElement = node
                }}
              >
                {render()({
                  get filtered() {
                    return filterCount() > 0
                  },
                  clearFilters,
                })}
              </div>
            )}
          </Show>
        </Show>
      </div>
    </TableWorkspace>
  )
}
