import { Theme } from '@wfe/components/theme'
import { Button, Checkbox, Input, SelectField } from '@wfe/components'
import '@wfe/components/styles.css'
import {
  For,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onSettled,
} from 'solid-js'
import { createTableVirtualizer, VirtualRows } from '@wfe/components/virtual'
import { nativeEvents } from '@wfe/components/events'
import { cellText } from './.input/runtime'
import { get as getWidget } from './.input/widget'
import definition from './.input/definition.json'
import { createWamnTable } from './createWamnTable'
import type { CellType, Transport } from './.input/runtime'
import './style.css'

export function App(props: {
  transport: Transport
  ready: (value: FixtureController) => void
}) {
  const model = createWamnTable(props.transport)
  const { table } = model
  let viewport!: HTMLDivElement
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const virtualizer = createTableVirtualizer({
    mode: 'measured',
    get keys() {
      return table.getRowIds()
    },
    getScrollElement: () => viewport,
    estimateSize: () => 44,
    overscan: 4,
    scrollMargin: 44,
  })
  const counts = { mounted: 0, unmounted: 0, cells: 0, maxLive: 0 }
  const [action, setAction] = createSignal('')
  const width = createMemo(
    () =>
      table
        .getVisibleColumns()
        .reduce((sum, column) => sum + column.getSize(), 0) + 280,
  )
  const Row = (rowProps: { id: string }) => {
    const id = rowProps.id
    const row = table.createRowView(id)
    counts.mounted++
    counts.maxLive = Math.max(counts.maxLive, counts.mounted - counts.unmounted)
    let element!: HTMLDivElement
    virtualizer.observeRow(() => element, id)
    onCleanup(() => {
      counts.unmounted++
      if (element.contains(document.activeElement))
        viewport.focus({ preventScroll: true })
    })
    return (
      <div
        ref={element}
        class="row"
        role="row"
        data-row={id}
        aria-selected={row.getIsSelected() ? 'true' : 'false'}
        aria-rowindex={(virtualizer.getItem(id)?.index ?? 0) + 2}
      >
        <For each={row.getVisibleCells()}>
          {(cell) => {
            counts.cells++
            const meta = definition.columns.find(
              (column) => column.id === cell.column.id,
            )!
            return (
              <div
                role="gridcell"
                data-column={cell.column.id}
                style={{ width: `${cell.column.getSize()}px` }}
              >
                <Show
                  when={cell.column.id === 'note' && model.drafts[id]}
                  fallback={
                    cell.column.id === 'makerId'
                      ? (model.labels[String(cell.getValue())] ??
                        cellText(cell.getValue(), meta.type as CellType))
                      : cellText(cell.getValue(), meta.type as CellType)
                  }
                >
                  <Input
                    aria-label={`Note ${id}`}
                    value={model.drafts[id]?.note ?? ''}
                    disabled={model.drafts[id]?.busy}
                    ref={nativeEvents<HTMLInputElement>({
                      input: (event) =>
                        model.edit(id, { note: event.currentTarget.value }),
                    })}
                  />
                </Show>
              </div>
            )
          }}
        </For>
        <div role="gridcell" class="actions">
          <Checkbox
            checked={row.getIsSelected()}
            onChange={(checked) => row.toggleSelected(checked)}
          >
            <Checkbox.Input aria-label={`Select ${id}`} />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox>
          <Show
            when={model.drafts[id]}
            fallback={
              <Button
                aria-label={`Edit ${id}`}
                disabled={model.page().busy}
                onClick={() => model.edit(id, {})}
              >
                Edit
              </Button>
            }
          >
            <Button
              aria-label={`Save ${id}`}
              disabled={model.drafts[id]?.busy}
              onClick={() => model.save(id)}
            >
              Save
            </Button>
            <Button
              aria-label={`Discard ${id}`}
              disabled={model.drafts[id]?.busy}
              onClick={() => model.discard(id)}
            >
              Discard
            </Button>
          </Show>
          <Button
            aria-label={`Open ${id}`}
            onClick={async () => {
              const result = await getWidget(props.transport, [{ id }])
              if (!disposed)
                setAction(
                  result.status === 'completed'
                    ? `Opened ${result.value.id}`
                    : result.status,
                )
            }}
          >
            Open
          </Button>
          <Button
            aria-label={`Prepare form ${id}`}
            onClick={() =>
              setAction(
                JSON.stringify({
                  operation: definition.rowForms[0]!.operation,
                  pairs: definition.rowForms[0]!.pairs.map(([field, input]) => [
                    input,
                    row.original![field as keyof typeof row.original],
                  ]),
                }),
              )
            }
          >
            Form
          </Button>
        </div>
      </div>
    )
  }
  onSettled(() => props.ready({ model, virtualizer, viewport, counts }))
  return (
    <Theme
      density="compact"
      style={{ 'min-height': '100dvh', display: 'flow-root' }}
    >
      <main class="wamn-example" data-ui="" data-ui-portal-root="">
        <h1>Find widgets</h1>
        <p>WAMN integration fixture</p>
        <div class="toolbar">
          <Button onClick={() => model.read()}>Read</Button>
          <Button onClick={() => model.read()}>Refresh</Button>
          <Button
            disabled={
              model.load.mode !== 'browse' ||
              model.page().busy ||
              model.page().cursor === null ||
              model.page().rows.length >= model.load.cap
            }
            onClick={() => model.read(true)}
          >
            Next page
          </Button>
          <label>
            Mode{' '}
            <SelectField
              label="Mode"
              data-ui-text="system"
              value={model.load.mode}
              choices={[
                { value: 'load', label: 'Load' },
                { value: 'browse', label: 'Browse' },
              ]}
              onValueChange={(value) => {
                void model.configure({ mode: value as 'load' | 'browse' })
              }}
            />
          </label>
          <label>
            Cap{' '}
            <Input
              type="number"
              min="1"
              value={model.load.cap}
              ref={nativeEvents<HTMLInputElement>({
                change: (event) =>
                  model.configure({ cap: Number(event.currentTarget.value) }),
              })}
            />
          </label>
          <label>
            Scope code{' '}
            <Input
              ref={nativeEvents<HTMLInputElement>({
                change: (event) =>
                  model.configure({ code: event.currentTarget.value }),
              })}
            />
          </label>
          <label>
            Refine note{' '}
            <Input
              disabled={!model.local()}
              ref={nativeEvents<HTMLInputElement>({
                input: (event) =>
                  table.setColumnFilters(
                    event.currentTarget.value
                      ? [{ id: 'note', value: event.currentTarget.value }]
                      : [],
                  ),
              })}
            />
          </label>
          <Button
            disabled={!model.local()}
            onClick={() =>
              table.setSorting(
                table.state.sorting.length ? [] : [{ id: 'note', desc: true }],
              )
            }
          >
            Sort note
          </Button>
        </div>
        <p role="status">
          {model.page().busy
            ? 'Loading'
            : (model.page().refusal ??
              (model.load.fullyRead
                ? 'Complete set'
                : model.page().cursor
                  ? 'Full dataset cannot be loaded'
                  : 'Ready'))}{' '}
          · {model.page().rows.length} loaded · Total:{' '}
          {String(table.getTotalValue('id') ?? 'unavailable')}
        </p>
        <p role="alert">{model.load.message}</p>
        <For each={Object.keys(model.drafts)}>
          {(id) => <p data-draft={id}>{model.drafts[id]?.message}</p>}
        </For>
        <p data-action>{action()}</p>
        <div
          class="viewport"
          ref={viewport}
          tabindex="0"
          role="grid"
          aria-label="Widgets"
          aria-rowcount={table.getRowIds().length + 1}
        >
          <div style={{ width: `${width()}px` }}>
            <div role="row" class="row header">
              <For each={table.getVisibleColumns()}>
                {(column) => (
                  <div
                    role="columnheader"
                    style={{ width: `${column.getSize()}px` }}
                  >
                    {String(column.columnDef?.header)}
                  </div>
                )}
              </For>
              <div role="columnheader" class="actions">
                Actions
              </div>
            </div>
            <VirtualRows
              window={virtualizer}
              layout="block"
              bodyClass="spacer"
              windowClass="window"
              renderRow={(id) => <Row id={id} />}
            />
          </div>
        </div>
      </main>
    </Theme>
  )
}
export interface FixtureController {
  model: ReturnType<typeof createWamnTable>
  virtualizer: ReturnType<typeof createTableVirtualizer<string>>
  viewport: HTMLDivElement
  counts: { mounted: number; unmounted: number; cells: number; maxLive: number }
}
