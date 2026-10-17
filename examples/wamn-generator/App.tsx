import { FormView, TableView, LayoutView } from '@wfe/generator'
import { createApplication } from './application'
export function App(props: {
  name: string
  ready?: (application: ReturnType<typeof createApplication>) => void
}) {
  const app = createApplication(props.name)
  props.ready?.(app)
  const Editor = () => (
    <FormView
      description={app.description().form}
      bindings={{
        form: app.form,
        choices: { code: () => app.description().choices },
        actions: { reset: { run: app.form.reset } },
      }}
    />
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
    <LayoutView
      description={app.description().layout}
      bindings={{
        views: { editor: Editor, records: Records },
        actions: {
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
        },
      }}
    />
  )
}
