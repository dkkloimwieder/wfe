import { columnLabel } from './columnLabel'
import { resolveTableMessages, type TableMessages } from './messages'
import { Icon } from '../components/Icon'
import {
  For,
  Show,
  createMemo,
  createEffect,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'
import { Button } from '../components/NativeFields'
import { nativeEvents } from '../utils/nativeEvents'
import { TableSort } from './TableSort'
import { tableSelectionEvents } from './tableSelectionEvents'
import type { TableSelection } from './createTableSelection'
import type { JSX } from '@solidjs/web'
import type { NativeCell, NativeColumn, NativeTable } from './engine'

export type TableColumnAlignment = 'left' | 'center' | 'right'
export type TableColumnAlignments = Readonly<
  Record<string, TableColumnAlignment | undefined>
>
export type TableColumnWidths = Readonly<
  Record<string, number | string | undefined>
>
export type TableCellWrap = 'normal' | 'anywhere'

function cssWidth(width: number | string | undefined) {
  return typeof width === 'number' ? `${width}px` : width
}

export type TableEdge = {
  /** Numeric pixel width or a CSS length, including shared sizing variables. */
  width: number | string
  /** Use intrinsic table layout to fit the contents of a trailing edge. */
  fitContent?: boolean
  header: () => JSX.Element
  group: () => JSX.Element
}

/** Shared presentation. Applications own data, processing and editing policy. */
export function Table<T, M>(props: {
  messages?: Partial<TableMessages>
  table: NativeTable<T, M>
  selection?: TableSelection
  columnAlignment?: TableColumnAlignments
  caption?: string
  accessibleLabel?: string
  label?: (column: NativeColumn<T, M>) => string
  header?: (column: NativeColumn<T, M>) => JSX.Element
  headerEnd?: (column: NativeColumn<T, M>) => JSX.Element
  summaryHeader?: (column: NativeColumn<T, M>) => JSX.Element
  ariaSort?: (column: NativeColumn<T, M>) => JSX.AriaAttributes['aria-sort']
  renderRow?: (id: string, grouped: boolean) => JSX.Element
  renderBody?: () => JSX.Element
  renderCell?: (cell: NativeCell<T, M>) => JSX.Element
  formatValue?: (value: unknown, column: NativeColumn<T, M>) => JSX.Element
  formatSummary?: (value: unknown, column: NativeColumn<T, M>) => JSX.Element
  groupLabel?: (id: string) => string
  grouped?: boolean
  rowIds?: readonly string[]
  displayKeys?: readonly string[]
  canToggleGroup?: () => boolean
  leading?: TableEdge
  leadingColumns?: readonly TableEdge[]
  trailing?: TableEdge
  /** Exact pixel width when supplied. Otherwise the table fills its container. */
  width?: number
  minWidth?: number | string
  columnWidths?: TableColumnWidths
  cellWrap?: TableCellWrap
  elementRef?: (element: HTMLTableElement) => void
  onGroupMount?: () => void
  onGroupCleanup?: () => void
  onGroupCell?: () => void
}) {
  const messages = resolveTableMessages(() => props.messages)
  const table = untrack(() => props.table)
  createEffect(
    () => props.table,
    (next) => {
      if (next !== table)
        throw new Error(
          'Table: remount the table presentation to replace its table controller',
        )
    },
  )
  const selection = createMemo(() => props.selection)
  const elementRef = untrack(() => props.elementRef)
  const [element, setElement] = createSignal<HTMLTableElement>()
  let binding: ReturnType<typeof tableSelectionEvents> | undefined
  createEffect(
    () => ({ element: element(), selection: selection() }),
    ({ element, selection }) => {
      if (!element || !selection) return
      binding = untrack(() => tableSelectionEvents(element, selection))
      return () => {
        binding?.dispose()
        binding = undefined
      }
    },
  )
  createEffect(
    () => selection()?.range,
    () => untrack(() => binding?.paint()),
  )
  const headerEnd = createMemo(() => props.headerEnd)
  const grouped = () => props.grouped ?? table.state.grouping.length > 0
  const leading = createMemo(() =>
    props.leading
      ? [props.leading, ...(props.leadingColumns ?? [])]
      : props.leadingColumns,
  )
  const label = (column: NativeColumn<T, M>) =>
    props.label?.(column) ?? columnLabel(column)
  function DataRow(row: { id: string; grouped: boolean }) {
    return (
      <Show
        when={props.renderRow}
        keyed
        fallback={
          <TableRow
            table={table}
            columnAlignment={props.columnAlignment}
            id={row.id}
            renderCell={props.renderCell}
            formatValue={props.formatValue}
          />
        }
      >
        {(renderRow) => renderRow(row.id, row.grouped)}
      </Show>
    )
  }
  return (
    <>
      <Show when={selection()} keyed>
        {(controller) => (
          <output class="sr-only" aria-live="polite" data-ui-text="system">
            {messages.selectionCount(
              controller.rowCount,
              controller.columnCount,
            )}
          </output>
        )}
      </Show>
      <table
        class="ui-table"
        data-cell-wrap={props.cellWrap}
        data-fit-trailing={props.trailing?.fitContent ? '' : undefined}
        ref={(node) => {
          setElement(node)
          elementRef?.(node)
        }}
        tabindex={props.selection ? 0 : -1}
        aria-label={props.accessibleLabel}
        aria-description={
          props.selection ? messages.selectionKeyboardHelp : undefined
        }
        style={{
          width: props.width === undefined ? '100%' : `${props.width}px`,
          'min-width': cssWidth(props.minWidth),
        }}
      >
        <Show when={props.caption}>
          <caption>{props.caption}</caption>
        </Show>
        <Show
          when={
            props.width !== undefined ||
            props.columnWidths ||
            leading()?.length ||
            props.trailing
          }
        >
          <colgroup>
            <For each={leading()}>
              {(edge) => <col style={{ width: cssWidth(edge.width) }} />}
            </For>
            <For each={table.getVisibleColumns()}>
              {(column) => (
                <col
                  data-column-width={column.id}
                  style={{
                    width: cssWidth(
                      props.columnWidths?.[column.id] ??
                        (props.width === undefined
                          ? undefined
                          : column.getSize()),
                    ),
                  }}
                />
              )}
            </For>
            <Show when={props.trailing}>
              <col style={{ width: cssWidth(props.trailing?.width) }} />
            </Show>
          </colgroup>
        </Show>
        <thead>
          <tr>
            <For each={leading()}>{(edge) => edge.header()}</For>
            <For each={table.getVisibleColumns()}>
              {(column) => (
                <th
                  scope="col"
                  data-column={column.id}
                  data-column-header={column.id}
                  data-column-alignment={props.columnAlignment?.[column.id]}
                  class="column-header"
                  aria-sort={
                    props.ariaSort
                      ? props.ariaSort(column)
                      : column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : column.getIsSorted() === 'desc'
                          ? 'descending'
                          : 'none'
                  }
                >
                  <div class="column-heading">
                    {props.header ? (
                      props.header(column)
                    ) : (
                      <TableSort
                        messages={props.messages}
                        label={label(column)}
                        sorted={column.getIsSorted()}
                        disabled={
                          !table.options.manualProcessing &&
                          !table.options.manualSorting &&
                          !column.columnDef?.sortFn
                        }
                        onSort={(multi) =>
                          column.toggleSorting(undefined, multi)
                        }
                      />
                    )}
                  </div>
                  {headerEnd()?.(column)}
                </th>
              )}
            </For>
            {props.trailing?.header()}
          </tr>
          <Show when={grouped() && props.summaryHeader}>
            <tr class="group-summary-headers">
              <For each={leading()}>
                {() => <th class="sub-table-control" />}
              </For>
              <For each={table.getVisibleColumns()}>
                {(column) => (
                  <th
                    scope="col"
                    data-summary-header={column.id}
                    data-column-alignment={props.columnAlignment?.[column.id]}
                  >
                    {props.summaryHeader!(column)}
                  </th>
                )}
              </For>
              <Show when={props.trailing}>
                <th scope="col">-</th>
              </Show>
            </tr>
          </Show>
        </thead>
        <Show
          when={props.renderBody}
          keyed
          fallback={
            <Show
              when={grouped()}
              fallback={
                <For each={props.rowIds ?? table.getRowIds()}>
                  {(id) => <DataRow id={id} grouped={false} />}
                </For>
              }
            >
              <For each={props.displayKeys ?? table.getDisplayKeys()}>
                {(key) => {
                  const item = table.getDisplayItem(key)
                  return item.kind === 'row' ? (
                    <DataRow id={item.id} grouped />
                  ) : (
                    <TableGroup
                      messages={props.messages}
                      table={table}
                      groupKey={item.key}
                      columnAlignment={props.columnAlignment}
                      label={props.groupLabel}
                      formatValue={props.formatValue}
                      formatSummary={props.formatSummary}
                      canToggle={props.canToggleGroup}
                      leading={() => (
                        <For each={leading()}>{(edge) => edge.group()}</For>
                      )}
                      trailing={props.trailing?.group}
                      onMount={props.onGroupMount}
                      onCleanup={props.onGroupCleanup}
                      onCell={props.onGroupCell}
                    />
                  )
                }}
              </For>
            </Show>
          }
        >
          {(renderBody) => renderBody()}
        </Show>
      </table>
    </>
  )
}

export function TableRow<T, M>(props: {
  table: NativeTable<T, M>
  columnAlignment?: TableColumnAlignments
  id: string
  renderCell?: (cell: NativeCell<T, M>) => JSX.Element
  formatValue?: (value: unknown, column: NativeColumn<T, M>) => JSX.Element
  leading?: () => JSX.Element
  trailing?: () => JSX.Element
  detail?: () => JSX.Element
  onCell?: () => void
}) {
  const row = props.table.createRowView(props.id)
  return (
    <tbody>
      <tr data-row={props.id}>
        {props.leading?.()}
        <For each={row.getVisibleCells()}>
          {(cell) => {
            props.onCell?.()
            return (
              <td
                data-column={cell.column.id}
                class="read-only-value"
                data-column-alignment={props.columnAlignment?.[cell.column.id]}
              >
                {props.renderCell
                  ? props.renderCell(cell)
                  : (props.formatValue?.(cell.getValue(), cell.column) ??
                    String(cell.getValue() ?? ''))}
              </td>
            )
          }}
        </For>
        {props.trailing?.()}
      </tr>
      {props.detail?.()}
    </tbody>
  )
}

function TableGroup<T, M>(props: {
  messages?: Partial<TableMessages>
  table: NativeTable<T, M>
  columnAlignment?: TableColumnAlignments
  groupKey: string
  label?: (id: string) => string
  formatValue?: (value: unknown, column: NativeColumn<T, M>) => JSX.Element
  formatSummary?: (value: unknown, column: NativeColumn<T, M>) => JSX.Element
  canToggle?: () => boolean
  leading?: () => JSX.Element
  trailing?: () => JSX.Element
  onMount?: () => void
  onCleanup?: () => void
  onCell?: () => void
}) {
  const messages = resolveTableMessages(() => props.messages)
  const group = props.table.createGroupView(props.groupKey)
  props.onMount?.()
  onCleanup(() => props.onCleanup?.())
  const label = () =>
    group.path
      ?.map(
        (entry) =>
          `${props.label?.(entry.columnId) ?? entry.columnId}: ${entry.value == null || entry.value === '' ? messages.emptyGroup : String(entry.value)}`,
      )
      .join(' / ') ?? ''
  const valueLabel = () => {
    const entry = group.path?.at(-1)
    const value = entry?.value
    if (value == null || value === '') return messages.emptyGroup
    const column = entry && props.table.getColumn(entry.columnId)
    return (column && props.formatValue?.(value, column)) ?? String(value)
  }
  return (
    <tbody>
      <tr data-group={props.groupKey} class="group-row">
        {props.leading?.()}
        <For each={group.getVisibleCells()}>
          {(cell) => {
            props.onCell?.()
            const first = () => {
              const columnId = group.path?.at(-1)?.columnId
              const visible = props.table.getVisibleColumns()
              return (
                cell.column.id ===
                (visible.some((column) => column.id === columnId)
                  ? columnId
                  : visible[0]?.id)
              )
            }
            return (
              <td
                data-column={cell.column.id}
                data-column-alignment={props.columnAlignment?.[cell.column.id]}
                role={first() ? 'rowheader' : undefined}
              >
                <Show when={first()}>
                  <div
                    class="group-heading"
                    style={{
                      'padding-left': `${Math.max(group.depth, 0) * 20}px`,
                    }}
                  >
                    <Button
                      data-group-toggle={props.groupKey}
                      aria-expanded={group.getIsExpanded() ? 'true' : 'false'}
                      aria-label={messages.groupToggle(
                        label(),
                        group.getIsExpanded(),
                      )}
                      ref={nativeEvents({
                        click: () => {
                          if (props.canToggle?.() !== false)
                            group.toggleExpanded()
                        },
                      })}
                    >
                      <span>
                        <span class="ui-icon-text-slot">
                          <Icon
                            name={
                              group.getIsExpanded()
                                ? 'chevron-down'
                                : 'chevron-right'
                            }
                          />
                        </span>{' '}
                        {valueLabel()}
                      </span>
                    </Button>
                    <span class="group-count">
                      {messages.groupRecordsCount(group.count)}
                    </span>
                  </div>
                </Show>
                <Show when={cell.column.columnDef?.aggregationFn}>
                  <span
                    class="group-summary"
                    data-group-summary={cell.column.id}
                  >
                    {props.formatSummary?.(cell.getValue(), cell.column) ??
                      String(cell.getValue() ?? '—')}
                  </span>
                </Show>
              </td>
            )
          }}
        </For>
        {props.trailing?.()}
      </tr>
    </tbody>
  )
}
