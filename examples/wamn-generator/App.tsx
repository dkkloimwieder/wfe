import { createSignal, onCleanup } from 'solid-js'
import { uiScope } from '@wfe/components'
import {
  accents,
  appearanceStyle,
  schemes,
} from '../shared/appearance/appearance'
import { FormView, TableView, LayoutView } from '@wfe/generator'
import { createApplication } from './application'
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
  const [editing, setEditing] = createSignal(false)
  let recordsScreen!: HTMLDivElement
  let editorScreen!: HTMLDivElement
  let alive = true
  onCleanup(() => {
    alive = false
  })
  function navigate(next: boolean) {
    const focused = document.activeElement
    if (
      focused instanceof HTMLElement &&
      (recordsScreen.contains(focused) || editorScreen.contains(focused))
    )
      focused.blur()
    setEditing(next)
    queueMicrotask(() => {
      if (!alive || editing() !== next) return
      const target = next
        ? editorScreen.querySelector<HTMLElement>(
            'form input:not([type="hidden"]), form textarea, form button[aria-haspopup]',
          )
        : recordsScreen.querySelector<HTMLElement>(
            '[data-generator-action="edit"]',
          )
      if (target?.isConnected) target.focus({ preventScroll: true })
    })
  }
  const reads = {
    refresh: {
      run: () => {
        void app.refresh()
      },
      disabled: app.busy,
    },
    open: {
      run: () => {
        void app.open()
      },
      disabled: app.busy,
    },
  }
  const Editor = () => (
    <>
      <div role="status">{app.status()}</div>
      <FormView
        description={app.description().form}
        bindings={{
          form: app.form,
          choices: { code: () => app.description().choices },
          actions: {
            reset: { run: app.form.reset },
            cancel: {
              run: () => {
                app.form.reset()
                navigate(false)
              },
            },
          },
        }}
      />
    </>
  )
  const Records = () => (
    <>
      <div role="status">{app.status()}</div>
      <TableView
        description={app.description().table}
        bindings={{
          table: app.table,
          controlsCollapsed: app.controlsCollapsed(),
          onControlsCollapsedChange: app.setControlsCollapsed,
        }}
      />
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
        hidden={editing()}
        inert={editing()}
        ref={(node) => {
          recordsScreen = node
        }}
      >
        <LayoutView
          description={app.description().layout}
          bindings={{
            views: { records: Records },
            actions: { ...reads, edit: { run: () => navigate(true) } },
          }}
        />
      </div>
      <div
        class="wamn-screen"
        data-wamn-screen="editor"
        hidden={!editing()}
        inert={!editing()}
        ref={(node) => {
          editorScreen = node
        }}
      >
        <LayoutView
          description={app.description().editorLayout}
          bindings={{
            views: { editor: Editor },
            actions: { ...reads, back: { run: () => navigate(false) } },
          }}
        />
      </div>
    </div>
  )
}
