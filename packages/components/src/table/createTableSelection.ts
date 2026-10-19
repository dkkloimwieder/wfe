import { createEffect, createMemo, createSignal, untrack } from 'solid-js'
import type { Accessor } from 'solid-js'

export type TableSelectionCell = Readonly<{ row: string; column: string }>
export type TableSelectionRange = Readonly<{
  anchor: TableSelectionCell
  focus: TableSelectionCell
  kind?: 'cells' | 'rows' | 'columns' | 'all'
}>
export type TableSelectionOptions = {
  /** IDs in displayed order. Include only synchronously available records. */
  rows: Accessor<readonly string[]>
  /** Exclude action and other non-data columns. */
  columns: Accessor<readonly string[]>
  getText: (cell: TableSelectionCell) => string
  value?: Accessor<TableSelectionRange | undefined>
  defaultValue?: TableSelectionRange
  onChange?: (range: TableSelectionRange | undefined) => void
  /** The application owns virtual scrolling and data access. */
  onReveal?: (cell: TableSelectionCell) => void
}
function sameIds(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index])
}
function axis(ids: readonly string[]) {
  const index = new Map(ids.map((id, position) => [id, position]))
  if (index.size !== ids.length)
    throw new Error('Table selection requires unique row and column IDs')
  return { ids: [...ids], index }
}
function quote(value: string) {
  return /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** UI selection only. Applications supply order, available data and copy text. */
export function createTableSelection(options: TableSelectionOptions) {
  let previous:
    | { rows: ReturnType<typeof axis>; columns: ReturnType<typeof axis> }
    | undefined
  const axes = createMemo(() => {
    const rows = options.rows(),
      columns = options.columns()
    if (
      previous &&
      sameIds(rows, previous.rows.ids) &&
      sameIds(columns, previous.columns.ids)
    )
      return previous
    return (previous = { rows: axis(rows), columns: axis(columns) })
  })
  const [revision, setRevision] = createSignal(0)
  let local = { value: options.defaultValue, axes: untrack(axes) }
  const controlledValue = createMemo(() => options.value?.())
  const controlledState = createMemo(() => ({
    value: controlledValue(),
    axes: untrack(axes),
  }))
  function accepted() {
    if (options.value) return controlledState()
    revision()
    return local
  }
  function bounds() {
    const order = axes(),
      state = accepted(),
      range = state.value
    if (!range || order !== state.axes) return
    const ar = order.rows.index.get(range.anchor.row),
      fr = order.rows.index.get(range.focus.row)
    const ac = order.columns.index.get(range.anchor.column),
      fc = order.columns.index.get(range.focus.column)
    if (
      ar === undefined ||
      fr === undefined ||
      ac === undefined ||
      fc === undefined
    )
      return
    const allRows = range.kind === 'columns' || range.kind === 'all'
    const allColumns = range.kind === 'rows' || range.kind === 'all'
    return {
      top: allRows ? 0 : Math.min(ar, fr),
      bottom: allRows ? order.rows.ids.length - 1 : Math.max(ar, fr),
      left: allColumns ? 0 : Math.min(ac, fc),
      right: allColumns ? order.columns.ids.length - 1 : Math.max(ac, fc),
    }
  }
  function change(range: TableSelectionRange | undefined) {
    if (!options.value) {
      local = { value: range, axes: untrack(axes) }
      setRevision((value) => value + 1)
    }
    untrack(() => options.onChange?.(range))
  }
  createEffect(
    () => ({ accepted: accepted(), axes: axes() }),
    (state) => {
      if (state.accepted.value && state.accepted.axes !== state.axes)
        change(undefined)
    },
  )
  let revealed: TableSelectionCell | undefined
  createEffect(
    () => (bounds() ? accepted().value?.focus : undefined),
    (focus) => {
      const changed =
        focus?.row !== revealed?.row || focus?.column !== revealed?.column
      revealed = focus
      if (focus && changed) untrack(() => options.onReveal?.(focus))
    },
  )
  function contains(cell: TableSelectionCell) {
    return (
      axes().rows.index.has(cell.row) && axes().columns.index.has(cell.column)
    )
  }
  function select(cell: TableSelectionCell, extend = false) {
    if (!contains(cell)) return
    const current = bounds() ? accepted().value : undefined
    const anchor = extend && current ? current.anchor : cell
    if (
      current?.kind === 'cells' &&
      current.anchor.row === anchor.row &&
      current.anchor.column === anchor.column &&
      current.focus.row === cell.row &&
      current.focus.column === cell.column
    )
      return
    change({ anchor: { ...anchor }, focus: { ...cell }, kind: 'cells' })
  }
  function whole(kind: 'rows' | 'columns' | 'all') {
    const order = axes(),
      current = bounds() ? accepted().value : undefined
    const cell = current?.focus ?? {
      row: order.rows.ids[0]!,
      column: order.columns.ids[0]!,
    }
    if (!contains(cell)) return
    change({
      anchor: { ...(current?.anchor ?? cell) },
      focus: { ...cell },
      kind,
    })
  }
  return {
    get range() {
      return bounds() ? accepted().value : undefined
    },
    get bounds() {
      return bounds()
    },
    get rowCount() {
      const b = bounds()
      return b ? b.bottom - b.top + 1 : 0
    },
    get columnCount() {
      const b = bounds()
      return b ? b.right - b.left + 1 : 0
    },
    contains,
    select,
    selectRow: () => whole('rows'),
    selectColumn: () => whole('columns'),
    selectAll: () => whole('all'),
    clear: () => change(undefined),
    move(rowDelta: number, columnDelta: number, extend = false) {
      const order = axes(),
        current = bounds() ? accepted().value?.focus : undefined
      const row = current ? order.rows.index.get(current.row)! : 0
      const column = current ? order.columns.index.get(current.column)! : 0
      const cell = {
        row: order.rows.ids[
          Math.max(
            0,
            Math.min(order.rows.ids.length - 1, row + (current ? rowDelta : 0)),
          )
        ]!,
        column:
          order.columns.ids[
            Math.max(
              0,
              Math.min(
                order.columns.ids.length - 1,
                column + (current ? columnDelta : 0),
              ),
            )
          ]!,
      }
      select(cell, extend)
    },
    cellState(cell: TableSelectionCell) {
      const b = bounds(),
        order = axes()
      if (!b) return
      const row = order.rows.index.get(cell.row),
        column = order.columns.index.get(cell.column)
      if (
        row === undefined ||
        column === undefined ||
        row < b.top ||
        row > b.bottom ||
        column < b.left ||
        column > b.right
      )
        return
      const anchor = accepted().value!.anchor
      return {
        active: anchor.row === cell.row && anchor.column === cell.column,
        edges: [
          row === b.top && 'top',
          row === b.bottom && 'bottom',
          column === b.left && 'left',
          column === b.right && 'right',
        ]
          .filter(Boolean)
          .join(' '),
      }
    },
    copyText() {
      const b = bounds(),
        order = axes()
      if (!b) return
      const rows: string[] = []
      for (let row = b.top; row <= b.bottom; row++) {
        const cells: string[] = []
        for (let column = b.left; column <= b.right; column++)
          cells.push(
            quote(
              options.getText({
                row: order.rows.ids[row]!,
                column: order.columns.ids[column]!,
              }),
            ),
          )
        rows.push(cells.join('\t'))
      }
      return rows.join('\n')
    },
  }
}
export type TableSelection = ReturnType<typeof createTableSelection>
