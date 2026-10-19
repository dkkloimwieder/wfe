import { createMemo, createUniqueId, For, onCleanup, untrack } from 'solid-js'
import { Checkbox } from '@wfe/components'
import { createGridModel } from './gridModel'
import { preserveReorderFocus } from './reorderFocus'
import { requireValue } from './shared'
import type {
  GridColumnId,
  GridDescription,
  GridRowId,
  GridViewProps,
} from './gridTypes'

/** A controlled boolean matrix composed from the shared checkbox and table styles. */
export function GridView<const D extends GridDescription>(
  props: GridViewProps<D>,
) {
  const model = createMemo(() => createGridModel(props.description))
  const identity = untrack(() => model().id)
  const domId = `generated-grid-${createUniqueId()}`
  const state = createMemo(() => {
    requireValue(
      model().id === identity,
      'remount the grid to replace its identity',
    )
    const bindings = props.bindings
    requireValue(
      bindings !== null &&
        typeof bindings === 'object' &&
        typeof bindings.value === 'function' &&
        typeof bindings.onValueChange === 'function',
      'invalid grid bindings',
    )
    return { id: model().id, bindings }
  })
  const rowIds = createMemo(() => [...model().rows.keys()])
  const columnIds = createMemo(() => [...model().columns.keys()])
  const label = () => props.description.title ?? model().id
  // Hexadecimal code points also preserve isolated UTF-16 surrogates in record keys.
  const keyPart = (id: string) =>
    Array.from(id, (part) => part.codePointAt(0)!.toString(16)).join('-')
  const rowHeaderId = (id: string) => `${domId}-row-${keyPart(id)}`
  const columnHeaderId = (id: string) => `${domId}-column-${keyPart(id)}`
  preserveReorderFocus(domId, () => [
    ...rowIds().map((id) => `row:${id}`),
    ...columnIds().map((id) => `column:${id}`),
  ])
  function Cell(cell: { row: string; column: string }) {
    let alive = true
    onCleanup(() => {
      alive = false
    })
    const row = () => model().rows.get(cell.row)
    const column = () => model().columns.get(cell.column)
    const checked = createMemo(() => {
      if (!row() || !column()) return false
      const value = state().bindings.value(
        cell.row as GridRowId<D>,
        cell.column as GridColumnId<D>,
      )
      requireValue(
        typeof value === 'boolean',
        `nonboolean grid value at "${cell.row}", "${cell.column}"`,
      )
      return value
    })
    return (
      <td data-column-alignment="center">
        <Checkbox
          style={{
            'grid-template-columns': 'max-content',
            'justify-content': 'center',
          }}
          checked={checked()}
          disabled={row()?.disabled}
          readOnly={column()?.readOnly}
          onChange={(value) =>
            untrack(() => {
              if (
                !alive ||
                !row() ||
                !column() ||
                row()?.disabled ||
                column()?.readOnly ||
                value === checked()
              )
                return
              state().bindings.onValueChange({
                row: cell.row as GridRowId<D>,
                column: cell.column as GridColumnId<D>,
                value,
              })
            })
          }
        >
          <Checkbox.Input
            aria-labelledby={`${rowHeaderId(cell.row)} ${columnHeaderId(cell.column)}`}
          />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox>
      </td>
    )
  }
  return (
    <section
      id={domId}
      data-ui=""
      data-generator-view={state().id}
      style={{
        display: 'flex',
        'flex-direction': 'column',
        flex: 1,
        'min-width': 0,
        'min-height': 0,
      }}
    >
      <div
        class="table-scroll"
        role="region"
        aria-label={label()}
        tabindex={0}
        style={{ flex: 1, 'min-height': 0 }}
      >
        <table
          style={{
            width: '100%',
            'min-width': `${Math.max(1, columnIds().length + 1) * 7}rem`,
          }}
        >
          <caption data-ui-text="system">{label()}</caption>
          <thead>
            <tr>
              <th scope="col" aria-label="Row" />
              <For each={columnIds()}>
                {(id) => (
                  <th
                    id={columnHeaderId(id)}
                    scope="col"
                    data-ui-text="system"
                    data-column-alignment="center"
                  >
                    {model().columns.get(id)?.label}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={rowIds()}>
              {(row) => (
                <tr data-grid-row={row}>
                  <th id={rowHeaderId(row)} scope="row" data-ui-text="system">
                    {model().rows.get(row)?.label}
                  </th>
                  <For each={columnIds()}>
                    {(column) => <Cell row={row} column={column} />}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </section>
  )
}
