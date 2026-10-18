import { Field, Label, SelectField, Button } from '@wfe/components'
import { FormView, TableView, LayoutView } from '@wfe/generator'
import { createDispatchApplication } from './dispatch-application'

export function DispatchApp(props: {
  ready?: (app: ReturnType<typeof createDispatchApplication>) => void
}) {
  const app = createDispatchApplication()
  props.ready?.(app)
  const Editor = () => (
    <FormView
      description={app.formDescription()}
      bindings={{
        form: app.form,
        choices: {
          carrier: () =>
            [
              { value: 'post', label: 'Post' },
              { value: 'courier', label: 'Courier' },
            ] as const,
        },
        actions: {
          reset: { run: app.form.reset },
          cancel: { run: app.form.cancel, disabled: () => !app.form.pending },
          inspect: { run: app.callback() },
        },
      }}
    />
  )
  const Records = () => (
    <>
      <div class="dispatch-summary">
        <span role="status" data-ui-text="system">
          {app.form.phase} · {app.provider.publications()} dispatched
        </span>
        <Field>
          <Label>Reply mode</Label>
          <SelectField
            label="Reply mode"
            choices={[
              { value: 'accepted', label: 'Accepted' },
              { value: 'field-error', label: 'Field rejection' },
              { value: 'form-error', label: 'Form rejection' },
              { value: 'failure', label: 'Service failure' },
            ]}
            value={app.provider.response()}
            onValueChange={(value) => {
              if (
                value === 'accepted' ||
                value === 'field-error' ||
                value === 'form-error' ||
                value === 'failure'
              )
                app.provider.setResponse(value)
            }}
          />
        </Field>
        <Button
          disabled={!app.form.pending || !app.provider.pending()}
          onClick={() => {
            const waiting = app.provider.pending()
            if (waiting?.stage === 'validation')
              app.provider.completeValidation(waiting.id)
            else if (waiting) app.provider.completeSave(waiting.id)
          }}
        >
          Complete reply
        </Button>
      </div>
      <TableView
        description={app.tableDescription()}
        bindings={{
          table: app.table,
          cells: { money: app.MoneyCell },
          headerAliases: app.aliases,
          controlsCollapsed: app.controlsCollapsed(),
          onControlsCollapsedChange: app.setControlsCollapsed,
        }}
      />
    </>
  )
  return (
    <LayoutView
      description={app.layoutDescription()}
      bindings={{
        views: { editor: Editor, records: Records },
        actions: { revise: { run: app.revise }, remove: { run: app.remove } },
      }}
    />
  )
}
