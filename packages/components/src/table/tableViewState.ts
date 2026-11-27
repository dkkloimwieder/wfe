import type { TableColumnAlignment } from './Table'
import type { NativeTableState } from './engine'

export type TableViewValue =
  | null
  | boolean
  | number
  | string
  | readonly TableViewValue[]
  | { readonly [key: string]: TableViewValue | undefined }

export type TableControlsPlacement = 'left' | 'top' | 'right'

export type TableViewControlsState = {
  placement?: TableControlsPlacement
  collapsed?: boolean
  /** A percentage, or null for automatic sizing. */
  size?: number | null
}

/** Omitted settings use the initial configuration of the current table. */
export type TableViewState = {
  version: 1
  columnFilters?: readonly { id: string; value: TableViewValue }[]
  globalFilter?: string
  sorting?: Readonly<NativeTableState['sorting']>
  grouping?: readonly string[]
  groupSorting?: Readonly<NativeTableState['groupSorting']>
  groupExpanded?: Readonly<NativeTableState['groupExpanded']>
  columnVisibility?: Readonly<NativeTableState['columnVisibility']>
  columnOrder?: readonly string[]
  columnPinning?: { start: readonly string[]; end: readonly string[] }
  columnSizing?: Readonly<NativeTableState['columnSizing']>
  columnAlignment?: Readonly<Record<string, TableColumnAlignment>>
  pageSize?: number
  extraFilters?: TableViewValue
  formatting?: TableViewValue
  controls?: TableViewControlsState
}

export type TableView = { id: string; name: string; state: TableViewState }
export type TableViewList = {
  views: readonly TableView[]
  defaultId?: string | null
}

type ViewResult<T> = T | Promise<T>

/** One adapter belongs to one user's table. Remove also clears its default ID. */
export type TableViewStorage = {
  list: (signal: AbortSignal) => ViewResult<TableViewList>
  save: (view: TableView, signal: AbortSignal) => ViewResult<void>
  remove: (id: string, signal: AbortSignal) => ViewResult<void>
  setDefault: (id: string | null, signal: AbortSignal) => ViewResult<void>
  /** Reports list changes from the application without replacing the current controls. */
  subscribe?: (listener: (list: TableViewList) => void) => () => void
}

export type TableViewsOptions = {
  systemViews?: readonly TableView[]
  initialViewId?: string
  storage: TableViewStorage
}

export type TableViewBinding = {
  capture: () => TableViewValue
  restore: (value: TableViewValue) => void
  /** Drop retired or unsupported settings before comparison and restore. */
  normalize?: (value: TableViewValue) => TableViewValue
}

export type ReadOnlyTableViewsOptions = TableViewsOptions & {
  extraFilters?: TableViewBinding
  formatting?: TableViewBinding
}

export type TableWorkspaceViewsOptions = TableViewsOptions & {
  capture: () => Omit<TableViewState, 'controls'> | undefined
  restore: (state: Omit<TableViewState, 'controls'>) => void
  normalize?: (
    state: Omit<TableViewState, 'controls'>,
    initial: Omit<TableViewState, 'controls'>,
  ) => Omit<TableViewState, 'controls'>
}

export function viewRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null) return
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype === Object.prototype || prototype === null)
    return value as Record<string, unknown>
  return undefined
}

/** Copy JSON data and sort object keys for stable comparisons. */
export function copyTableViewValue(
  value: unknown,
  ancestors = new Set<object>(),
): TableViewValue | undefined {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return value
  const record = viewRecord(value)
  if (
    (!Array.isArray(value) && !record) ||
    typeof value !== 'object' ||
    value === null ||
    ancestors.has(value)
  )
    return
  ancestors.add(value)
  let result: TableViewValue | undefined
  if (Array.isArray(value)) {
    const items = Array.from(value, (entry: unknown) =>
      copyTableViewValue(entry, ancestors),
    )
    if (items.every((item) => item !== undefined)) result = items
  } else if (record) {
    const entries = Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => [key, copyTableViewValue(record[key], ancestors)] as const)
    if (entries.every(([, field]) => field !== undefined))
      result = Object.fromEntries(entries)
  }
  ancestors.delete(value)
  return result
}

export function viewArray<T>(
  value: unknown,
  read: (entry: unknown) => T | undefined,
): T[] | undefined {
  if (!Array.isArray(value)) return
  return value.flatMap((entry: unknown) => {
    const parsed = read(entry)
    return parsed === undefined ? [] : [parsed]
  })
}

export function viewString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function viewBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function positiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined
}

function viewMap<T>(
  value: unknown,
  read: (field: unknown) => T | undefined,
): Record<string, T> | undefined {
  const record = viewRecord(value)
  if (!record) return
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .flatMap((key) => {
        const field = read(record[key])
        // State maps are also copied into mutable engine objects.
        return field === undefined || key === '__proto__' ? [] : [[key, field]]
      }),
  )
}

function viewFilter(value: unknown) {
  const entry = viewRecord(value)
  const field = copyTableViewValue(entry?.value)
  if (typeof entry?.id === 'string' && field !== undefined)
    return { id: entry.id, value: field }
  return undefined
}

function viewSort(value: unknown) {
  const entry = viewRecord(value)
  if (typeof entry?.id === 'string' && typeof entry.desc === 'boolean')
    return { id: entry.id, desc: entry.desc }
  return undefined
}

function viewGroupSort(value: unknown) {
  const entry = viewRecord(value)
  const sort = viewSort(value)
  const depth = entry?.depth
  if (
    sort &&
    typeof depth === 'number' &&
    Number.isSafeInteger(depth) &&
    depth >= 0
  )
    return { ...sort, depth }
  return undefined
}

function viewPinning(value: unknown) {
  const entry = viewRecord(value)
  const start = viewArray(entry?.start, viewString)
  const end = viewArray(entry?.end, viewString)
  if (start && end) return { start, end }
  return undefined
}

export function viewPlacement(value: unknown) {
  if (value === 'left' || value === 'right' || value === 'top') return value
  return undefined
}

function viewControls(value: unknown): TableViewControlsState | undefined {
  const entry = viewRecord(value)
  if (!entry) return
  const size = entry.size
  return {
    placement: viewPlacement(entry.placement),
    collapsed: viewBoolean(entry.collapsed),
    size:
      size === null || (typeof size === 'number' && size >= 10 && size <= 90)
        ? size
        : undefined,
  }
}

export function readTableViewState(input: unknown): TableViewState | undefined {
  const state = viewRecord(input)
  if (state?.version !== 1) return
  return {
    version: 1,
    columnFilters: viewArray(state.columnFilters, viewFilter),
    globalFilter: viewString(state.globalFilter),
    sorting: viewArray(state.sorting, viewSort),
    grouping: viewArray(state.grouping, viewString),
    groupSorting: viewArray(state.groupSorting, viewGroupSort),
    groupExpanded: viewMap(state.groupExpanded, viewBoolean),
    columnVisibility: viewMap(state.columnVisibility, viewBoolean),
    columnOrder: viewArray(state.columnOrder, viewString),
    columnPinning: viewPinning(state.columnPinning),
    columnSizing: viewMap(state.columnSizing, (value) =>
      typeof value === 'number' && Number.isFinite(value) && value > 0
        ? value
        : undefined,
    ),
    columnAlignment: viewMap(state.columnAlignment, (value) =>
      value === 'left' || value === 'center' || value === 'right'
        ? value
        : undefined,
    ),
    pageSize: positiveInteger(state.pageSize),
    extraFilters: copyTableViewValue(state.extraFilters),
    formatting: copyTableViewValue(state.formatting),
    controls: viewControls(state.controls),
  }
}

export function readTableView(input: unknown): TableView | undefined {
  const view = viewRecord(input)
  const id = viewString(view?.id)
  const name = viewString(view?.name)?.trim()
  const state = readTableViewState(view?.state)
  if (id && name && state) return { id, name, state }
  return undefined
}

export function mergeTableViewState(
  initial: TableViewState,
  state: TableViewState,
): TableViewState {
  return {
    ...initial,
    ...Object.fromEntries(
      Object.entries(state).filter(([, value]) => value !== undefined),
    ),
    controls: {
      ...initial.controls,
      ...Object.fromEntries(
        Object.entries(state.controls ?? {}).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    },
  }
}
