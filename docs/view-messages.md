# Messages for generated views and shells

Generated views accept a reactive partial `messages` prop with the `GeneratorMessages` type.
Import `generatorMessages` from `@wfe/generator` for the current English defaults.
Each omitted or undefined property falls back separately.
Changing messages updates text without replacing view identities, accepted values, drafts, or focused controls.

The catalog covers loading status, form-action failure, default delete and cancel labels, repeated-row actions and titles, and the grid row heading.
LayoutView also uses it for its navigation and context controls.
Explicit delete labels and layout region labels in descriptions take precedence.
Action labels, field labels, record values, application errors, and panel content remain application-owned text.
A LayoutView does not translate the application-provided views inside its panels.

TableView uses its `messages` prop for its own generated status text.
Its `bindings.messages` property forwards a partial `TableMessages` catalog to ReadOnlyTable.
Those table messages control filtering, selection, pagination, and other table-owned text.
Neither catalog changes filtering, requests, or application validation.

ShellView accepts a reactive partial `messages` prop with the `ShellMessages` type.
Import `shellMessages` from `@wfe/shell` for English defaults.
Its catalog covers Audience, Breadcrumbs, and the navigation and context controls.
Existing `audienceLabel`, navigation labels, and context labels take precedence over these defaults.
Authored route and audience labels remain application-owned values.
Custom header and navigation replacements keep their existing ownership and behavior.

Use the same initial messages on the server and client when hydrating.
Language can change after hydration without remounting the page.
Messages supply text. They do not install a translation service or change formatting locale.

The public `resolveMessages(defaults, overrides)` helper comes from `@wfe/components`.
It reads each property lazily from the current overrides accessor.
An own override property wins unless its value is null or undefined.
Otherwise, that property uses its default.
Defaults can be frozen. Resolved catalogs retain their own keys for property checks, spreads, and layered catalogs.
The helper preserves each property's type, adds no global state, and does not parse external configuration.
