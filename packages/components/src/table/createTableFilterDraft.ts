import { createEffect, createMemo, createSignal, untrack } from 'solid-js'
import type { NativeTable, NativeTableState } from './engine'

export type TableFilterCriteria = Pick<
  NativeTableState,
  'columnFilters' | 'globalFilter'
>

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      left.every((value, index) => Object.is(value, right[index]))
    )
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object')
    return false
  if (
    Object.getPrototypeOf(left) !== Object.prototype ||
    Object.getPrototypeOf(right) !== Object.prototype
  )
    return false
  const a = left as Record<string, unknown>
  const b = right as Record<string, unknown>
  const keys = Object.keys(a)
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => {
      if (!Object.hasOwn(b, key)) return false
      const value = a[key]
      const other = b[key]
      return (
        Object.is(value, other) ||
        (Array.isArray(value) &&
          Array.isArray(other) &&
          value.length === other.length &&
          value.every((item, index) => Object.is(item, other[index])))
      )
    })
  )
}
function sameColumns(
  left: TableFilterCriteria['columnFilters'],
  right: TableFilterCriteria['columnFilters'],
) {
  return (
    left.length === right.length &&
    left.every((entry) => {
      const other = right.find((filter) => filter.id === entry.id)
      return other !== undefined && sameValue(entry.value, other.value)
    })
  )
}

/** Pending UI criteria. Application changes replace the pending snapshot. */
export function createTableFilterDraft<T, M>(
  table: NativeTable<T, M>,
  options: { onApply?: (criteria: TableFilterCriteria) => void } = {},
) {
  const snapshot = (): TableFilterCriteria => ({
    columnFilters: table.state.columnFilters.map(({ id, value }) => ({
      id,
      value,
    })),
    globalFilter: table.state.globalFilter,
  })
  const [draft, setDraft] = createSignal<TableFilterCriteria>(untrack(snapshot))
  createEffect(
    snapshot,
    (value) => {
      setDraft(value)
    },
    { defer: true },
  )
  const changed = createMemo(() => {
    const value = draft()
    return (
      value.globalFilter !== table.state.globalFilter ||
      !sameColumns(value.columnFilters, table.state.columnFilters)
    )
  })
  return {
    get changed() {
      return changed()
    },
    get globalFilter() {
      return draft().globalFilter
    },
    getValue(id: string) {
      return draft().columnFilters.find((filter) => filter.id === id)?.value
    },
    setValue(id: string, value: unknown) {
      setDraft((old) => ({
        ...old,
        columnFilters:
          value === undefined || value === ''
            ? old.columnFilters.filter((filter) => filter.id !== id)
            : old.columnFilters.some((filter) => filter.id === id)
              ? old.columnFilters.map((filter) =>
                  filter.id === id ? { id, value } : filter,
                )
              : [...old.columnFilters, { id, value }],
      }))
    },
    setGlobalFilter(value: string) {
      setDraft((old) => ({ ...old, globalFilter: value }))
    },
    apply({ refresh = false }: { refresh?: boolean } = {}) {
      if (!untrack(changed) && !refresh) return
      const value = untrack(draft)
      if (options.onApply) {
        options.onApply({
          columnFilters: value.columnFilters.map(({ id, value }) => ({
            id,
            value,
          })),
          globalFilter: value.globalFilter,
        })
        return
      }
      if (!sameColumns(value.columnFilters, table.state.columnFilters))
        table.setColumnFilters(
          value.columnFilters.map(({ id, value }) => ({ id, value })),
        )
      if (value.globalFilter !== table.state.globalFilter)
        table.setGlobalFilter(value.globalFilter)
    },
  }
}
