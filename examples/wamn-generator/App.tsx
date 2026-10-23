import { Theme } from '@wfe/components/theme'
import {
  createSignal,
  onCleanup,
  onSettled,
  createUniqueId,
  For,
  Show,
} from 'solid-js'
import { Button, SelectField } from '@wfe/components'
import { FormView, TableView, LayoutView } from '@wfe/generator'
import type { CustomCellProps } from '@wfe/generator'
import { nativeEvents } from '@wfe/components/events'
import { TableColumnResize } from '@wfe/components/table'
import type { NativeColumn } from '@wfe/components/table'
import type { WidgetQueryRow } from '../wamn/.input/widget'
import { createApplication } from './application'

type Screen = 'records' | 'editor' | 'details'
type Route =
  { screen: 'records' } | { screen: 'editor' | 'details'; id: string }
export function App(props: {
  name: string
  ready?: (application: ReturnType<typeof createApplication>) => void
}) {
  const app = createApplication(props.name)
  props.ready?.(app)
  const [screen, setScreen] = createSignal<Screen>('records')
  let recordsScreen!: HTMLDivElement
  let editorScreen!: HTMLDivElement
  let detailsScreen!: HTMLDivElement
  let returnFocus: HTMLButtonElement | undefined
  const [navigationError, setNavigationError] = createSignal('')
  const [inlineId, setInlineId] = createSignal<string | undefined>(undefined)
  let inlineAttempt = 0
  let position = 0
  let historyScope = ''
  let restoringTo: number | undefined
  let alive = true
  onCleanup(() => {
    alive = false
  })
  function showScreen(next: Screen) {
    if (next === 'editor') {
      inlineAttempt++
      setInlineId(undefined)
    }
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
  function readPosition() {
    const entry = window.history.state?.wamnNavigation
    return entry?.scope === historyScope && Number.isSafeInteger(entry.position)
      ? (entry.position as number)
      : 0
  }
  function readRoute(): Route | undefined {
    const params = new URL(window.location.href).searchParams
    const next = params.get('screen')
    const id = params.get('record')
    if (next === null && id === null) return { screen: 'records' }
    if (
      (next === 'editor' || next === 'details') &&
      id !== null &&
      Object.hasOwn(app.rows(), id)
    )
      return { screen: next, id }
    return undefined
  }
  function applyRoute(route: Route | undefined) {
    if (!route) {
      setNavigationError('The record URL does not match an available record')
      return false
    }
    if (route.screen === 'editor' && !app.beginEdit(route.id)) return false
    if (route.screen === 'details') void app.open(route.id)
    setNavigationError('')
    showScreen(route.screen)
    return true
  }
  function navigate(route: Route) {
    const next = route.screen
    if (!alive || restoringTo !== undefined) return
    const url = new URL(window.location.href)
    if (route.screen === 'records') {
      url.searchParams.delete('screen')
      url.searchParams.delete('record')
    } else {
      url.searchParams.set('screen', next)
      url.searchParams.set('record', route.id)
    }
    if (url.href !== window.location.href) {
      window.history.pushState(
        {
          ...window.history.state,
          wamnNavigation: { scope: historyScope, position: position + 1 },
        },
        '',
        url,
      )
      position++
    }
    setNavigationError('')
    showScreen(next)
  }
  onSettled(() => {
    const url = new URL(window.location.href)
    historyScope = `${url.pathname}?app=${url.searchParams.get('app') ?? 'original'}`
    // The initial untagged table entry is position zero. A new branch reuses
    // current position + 1 because pushState removes forward entries.
    position = readPosition()
    if (url.searchParams.has('screen') || url.searchParams.has('record'))
      applyRoute(readRoute())
    const pop = () => {
      if (!alive) return
      const target = readPosition()
      if (restoringTo !== undefined) {
        if (target !== restoringTo) {
          window.history.go(restoringTo - target)
          return
        }
        restoringTo = undefined
        return
      }
      if (!applyRoute(readRoute())) {
        if (position !== target) {
          restoringTo = position
          window.history.go(position - target)
        }
        return
      }
      position = target
    }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  })
  function edit(id: string, trigger?: HTMLButtonElement) {
    if (!alive || restoringTo !== undefined || !app.beginEdit(id)) return
    if (trigger) returnFocus = trigger
    navigate({ screen: 'editor', id })
  }
  function view(id: string, trigger: HTMLButtonElement) {
    if (!alive || restoringTo !== undefined) return
    returnFocus = trigger
    void app.open(id)
    navigate({ screen: 'details', id })
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
  function focusCode(id: string, editing: boolean) {
    queueMicrotask(() => {
      if (!alive || screen() !== 'records') return
      if (editing ? inlineId() !== id : inlineId() !== undefined) return
      const cell = [
        ...recordsScreen.querySelectorAll<HTMLElement>('[data-code-cell]'),
      ].find((node) => node.dataset.codeCell === id)
      cell
        ?.querySelector<HTMLElement>(
          editing ? '[aria-haspopup=listbox]' : '[data-inline-code]',
        )
        ?.focus({ preventScroll: true })
    })
  }
  function cancelInline(id: string) {
    if (!alive || inlineId() !== id) return
    inlineAttempt++
    app.form.reset()
    setInlineId(undefined)
    focusCode(id, false)
  }
  async function saveInline(id: string) {
    if (!alive || inlineId() !== id) return
    const attempt = inlineAttempt
    const result = await app.form.submit()
    if (!alive || attempt !== inlineAttempt || inlineId() !== id) return
    if (result.status === 'success') {
      setInlineId(undefined)
      focusCode(id, false)
    }
  }
  const InlineCode = (cell: CustomCellProps<WidgetQueryRow, never>) => {
    const errorId = `inline-code-${createUniqueId()}`
    const error = () =>
      app.form.errors.fields?.code ??
      app.form.errors.form ??
      (app.form.phase === 'error' ? 'The form action failed.' : undefined)
    return (
      <div data-code-cell={cell.row.id}>
        <Show
          when={inlineId() === cell.row.id}
          fallback={
            <Button
              data-inline-code={cell.row.id}
              data-ui-text="value"
              aria-label={`Edit ${columnLabel('code')} for ${cell.row.id}`}
              onClick={() => {
                if (!alive || !app.beginInlineEdit(cell.row.id)) return
                inlineAttempt++
                setInlineId(cell.row.id)
                focusCode(cell.row.id, true)
              }}
            >
              {String(cell.value ?? '')}
            </Button>
          }
        >
          <div
            class="inline-code-editor"
            data-inline-editor={cell.row.id}
            role="group"
            aria-label={`Edit ${columnLabel('code')} for ${cell.row.id}`}
            aria-busy={app.form.pending ? 'true' : 'false'}
            ref={nativeEvents<HTMLDivElement>({
              keydown: (event) => {
                if (event.key !== 'Escape' || event.defaultPrevented) return
                if (event.currentTarget.querySelector('[aria-expanded=true]'))
                  return
                event.preventDefault()
                cancelInline(cell.row.id)
              },
            })}
          >
            <SelectField
              label={`${columnLabel('code')} for ${cell.row.id}`}
              choices={app.description().choices}
              value={app.form.values.code}
              onValueChange={(value) =>
                app.form.setValue('code', value as 'priority' | 'standard')
              }
              disabled={app.form.pending}
              invalid={Boolean(app.form.errors.fields?.code)}
              aria-describedby={error() ? errorId : undefined}
              data-ui-text="value"
            />
            <div class="inline-code-actions">
              <Button
                disabled={app.form.pending}
                onClick={() => void saveInline(cell.row.id)}
              >
                Save
              </Button>
              <Button onClick={() => cancelInline(cell.row.id)}>Cancel</Button>
            </div>
            <Show when={error()}>
              <p id={errorId} role="alert">
                {error()}
              </p>
            </Show>
          </div>
        </Show>
      </div>
    )
  }
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
                navigate({ screen: 'records' })
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
      <Show when={navigationError()}>
        <p role="alert">{navigationError()}</p>
      </Show>
      <div role="status">{app.status()}</div>
      <TableView
        description={app.description().table}
        bindings={{
          table: app.table,
          cells: { 'row-actions': RowActions, 'inline-code': InlineCode },
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
    <Theme class="wamn-page">
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
            actions: {
              ...reads,
              back: { run: () => navigate({ screen: 'records' }) },
            },
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
              back: { run: () => navigate({ screen: 'records' }) },
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
    </Theme>
  )
}
