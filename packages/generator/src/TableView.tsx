import { createMemo, untrack } from 'solid-js'
import { ValueDisplay } from '@wfe/components'
import { Show } from 'solid-js'
import { ReadOnlyTable } from '@wfe/components/table'
import type { NativeCell } from '@wfe/components/table'
import type { Component } from 'solid-js'
import type {
  TableDescription,
  TableViewBindings,
  CustomCellProps,
} from './types'
import {
  ActionsView,
  StatusView,
  requireValue,
  validateActions,
  validatePresentation,
  uniqueIds,
} from './shared'
import type { Actions } from './shared'

export function TableView<Row, Meta, D extends TableDescription>(props: {
  description: D
  bindings: TableViewBindings<Row, Meta, D>
}) {
  const table = untrack(() => props.bindings.table)
  const identity = untrack(() => props.description.id)
  const cells = () =>
    (
      props.bindings as {
        cells?: Readonly<Record<string, Component<CustomCellProps<Row, Meta>>>>
      }
    ).cells
  const actions = () => (props.bindings as { actions?: Actions }).actions
  const initialCells = untrack(() => ({ ...cells() }))
  const initialRenderers = untrack(() =>
    Object.fromEntries(
      Object.entries(props.description.columns).map(([id, column]) => [
        id,
        column.renderer,
      ]),
    ),
  )
  const description = createMemo(() => {
    const value = props.description
    requireValue(
      value.id === identity && props.bindings.table === table,
      'remount the table view to replace its identity or table instance',
    )
    uniqueIds([value.id], 'table')
    requireValue(
      value.controlsPlacement === undefined ||
        ['left', 'top', 'right'].includes(value.controlsPlacement),
      'unsupported table controls placement',
    )
    validateActions(value.actions ?? [], actions())
    uniqueIds(Object.keys(value.columns), 'column')
    for (const id of new Set([
      ...Object.keys(initialRenderers),
      ...Object.keys(value.columns),
    ])) {
      requireValue(
        (Object.hasOwn(value.columns, id)
          ? value.columns[id]?.renderer
          : undefined) ===
          (Object.hasOwn(initialRenderers, id)
            ? initialRenderers[id]
            : undefined),
        `remount the table view to replace the renderer for column "${id}"`,
      )
    }
    for (const [id, column] of Object.entries(value.columns)) {
      requireValue(table.getColumn(id), `unknown table column "${id}"`)
      validatePresentation(column, `column "${id}"`)
      if (column.renderer !== undefined) {
        uniqueIds([column.renderer], 'cell renderer')
        requireValue(
          Object.hasOwn(cells() ?? {}, column.renderer) &&
            typeof cells()?.[column.renderer] === 'function',
          `missing cell renderer "${column.renderer}"`,
        )
        requireValue(
          cells()?.[column.renderer] === initialCells[column.renderer],
          `remount the table view to replace cell renderer "${column.renderer}"`,
        )
      }
    }
    return value
  })
  const aliases = createMemo(() => {
    const value = props.bindings.headerAliases?.() ?? {}
    for (const id of Object.keys(value))
      requireValue(
        Object.hasOwn(description().columns, id),
        `unknown header alias "${id}"`,
      )
    return value as Readonly<Record<string, string | undefined>>
  })
  function Cell(cellProps: { cell: NativeCell<Row, Meta> }) {
    const renderer = untrack(() => {
      const columns = description().columns
      const id = cellProps.cell.column.id
      return Object.hasOwn(columns, id) ? columns[id]?.renderer : undefined
    })
    const Custom = renderer ? initialCells[renderer] : undefined
    return Custom ? (
      <Custom
        row={cellProps.cell.row}
        value={cellProps.cell.getValue()}
        column={cellProps.cell.column}
      />
    ) : (
      <Show
        when={description().columns[cellProps.cell.column.id]?.format}
        keyed
        fallback={String(cellProps.cell.getValue() ?? '')}
      >
        {(format) => (
          <ValueDisplay
            value={cellProps.cell.getValue()}
            format={format}
            locale={
              description().columns[cellProps.cell.column.id]?.formatOptions
                ?.locale
            }
            dateFormat={
              description().columns[cellProps.cell.column.id]?.formatOptions
                ?.dateFormat
            }
            timeFormat={
              description().columns[cellProps.cell.column.id]?.formatOptions
                ?.timeFormat
            }
            timeZone={
              description().columns[cellProps.cell.column.id]?.formatOptions
                ?.timeZone
            }
          />
        )}
      </Show>
    )
  }
  return (
    <section
      style={{
        display: 'flex',
        'flex-direction': 'column',
        flex: 1,
        'min-height': 0,
      }}
      data-generator-view={description().id}
      aria-busy={props.bindings.status?.().loading ? 'true' : 'false'}
    >
      <StatusView status={props.bindings.status} />
      <ReadOnlyTable
        table={table}
        selection={props.bindings.selection}
        width={props.bindings.width}
        headerEnd={props.bindings.headerEnd}
        title={description().title}
        controls={description().controls}
        controlsPlacement={description().controlsPlacement}
        controlsResizable={props.bindings.controlsResizable}
        controlsSize={props.bindings.controlsSize}
        onControlsSizeChange={props.bindings.onControlsSizeChange}
        controlsCollapsed={props.bindings.controlsCollapsed}
        onControlsCollapsedChange={props.bindings.onControlsCollapsedChange}
        onApplyFilters={props.bindings.onApplyFilters}
        filter={props.bindings.filter}
        groupable={props.bindings.groupable}
        columnAlignment={props.bindings.columnAlignment}
        onColumnAlignmentChange={props.bindings.onColumnAlignmentChange}
        label={(column) =>
          aliases()[column.id] ??
          description().columns[column.id]?.label ??
          String(column.columnDef?.header ?? column.id)
        }
        renderCell={(cell) => <Cell cell={cell} />}
        actions={
          description().actions?.length ? (
            <ActionsView
              descriptions={description().actions ?? []}
              bindings={actions()}
            />
          ) : undefined
        }
      />
    </section>
  )
}
