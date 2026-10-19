import { exampleSizing } from '../shared/appearance/sizing'
import { untrack } from 'solid-js'
import { FormView, TableView, LayoutView } from '@wfe/generator'
import { createRecordsApplication } from './records-application'

export function RecordsReview(props: {
  reviewCells?: boolean
  ready?: (api: ReturnType<typeof createRecordsApplication>) => void
}) {
  const app = createRecordsApplication(
    untrack(() => props.reviewCells ?? false),
  )
  props.ready?.(app)
  const Editor = () => (
    <FormView
      description={app.formDescription()}
      bindings={{
        form: app.form,
        choices: {
          category: () =>
            [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
            ] as const,
        },
        fields: { quantity: app.Quantity },
        actions: {
          reset: { run: () => app.form.reset() },
          extra: { run: app.action() },
        },
      }}
    />
  )
  const Records = () => (
    <TableView
      description={app.tableDescription()}
      bindings={{
        table: app.table,
        cells: { quantity: app.Amount },
        headerAliases: app.aliases,
      }}
    />
  )
  return (
    <LayoutView
      style={exampleSizing}
      description={app.layoutDescription()}
      bindings={{
        views: { editor: Editor, records: Records },
        actions: { revise: { run: app.revise }, remove: { run: app.remove } },
      }}
    />
  )
}
