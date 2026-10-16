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

The generic examples are components, table-editing, table-read-only, analytics, styles, layout, dashboard, and virtualization.
Each example imports public exports from `@wfe/components`.
Applications own records, transport, validation, query paging, cache policy, and export requests.
The optional WAMN example requires its separate input preparation.

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
