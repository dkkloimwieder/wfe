# First form contract

Beads task `wfe-w2y.3.1` defines this proposal through a runnable, three-field example.
The example uses text, choice, and boolean controls from `@wfe/components`.
Its application owns values, defaults, validation rules, service calls, and displayed messages.
The reference coordinates errors and submission without copying control markup or behavior.

The proposal lives in `examples/form-contract/contract.ts`.
The concrete reference lives in `examples/form-contract/reference.ts`.
Task `wfe-w2y.3.2` implements the reusable `@wfe/form` package from this contract.
The reference supports only its three declared fields.
It is not a public form package or a second component implementation.

## Values and defaults

`FormBindings<T>` supplies `values`, `defaults`, `onValuesChange`, `validate`, and `onSubmit`.
The first contract supports a flat object of scalar values: strings, numbers, booleans, null, or undefined.
Field names and corresponding value types come from `T`.
Nested records, repeating fields, field arrays, and schema inference remain outside this first contract.

The application supplies accepted values through the `values()` accessor.
It replaces immutable objects when values change.
`setValue(field, value)` requests a complete next object through `onValuesChange`.
A callback does not prove acceptance.
Controls continue to show the current application values if the application rejects a request.

The form does not keep another editable value store.
`dirty` compares accepted values against the current application defaults.
The comparison uses scalar equality for the declared fields.
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
`FormErrors<T>` contains optional field messages and an optional form message.
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

`cancel()` aborts the current context, settles its outcome as `cancelled`, and clears pending feedback.
Accepted edits, external value replacements, and reset also cancel current work.
The application can still reject an edit without cancelling the unchanged submission.

Callbacks must use the supplied signal to stop application work when possible.
Cancellation cannot undo a save that a service already accepted.
A callback can also ignore cancellation or finish after it.
The reference ignores these late replies, including their errors and success messages.
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
Choice controls and checkboxes keep their native keyboard behavior.

The application composes `Field`, `Label`, `Input`, `NativeSelect`, `Checkbox`, and `FieldError`.
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
The first reference is a client example.
Task `wfe-w2y.3.3` adds the reusable form package's server rendering, hydration, and broader integration qualification.
