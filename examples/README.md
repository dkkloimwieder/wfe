# Examples

Run every command from the wfe repository root.
Install dependencies with `pnpm install --frozen-lockfile`.
Build the packages with `pnpm build` before testing their built exports.

## Preview

Start the component consumer on port 7782:

```sh
pnpm exec vite --config examples/components/vite.config.ts --host 127.0.0.1 --port 7782 --strictPort
```

Open `http://127.0.0.1:7782/?consumer=1`.
Use the same command with another example configuration and an unused port.
The active review previews now use wfe.
Editing uses port 7777, components use 7782, analytics uses 7783, and the read-only table uses 7784.
Use `examples/table-editing/vite.config.ts`, `examples/analytics/vite.config.ts`, or `examples/table-read-only/vite.config.ts` for those examples.
If a review server already occupies the port, use an unused port for another instance.

The inventory below distinguishes generic consumers, integration examples, and manual performance tools.
Generic consumers use public exports from the components, form, generator, or shell packages.
Applications own records, transport, validation, query paging, cache policy, and export requests.
The optional WAMN example requires its separate input preparation.

Normal pages use the shared public Theme. See [theme ownership and deliberate raw-fixture exceptions](../docs/example-themes.md).

## Fixture inventory

Generic controls and layout consumers:

- [Component gallery](components/README.md), [shared styles](styles/README.md), and [Default theme](theme/README.md).
- [Dashboard composition](dashboard/README.md), [layout](layout/README.md), and [described shell](shell/README.md).
- [Date picker](date-picker/README.md), [form contract](form-contract/README.md), and [generator](generator/README.md).
- [Charts](charts/README.md), [boolean grid](grid/README.md), and [status tiles](status-tiles/README.md).
- [Table editing](table-editing/README.md), [read-only tables](table-read-only/README.md), [analytics](analytics/README.md), and [virtualization](virtualization/README.md).
- [Sync store](sync/README.md), which fills one collection from a fake feed and reads it through both adapters.
- [Drag and drop](drag-and-drop/README.md), with generic targets, controlled sorting, and an issue board.
- [Shared hydration](hydration/README.md) and [shared fixture support](shared/README.md).

Application integration examples:

- [Platform mock](platform/README.md), which uses a prepared platform schema.
- [WAMN fixture](wamn/README.md), which requires optional prepared inputs.
- [WAMN generator adapter](wamn-generator/README.md), which reuses those inputs.

Manual performance tools:

- [Accessor profiling](accessor-profile/README.md).
- [Editing overhead](editing-overhead/README.md).
- [Performance tools](../bench/README.md) document additional workloads and evidence limits.

The inventory lists available fixtures, not a successful qualification result.
Use `node scripts/qualify.mjs --plan` to inspect current automated coverage.

## Browser cases

Install Chromium with `pnpm exec playwright install chromium`.
Build and test an example:

```sh
pnpm exec vite build --config examples/components/vite.config.ts
node examples/components/run.mjs
```

Set `BENCH_DISTRIBUTION=1` for both commands to test the built package.
The source mode uses the public `wfe-source` export condition.
The built mode uses the public `solid` export condition.
Run heavy browser suites serially.
Set `BENCH_WORKLOADS=0` for editing cases to omit optional performance workloads.
Set `BENCH_OUTPUT` to preserve each browser report at a separate path.

The layout fixture tests the public dashboard shell contract.
Use `examples/layout/vite.config.ts` on an unused port to inspect it.
The default dashboard preview contains only Table controls and the main results panel.
The separate composition example adds navigation, a record form, and status content.
Open `http://127.0.0.1:7786/?composition=1` to inspect that example.
Use `examples/dashboard/vite.config.ts` on port 7786 to inspect it.
The composition application owns validation, saves, navigation, and data replacement.
Its 500-row sample stays in memory and uses the normal Table renderer.
The table scroll area keeps its height when the result count changes.

The dashboard uses the default split Table workspace.
Filters, grouping, columns, and sample data actions occupy the left controls panel.
Results fill the main panel and keep their height as controls expand.
The layout fixture also covers a 100,000-row virtual Table, dialogs, and popup controls.

The form contract example uses `examples/form-contract/vite.config.ts` on port 7787.
It demonstrates application-owned values, explicit submission, validation, reset, cancellation, and late-response handling.
It imports the generic `createForm` implementation from `@wfe/form`.
Read [the form contract](../docs/form-contract.md) for the public API and ownership rules.

The [generator example](generator/README.md) composes a form, table, and dashboard through `@wfe/generator`.
Use `examples/generator/vite.config.ts` with an unused port to preview it.
Its README lists the build, browser, and hydration commands.
The application owns data and callbacks, while descriptions control presentation and composition.

The [WAMN generator adapter](wamn-generator/README.md) maps prepared Widget metadata to the same public views.
It tests two metadata variants with the existing mock HTTP transport and generated query, get, and update bindings.
Its optional qualification reuses the prepared inputs and keeps production WAMN unchanged.

The read-only and platform examples support rectangular cell selection.
See [table selection](../docs/table-selection.md) for keyboard commands and copy behavior.
The read-only browser fixture also tests the shared virtual renderer with 1,000 available rows.

The [chart example](charts/README.md) demonstrates the owned chart API and generated views.
It includes shared appearance controls and source, package, development, and hydration tests.

## Described application shell

The [shell example](shell/README.md) uses two invented audiences and six routes.
Its generated tables and forms use public packages and shared appearance defaults.
Its application owns addresses, Back and Forward navigation, validation, and draft retention.
Use `examples/shell/vite.config.ts` on an unused port to inspect it.

## Boolean grid

The [grid example](grid/README.md) renders 30 rows and five columns from GridDescription.
It uses shared Checkbox controls and reports one application request for each change.
Use `examples/grid/vite.config.ts` on an unused port to inspect it.

## Status tiles

The [status tile example](status-tiles/README.md) shows all states, formats, long text, and missing detail.
It uses the same appearance roles and responsive grid as other components.
Use `examples/status-tiles/vite.config.ts` on an unused port to inspect it.
