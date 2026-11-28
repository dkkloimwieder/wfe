# wfe

wfe is a frontend library for Solid applications. It provides shared controls, tables, layouts, and tools to compose application screens. Applications own their records, rules, and requests.

| Package                                          | Purpose                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| [@wfe/components](packages/components/README.md) | Controls, Table, layout, charts, and shared styles.                          |
| [@wfe/form](packages/form/README.md)             | Form errors, submission, reset, and cancellation.                            |
| [@wfe/generator](packages/generator/README.md)   | Views built from typed descriptions and application bindings.                |
| [@wfe/shell](packages/shell/README.md)           | Application navigation and pages built from typed descriptions.              |
| [@wfe/sync](packages/sync/README.md)             | Collection synchronization and offline support through application adapters. |

The current release is Git tag [`v0.0.13`](https://github.com/dkkloimwieder/wfe/tree/v0.0.13). The workspace packages are private.

Use Node 22.22.2 or later in the 22.x line, Node 24.15.0 or later in the 24.x line, or Node 26 or later. Use pnpm 12.4.1.

From the repository root, install the dependencies and run the checks.

```sh
pnpm install --frozen-lockfile
pnpm check
```

Read the [documentation index](docs/README.md) for guides by component type. Use the [example index](examples/README.md) to start a preview or run browser cases. See the [changelog](CHANGELOG.md) for release notes.
