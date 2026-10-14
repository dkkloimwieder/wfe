# wfe

Wfe is a generic frontend library for applications that use Solid.
The project starts with one private package, `@wfe/components`.
It contains controls, Table, shared styles, layout, internal behavior, and owned vendor source.
Form coordination and programmatic generation follow their scoped Beads issues.
Application records, routing, permissions, validation rules, requests, and persistence remain application-owned.

## Development

Use Node 22.12 or newer and pnpm 12.4.1.
From the repository root, install dependencies and run the checks:

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` runs formatting, lint, strict types, package builds, and the current tests serially.
`pnpm test:unit` runs native engine, editing, event, and virtualizer unit tests.
`pnpm test:qualification` runs the complete serial qualification suite.
The component source and native Table engine are extracted.
The generic examples now use public package exports.
Source and built-package browser cases cover controls, editing, read-only tables, analytics, styles, and virtualization.
See [the example instructions](examples/README.md) for previews and browser commands.
Unit tools, rendering, hydration, vendor audits, and live checks now run from wfe.
The [adoption guide](docs/adoption.md) describes public imports, controlled values, state ownership, and hydration.
The remaining migration issue proves a fresh standalone checkout and preview cutover.

## Organization

`packages/components/src/components` contains individual controls.
`src/styles` contains shared typography, colors, density, spacing, borders, and focus styles.
`src/utils` contains small shared helpers.
`src/internal` contains shared behavior and component implementation support.
`src/table` contains Table presentation and its engine.
Page layout will live under `src/layout` after the migration.
`src/vendor` contains the owned Kobalte and virtual engine subsets with their attribution and provenance.
`examples` contains application composition, mock services, and optional integrations.
`tests`, `bench`, and `scripts` contain qualification and maintenance tools.

## Migration

The [inventory](migration/inventory.json) records source commit, file mapping, and original file hashes.
The [migration record](migration/README.md) explains the extraction boundaries.
Beads epic `wfe-w2y` records the work and dependency order.
Run `bd ready --type task` to find the next implementation issue.
