# Shared popup editing

This fixture uses shared Select with Table and Solid 2 rc.14.
The private components package supplies the owned Kobalte behavior.
It replaces the Priority editor through a component supplied by the parent.
The regular editing fixture uses SelectField, which composes the same Select behavior.
Neither fixture installs an external Kobalte package.

The wrapper maps a scalar draft to a stable choice object.
Labels remain separate from saved values.
The existing controller owns drafts, Zod Mini rules, revision conflicts, and save requests.
The popup owns its open state and highlighted choice.
This interface adds no record store or copy of the collection.

## Generic form and Table consumer

Open `http://127.0.0.1:7782/?consumer=1` for a form beside a read-only Table.
Add `&alternate=1` for different field names and a stacked layout.
Both layouts use public exports from `@wfe/components` and `@wfe/components/table`.
They use the same compact styles as the other fixtures.

The application owns field values, required-field rules, confirmation, requests, and saved records.
The Table reads those records through the native engine.
Sorting, filtering, grouping, and column controls remain independent of the form.
A successful save adds one server response to the application collection.
A failed save keeps the form values and existing records.
The confirmation captures a submission snapshot and prevents duplicate saves while a request runs.

The fake server returns choice pages after a short delay.
Clear the search text to see all choices, then use More results for another page.
Search for `fail` to see a request error.
Use the name `Reject` to see a save error.
These rules belong to the fake application transport, not the shared components.

Browser tests add `&manual=1` to control each response without timing assumptions.
They finish cancelled requests late to make sure that old results cannot replace the current search.
They also test loading, empty results, retry, confirmation focus, both naming schemes, and external value updates.
Cleanup aborts application requests, clears fake server timers and listeners, and removes popup portals.
Pending promises settle during cleanup, and their callbacks cannot change disposed application state.
These interaction tests do not measure heap retention or performance.
Production WAMN components and generator output remain outside this fixture.

The existing popup runner includes the consumer cases in source, distribution, and development runs.
Run only these cases with `BENCH_CASE_PATTERN='^consumer:'` and disable benchmark workloads with `BENCH_WORKLOADS=0`.

## Live development regression

The qualification suite also starts a temporary Vite development server.
`run-live.mjs` tests every public part of the choice, menu, overlay, and dialog components.
It reloads their modules through Vite hot updates and makes sure that the form draft survives.
Then it runs the full popup interaction suite against that server.
Browser pages enable Chromium accessibility tracking so focused `aria-hidden` warnings remain visible.
The runner also records synchronous attempts to hide a focused element and rejects them.
Modal background hiding waits for initial focus and respects caller focus callbacks.
The script closes its temporary server and leaves existing review servers running.

Solid refresh wraps component functions in proxies.
These proxies support direct property access but hide keys from object enumeration.
Styled components copy named parts explicitly because spreading a proxied compound function drops its parts.
Built files do not use these refresh proxies, so built development tests alone cannot catch this failure.

From the repository root, run the live regression with the installed Chromium browser:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/table-solid-export-browsers TMPDIR=/dev/shm node examples/components/run-live.mjs
```

## Source and local repairs

The fixture imports styled Select and Combobox from the private `@wfe/components` workspace package.
Those controls use checked-in behavior from `@wfe/components`.
[The vendor record](../../packages/components/src/vendor/kobalte/README.md) identifies the source revision, licenses, original hashes, and local repairs.
Select and Combobox share one Core and Utils subset.
The workspace lockfile declares external primitives and runtime versions.
The fixture uses the workspace compiler and TypeScript 6.0.3.

`prepare.mjs` now runs the source integrity audit. It downloads no runtime source or dependencies.
The Vite configuration applies no source rewrite plugin or Kobalte source alias.
Focus, refs, scrolling, and owned listener repairs appear directly in the checked-in source.
The external scroll registry repair uses a shared pnpm patch.
Bead `table-gd3.6.7.9` still tracks repair retirement after matched upstream fixes.

The initial standalone probe produced `STRICT_READ_UNTRACKED` diagnostics during focus.
Table integration also exposed positioning, scrolling, Tab order, and disposal defects.
The [heap findings](../../bench/heap-findings.md#kobalte-popup-editing) describe the retaining paths and measured results.

## Table behavior

A portal places the popup outside the row in the document.
The popup carries a Table-specific owner ID so focus inside it preserves the row editor.
Tab closes the popup and continues from the trigger position in the table.
Escape closes only the popup. Selecting a choice changes only the draft.
Explicit Save or Save all commits changes.

Pending saves disable the trigger and close its popup.
An outside interaction prevents delayed focus restoration.
Child tables use the same editor and save independently.
Grouped rows construct no editors.
Existing editing locks keep filters, sorting, grouping, and layout fixed during an edit.

The demonstration includes an empty choice and a disabled choice.
Its application schema rejects an empty priority and allows recovery in place.
Nullable application schemas can accept the same empty value.
Generic Combobox search and caller-supplied pages have a separate form fixture.
Production record references, multiple selection, touch gestures, and other browsers require separate work.
WAMN Form/UI and Zaidan wrappers remain outside this fixture.

## Run the fixture

Run these commands from the repository root after the workspace dependencies are installed:

```sh
node examples/components/prepare.mjs
pnpm exec vite --config examples/components/vite.config.ts --host 127.0.0.1 --port 7782 --strictPort
```

Open `http://127.0.0.1:7782/?size=25&save=all` for Table editing.
Open `http://127.0.0.1:7782/?standalone=1` for the independent popup.
Open `http://127.0.0.1:7782/?combobox=1` for the basic Combobox source-wiring fixture.
Open `http://127.0.0.1:7782/?choices=1` for controlled choice fields and application-supplied pages.
Open `http://127.0.0.1:7782/?dialogs=1` for Dialog, nested dialogs, explicit confirmation, and Sheet.
Open `http://127.0.0.1:7782/?booleans=1` for controlled Checkbox, Switch, and RadioGroup fields.
Open `http://127.0.0.1:7782/?fields=1` for native interoperability controls, field layouts, and native form submission.
Open `http://127.0.0.1:7782/?icons=1` for shared glyphs and explicit icon slots.

The choice cases test pointer and keyboard selection, disabled options, rejected text changes, empty lists, loading content, and changed pages.
They also test off-page labels, native form values, custom item elements, footer focus, error links, and disposal.
The application supplies every page and label. The controls make no service requests.

Build the source fixture and run its Chromium scenarios:

```sh
pnpm exec vite build --config examples/components/vite.config.ts
node examples/components/run.mjs
```

Before building the distribution fixture, run `pnpm build` from the repository root.
Use the unminified profile build for heap classification:

```sh
BENCH_DISTRIBUTION=1 BENCH_PROFILE=1 pnpm exec vite build --config examples/components/vite.config.ts
BENCH_DISTRIBUTION=1 BENCH_WORKLOAD=1 BENCH_HEAPS=/tmp/table-popup-heaps node examples/components/run.mjs
```

`BENCH_SCENARIOS=0` selects only the repeated workload.
Heap snapshots use gzip compression and retain their parsed summaries beside them.
The inspector also accepts uncompressed Chrome snapshots.
Resource counts are strict assertions. Timings remain advisory on a shared host.

Build and exercise Solid development diagnostics:

```sh
NODE_ENV=development BENCH_DEVELOPMENT=1 pnpm exec vite build --config examples/components/vite.config.ts
BENCH_DEVELOPMENT=1 node examples/components/run.mjs
```

The qualification host uses `PLAYWRIGHT_BROWSERS_PATH=/tmp/table-solid-export-browsers` for its existing Chromium installation.
It also uses `TMPDIR=/dev/shm` for browser scratch files because the temporary filesystem has a quota.
Set these variables only for browser commands on that host.
`BENCH_URL=http://127.0.0.1:7782/` tests the running development preview.
`BENCH_OUTPUT` selects the JSON report path.

The module audit requires one Solid runtime and rejects table-core, TanStack Store, virtual-core, and Form.
TypeScript tests the wrapper against the owned source.
The module audit also rejects downloaded or installed Kobalte implementations.
The basic Combobox case covers input filtering, selection, and Escape.
The controlled choice cases cover the shared styled controls.
The shared browser matrix covers component states, nested popups, structured classes, field associations, and cleanup.
This fixture does not run the upstream Kobalte test suite.

## Contextual controls

Open `?overlays=1` for Popover, DropdownMenu, and Tooltip.
The fixture uses application-owned state and action callbacks.
It also places Popover and DropdownMenu inside a modal Dialog.
Browser cases cover pointer and keyboard input, nested menus, focus, placement, force-mounted content, and disposal.

## Display and status

Open `?display=1` for native display components and Toast.
The fixture gives loading and empty content the same reserved viewport.
Toast uses application-owned visibility and actions.
Browser cases exercise progress semantics, announcements, themes, keyboard focus, timer pauses, rejection, and disposal.

## Control consistency

Open `?consistency=1` for public table controls beside form and popup controls.
Add `&comfortable=1` or `&dark=1` to change density or theme.
The fixture keeps its popup open while other consumers receive focus for comparison.
This behavior belongs to the fixture and uses the public outside-event callbacks.

Browser cases compare field geometry, caret appearance, hover, focus, disabled state, read-only fields, and invalid borders.
They test text and choice acceptance, rejected values, and input-method composition.
Table filters retain their own clear actions and three-state boolean behavior.
Read-only comparisons cover text controls and choice editors, not a new read-only filter API.

The filter section covers text, boolean, select, multiple choices, tags, numbers, and date boundaries.
Nested cases place Select, Popover, DropdownMenu, Tooltip, and Dialog inside a native popover.
They test pointer access to the complete option list, Escape, focus return, modal content, and disposal.
Native hosts allow visible overflow and keep scrolling in an inner content element.
Forced-color cases retain visible focus and field geometry.

`check-controls.mjs` rejects raw controls, private control imports, and NativeSelect in normal example interfaces.
Named exceptions allow the existing native interoperability and scope-isolation fixtures.
Those exceptions do not permit other raw controls or private imports in the same file.
The shared component implementation remains outside this example guard.

## Structured classes

Open `?classes=1` to exercise native class values on styled components.
The wrappers accept strings, nested arrays, conditional maps, numbers, booleans, and empty values.
Library classes remain present when caller classes change.

Browser cases test class replacement, a map with reactive properties, stable DOM nodes, refs, and events.
They also test classes on composed popup triggers and content.
The hydration suite uses the same fixture in a hidden section to preserve its existing layout tests.
It compares server nodes with attached client nodes before testing further class changes.

## CSS provenance

The example Vite plugin selects source CSS for source and development builds.
It selects copied package CSS for distribution builds.
PostCSS records the files that it processes, including imported styles.
The compiler refreshes its input record after style imports change.
A build fails if those inputs use the wrong directory or differ from current source files.

Each client build emits `css-provenance.json` with input and asset hashes.
The browser matrix compares that record with current files and the served CSS assets.
Live Vite tests compare the injected styles with the compiler output.
Both hydration suites use the same CSS selection and browser assertions.
Server builds retain their normal CSS handling and do not emit client evidence.

The regular qualification command runs the matrix in source, distribution, development, and live modes.
It also runs the usage guard and negative CSS build tests through `pnpm check`.

## Default appearance previews

The `?tabs=1` and `?breadcrumbs=1` routes share the records example appearance.
They use a blue accent, outline buttons, Surface 1 components, a Surface 2 backdrop, and shadow depth 2.
The shared `DefaultAppearance` wrapper supplies those values and the stylesheet dependencies.
The generic components continue to inherit their appearance from the application scope.
