import type { GeneratorMessageProps } from './messages'
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
  descriptionLabel,
  validateActions,
  validatePresentation,
  uniqueIds,
} from './shared'
import type { Actions } from './shared'

export function TableView<Row, Meta, D extends TableDescription>(
  props: GeneratorMessageProps & {
    description: D
    bindings: TableViewBindings<Row, Meta, D>
  },
) {
  const table = untrack(() => props.bindings.table)
  const ToolbarActions = untrack(() => props.bindings.toolbarActions)
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
  const configuration = createMemo(() => {
    const value = props.description
    requireValue(
      value.id === identity && props.bindings.table === table,
      'remount the table view to replace its identity or table instance',
    )
    requireValue(
      props.bindings.toolbarActions === ToolbarActions,
      'remount the table view to replace its toolbar action component',
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
      descriptionLabel(column.label, id)
      validatePresentation(column, `column "${id}"`)
      for (const key of ['sortable', 'filterable'] as const) {
        requireValue(
          column[key] === undefined || typeof column[key] === 'boolean',
          `invalid ${key} for column "${id}"`,
        )
      }
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
    const headerAliases = props.bindings.headerAliases?.() ?? {}
    for (const id of Object.keys(headerAliases)) {
      requireValue(
        Object.hasOwn(value.columns, id),
        `unknown header alias "${id}"`,
      )
      descriptionLabel(headerAliases[id as keyof typeof headerAliases], id)
    }
    return {
      description: value,
      aliases: headerAliases as Readonly<Record<string, string | undefined>>,
    }
  })
  const description = createMemo(() => configuration().description)
  const aliases = createMemo(() => configuration().aliases)
  // Validate before JSX can construct application toolbar or cell components.
  untrack(configuration)
  function Cell(cellProps: { cell: NativeCell<Row, Meta> }) {
    const renderer = untrack(() => {
      // Demand the validator itself before invoking application code. A cached
      // description projection can retain its prior value during an error update.
      const columns = configuration().description.columns
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
      <StatusView messages={props.messages} status={props.bindings.status} />
      <ReadOnlyTable
        messages={props.bindings.messages}
        table={table}
        toolbarActions={ToolbarActions ? <ToolbarActions /> : undefined}
        pagination={props.bindings.pagination}
        selection={props.bindings.selection}
        rowDetails={props.bindings.rowDetails}
        width={props.bindings.width}
        headerEnd={props.bindings.headerEnd}
        title={description().title}
        controls={description().controls}
        controlsPlacement={description().controlsPlacement}
        controlsResizable={props.bindings.controlsResizable}
        controlsSize={props.bindings.controlsSize}
        onControlsSizeChange={props.bindings.onControlsSizeChange}
        headerEnabled={props.bindings.headerEnabled}
        footerEnabled={props.bindings.footerEnabled}
        controlsEnabled={props.bindings.controlsEnabled}
        refreshEnabled={props.bindings.refreshEnabled}
        controlsCollapsed={props.bindings.controlsCollapsed}
        onControlsCollapsedChange={props.bindings.onControlsCollapsedChange}
        onApplyFilters={props.bindings.onApplyFilters}
        sortable={(column) =>
          description().columns[column.id]?.sortable !== false
        }
        filterable={(column) =>
          description().columns[column.id]?.filterable !== false
        }
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
