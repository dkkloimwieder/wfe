# Form contract

The private `@wfe/form` package coordinates errors, submission, reset, and cancellation.
Its `createForm` function supports application-defined fields, scalar values, and one-level lists of scalar records.
The example uses text, choice, and boolean controls from `@wfe/components`.
Its application owns values, defaults, validation rules, service calls, and displayed messages.
The package owns no controls, styles, transport, or record schema.

The implementation and public types live in `packages/form/src`.
The example imports that package and contains no separate form implementation.
Create the form inside a Solid component or another Solid owner so that disposal cancels its work.
An owner defines the lifetime of effects and cleanup callbacks.
`createForm` does not create an implicit owner or expose an independent disposal method.
Creation without an owner is unsupported, even if a submission completes.

## Values and defaults

`FormBindings<T>` supplies `values`, `defaults`, `onValuesChange`, `validate`, and `onSubmit`.
A scalar value is a string, number, boolean, null, or undefined.
A form field can also contain a list of records with scalar fields.
Repeated lists require an array, including an empty array when there are no rows.
Rows use own enumerable scalar fields.
Nested records, nested lists, hidden row properties, and class instances are outside this value contract.
Field names and corresponding value types come from `T`.
Nested repeated groups and schema inference remain outside this contract.

The application supplies accepted values through the `values()` accessor.
It replaces immutable objects when values change.
`setValue(field, value)` requests a complete next object through `onValuesChange`.
A callback does not prove acceptance.
Controls continue to show the current application values if the application rejects a request.

The form does not keep another editable value store.
`dirty` compares accepted values against the current application defaults.
The comparison uses `Object.is` for each own field and compares field names.
A missing optional field differs from a field with an explicit undefined value.
False, zero, empty text, null, and undefined remain distinct values.

`reset()` cancels pending work, clears feedback, and requests the latest `defaults()` object.
The application can accept or reject that request.
Rejected reset requests leave accepted values and the corresponding dirty state intact.
Reset never changes the application defaults.
External value replacement also cancels pending work and clears feedback for the old values.
An equivalent replacement does not cancel work.

Changing defaults alone changes the dirty comparison and the next reset target.
It does not replace editable values or cancel a submission.
The example updates defaults after a successful simulated save.
That behavior belongs to the example application.

## Public imports

This example accepts application callbacks and keeps values and defaults in application signals.
Call `createRecordForm` inside a Solid owner.
Connect its returned getters and methods to existing components as the runnable example demonstrates.

```ts
import { createSignal } from 'solid-js'
import { createForm } from '@wfe/form'
import type { FormBindings } from '@wfe/form'

interface RecordValues {
  title: string
  quantity: number
  available: boolean
  note?: string | null
}

export function createRecordForm(
  initial: Readonly<RecordValues>,
  validate: FormBindings<RecordValues>['validate'],
  save: FormBindings<RecordValues>['onSubmit'],
) {
  const [values, setValues] = createSignal(initial)
  const [defaults, setDefaults] = createSignal(initial)
  return createForm({
    values,
    defaults,
    onValuesChange: (requested) => setValues(requested),
    validate,
    async onSubmit(snapshot, context) {
      const reply = await save(snapshot, context)
      if (reply.ok && !context.signal.aborted) setDefaults(snapshot)
      return reply
    },
  })
}
```

Successful saves update defaults only because this application callback requests that change.
The package uses the same compiled implementation in browser and server builds.
It imports external Solid through a peer dependency and does not bundle another runtime.

## Validation and submission

The form validates only when the application calls `submit()`.
Edits do not run validation.
Accepted edits clear feedback because that feedback describes an older value snapshot.
This first contract has no touched, blur, or automatic validation mode.

`submit()` captures one frozen snapshot of accepted values.
The validator and submit callback receive that same snapshot and context.
The context contains an attempt number and an `AbortSignal`.
Attempt numbers increase within one form lifetime.
They are not global service request identifiers.

Validation can return errors immediately or through a promise.
`FormErrors<T>` contains optional field messages, row messages, and a form message.
Nonempty messages stop submission and produce an `invalid` outcome.
The application controls error text and the order used to focus invalid fields.
The example focuses the first invalid control in its DOM order.

After successful validation, `onSubmit` receives the snapshot and context.
An `{ ok: true }` reply produces a `success` outcome.
An `{ ok: false, errors }` reply preserves the supplied errors and produces a `rejected` outcome.
The coordinator does not infer server error formats or apply returned records.
The application adapter translates service responses into this reply.

A thrown exception or rejected promise produces an `error` outcome.
The `failure` property retains the unknown error for application handling.
The example displays its own safe failure message.
A retry clears old errors and failure state, then starts validation again.

A pending submission returns the same promise on repeated `submit()` calls.
It does not start another validator or service request.
The phases are `idle`, `validating`, `submitting`, `success`, `invalid`, `rejected`, and `error`.
`pending` is true only during validation or submission.

## Cancellation and late responses

`cancel()` aborts a pending context and settles its outcome as `cancelled`.
While the owner remains active, it returns the phase to `idle` and clears errors and failure feedback.
This includes feedback from a completed attempt.
It does not change accepted values or rewrite an outcome that already settled.
Accepted edits, external value replacements, and reset also cancel current work.
The application can still reject an edit without cancelling the unchanged submission.

The same rules apply when `onSubmit` publishes accepted values before its reply resolves.
Unequal values cancel that attempt, and its later success or error reply cannot replace the new form state.
Equivalent values preserve the attempt. Changes to defaults alone also preserve it.
These rules protect attempt identity. They do not decide when an application publishes saved values.

Callbacks must use the supplied signal to stop application work when possible.
Cancellation cannot undo a save that a service already accepted.
A callback can also ignore cancellation or finish after it.
The coordinator ignores these late replies, including their errors and success messages.
An older attempt cannot change a newer attempt's state.

Disposal aborts current work and settles its outcome as `disposed`.
Later callback results do not update form state.
Stale value, reset, and cancel methods do nothing.
A stale `submit()` call resolves as `disposed`.
The application remains responsible for its own timers, listeners, requests, and service resources.

## Keyboard and presentation

The coordinator owns no keyboard policy or DOM nodes.
The example uses an explicit SAVE button.
Enter in a text field does not submit, validate, or open a dialog.
Enter and Space on SAVE activate that button normally.
Choice controls and checkboxes keep their shared keyboard behavior.

The application composes `Field`, `Label`, `Input`, `SelectField`, `Checkbox`, and `FieldError`.
Those existing components own label and error associations.
The application renders form errors, pending state, failure messages, and action buttons.
No backend schema, transport, permission rule, or persistence enters the contract.

## Review and evidence

From the repository root, start the example:

```sh
pnpm exec vite --config examples/form-contract/vite.config.ts --host 127.0.0.1 --port 7787 --strictPort
```

Open `http://127.0.0.1:7787/`.
Use the simulated response choices to review field errors, form errors, and unexpected failures.
Enable PAUSE RESPONSE to review cancellation and late replies.
LOAD OTHER RECORD demonstrates an application replacement.
RESET uses the current application defaults.

The type examples reject unknown fields and mismatched field values.
Focused unit cases cover ownership, immutable snapshots, cancellation, response identity, reset, errors, and disposal.
Browser cases exercise those rules through the shared controls in source, built-package, and development modes.
The hydration runner renders this same screen on the server and attaches the client to its original nodes.
It tests accessible controls before attachment, keyboard submission, field errors, service failures, retry, cancellation, reset, and external replacement.
Custom ID changes and conditional descriptions retain their controls and remove obsolete references.
Six lifetimes exercise pending validation and submission, detached controls, released subscriptions, and stale responses without page navigation.
Source, built-package, and development modes reject server warnings, browser warnings, and reactive diagnostics.

Run the form hydration cases from the repository root after `pnpm build`:

```sh
node examples/form-contract/run-hydration.mjs
```

Set `BENCH_DISTRIBUTION=1` to use the built packages.
Set `NODE_ENV=development` and `BENCH_DEVELOPMENT=1` for development behavior.
The runner builds its server and client serially and preserves their module inventories.
`pnpm test:qualification` includes these three modes.

Use the same accepted values and defaults on the server and client.
Create a separate form inside each rendered owner.
Do not share an editable form across server requests or call `submit()` during rendering.
The client attaches event handlers through `hydrate` from `@solidjs/web`.
Release its owner and remove the retained server markup when the host closes the view.
The shared example fixture demonstrates this host cleanup.

Fields and checkboxes establish automatic label and description associations in server markup.
Labels can precede custom control IDs, and descriptions can follow their controls.
Conditional descriptions and invalid messages update after client attachment without replacing controls.
Caller description IDs remain intact.
The example uses automatic checkbox associations and requires no explicit label workaround.
The hydration cases also cover textarea, native choices, switches, Select, and Combobox associations.

## Shell integration

A shell page can render FormView or a manually composed form.
The application decides where its form contract lives and whether values survive a route change.
Shell navigation does not submit, reset, cancel, save, or validate a form.
Applications handle unsaved-work decisions through their navigation bindings.

The [shell example](../examples/shell/README.md) combines two audiences, six routes, generated tables, and generated forms.
Its application owns browser history and retains form values across page changes.

`GridDescription` supplies independent row/column metadata for boolean cells.
Its application bindings own accepted cell values and one change callback.
The grid does not create a form contract or a table engine.
Read the [generator contract](generator-contract.md) for keyed metadata and controlled values.

`GridView` renders that metadata through shared Checkbox controls without creating another form or table coordinator.
The [grid example](../examples/grid/README.md) demonstrates 150 cells, independent scrolling, and retained input owners.

StatusTile presents application-supplied values and explicit states through the existing display components.
TileRow reuses the responsive DashboardGrid. It adds no form coordinator or application controller.
Read the [tile guide](status-tiles.md) and [example](../examples/status-tiles/README.md) for read-only composition and formats.

Generated field labels default to their field keys when omitted.
Generated action and submit labels default to their operation IDs.
These presentation fallbacks preserve accepted values, callbacks, control identities, and existing table header aliases.

## Read-only output

Use FieldValue inside Field for a named read-only value with optional shared formatting.
The output retains label, help, and error associations and disables implicit live announcements.
Generated forms use this component for formatted built-in fields when the application marks them read-only.
Editable fields retain their controls and raw values. Custom fields retain their presentation.

```tsx
import { Field, Label, HelpText, FieldValue } from '@wfe/components'

export function Identifier() {
  return (
    <Field>
      <Label>Identifier</Label>
      <FieldValue value="0123456789abcdef" format="short-hash" />
      <HelpText>
        The full identifier remains available in the value title.
      </HelpText>
    </Field>
  )
}
```

## Repeated record snapshots

The existing coordinator accepts one-level arrays of scalar records through FormShape.
Scalar row interfaces need no index signature.
Applications still own accepted rows, defaults, keys, factories, validation rules, and persistence.
The coordinator does not choose row keys or add/remove policies.

Each requested or submitted snapshot copies and freezes the array and each row.
The coordinator never freezes application-owned rows in place.
Validation and submission share one FormSnapshot and attempt identity.
This public type marks arrays and row properties read-only, even when accepted application arrays are mutable.
Equal row contents in the same order preserve pending work and remain clean against equal defaults.
Accepted additions, removals, reordering, or scalar edits cancel pending work and clear stale errors.
Rejected requests leave accepted state and pending work intact.
Reset copies the application's current defaults.

Use `rows.entries[rowKey]` for an error on a row in the `entries` field.
A row message belongs to `row`. Scalar messages belong to `fields` with keys from the row type.
Row-only errors block submission, and published error maps are copied and frozen.
The application supplies these keys. Their meaning does not become a coordinator identity rule.

```tsx
import { createForm } from '@wfe/form'
import { createSignal } from 'solid-js'

interface Entry {
  key: string
  name: string
}
interface Values {
  title: string
  entries: readonly Entry[]
}
export function createEntryForm() {
  const initial: Values = {
    title: 'Entries',
    entries: [{ key: 'first', name: '' }],
  }
  const [values, setValues] = createSignal<Readonly<Values>>(initial)
  return createForm<Values>({
    values,
    defaults: () => initial,
    onValuesChange: setValues,
    validate: (snapshot) =>
      snapshot.entries[0]?.name
        ? {}
        : {
            rows: { entries: { first: { fields: { name: 'Enter a name' } } } },
          },
    onSubmit: () => ({ ok: true }),
  })
}
```

Generated forms render a repeated list with `control: 'repeat'` and scalar child descriptions.
The application supplies the key function and row factory through `bindings.repeated`.
Add, remove, and edit requests still use the same form contract.
See the [repeated group contract](generator-contract.md#repeated-groups) for keys, choices, errors, and focus behavior.

```tsx
import { createSignal } from 'solid-js'
import { createForm } from '@wfe/form'
import { FormView } from '@wfe/generator'
import type { FormDescription } from '@wfe/generator'

interface Entry {
  key: string
  name: string
  quantity: number
}
interface Values {
  entries: readonly Entry[]
}
export function RepeatedEditor() {
  const initial: Values = { entries: [{ key: 'first', name: '', quantity: 0 }] }
  const [values, setValues] = createSignal<Readonly<Values>>(initial)
  let sequence = 0
  const form = createForm<Values>({
    values,
    defaults: () => initial,
    onValuesChange: setValues,
    validate(snapshot) {
      const errors: Record<string, { fields: { name: string } }> = {}
      for (const row of snapshot.entries)
        if (!row.name) errors[row.key] = { fields: { name: 'Enter a name' } }
      return { rows: { entries: errors } }
    },
    onSubmit: () => ({ ok: true }),
  })
  const description = {
    id: 'entries',
    fields: [
      {
        field: 'entries',
        control: 'repeat',
        fields: [
          { field: 'name', control: 'text' },
          { field: 'quantity', control: 'number' },
        ],
      },
    ],
    submit: { id: 'save' },
  } as const satisfies FormDescription<Values>
  return (
    <FormView
      description={description}
      bindings={{
        form,
        repeated: {
          entries: {
            rowKey: (row) => row.key,
            createRow: () => ({
              key: `new-${++sequence}`,
              name: '',
              quantity: 0,
            }),
          },
        },
      }}
    />
  )
}
```

The [repeated form example](../examples/generator/RepeatedApp.tsx) submits row errors and retries through the same coordinator.
