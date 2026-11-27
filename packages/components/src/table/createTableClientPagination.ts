import { createEffect, createMemo, createSignal, untrack } from 'solid-js'
import type { NativeTable } from './engine'
import type { TableMessages } from './messages'
import {
  validTablePageSizes,
  type TablePaginationProps,
} from './TablePagination'

export type TableClientPagination = {
  /** Positive, unique sizes. The first size is the initial size. */
  pageSizes: readonly number[]
  /** Controlled, zero-based page index. */
  page?: number
  onPageChange?: (page: number) => void
  /** Controlled size. A value outside pageSizes falls back to its first size. */
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  /** Change this value to return to the first page. Object keys use identity. */
  resetKey?: unknown
}

export function createTableClientPagination<T, M>(
  table: NativeTable<T, M>,
  configuration: () => TableClientPagination | undefined,
  grouped: () => boolean,
  messages: Readonly<Required<TableMessages>>,
) {
  const [localPage, setLocalPage] = createSignal(0)
  const [localSize, setLocalSize] = createSignal<number>()
  const enabled = createMemo(() => configuration() !== undefined)
  const resetKey = createMemo(() => configuration()?.resetKey, {
    equals: Object.is,
  })
  const requestedPage = createMemo(() => configuration()?.page ?? localPage())
  const size = createMemo(() => {
    const options = configuration()
    const sizes = options?.pageSizes
    if (!sizes) return
    if (!validTablePageSizes(sizes))
      throw new Error(
        'Client table page sizes must be unique positive integers',
      )
    const requested = options.pageSize ?? localSize()
    return sizes.find((value) => value === requested) ?? sizes[0]!
  })
  const pageCount = createMemo(() =>
    enabled()
      ? Math.max(1, Math.ceil(table.getRowIds().length / (size() ?? 1)))
      : 1,
  )
  const page = () => {
    const requested = requestedPage()
    return Number.isSafeInteger(requested) && requested >= 0
      ? Math.min(requested, pageCount() - 1)
      : 0
  }
  const changePage = (next: number) => {
    const options = configuration()
    if (!options || next === requestedPage()) return
    if (options.page === undefined) setLocalPage(next)
    options.onPageChange?.(next)
  }
  const reset = () => changePage(0)
  const resetCriteria = createMemo(
    () =>
      enabled() && [
        resetKey(),
        table.state.globalFilter,
        table.state.columnFilters.map(({ id, value }) => [id, value]),
        table.state.sorting.map(({ id, desc }) => [id, desc]),
        table.state.grouping.slice(),
        size(),
      ],
  )
  createEffect(
    () => ({ criteria: resetCriteria(), page: enabled() ? page() : undefined }),
    ({ criteria, page: next }, previous) => {
      if (next === undefined) return
      untrack(() =>
        changePage(
          previous?.criteria && criteria !== previous.criteria ? 0 : next,
        ),
      )
    },
  )
  const rows = createMemo(() => {
    const count = size()
    if (count === undefined) return
    const start = page() * count
    return table.getRowIds().slice(start, start + count)
  })
  const displayKeys = createMemo(() => {
    const ids = rows()
    if (!ids || !grouped()) return
    const included = new Set(ids)
    // Keep the headings for records on this page, including collapsed groups.
    return table.getDisplayKeys().filter((key) => {
      const item = table.getDisplayItem(key)
      if (item.kind === 'row') return included.has(item.id)
      for (const id of table.getGroup(key).getLeafRowIds())
        if (included.has(id)) return true
      return false
    })
  })
  const pagination: TablePaginationProps = {
    get hasPrevious() {
      return page() > 0
    },
    get hasNext() {
      return page() + 1 < pageCount()
    },
    get totalRows() {
      return table.getRowIds().length
    },
    get status() {
      return messages.pageStatus(page() + 1, pageCount())
    },
    onPrevious: () => changePage(Math.max(0, page() - 1)),
    onNext: () => changePage(Math.min(page() + 1, pageCount() - 1)),
    get pageSize(): TablePaginationProps['pageSize'] {
      const options = configuration()?.pageSizes
      return (
        options && {
          value: size()!,
          options,
          onValueChange(value) {
            const current = configuration()
            if (
              !current ||
              !current.pageSizes.includes(value) ||
              value === size()
            )
              return
            if (current.pageSize === undefined) setLocalSize(value)
            current.onPageSizeChange?.(value)
          },
        }
      )
    },
  }
  return { rows, displayKeys, pagination, reset }
}
