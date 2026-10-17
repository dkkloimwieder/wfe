import { createSignal, onCleanup, For, Show } from 'solid-js'
import { Button, uiScope } from '@wfe/components'
import {
  accents,
  appearanceStyle,
  schemes,
} from '../shared/appearance/appearance'
import { FormView, TableView, LayoutView } from '@wfe/generator'
import type { CustomCellProps } from '@wfe/generator'
import { TableColumnResize } from '@wfe/components/table'
import type { NativeColumn } from '@wfe/components/table'
import type { WidgetQueryRow } from '../wamn/.input/widget'
import { createApplication } from './application'

type Screen = 'records' | 'editor' | 'details'
export function App(props: {
  name: string
  ready?: (application: ReturnType<typeof createApplication>) => void
}) {
  const scope = uiScope()
  const appearance = appearanceStyle(schemes[1]!, accents[1]!, 1, {
    canvas: 1,
    pane: 0,
    content: 0,
  })
  const app = createApplication(props.name)
  props.ready?.(app)
  const [screen, setScreen] = createSignal<Screen>('records')
  let recordsScreen!: HTMLDivElement
  let editorScreen!: HTMLDivElement
  let detailsScreen!: HTMLDivElement
  let returnFocus: HTMLButtonElement | undefined
  let alive = true
  onCleanup(() => {
    alive = false
  })
  function navigate(next: Screen) {
    const focused = document.activeElement
    if (
      focused instanceof HTMLElement &&
      [recordsScreen, editorScreen, detailsScreen].some((node) =>
        node.contains(focused),
      )
    )
      focused.blur()
    setScreen(next)
    queueMicrotask(() => {
      if (!alive || screen() !== next) return
      const target =
        next === 'editor'
          ? editorScreen.querySelector<HTMLElement>(
              'form input:not([type="hidden"]):not(:disabled), form textarea:not(:disabled), form button[aria-haspopup]:not(:disabled), form [data-generator-action=cancel]',
            )
          : next === 'details'
            ? detailsScreen.querySelector<HTMLElement>('[data-record-title]')
            : returnFocus?.isConnected && recordsScreen.contains(returnFocus)
              ? returnFocus
              : recordsScreen.querySelector<HTMLElement>('[data-row-action]')
      if (target?.isConnected) target.focus({ preventScroll: true })
    })
  }
  function edit(id: string, trigger?: HTMLButtonElement) {
    if (!app.beginEdit(id)) return
    if (trigger) returnFocus = trigger
    navigate('editor')
  }
  function view(id: string, trigger: HTMLButtonElement) {
    returnFocus = trigger
    void app.open(id)
    navigate('details')
  }
  const reads = {
    refresh: {
      run: () => {
        void app.refresh()
      },
      disabled: app.busy,
    },
  }
  const RowActions = (cell: CustomCellProps<WidgetQueryRow, never>) => (
    <div class="record-row-actions">
      <Button
        data-row-action="view"
        data-row-id={cell.row.id}
        aria-label={`View ${cell.row.id}`}
        onClick={(event) => view(cell.row.id, event.currentTarget)}
      >
        View
      </Button>
      <Button
        data-row-action="edit"
        data-row-id={cell.row.id}
        aria-label={`Edit ${cell.row.id}`}
        onClick={(event) => edit(cell.row.id, event.currentTarget)}
      >
        Edit
      </Button>
    </div>
  )
  const Editor = () => (
    <>
      <div role="status">{app.status()}</div>
      <p data-ui-text="value">{app.selectedId()}</p>
      <FormView
        description={app.description().form}
        bindings={{
          form: app.form,
          disabled: () => app.form.pending,
          choices: { code: () => app.description().choices },
          actions: {
            reset: { run: app.form.reset },
            cancel: {
              run: () => {
                app.form.reset()
                navigate('records')
              },
            },
          },
        }}
      />
    </>
  )
  function columnLabel(id: string) {
    const columns: Readonly<Record<string, { label: string }>> =
      app.description().table.columns
    return columns[id]?.label ?? id
  }
  const resize = (column: NativeColumn<WidgetQueryRow, never>) =>
    column.columnDef?.enableResizing === false ? undefined : (
      <TableColumnResize
        label={columnLabel(column.id)}
        size={column.getSize()}
        min={column.columnDef?.minSize ?? 20}
        max={column.columnDef?.maxSize ?? Number.MAX_SAFE_INTEGER}
        onSizeChange={column.setSize}
      />
    )
  const Records = () => (
    <>
      <div role="status">{app.status()}</div>
      <TableView
        description={app.description().table}
        bindings={{
          table: app.table,
          cells: { 'row-actions': RowActions },
          width: app.table
            .getVisibleColumns()
            .reduce((sum, column) => sum + column.getSize(), 0),
          headerEnd: resize,
          controlsCollapsed: app.controlsCollapsed(),
          onControlsCollapsedChange: app.setControlsCollapsed,
        }}
      />
    </>
  )
  const Details = () => (
    <>
      <div role="status">{app.status()}</div>
      <p data-record-title="" tabindex="-1">
        {app.inspectedId()}
      </p>
      <Show when={app.inspectedRecord()}>
        {(record) => (
          <dl class="record-details">
            <For
              each={app
                .description()
                .columnOrder.filter((id) => id !== 'actions')}
            >
              {(id) => (
                <div>
                  <dt data-ui-text="system">{columnLabel(id)}</dt>
                  <dd>{String(record()[id as keyof WidgetQueryRow] ?? '')}</dd>
                </div>
              )}
            </For>
          </dl>
        )}
      </Show>
    </>
  )
  return (
    <div
      {...scope}
      class="wamn-page appearance-scope"
      style={{
        ...scope.style,
        ...appearance,
        '--ui-button-color': 'var(--ui-accent)',
        '--ui-button-on-color': 'var(--ui-on-accent)',
      }}
    >
      <div
        class="wamn-screen"
        data-wamn-screen="records"
        hidden={screen() !== 'records'}
        inert={screen() !== 'records'}
        ref={(node) => {
          recordsScreen = node
        }}
      >
        <LayoutView
          description={app.description().layout}
          bindings={{ views: { records: Records }, actions: reads }}
        />
      </div>
      <div
        class="wamn-screen"
        data-wamn-screen="editor"
        hidden={screen() !== 'editor'}
        inert={screen() !== 'editor'}
        ref={(node) => {
          editorScreen = node
        }}
      >
        <LayoutView
          description={app.description().editorLayout}
          bindings={{
            views: { editor: Editor },
            actions: { ...reads, back: { run: () => navigate('records') } },
          }}
        />
      </div>
      <div
        class="wamn-screen"
        data-wamn-screen="details"
        hidden={screen() !== 'details'}
        inert={screen() !== 'details'}
        ref={(node) => {
          detailsScreen = node
        }}
      >
        <LayoutView
          description={app.description().detailsLayout}
          bindings={{
            views: { details: Details },
            actions: {
              back: { run: () => navigate('records') },
              refreshView: {
                run: () => {
                  void app.open(app.inspectedId())
                },
                disabled: app.busy,
              },
              editSelected: {
                run: () => edit(app.inspectedId()),
                disabled: () => !app.inspectedRecord(),
              },
            },
          }}
        />
      </div>
    </div>
  )
}
