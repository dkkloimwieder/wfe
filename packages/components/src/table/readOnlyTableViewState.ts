import { parseDate } from '../utils/date'
import type { TableColumnFilterConfig } from './TableColumnFilter'
import type { NativeColumn, NativeTable } from './engine'
import {
  copyTableViewValue,
  viewArray,
  viewRecord,
  viewString,
  type TableViewState,
  type TableViewValue,
} from './tableViewState'

type FilterKind = TableColumnFilterConfig['kind']
type FilterRule = { kind: FilterKind; config?: TableColumnFilterConfig }

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function tableViewFilterValue(
  input: TableViewValue,
  rule: FilterRule | undefined,
): TableViewValue | undefined {
  if (!rule) return input
  const { kind, config } = rule
  if (kind === 'boolean') return typeof input === 'boolean' ? input : undefined
  if (kind === 'text' && !config)
    return typeof input === 'string' || typeof input === 'number'
      ? input
      : undefined
  const value = viewRecord(input)
  if (!value) return
  if (kind === 'date-range') {
    const start = viewString(value.start)
    const end = viewString(value.end)
    if ((start && parseDate(start)) || (end && parseDate(end)))
      return {
        start: start && parseDate(start) ? start : undefined,
        end: end && parseDate(end) ? end : undefined,
      }
    return
  }
  const operator = value.operator
  if (operator === 'empty' || operator === 'not-empty')
    return config && 'empty' in config && config.empty
      ? { operator }
      : undefined
  if (
    kind === 'text' &&
    (operator === 'contains' ||
      operator === 'equals' ||
      operator === 'starts-with' ||
      operator === 'not-contains') &&
    typeof value.value === 'string'
  )
    return { operator, value: value.value }
  if (kind === 'number-range' && operator === 'between') {
    const min = finiteNumber(value.min)
    const max = finiteNumber(value.max)
    if (min !== undefined || max !== undefined) return { operator, min, max }
  }
  if (!config || !('choices' in config)) return
  if (
    (kind === 'tags' && (operator === 'any' || operator === 'all')) ||
    (kind !== 'tags' && operator === 'in') ||
    (operator === 'not-in' && config.exclude)
  ) {
    const valid = new Set(config.choices.map(({ value }) => value))
    const values = viewArray(value.values, viewString)?.filter((item) =>
      valid.has(item),
    )
    if (values?.length) return { operator, values: [...new Set(values)].sort() }
  }
  return undefined
}

export function captureTableView<T, M>(
  table: NativeTable<T, M>,
  criteria: {
    columnFilters: readonly { id: string; value: unknown }[]
    globalFilter: string
  },
): TableViewState | undefined {
  const state = table.state
  const columnFilters = criteria.columnFilters
    .filter(({ id }) => table.getColumn(id))
    .map(({ id, value }) => ({ id, value: copyTableViewValue(value) }))
  if (columnFilters.some(({ value }) => value === undefined)) return
  return {
    version: 1,
    columnFilters: columnFilters as NonNullable<
      TableViewState['columnFilters']
    >,
    globalFilter: criteria.globalFilter,
    sorting: state.sorting.map(({ id, desc }) => ({ id, desc })),
    grouping: state.grouping.slice(),
    groupSorting: state.groupSorting.map(({ depth, id, desc }) => ({
      depth,
      id,
      desc,
    })),
    groupExpanded: { ...state.groupExpanded },
    columnVisibility: Object.fromEntries(
      table.getColumns().map((column) => [column.id, column.getIsVisible()]),
    ),
    columnOrder: state.columnOrder.slice(),
    columnPinning: {
      start: state.columnPinning.start.slice(),
      end: state.columnPinning.end.slice(),
    },
    columnSizing: { ...state.columnSizing },
  }
}

function firstBy<T, K>(items: readonly T[], key: (item: T) => K): T[] {
  const seen = new Set<K>()
  return items.filter((item) => {
    const value = key(item)
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

export function normalizeTableView<T, M>(
  state: TableViewState,
  initial: TableViewState,
  columns: readonly NativeColumn<T, M>[],
  options: {
    filterRule: (column: NativeColumn<T, M>) => FilterRule | undefined
    filterable: (column: NativeColumn<T, M>) => boolean
    groupable: (id: string) => boolean
    groupSortable: (column: NativeColumn<T, M>) => boolean
    sortable: (column: NativeColumn<T, M>) => boolean
  },
): TableViewState {
  const known = new Map(
    columns
      .filter(({ id }) => id !== '__proto__')
      .map((column) => [column.id, column]),
  )
  const existing = (id: string) => known.has(id)
  const ordered = (ids: readonly string[] = []) => [
    ...new Set(ids.filter(existing)),
  ]
  const order = ordered(state.columnOrder)
  const grouping = ordered(state.grouping).filter(options.groupable)
  const pinning = (ids?: readonly string[]) =>
    ordered(ids).filter(
      (id) => known.get(id)?.columnDef?.enablePinning !== false,
    )
  const start = pinning(state.columnPinning?.start)
  const end = pinning(state.columnPinning?.end).filter(
    (id) => !start.includes(id),
  )
  const columnFilters = firstBy(
    state.columnFilters ?? [],
    (filter) => filter.id,
  )
    .flatMap(({ id, value }) => {
      const column = known.get(id)
      if (!column || !options.filterable(column)) return []
      const filter = tableViewFilterValue(value, options.filterRule(column))
      return filter === undefined ? [] : [{ id, value: filter }]
    })
    .sort((a, b) => (a.id < b.id ? -1 : Number(a.id > b.id)))
  const groupSorting = firstBy(
    (state.groupSorting ?? []).flatMap(({ id, depth, desc }) => {
      const group = state.grouping?.[depth]
      const next = group === undefined ? -1 : grouping.indexOf(group)
      const column = known.get(id)
      return column && options.groupSortable(column) && next >= 0
        ? [{ id, depth: next, desc }]
        : []
    }),
    (sort) => sort.depth,
  ).sort((a, b) => a.depth - b.depth)
  const columnSizing = Object.fromEntries(
    Object.entries(state.columnSizing ?? {}).flatMap(([id, size]) => {
      const column = known.get(id)
      if (!column || column.columnDef?.enableResizing === false) return []
      const min = column.columnDef?.minSize ?? 20
      const max = column.columnDef?.maxSize ?? Number.MAX_SAFE_INTEGER
      return [[id, Math.max(min, Math.min(size, max))]]
    }),
  )
  return {
    ...state,
    columnFilters,
    sorting: firstBy(state.sorting ?? [], (sort) => sort.id).filter(
      ({ id }) => {
        const column = known.get(id)
        return column && options.sortable(column)
      },
    ),
    grouping,
    groupSorting,
    groupExpanded: Object.fromEntries(
      Object.entries(state.groupExpanded ?? {}).filter(([, open]) => open),
    ),
    columnOrder: [
      ...order,
      ...[...known.keys()].filter((id) => !order.includes(id)),
    ],
    columnVisibility: Object.fromEntries(
      [...known].map(([id, column]) => [
        id,
        column.columnDef?.enableHiding === false ||
          (state.columnVisibility?.[id] ?? initial.columnVisibility?.[id]) !==
            false,
      ]),
    ),
    columnPinning: { start, end },
    columnSizing,
    columnAlignment: Object.fromEntries(
      [...known.keys()].map((id) => [
        id,
        state.columnAlignment?.[id] ?? initial.columnAlignment?.[id] ?? 'left',
      ]),
    ),
  }
}
