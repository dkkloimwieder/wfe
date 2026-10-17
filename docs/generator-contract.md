# Generator contract

`@wfe/generator` defines typed descriptions and application bindings for forms, tables, and dashboard layouts.
This private package currently exports types only.
Issue `wfe-w2y.4.2` implements builders and rendering through the existing components.
There are no placeholder runtime builders.

The intended API creates runtime UI from descriptions and bindings.
It does not define a serialized metadata format, a source emitter, or a service client.
Applications keep their data, validation rules, requests, and persistence.
The generator supplies composition over the existing components and their styles.

## Descriptions and bindings

Descriptions contain stable identities, text, control choices, actions, and layout references.
Bindings provide existing form and table instances, callbacks, current choices, presentation values, and custom components.
Use literal descriptions with `as const satisfies` to retain field, action, renderer, and view identities in their types.
Avoid widening a description to a general interface before deriving its bindings.
That widening loses the literal names needed to require specific bindings.

Use `FormDescription<T>` and `FormViewBindings<T, D>` for one flat scalar form.
Use `TableDescription` and `TableViewBindings<Row, Meta, D>` for one table.
Use `LayoutDescription<ViewId>` and `LayoutViewBindings<D>` for a dashboard composition.
`D` is the type of the particular description.
The [compile examples](../tests/contracts/generator-contract.ts) cover two unrelated record shapes and layouts.
Missing actions, choices, custom renderers, and referenced views produce type errors.
The tests also reject incompatible field controls, choice values, aliases, and layout references.

## Forms

A field's record key is its identity.
Labels and help text do not define identity.
The field list defines display order.
An application supplies one existing `FormContract<T>` from `@wfe/form`.
That contract supplies accepted values, errors, pending state, reset, cancellation, and submission.
Its original application bindings still own value acceptance, defaults, validation, and submission callbacks.
The generator does not create another coordinator or copy canonical values.

Text and textarea controls require a full string type.
Select controls accept typed string choices, including string unions.
Checkbox and switch controls require a full boolean type.
A literal boolean requires a custom control because a toggle requests both values.
Select bindings supply current typed choices through accessors.
An accessor is a function that reads the current value.
Numeric, nullable, optional, and other scalar controls use explicit custom field components in this first contract.
This limit avoids adding a second numeric draft or conversion policy.
Custom field props preserve the field's value type and request changes through the existing contract.
The surrounding field supplies labels, help, errors, and accessibility associations.
Custom controls must honor the supplied DOM identity and existing Field context.

A submit description explicitly enables the form's existing submission operation.
Its label and ID remain presentation data.
Extra actions use application callbacks keyed by their described IDs.
Applications handle asynchronous extra actions and supply their own pending or error presentation.
Disabled and read-only bindings remain application decisions.
A required flag supplies field semantics and does not replace application validation.

## Tables

An application supplies one configured `NativeTable<Row, Meta>`.
There is no alternate generator path that accepts raw rows and creates another table.
The supplied instance owns access to application rows and the existing engine configuration.
Accessors, comparisons, filtering, grouping, and controlled updates remain on that instance.
Current column ordering and visibility remain in its existing state and callbacks.
Applications still own server operations through the existing table and refresh bindings.

The column map supplies presentation by stable column ID.
Its property order does not define column order.
Computed column IDs are arbitrary strings and do not need to match record properties.
Static labels belong to the description.
Current header aliases belong to the application binding and override those labels.
Bindings also supply optional existing filter, grouping, alignment, refresh, and collapse contracts.
The renderer passes the same table to `ReadOnlyTable` and uses its existing slots.
Custom cell bindings receive the raw value and native column without changing sorting or filtering data.

The current `NativeTable` type does not encode its configured column IDs.
TypeScript cannot prove that a described column exists on that particular instance.
The renderer must report unknown column IDs at runtime before rendering.
It must also report unknown alias keys, duplicate field, action, and panel identities, and missing dynamic bindings.
These runtime guards belong to issue `wfe-w2y.4.2`.

## Layout and identity

Layout panels have stable IDs and reference view bindings by name.
The same view mechanism accepts ordinary components and generator compositions.
Main panels and optional navigation use the existing dashboard shell, grid, and panels.
Panel lists define order within their region.
Columns, scrolling, titles, and navigation labels remain presentation choices.

Labels, aliases, field order, panel order, callbacks, choices, loading, and errors can change without replacing form or table ownership.
Form and table instances remain fixed for a mounted view.
Replacing either instance requires a new view identity.
Changing a field's control family or a custom component's identity also requires an explicit remount.
Moving a panel between navigation and main content requires a new panel identity.
These boundaries keep application state separate from DOM lifetime.
The rendering issue must prove supported updates and cleanup before the API includes runtime exports.

## Qualification

From the repository root, run `pnpm build` before `pnpm test:contracts`.
The contract command compiles the documentation and positive and negative generator examples against the built package declarations.
Run `pnpm check` before committing.
This type-only stage changes no component renderer or existing browser interaction.
