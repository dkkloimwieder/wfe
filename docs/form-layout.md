# Form layout

`FormGrid` and `FieldGroup` provide shared form layout through `@wfe/components`.
They use the existing spacing, borders, text, and surfaces from `@wfe/components/styles.css`.
They do not own field values, validation, actions, or requests.

`FormGrid` accepts one, two, or three columns. The default is one.
Two columns start when the grid has 30rem of available width.
Three columns start at 45rem. Below these thresholds, fields stack in one column.
Each nested grid responds to its own container width, including a narrow panel on a wide screen.

A direct child uses `data-form-span="2"`, `data-form-span="3"`, or `data-form-span="full"` to span columns.
A numeric span applies when its configured grid has that many columns and enough available width.
Full width always spans the available columns. Narrow grids reset numeric spans and create no extra columns.
Keep numeric spans within the configured column count.

`FieldGroup` renders a native fieldset and legend. Its required title names the group for assistive technology.
Optional help text describes the group. The group has its own `columns` and can span columns in an outer grid through `span`.
Native attributes, classes, refs, and owned event handlers remain available.

```tsx
import { Field, FieldGroup, FormGrid, Input, Label } from '@wfe/components'

export function ContactFields() {
  return (
    <FormGrid columns={2}>
      <FieldGroup title="Contact" help="Public details" columns={2}>
        <Field data-form-span="full">
          <Label>Name</Label>
          <Input />
        </Field>
        <Field>
          <Label>City</Label>
          <Input />
        </Field>
        <Field>
          <Label>Postal code</Label>
          <Input />
        </Field>
      </FieldGroup>
      <FieldGroup title="Notes">
        <Field>
          <Label>Reference</Label>
          <Input />
        </Field>
      </FieldGroup>
    </FormGrid>
  )
}
```

## Generated forms

`FormDescription<T>` keeps the existing flat `fields` list for typed controls and bindings.
Optional `layout.columns` arranges those fields without groups.
Each field accepts `span: 1 | 2 | 3 | 'full'`.
Without layout metadata, the form keeps its single-column presentation.
Changing flat column metadata preserves the same controls and their local drafts.

Optional `layout.groups` adds named groups. In this mode, `layout.columns` arranges groups, and each group's `columns` arranges its fields.
Group order and each group's field list define the visible order.
Every described field must appear exactly once across the groups.
Group IDs must be unique, and titles must contain text.
A field's numeric span must fit its group. A group's numeric span must fit the outer grid.
Invalid descriptions produce a `Generator:` error before rendering.

```ts
import type { FormDescription } from '@wfe/generator'

type ContactValues = { name: string; city: string; notes: string }

export const contactDescription = {
  id: 'contact',
  fields: [
    { field: 'name', label: 'Name', control: 'text', span: 'full' },
    { field: 'city', label: 'City', control: 'text' },
    { field: 'notes', label: 'Notes', control: 'textarea' },
  ],
  layout: {
    columns: 2,
    groups: [
      {
        id: 'contact-details',
        title: 'Contact',
        columns: 2,
        fields: ['name', 'city'],
      },
      { id: 'notes', title: 'Notes', fields: ['notes'] },
    ],
  },
} as const satisfies FormDescription<ContactValues>
```

Group labels, help, columns, spans, group order, and field order can change while their controls remain mounted.
Reordering retains control identity, custom component state, local drafts, focus, and text selection.
A retained field stays in its original group. Moving it between groups or switching grouped mode requires an explicit form view remount.
Removing a field disposes its control. Reintroducing that field creates a new control and can assign another group.
This boundary matches the existing stable-region rule for dashboard panels.

Grouping changes presentation only. The application still owns values, validation, permissions, submission, and persistence.
The records generator example demonstrates two groups, field spans, and responsive columns.
