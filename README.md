# wfe

Wfe is a generic frontend library for applications that use Solid.
The private `@wfe/components` package contains controls, Table, shared styles, internal behavior, and owned vendor source.
The private `@wfe/form` package coordinates errors, submission, reset, and cancellation through application callbacks.
The private `@wfe/generator` package defines typed descriptions and application bindings.
Its public views build forms, tables, layouts, charts, and boolean grids from shared components.
The private `@wfe/shell` package composes described navigation through the existing layout and controls.
Applications supply accepted audience and route IDs, links, and page components.
Application records, routing, permissions, validation rules, requests, and persistence remain application-owned.

## Current release

Use Git tag [`v0.0.7`](https://github.com/dkkloimwieder/wfe/tree/v0.0.7).
The [adoption guide](docs/adoption.md#v007) describes shared form actions, application icons, and per-column table controls.
The [release verification record](docs/qualification.md#v007-release) identifies the tested commit and test scope.

## Documentation

Use the [documentation index](docs/README.md) to find the current guides.
The [feature catalog](docs/features.md) records implemented functionality and its ownership boundaries.
The [plans directory](docs/plan/README.md) keeps proposed work separate from current APIs.

## Development

Use Node 22.12 or newer and pnpm 12.4.1.
From the repository root, install dependencies and run the checks:

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` runs formatting, lint, integrity checks, package builds, package types, unit test types, example types, unit tests, and Node tooling tests serially.
The unit stage uses `NODE_ENV=test`. Node test files run one at a time.
`pnpm test:unit` runs native engine, editing, form, event, and virtualizer unit tests.
`pnpm test:qualification` runs the complete serial qualification suite.
The component source and native Table engine are extracted.
The generic examples now use public package exports.
Source and built-package browser cases cover controls, editing, read-only tables, analytics, styles, layout, dashboards, and virtualization.
See [the example instructions](examples/README.md) for previews and browser commands.
Unit tools, rendering, hydration, vendor audits, and live checks now run from wfe.
The [adoption guide](docs/adoption.md) describes public imports, controlled values, state ownership, and hydration.
The standalone migration is complete.
The migration acceptance run passes 47 stages in a fresh checkout with both original repositories hidden.
Review previews now run from wfe.
The [standalone record](migration/standalone.md) describes the proof and cutover.

## Organization

Within `packages/components`, `src/components` contains individual controls.
`src/styles` contains shared typography, colors, density, spacing, borders, and focus styles.
`src/utils` contains small shared helpers.
`src/internal` contains shared behavior and component implementation support.
`src/table` contains Table presentation and its engine.
The dashboard shell, panels, and grid live under `src/layout`.
The [layout guide](docs/layout.md) describes slots, navigation, scrolling, and available height.
`src/chart` contains the owned chart adapter and controlled legend.
The [chart guide](docs/charts.md) describes imports, data boundaries, generated views, and supported plots.
`src/vendor` contains the owned Kobalte, virtual, calendar, and chart subsets with their attribution and provenance.
`packages/form/src` contains the generic form implementation and its public types.
The [form guide](docs/form-contract.md) describes controlled values, callbacks, reset, and cancellation.
`packages/generator/src` contains typed contracts and rendering compositions.
The [generator contract](docs/generator-contract.md) defines identities, bindings, and ownership.
`examples` contains application composition, mock services, and optional integrations.
`tests`, `bench`, and `scripts` contain qualification and maintenance tools.

## Migration

The [inventory](migration/inventory.json) records source commit, file mapping, and original file hashes.
The [migration record](migration/README.md) explains the extraction boundaries.
Beads epic `wfe-w2y` records the work and dependency order.
Run `bd ready --type task` to find the next implementation issue.

See [Default theme](docs/theme.md) for the shared consumer appearance.
See [Icons](docs/icons.md) for the owned catalog and selective imports.
