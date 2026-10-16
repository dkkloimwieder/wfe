# Form

This private package coordinates controlled form state through `createForm`.
Applications own accepted values, defaults, validation rules, service calls, and persistence.
The package owns errors, submission phases, cancellation, and late-response guards.
It supports flat scalar records and application-defined field names.

Import `createForm` and its types from `@wfe/form`.
Create each form inside a Solid owner.
The package imports external Solid and has no component or style dependency.
Read [the form contract](../../docs/form-contract.md) for usage and lifecycle rules.
The [example](../../examples/form-contract/README.md) uses existing controls without a duplicate form implementation.
