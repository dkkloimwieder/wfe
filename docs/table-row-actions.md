# Row-dependent actions

A custom Actions cell can read `props.row.original` to control its buttons from the current record.
Read that getter inside JSX or a reactive accessor. Do not capture the record once when the component mounts.
Use `Show` to omit an unavailable action and `Button.disabled` for an action that remains visible but cannot run.
Labels and accessible names can also follow the record.
The outer `Show` omits actions when a synthetic row has no original record.
These decisions belong to the application. Table-wide described actions do not receive a row.

```tsx
import { Show } from 'solid-js'
import { Button, FormActions } from '@wfe/components'
import type { CustomCellProps } from '@wfe/generator'

type Row = { id: string; name: string; pending: boolean; archived: boolean }

export function createRowActions(callbacks: {
  openRecord: (id: string) => void
  archiveRecord: (id: string) => void
}) {
  return function Actions(props: CustomCellProps<Row, unknown>) {
    return (
      <Show when={props.row.original}>
        {(row) => (
          <FormActions>
            <Button
              disabled={row().pending}
              aria-label={`${row().archived ? 'View' : 'Edit'} ${row().name}`}
              onClick={() => callbacks.openRecord(row().id)}
            >
              {row().archived ? 'View' : 'Edit'}
            </Button>
            <Show when={!row().archived}>
              <Button
                disabled={row().pending}
                aria-label={`Archive ${row().name}`}
                onClick={() => callbacks.archiveRecord(row().id)}
              >
                Archive
              </Button>
            </Show>
          </FormActions>
        )}
      </Show>
    )
  }
}
```

The application supplies `openRecord` and `archiveRecord` and performs its own permission and request checks.
Call `createRowActions(callbacks)` once for each mounted table to obtain the stable `Actions` component.
Bind `Actions` through `bindings.cells.actions` and set the column renderer to `'actions'`.
Set the column's `sortable` and `filterable` flags to `false`.
Keep the cell component identity stable. Read the current application callback inside the click handler when callbacks can change.
An action that remains mounted retains its button identity and focus when its label changes.
Removing an action removes its button. The application decides where focus moves when that happens.

The [column-controls example](../examples/shared/controls/ColumnControlsApp.tsx) demonstrates these patterns at `?app=column-controls`.
Its controls change pending and archived state and replace the application callback.
The example records callback arguments without sending requests or prescribing application rules.
Browser tests cover live records, omitted buttons, disabled clicks, keyboard activation, retained focus, callback replacement, hydration, and disposal.
