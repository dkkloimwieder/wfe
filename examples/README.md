# Examples

Use each folder section to open a preview and run its browser cases. Open the URL that Vite prints for the preview. See [browser setup](#browser-cases).

## Browser cases

Run commands from the repository root. Install dependencies with `pnpm install --frozen-lockfile`. Use a free port for each new preview.

Install Chromium with `pnpm exec playwright install chromium`. Use the commands for each example in source mode.

For built packages, run `pnpm build` first. Set `BENCH_DISTRIBUTION=1` for both the fixture build and runner.
For the development runtime, set `BENCH_DEVELOPMENT=1` and `NODE_ENV=development` on both commands.
Source mode uses `wfe-source` for client imports. Package mode uses `solid`.

For example, run the gallery against the development runtime with these commands.

```sh
NODE_ENV=development BENCH_DEVELOPMENT=1 pnpm exec vite build --config examples/components/vite.config.ts
BENCH_DEVELOPMENT=1 node examples/components/run.mjs
```

Run the board against the built packages with these commands.

```sh
pnpm build
BENCH_DISTRIBUTION=1 pnpm exec vite build --config examples/drag-and-drop/vite.config.ts
BENCH_DISTRIBUTION=1 node examples/drag-and-drop/run.mjs
```

Run heavy tests serially. Set `BENCH_OUTPUT` to add a report at a fresh path. Set `BENCH_URL` to reuse a preview when the runner supports it.
The shared runner writes reports under `test-results/runs`. The [qualification guide](../docs/qualification.md) lists stage coverage and artifacts.

## accessor-profile

This data-only benchmark compares record access modes. Host load affects timings. The build rejects CSS imports and writes `css-contract.json`.

Preview with `pnpm exec vite --config examples/accessor-profile/vite.config.ts`.

Build with `pnpm exec vite build --config examples/accessor-profile/vite.config.ts`. Run `node examples/accessor-profile/run.mjs` for browser cases.

Set `BENCH_SIZES`, `BENCH_ITERATIONS`, `BENCH_REPEATS`, and `BENCH_WARMUPS` to select the workload. Set `BENCH_OUTPUT` for the JSON report.

## analytics

This fixture shows Sales, Inventory, and Large result queries. It retains column settings for a matching query and schema.

Preview with `pnpm exec vite --config examples/analytics/vite.config.ts --host 127.0.0.1 --port 7783`.

Build with `pnpm exec vite build --config examples/analytics/vite.config.ts`. Run `pnpm exec node examples/analytics/run.mjs` for browser cases.

Preview limits results to 1,000 rows. Load all pages through a bounded cache, with a mock result of 100,005 rows.
The server exports full-query CSV with the current visible columns, labels, order, and sort. Set `BENCH_CASE="Load all"` for that browser case.

## charts

This fixture shows responsive plots, generated charts, derived data, statistics, and time series. Its source tables show the original values.

Preview with `pnpm exec vite --config examples/charts/vite.config.ts --host 127.0.0.1 --port 7793 --strictPort`.

Build with `pnpm exec vite build --config examples/charts/vite.config.ts`. Run `node examples/charts/run.mjs` for browser cases.

Use Toggle custom tooltip to review keyboard access, retained controls, and dismissal. Run `node examples/charts/run.mjs --hydration` for server output and attachment.
Set `BENCH_CHART_FALLBACK=1` to test without native popovers. See [Charts](../docs/charts.md#charts).

## components

The gallery shows controls, Table, and application Blocks. Run `node examples/components/prepare.mjs` before you start the preview.

Preview with `pnpm exec vite --config examples/components/vite.config.ts --host 127.0.0.1 --port 7782 --strictPort`.

Build with `pnpm exec vite build --config examples/components/vite.config.ts`. Run `node examples/components/run.mjs` for browser cases.

Set `BENCH_URL` to reuse a preview. Run `node examples/components/run-live.mjs` for live updates on a separate preview.
See [gallery controls](#gallery-controls) for routes and [gallery profiling](#gallery-profiling) for popup heaps.

## dashboard

The dashboard combines the shared Table workspace with application records and actions. Open `?composition=1` for navigation and the record form.

Preview with `pnpm exec vite --config examples/dashboard/vite.config.ts`.

Build with `pnpm exec vite build --config examples/dashboard/vite.config.ts`. Run `node examples/dashboard/run.mjs` for browser cases.

See [Dashboard layout](../docs/layout.md#dashboard-layout).

## date-picker

The fixture covers keyboard navigation, rejected date and time requests, timezone conversion, daylight-saving changes, precision, and native form state.

Preview with `pnpm exec vite --config examples/date-picker/vite.config.ts`.

Build with `pnpm exec vite build --config examples/date-picker/vite.config.ts`. Run `node examples/date-picker/run.mjs` for browser cases.

Run `node examples/date-picker/run-hydration.mjs` for server and client bundles. See [Date and time inputs](../docs/inputs.md#date-and-time-inputs).

## diagrams

The fixture shows read-only workflows and entity relationships with automatic layout and controlled selection.

Preview with `pnpm exec vite --config examples/diagrams/vite.config.ts`.

Build with `pnpm exec vite build --config examples/diagrams/vite.config.ts`. Run `node examples/diagrams/run.mjs` for browser cases.

Run `node examples/diagrams/run.mjs --hydration` for server markup and client attachment. See [Diagrams](../docs/diagrams.md).

## drag-and-drop

The preview uses the shared [board](shared/drag-and-drop/BoardExample.tsx). The [generic example](shared/drag-and-drop/DragExample.tsx) uses arbitrary targets and a controlled sortable list.

Preview with `pnpm exec vite --config examples/drag-and-drop/vite.config.ts --host 127.0.0.1 --port 7790 --strictPort`.

Build with `pnpm exec vite build --config examples/drag-and-drop/vite.config.ts`. Run `node examples/drag-and-drop/run.mjs` for browser cases.

Open `?gallery=drag-and-drop` or `?gallery=kanban` in the gallery. The gallery runner covers assignment, rejection, keyboard targets, and move menus.
The shared hydration fixture includes drag and board cases. The examples keep accepted moves and edits in memory. See [Drag and drop](../docs/drag-and-drop.md#drag-and-drop).

## editing-overhead

This benchmark measures editing memory across five modes with the same records and Table engine.

Preview with `pnpm exec vite --config examples/editing-overhead/vite.config.ts`.

Build with `pnpm exec vite build --config examples/editing-overhead/vite.config.ts`. Run `node examples/editing-overhead/run.mjs` for browser cases.

Set `BENCH_SIZES=25` and `BENCH_WARMUPS=0` for a small run. See the [measurement commands](#editing-overhead-measurements) for source and package comparisons.

## form-contract

The fixture uses `createForm` with controlled defaults and shared fields. Save submits explicitly. The mock service can hold or refuse its reply. Load other record replaces values and defaults.

Preview with `pnpm exec vite --config examples/form-contract/vite.config.ts --host 127.0.0.1 --port 7787 --strictPort`.

Build with `pnpm exec vite build --config examples/form-contract/vite.config.ts`. Run `node examples/form-contract/run.mjs` for browser cases.

After `pnpm build`, run `node examples/form-contract/run-hydration.mjs` for node retention, focus, and cleanup. See [Form contract](../docs/forms.md#form-contract).

## generator

The fixture uses public FormView, TableView, LayoutView, DetailView, and DeleteView. Run `pnpm build` before you start the preview.

Preview with `pnpm exec vite --config examples/generator/vite.config.ts --host 127.0.0.1 --port 7788 --strictPort`.

Build with `pnpm exec vite build --config examples/generator/vite.config.ts`. Run `node examples/generator/run.mjs` for browser cases.

Run `node examples/generator/run-hydration.mjs` for hydration. See [Generator routes](#generator-routes) and the [contract](../docs/generator.md#generator-contract).

## grid

This GridView has 30 rows and five Checkbox columns. Verified is read-only, record 30 is disabled, and the footer reports accepted changes.

Preview with `pnpm exec vite --config examples/grid/vite.config.ts --host 127.0.0.1 --port 7795 --strictPort`.

Build with `pnpm exec vite build --config examples/grid/vite.config.ts`. Run `node examples/grid/run.mjs` for browser cases.

Run `node examples/grid/run.mjs --hydration` for server-node retention. Add `?qualification=1` to expose rejection and metadata controls.
The app accepts `{ row, column, value }` requests and keeps changes in memory. See [Boolean grid metadata](../docs/generator.md#boolean-grid-metadata).

## hydration

The fixture attaches browser behavior to server-rendered components. Its Gantt case retains bars, adopts edits and selection, and removes active gestures on disposal.

Run `node examples/hydration/run.mjs` to build both bundles and open a temporary preview for the browser cases. Use the delivery flags in [Browser cases](#browser-cases).

## layout

This fixture exercises dashboard panels, navigation, dialogs, popup controls, and a virtual table. Applications own records and requests.

Preview with `pnpm exec vite --config examples/layout/vite.config.ts`.

Build with `pnpm exec vite build --config examples/layout/vite.config.ts`. Run `node examples/layout/run.mjs` for browser cases.

See [Dashboard layout](../docs/layout.md#dashboard-layout).

## platform

The mock uses captured WAMN clients without a server. It shows project creation, environments, access, invitations, activation, and deactivation.

Preview with `pnpm exec vite --config examples/platform/vite.config.ts --host 127.0.0.1 --port 7791 --strictPort`.

Build with `pnpm exec vite build --config examples/platform/vite.config.ts`. Run `node examples/platform/run.mjs` for browser cases.

Run `node examples/platform/run.mjs --hydration` for server-node retention. See [Platform routes and snapshot](#platform-routes-and-snapshot) for deep links and maintenance.

## shared

This directory holds common fixture views, appearance controls, browser helpers, and diagnostic policies. Open the host example for the preview and browser command.

### Fixture disposal

`createFixtureDisposal` calls the current disposer inside a generator action. Call `flush()` outside the action after fixture cleanup. Keep this order for editing, read-only, analytics, and WAMN.
Fixtures own mounting, hydration, repeated-stop guards, and reference cleanup. Beads issue `wfe-0dj.4` tracks the action wrapper. Use the matched heap reproduction and real fixture cleanup cases before removal.

`scripts/check-example-boundaries.mjs` enforces public imports and prevents sibling imports. The gallery and generator share column and subtable examples. ThemeConsumer and the controlled board also have multiple hosts.

## shell

Operations shows Records, Record detail, and Overview. Research shows Observations, Observation detail, and Findings. The application owns history, validation, and drafts across routes.

Preview with `pnpm exec vite --config examples/shell/vite.config.ts --host 127.0.0.1 --port 7794 --strictPort`.

Build with `pnpm exec vite build --config examples/shell/vite.config.ts`. Run `node examples/shell/run.mjs` for browser cases.

Open `?custom-chrome=1` for an alternate header and menu. The menu uses the dashboard drawer state and close action.
Run `node examples/shell/run.mjs --hydration` for retained focus and server nodes. Add `?qualification=1` for fixture request and disposal data. See the [Shell guide](../packages/shell/README.md).

## status-tiles

Six read-only tiles show three states, shared number, date, and boolean formats, long text, and missing detail. Narrow screens show one column.

Preview with `pnpm exec vite --config examples/status-tiles/vite.config.ts --host 127.0.0.1 --port 7796 --strictPort`.

Build with `pnpm exec vite build --config examples/status-tiles/vite.config.ts`. Run `node examples/status-tiles/run.mjs` for browser cases.

Run `node examples/status-tiles/run.mjs --hydration` for retained tiles and heading focus. Add `?qualification=1` for the fixture API. See [Status tiles](../docs/display.md#status-tiles).

## styles

This fixture uses shared controls through public exports. The browser cases cover interaction and the origin of loaded CSS.

Preview with `pnpm exec vite --config examples/styles/vite.config.ts`.

Build with `pnpm exec vite build --config examples/styles/vite.config.ts`. Run `node examples/styles/run.mjs` for browser cases.

Use the [gallery](#components) for appearance review. See [Shared styles](../packages/components/src/styles/README.md).

## sync

This fixture loads 10,000 or 100,000 records from a mock feed. It shows `liveRows`, `liveList`, and a virtual ReadOnlyTable.

Preview with `pnpm exec vite --config examples/sync/vite.config.ts --host 127.0.0.1 --port 7798 --strictPort`.

Build with `pnpm exec vite build --config examples/sync/vite.config.ts`. Run `node examples/sync/run.mjs` for browser cases.

Queue a write offline, reconnect to replay it, or refuse it to try Resubmit or Discard. The fixture owns IndexedDB persistence and reloads.
Reports go to `test-results/sync` unless `BENCH_OUTPUT` selects another path. See [Sync](../docs/sync.md).

## table-editing

This fixture combines the native Table with application records, drafts, saves, summaries, named views, nested tables, and resize controls.

Preview with `pnpm exec vite --config examples/table-editing/vite.config.ts`.

Build with `pnpm exec vite build --config examples/table-editing/vite.config.ts`. Run `BENCH_OUTPUT=/tmp/table-editing-source.json node examples/table-editing/run.mjs` for browser cases.

Open `?size=250` for 250 records or `?size=25&save=all` for global save. Set `BENCH_URL` to reuse a preview and `BENCH_WORKLOADS=0` to omit performance cases.
See the [workspace](../docs/tables.md#table-workspace) and [heap workloads](#table-editing-heap-workloads).

## table-read-only

The fixture uses the shared Table without an editing model. It covers grouping, search, replacement records, and column visibility and order.

Preview with `pnpm exec vite --config examples/table-read-only/vite.config.ts --host 127.0.0.1 --port 7784`.

Build with `pnpm exec vite build --config examples/table-read-only/vite.config.ts`. Run `pnpm exec node examples/table-read-only/run.mjs` for browser cases.

Open `?pagination` for controlled mock pages. Open `?messages` and switch English / Español to retain filter drafts while changing text.
`messages.es.ts` implements the complete TableMessages contract. See [Shared Table presentation](../docs/tables.md#shared-table-presentation).

## theme

This fixture uses the public Theme with nested controls, layouts, and a table. It covers theme scope through source imports.

Preview with `pnpm exec vite --config examples/theme/vite.config.ts`.

Run `node examples/theme/run.mjs` for browser cases. The runner builds the fixture.

The [hydration fixture](#hydration) runs the same theme cases in all three delivery modes. See [Themes](../docs/theme.md#themes).

## theme-explorer

This fixture edits tokens in Sketchy, Vanilla, and Laser. The token panel shows computed values and the block that supplies each value.

Preview with `pnpm exec vite --config examples/theme-explorer/vite.config.ts --port 7806`.

Run `node examples/theme-explorer/run.mjs` for browser cases. The runner builds the fixture.

Reset one token or reset all. Copy changes as CSS exports the current preset rule. Edits stay with their preset.
Open `?variants=buttons`, `?variants=inputs`, `?variants=icons`, or `?variants=surfaces`. Add `&mode=dark` for dark mode. See [Theme explorer variants](#theme-explorer-variants).

## tree-prototype

This diagnostic fixture isolates the experimental Tree export. It covers keyboard navigation, selection, expansion, and names in server markup.

Preview with `pnpm exec vite --config examples/tree-prototype/vite.config.ts`.

Build with `pnpm exec vite build --config examples/tree-prototype/vite.config.ts`. Run `node examples/tree-prototype/run.mjs` for browser cases.

Run `node examples/tree-prototype/run.mjs --hydration` for server markup and client attachment. The browser runner covers source and built-package modes.

## virtualization

This fixture exercises the shared virtual renderer. It covers bounded rendered rows, scrolling, edits, saves, and appended records.

Preview with `pnpm exec vite --config examples/virtualization/vite.config.ts`.

Build with `pnpm exec vite build --config examples/virtualization/vite.config.ts`. Run `node examples/virtualization/run.mjs` for browser cases.

Use source or built-package mode. See [Virtual rows](../packages/components/src/virtual/README.md).

## wamn

This optional fixture adapts generated Widget operations to Table through a mock transport. Load uses bounded results. Browse requests the next cursor.

Preview with `pnpm exec vite --config examples/wamn/vite.config.ts`.

Build with `pnpm exec vite build --config examples/wamn/vite.config.ts`. Run `node examples/wamn/run.mjs` for browser cases.

Prepare and check `.input` before running. See [WAMN inputs and modes](#wamn-inputs-and-modes) and [Table development diagnostics](../docs/tables.md#table-development-diagnostics).

## wamn-generator

This optional fixture uses generated Widget query, read, and update bindings with a mock transport. Its inline and separate editors share one form.

Preview with `pnpm exec vite --config examples/wamn-generator/vite.config.ts --host 127.0.0.1 --port 7789 --strictPort`.

Build with `pnpm exec vite build --config examples/wamn-generator/vite.config.ts`. Run `node examples/wamn-generator/run.mjs` for browser cases.

Open `/?app=original` or `/?app=review` to compare labels, column order, and presentation with stable identities.
Prepare and check the same inputs as [WAMN](#wamn). See [WAMN generator setup](#wamn-generator-setup) for types and hydration.

## Gallery controls

The gallery brings shared controls, data views, and application Blocks into one browser interface. Each example renders directly in the gallery document and inherits its owning theme.

### Open the gallery

Use the [components preview](#components) or start another preview on a free port.

```sh
pnpm exec vite --config examples/components/vite.config.ts --host 127.0.0.1 --port 7790
```

Open `http://127.0.0.1:7790/`. Add `?gallery=<id>` to open an example such as `?gallery=fields`. Use `?galleryPreview=<id>` to render that example without the gallery shell. If a preview is already running, use its URL.

Choose a category and example in the sidebar. The header shows the category and example as breadcrumbs. On narrow screens, open navigation with Components. Choosing an example closes the drawer and moves focus to its title. Escape closes navigation and returns focus to the toggle. Modified link clicks keep native browser behavior.

The desktop divider control collapses the sidebar. In Appearance, choose whether a compact group opens a flyout or expands the sidebar. Either choice retains the current example.

### Review controls

Appearance selects the preset, mode, colors, and surface layers. It starts collapsed so the example has space. Sketchy adds controls for dot and border colors and opacity. See the [theme guide](../docs/theme.md#themes) for public configuration.

Available state controls depend on the example. Form fields can demonstrate normal, disabled, readonly, and invalid states. Buttons and tabs offer the states listed in the [catalog](components/gallery/catalog.ts).

Choose Full width, 768px panel, or 320px panel to change the available preview width. Width controls keep the browser viewport unchanged. Dashboard and table drawers can respond to the smaller panel. Resize the window to test viewport behavior.

The Direct link action includes the selected example and appearance parameters. Back and Forward restore entries in browser history. Appearance and state changes retain the mounted example and its drafts. Changing examples disposes the old example.

### Examples

The catalog includes Forms, Tables, Components, Navigation, Layout, Charts, Diagrams, and Blocks. Open `?gallery=everything` for a composed form, `?gallery=table` for the Table workspace, or `?gallery=blocks-admin-app` for an application shell.

The icon catalog and application Blocks load on demand. The gallery keeps navigation available while the preview loads. The loading status uses the accessible name Example loading.

The focused fixtures also run without the gallery shell.

| Route                       | Fixture                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `?consumer=1`               | Generic form and Table consumer.                                |
| `?editing&size=25&save=all` | Table popup editing.                                            |
| `?choices=1`                | Controlled Select and Combobox with application-supplied pages. |
| `?dialogs=1`                | Dialog, AlertDialog, and Sheet.                                 |
| `?consistency=1`            | Shared table, form, and popup controls.                         |
| `?classes=1`                | Structured class values, events, and refs.                      |
| `?files=1` and `?tabs=1`    | File and Tabs fixtures.                                         |

## Routes and maintenance

### Generator routes

| Route                        | Fixture                                                |
| ---------------------------- | ------------------------------------------------------ |
| `?app=records`               | Records, details, and a grouped editor.                |
| `?app=records&reviewCells=1` | Custom cell drafts, reordering, and disposal.          |
| `?app=dispatch`              | A form with held responses and a nullable amount.      |
| `?app=dates`                 | Date, time, timezone, and read-only formats.           |
| `?app=formats`               | Optional labels, shared formats, and an editable note. |
| `?app=repeated`              | Row changes and errors by row key.                     |
| `?app=details`               | Record details and deletion confirmation.              |

### Platform routes and snapshot

`PlatformApp.tsx` owns navigation, history, and one controller. Project and environment tables stay mounted across routes.
The application owns permissions, cancellation, and result validation. It binds application hosts to a project and environment before dispatch.

| Route                                                           | Screen                           |
| --------------------------------------------------------------- | -------------------------------- |
| `?screen=app-users&project=billing&env=dev`                     | Application user assignments.    |
| `?screen=app-roles&project=billing&env=dev`                     | Application permissions by role. |
| `?screen=members&project=billing`                               | Project members.                 |
| `?screen=access&principal=00000000-0000-4000-8000-000000000002` | Access for one user.             |

The checked-in snapshot records source paths, hashes, and licenses. The first command checks it without an external checkout.
To refresh it, point `WAMN_ROOT` at a checkout with generated clients and the platform schema.
Rebuild result schemas if operation metadata changes. Use `--check` to compare them with current metadata.

```sh
node examples/platform/check-snapshot.mjs
```

```sh
WAMN_ROOT=/home/kaalin/dev/wamn node examples/platform/capture.mjs
```

```sh
node examples/platform/generate-result-schemas.mjs
```

```sh
node examples/platform/generate-result-schemas.mjs --check
```

### Theme explorer variants

The explorer shows the rest, hover, focus, pressed, disabled, invalid, and selected states for the chosen group. It loads only that group.
`force-states.ts` applies the states. `variant-groups.json` lists the groups. `variant-parity.mjs` and `variant-audit.mjs` compare computed styles in both modes.

The token panel distinguishes base, mode, density, preset, and application values. The “Show only tokens that a block overrides” control filters the list.
See the [token base](../docs/theme.md#token-base) for the override rule.

### Gallery profiling

Build the packages before the optional popup heap run.

```sh
BENCH_DISTRIBUTION=1 BENCH_PROFILE=1 pnpm exec vite build --config examples/components/vite.config.ts
BENCH_DISTRIBUTION=1 BENCH_WORKLOAD=1 BENCH_HEAPS=/tmp/table-popup-heaps node examples/components/run.mjs
```

Set `BENCH_SCENARIOS=0` for the repeated workload alone. Read the [benchmark guide](../bench/README.md) for heap tools.

### Table editing heap workloads

Build the distribution profile first. It retains module names. Use the last two commands for edit-lock and saved-view captures.

```sh
pnpm build
BENCH_DISTRIBUTION=1 BENCH_PROFILE=1 pnpm exec vite build --config examples/table-editing/vite.config.ts
BENCH_DISTRIBUTION=1 BENCH_HEAPS=/tmp/table-editing-heaps BENCH_OUTPUT=/tmp/table-editing-distribution.json node examples/table-editing/run.mjs
```

```sh
BENCH_DISTRIBUTION=1 BENCH_SCENARIOS=0 BENCH_WORKLOADS=0 BENCH_LOCK_WORKLOAD=1 BENCH_HEAPS=/tmp/table-editing-lock-heaps node examples/table-editing/run.mjs
```

```sh
BENCH_DISTRIBUTION=1 BENCH_SCENARIOS=0 BENCH_WORKLOADS=0 BENCH_VIEW_WORKLOAD=1 BENCH_HEAPS=/tmp/table-views-heaps node examples/table-editing/run.mjs
```

Use fresh paths for repeat captures. The runner leaves an existing preview running.

### Editing overhead measurements

All five modes use the same record store. Store mounts the store alone. Controller adds the editing controller. Model adds the app model and engine.
Read-only and editable add the corresponding Table. They measure 25, 250, and 999 records. The non-rendered modes also measure 10,000 and 50,000 records.

Each sample uses a fresh page and measures memory after garbage collection. Run both builds and measurements in order.

```sh
pnpm build
PLAYWRIGHT_BROWSERS_PATH=/tmp/table-solid-export-browsers pnpm exec playwright install chromium
pnpm exec vite build --config examples/editing-overhead/vite.config.ts
PLAYWRIGHT_BROWSERS_PATH=/tmp/table-solid-export-browsers TMPDIR=/dev/shm BENCH_REPEATS=5 BENCH_HEAPS=/tmp/table-editing-overhead-source-heaps BENCH_OUTPUT=/tmp/table-editing-overhead-source.json node examples/editing-overhead/run.mjs
BENCH_DISTRIBUTION=1 pnpm exec vite build --config examples/editing-overhead/vite.config.ts
PLAYWRIGHT_BROWSERS_PATH=/tmp/table-solid-export-browsers TMPDIR=/dev/shm BENCH_DISTRIBUTION=1 BENCH_REPEATS=5 BENCH_HEAPS=/tmp/table-editing-overhead-distribution-heaps BENCH_OUTPUT=/tmp/table-editing-overhead-distribution.json node examples/editing-overhead/run.mjs
node examples/editing-overhead/summarize.mjs /tmp/table-editing-overhead-source.json /tmp/table-editing-overhead-distribution.json
```

Omit `BENCH_HEAPS` to skip snapshots. Reports record work counts, runtime, build hashes, and host load. The [coverage inventory](../scripts/coverage-inventory.mjs) classifies this runner as diagnostic.

### WAMN inputs and modes

Set `WAMN_ROOT` if the checkout is outside `~/dev/wamn`. Preparation needs the installed WAMN runtime and cached build dependencies.
It writes generated inputs and provenance to `.input`. The validator compares hashes. The `--current-source` flag also compares the upstream revision and relevant changes.

Run the preparation, type, and source commands in order. The next block uses built-package imports. The last block enables development diagnostics.

```sh
node examples/wamn/prepare.mjs
node examples/wamn/check-inputs.mjs --current-source
pnpm exec tsc --project examples/wamn/tsconfig.json
pnpm exec vite build --config examples/wamn/vite.config.ts
node examples/wamn/run.mjs
```

```sh
pnpm build
BENCH_DISTRIBUTION=1 pnpm exec vite build --config examples/wamn/vite.config.ts
BENCH_DISTRIBUTION=1 node examples/wamn/run.mjs
```

```sh
NODE_ENV=development BENCH_DEVELOPMENT=1 pnpm exec vite build --config examples/wamn/vite.config.ts
BENCH_DEVELOPMENT=1 BENCH_SIZES=1000 node examples/wamn/run.mjs
```

Set `BENCH_WORKLOADS=0` to run only interaction cases. Set `BENCH_PROFILE=1` for readable profiles. Set `BENCH_HEAPS` for heap captures.
Larger workloads generate records locally. The application owns records, revisions, drafts, scope changes, and requests.

### WAMN generator setup

Validate the prepared WAMN inputs before type checks, bundling, and browser cases.

```sh
node examples/wamn/check-inputs.mjs
pnpm build
pnpm exec tsc --project examples/wamn-generator/tsconfig.json
pnpm exec vite build --config examples/wamn-generator/vite.config.ts
node examples/wamn-generator/run.mjs
node examples/wamn-generator/run.mjs --hydration
```

Use matching delivery modes for the build and runner. The [qualification guide](../docs/qualification.md#run-serial-qualification) lists the optional stages.
