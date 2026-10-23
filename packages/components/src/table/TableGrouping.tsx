import { For, Show, onSettled } from 'solid-js'
import { Button } from '../components/NativeFields'
import { SelectField } from '../components/Select'
import { nativeEvents } from '../utils/nativeEvents'
import type { JSX } from '@solidjs/web'
import type { NativeTable } from './engine'

export function TableGrouping<T, M>(props: {
  table: NativeTable<T, M>
  disabled?: boolean
  label: (id: string) => string
  groupable: (id: string) => boolean
  configureGrouping?: (ids: Array<string>) => void
  summaryChoices?: (
    id: string,
  ) => ReadonlyArray<{ value: string; label: string }> | undefined
  summary?: (id: string) => string | undefined
  summaryHelp?: JSX.Element
  setSummary?: (id: string, value: string) => void
}) {
  const table = props.table
  function configureGrouping(next: Array<string>) {
    if (props.configureGrouping) return props.configureGrouping(next)
    const previous = table.state.grouping
    const sorting = next.flatMap((id, depth) => {
      const order = table.state.groupSorting.find(
        (item) => item.depth === previous.indexOf(id),
      )
      return order ? [{ ...order, depth }] : []
    })
    table.setGrouping(next)
    table.setGroupSorting(sorting)
  }
  let addControl!: HTMLButtonElement
  const label = (id: string) => props.label(id)
  function move(id: string, offset: number) {
    const next = [...table.state.grouping]
    const from = next.indexOf(id)
    const to = from + offset
    if (from < 0 || to < 0 || to >= next.length) return
    ;[next[from], next[to]] = [next[to]!, next[from]!]
    configureGrouping(next)
  }
  function orderValue(depth: number, id: string) {
    const order = table.state.groupSorting.find((item) => item.depth === depth)
    return order
      ? `${order.id === id ? 'value' : order.id}:${order.desc ? 'desc' : 'asc'}`
      : ''
  }
  function setOrder(depth: number, id: string, value: string) {
    const [column, direction] = value.split(':')
    table.setGroupSorting((old) => {
      const rest = old.filter((item) => item.depth !== depth)
      return value
        ? [
            ...rest,
            {
              depth,
              id: column === 'value' ? id : column!,
              desc: direction === 'desc',
            },
          ]
        : rest
    })
  }
  return (
    <fieldset class="grouping-controls" disabled={props.disabled}>
      <legend>Group records</legend>
      <div class="grouping-toolbar">
        <label>
          <span class="ui-label">Add grouping</span>
          <SelectField
            data-ui-text="system"
            label="Add grouping"
            value=""
            disabled={props.disabled}
            ref={(node) => {
              addControl = node
            }}
            choices={[
              { value: '', label: 'Choose a column' },
              ...table
                .getColumns()
                .filter((column) => props.groupable(column.id))
                .map((column) => ({
                  value: column.id,
                  label: label(column.id),
                  disabled: table.state.grouping.includes(column.id),
                })),
            ]}
            onValueChange={(id) => {
              if (id && !table.state.grouping.includes(id))
                configureGrouping([...table.state.grouping, id])
            }}
          />
        </label>
        <Show when={table.state.grouping.length > 0}>
          <Button
            ref={nativeEvents({
              click: () => table.toggleAllGroupsExpanded(true),
            })}
          >
            Expand all groups
          </Button>
          <Button
            ref={nativeEvents({
              click: () => table.toggleAllGroupsExpanded(false),
            })}
          >
            Collapse all groups
          </Button>
          <Button
            ref={nativeEvents({
              click: () => {
                addControl.focus()
                configureGrouping([])
              },
            })}
          >
            Clear grouping
          </Button>
        </Show>
      </div>
      <Show when={table.state.grouping.length > 0}>
        <ol class="grouping-levels" aria-label="Grouping levels">
          <For each={table.state.grouping}>
            {(id, index) => {
              let orderControl!: HTMLButtonElement
              return (
                <li data-group-level={id}>
                  <span class="grouping-level-label">
                    {index() + 1}. {label(id)}
                  </span>
                  <div class="grouping-level-move">
                    <Button
                      aria-label={`Move ${label(id)} up`}
                      disabled={index() === 0}
                      ref={nativeEvents({
                        click: () => {
                          orderControl.focus()
                          move(id, -1)
                          onSettled(() => orderControl.focus())
                        },
                      })}
                    >
                      ↑
                    </Button>
                    <Button
                      aria-label={`Move ${label(id)} down`}
                      disabled={index() === table.state.grouping.length - 1}
                      ref={nativeEvents({
                        click: () => {
                          orderControl.focus()
                          move(id, 1)
                          onSettled(() => orderControl.focus())
                        },
                      })}
                    >
                      ↓
                    </Button>
                  </div>
                  <label>
                    <span class="ui-label">Order {label(id)} groups</span>
                    <SelectField
                      data-ui-text="system"
                      label={`Order ${label(id)} groups`}
                      value={orderValue(index(), id)}
                      disabled={props.disabled}
                      ref={(node) => {
                        orderControl = node
                      }}
                      onValueChange={(value) => setOrder(index(), id, value)}
                      choices={[
                        { value: '', label: 'Record order' },
                        { value: 'value:asc', label: 'Group value: ascending' },
                        {
                          value: 'value:desc',
                          label: 'Group value: descending',
                        },
                        ...table
                          .getColumns()
                          .filter(
                            (column) =>
                              column.id !== id &&
                              props.summaryChoices?.(column.id),
                          )
                          .flatMap((column) =>
                            ['asc', 'desc'].map((direction) => ({
                              value: `${column.id}:${direction}`,
                              label: `${label(column.id)} summary: ${direction === 'asc' ? 'ascending' : 'descending'}`,
                              disabled: props.summary?.(column.id) === 'none',
                            })),
                          ),
                      ]}
                    />
                  </label>
                  <div class="grouping-level-actions">
                    <Button
                      aria-label={`Expand ${label(id)} level`}
                      ref={nativeEvents({
                        click: () =>
                          table.toggleAllGroupsExpanded(true, index()),
                      })}
                    >
                      Expand
                    </Button>
                    <Button
                      aria-label={`Collapse ${label(id)} level`}
                      ref={nativeEvents({
                        click: () =>
                          table.toggleAllGroupsExpanded(false, index()),
                      })}
                    >
                      Collapse
                    </Button>
                    <Button
                      aria-label={`Remove ${label(id)} grouping`}
                      ref={nativeEvents({
                        click: () => {
                          addControl.focus()
                          configureGrouping(
                            table.state.grouping.filter(
                              (column) => column !== id,
                            ),
                          )
                        },
                      })}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              )
            }}
          </For>
        </ol>
        <Show when={props.setSummary}>
          <div
            class="summary-controls"
            role="group"
            aria-label="Column summaries"
          >
            <For each={table.getColumns()}>
              {(column) => (
                <label>
                  <span class="ui-label">{label(column.id)} summary</span>
                  <SelectField
                    data-ui-text="system"
                    label={`${label(column.id)} summary`}
                    value={props.summary?.(column.id)}
                    disabled={props.disabled}
                    choices={props.summaryChoices?.(column.id) ?? []}
                    onValueChange={(value) =>
                      props.setSummary?.(column.id, value)
                    }
                  />
                </label>
              )}
            </For>
          </div>
          <p class="summary-help">
            {props.summaryHelp ?? (
              <>
                Summaries use filtered records, including collapsed rows. First
                and last follow the table sort order. Range shows both
                endpoints. Span shows their difference.
              </>
            )}
          </p>
        </Show>
      </Show>
    </fieldset>
  )
}
