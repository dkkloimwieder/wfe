# Form

This private package coordinates controlled form state through `createForm`.
Applications own accepted values, defaults, validation rules, service calls, and persistence.
The package owns errors, submission phases, cancellation, and late-response guards.
It supports flat scalar records and application-defined field names.

Import `createForm` and its types from `@wfe/form`.
Create each form inside a Solid owner. The form relies on that owner for disposal and creates no implicit lifetime.
`cancel()` clears pending or settled feedback without changing accepted values.
Unequal value updates during submission cancel that attempt, including updates from the application submit callback.
The package imports external Solid and has no component or style dependency.
Read [the form contract](../../docs/form-contract.md) for usage and lifecycle rules.
The [example](../../examples/form-contract/README.md) uses existing controls without a duplicate form implementation.

## Package exports

Export conditions select package files in this order: `types` selects `dist/*.d.ts`, `wfe-source` selects `src/*.ts`, and `default` selects `dist/*.js`.
The `wfe-source` condition is only for wfe's own examples and checks.
`pnpm install` runs `prepare`, which builds `dist`.
