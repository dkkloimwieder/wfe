import { For, Show, createMemo } from 'solid-js'
import { Checkbox } from '../components/Checkbox'
import { Button } from '../components/NativeFields'
import { createTableFilterDraft } from './createTableFilterDraft'
import type { TableFilterCriteria } from './createTableFilterDraft'
import { TableSort } from './TableSort'
import { Table } from './Table'
import { TableControlSection, TableWorkspace } from './TableWorkspace'
import { TableFilter } from './TableFilter'
import { TableDateFilter } from './TableDateFilter'
import { TableColumnFilter } from './TableColumnFilter'
import type {
  TableColumnFilterConfig,
  TableColumnFilterValue,
} from './TableColumnFilter'
import type { TableDateRange } from './TableDateFilter'
import { TableGrouping } from './TableGrouping'
import { TableColumnMove, moveColumn } from './TableColumnMove'
import type { JSX } from '@solidjs/web'
import type { NativeColumn, NativeTable } from './engine'

export type TableFilterConfig =
  TableColumnFilterConfig | { kind: 'boolean' | 'date-range' }

/** Full display features over an application-owned table, without editing state. */
export function ReadOnlyTable<T, M>(props: {
  table: NativeTable<T, M>
  title?: string
  controls?: {
    sorting?: boolean
    filtering?: boolean
    search?: boolean
    grouping?: boolean
    columnReordering?: boolean
  }
  actions?: JSX.Element
  configuration?: JSX.Element
  formatting?: JSX.Element
  onApplyFilters?: (criteria: TableFilterCriteria) => void
  label?: (column: NativeColumn<T, M>) => string
  filter?: (column: NativeColumn<T, M>) => TableFilterConfig | undefined
  filterKind?: (column: NativeColumn<T, M>) => 'text' | 'boolean' | 'date-range'
  groupable?: (id: string) => boolean
  formatValue?: (value: unknown, column: NativeColumn<T, M>) => JSX.Element
  formatSummary?: (value: unknown, column: NativeColumn<T, M>) => JSX.Element
}) {
  const table = props.table
  const filters = createTableFilterDraft(table, {
    get onApply() {
      return props.onApplyFilters
    },
  })
  let filterControls: HTMLDivElement | undefined
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
  return (
    <TableWorkspace
      class="table-component"
      label={props.title ?? 'Read-only table'}
      footer={
        <>
          {table.getFilteredRowIds().length}/{table.getSourceIds().length}{' '}
          records
        </>
      }
      controlsHeader={
        <Show
          when={
            props.controls?.filtering !== false ||
            props.controls?.search !== false
          }
        >
          <div class="table-filter-actions">
            <Button
              aria-label="Apply filters"
              disabled={!filtering()}
              aria-disabled={!filters.changed ? 'true' : undefined}
              onClick={() => {
                if (!filtering() || !filters.changed) return
                const invalid = filterControls?.querySelector<HTMLElement>(
                  '[aria-invalid="true"]:not(:disabled)',
                )
                if (invalid) invalid.focus()
                else filters.apply()
              }}
            >
              Apply
            </Button>
            <Show when={filters.changed}>
              <span data-ui-text="system">Unapplied changes</span>
            </Show>
          </div>
        </Show>
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
              title="Filters"
              defaultOpen
              summary={`${table.state.columnFilters.length + (table.state.globalFilter ? 1 : 0)} active`}
            >
              <Show when={props.controls?.filtering !== false}>
                <div
                  class="column-filters"
                  ref={(node) => {
                    filterControls = node
                  }}
                  role="region"
                  aria-label="Column filters"
                >
                  <For each={table.getColumns()}>
                    {(column) => {
                      const configuration = () => props.filter?.(column)
                      const kind = () =>
                        configuration()?.kind ?? props.filterKind?.(column)
                      const advanced = () => {
                        const value = configuration()
                        return value &&
                          value.kind !== 'boolean' &&
                          value.kind !== 'date-range'
                          ? (value as TableColumnFilterConfig)
                          : undefined
                      }
                      const disabled = () =>
                        !filtering() ||
                        (!props.onApplyFilters && !column.columnDef?.filterFn)
                      return (
                        <Show
                          when={advanced()}
                          fallback={
                            <Show
                              when={kind() === 'date-range'}
                              fallback={
                                <TableFilter
                                  kind={
                                    kind() === 'boolean' ? 'boolean' : 'text'
                                  }
                                  label={label(column)}
                                  clearLabel={`Clear ${label(column)} filter`}
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
                                label={label(column)}
                                startLabel={`${label(column)} start`}
                                endLabel={`${label(column)} end`}
                                clearStartLabel={`Clear ${label(column)} start`}
                                clearEndLabel={`Clear ${label(column)} end`}
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
                              label={label(column)}
                              clearLabel={`Clear ${label(column)} filter`}
                              config={config()}
                              value={
                                filters.getValue(column.id) as
                                  TableColumnFilterValue | undefined
                              }
                              disabled={disabled()}
                              onValueChange={(value) =>
                                filters.setValue(column.id, value)
                              }
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
                    label="Search all columns"
                    clearLabel="Clear search"
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
              title="Grouping"
              defaultOpen
              summary={`${table.state.grouping.length} levels`}
            >
              <TableGrouping
                table={table}
                disabled={!processing() || table.options.manualGrouping}
                label={(id) => label(table.getColumn(id)!)}
                groupable={(id) => props.groupable?.(id) ?? true}
              />
            </TableControlSection>
          </Show>
          <TableControlSection
            title="Display columns"
            summary={`${table.getVisibleColumns().length} visible`}
          >
            <fieldset class="display-fields">
              <legend>Visible columns</legend>
              <For each={table.getColumns()}>
                {(column) => (
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
                )}
              </For>
            </fieldset>
          </TableControlSection>
          <Show when={props.formatting} keyed>
            {(formatting) => (
              <TableControlSection title="Formatting" defaultOpen>
                {formatting}
              </TableControlSection>
            )}
          </Show>
          <Show when={props.actions}>
            <TableControlSection title="Actions" defaultOpen>
              {props.actions}
            </TableControlSection>
          </Show>
          <Show when={props.configuration}>
            <TableControlSection title="Configuration">
              {props.configuration}
            </TableControlSection>
          </Show>
        </>
      }
    >
      <div
        class="table-scroll"
        tabindex={0}
        role="region"
        aria-label={`${props.title ?? 'Read-only records'} results`}
      >
        <Table
          table={table}
          caption={props.title ?? 'Read-only records'}
          grouped={
            processing() &&
            !table.options.manualGrouping &&
            table.state.grouping.length > 0
          }
          label={label}
          groupLabel={(id) => label(table.getColumn(id)!)}
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
                when={props.controls?.sorting !== false}
                fallback={<span class="column-title">{label(column)}</span>}
              >
                <TableSort
                  label={label(column)}
                  sorted={column.getIsSorted()}
                  disabled={
                    !processing() ||
                    table.options.manualSorting ||
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
              ? 'No records match your search or filters.'
              : 'No records yet.'}
          </p>
        </Show>
      </div>
    </TableWorkspace>
  )
}
