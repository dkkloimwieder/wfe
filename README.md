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
`pnpm test:unit` runs the component unit suite after its extraction.
The component source and native Table engine are extracted.
Source and build checks pass. Example and browser qualification follow the migration issues.

## Organization

`packages/components/src/components` contains individual controls.
`src/styles` contains shared typography, colors, density, spacing, borders, and focus styles.
`src/utils` contains small shared helpers.
`src/internal` contains shared behavior and component implementation support.
`src/table` contains Table presentation and its engine.
`src/layout` contains page layout composition.
`src/vendor` contains the owned Kobalte and virtual engine subsets with their attribution and provenance.
`examples` contains application composition, mock services, and optional integrations.
`tests`, `bench`, and `scripts` contain qualification and maintenance tools.

## Migration

The [inventory](migration/inventory.json) records source commit, file mapping, and original file hashes.
The [migration record](migration/README.md) explains the extraction boundaries.
Beads epic `wfe-w2y` records the work and dependency order.
Run `bd ready --type task` to find the next implementation issue.
