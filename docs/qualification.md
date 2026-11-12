# Qualification

Run these commands from the wfe repository root.
Use Node 22.22.2 or newer in the 22.x line, or 24.15.0 or newer in the 24.x line.
Node 26 and newer are also supported.
Use pnpm 12.4.1.
The root engine range describes repository development and checks: `^22.22.2 || ^24.15.0 || >=26.0.0`.
The pinned jsdom 30.0.1 requires that range.
Other pinned tools also exclude Node 22.12.
Within 22.x, tsdown 0.23.0 requires Node 22.18 or newer, and ESLint 10 requires Node 22.13 or newer.
The package manager pin remains pnpm 12.4.1. Dependency versions and the lockfile remain unchanged.

The library packages retain their existing `>=22.12.0` consumer engine declarations.
Those declarations do not promise that repository development tools run on Node 22.12.
This change does not establish new consumer-runtime coverage for that version.

On branches other than main, CI runs `pnpm check` and the direct source test on each declared boundary: Node 22.22.2, 24.15.0, and 26.0.0.
Each matrix job uses the frozen lockfile. Boundary jobs run one at a time; the existing Node 24 browser qualification job remains in place.
The direct source test imports an erasable TypeScript file without a custom loader.
Local verification on October 22, 2026 used the official Node 22.22.2 Linux x64 archive after SHA-256 verification.
That binary passed the direct source test without a custom loader and the full `pnpm check` gate.
The gate passed 819 unit tests, 59 Node tests, server rendering, and 33 documentation examples.
The other CI boundaries were not run locally.

Install dependencies and Chromium before the suite:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:qualification
```

The commit gate is `pnpm check`.
It includes server rendering and documentation contracts after the package build.
Run `pnpm test:qualification` as the required companion gate for runtime, export, rendering, hydration, and vendor changes.
Browser modes remain separate from routine type and unit tests.

The executable inventory is [coverage-inventory.mjs](../scripts/coverage-inventory.mjs).
It lists every example runner, example type project, documentation fence, and separate type contract.
Each entry has a required, diagnostic, optional, covered, or excluded disposition with a reason.
The inventory test rejects missing entries, changed fence counts, and missing required stages.
The example type runner and documentation compiler read this same inventory.
Documentation errors name the source Markdown file and fence index.

The public Theme consumer runs as a required browser stage and builds its own fixture.
Accessor profiling, editing overhead, and grouping profiling remain diagnostic workloads.
Their performance measurements do not run in the commit or qualification gates.
The first two diagnostic examples still receive routine type checks.
The WAMN adapters remain optional because they require prepared external inputs.
The platform snapshot example remains required integration coverage.
Virtualization runs in source and distribution production modes; its development-mode exclusion is recorded in the inventory.
Existing hydration, live-development, and preview stages remain required.

The runner tests formatting, lint, types, exports, unit behavior, mock transport, server rendering, hydration, and vendor ownership.
It builds browser examples against source, the built package, and the development runtime.
Component and form hydration run in all three modes and reject server warnings as well as browser diagnostics.
The form runner preserves server nodes and exercises six mount and disposal cycles without navigation.
Live checks test component exports, hot updates, interaction, focus, and cleanup.
The virtual demo also tests scrolling and bounded DOM rows.
Charts run against source, built packages, and development code, with server rendering and hydration in each mode.
Chart cases cover retained SVG nodes, tooltip cleanup, controlled legends, responsive sizing, hidden hosts, and forced colors.
The source chart run also tests the fallback tooltip portal.
The chart import probe rejects chart code in normal form and layout imports.
Shell cases cover two audiences, six routes, accepted and rejected requests, native links, and browser history.
Shell hydration preserves server nodes and initial focus, including direct links with query data and fragments.
Narrow drawer cases cover heading focus, Escape, rejected navigation, and disposal of history listeners.
Grid cases cover 150 controlled checkboxes, read-only columns, disabled rows, retained focus, and narrow scrolling.
Grid hydration retains all 150 server inputs and the initial focus.
Status tile cases cover controlled values and states, raw formats, full text, shared themes, narrow wrapping, and forced colors.
Tile hydration retains server nodes and initial heading focus.
Choice cases test selected option semantics, marker hit targets, containment, and focus after selection.
Chart fallback cases test usable geometry and recovery from invalid aspect ratios.
Server theme cases test ownership markers and caller-selected mode without fixing a control size.
The bundle guard rejects modules outside the wfe checkout.

The runner executes stages serially and stops at the first failure.
Its initial `pnpm check` stage includes unit tests, so qualification does not repeat that suite.
Node test files run serially inside the gate and the direct qualification stages.
Logs, browser reports, and the stage summary remain under a new `test-results/runs/qualification` child directory for each invocation.
Set `QUALIFICATION_OUTPUT` to choose a different parent directory; each invocation still creates a separate run.
The runner clears inherited case selectors, preview URLs, and performance flags.
It preserves `BENCH_EXECUTABLE_PATH` when the host needs a specific Chromium executable.
Set `PLAYWRIGHT_BROWSERS_PATH` when the host uses an existing browser installation.

Inspect the stages without running them:

```sh
node scripts/qualify.mjs --plan
```

The optional `--wamn` extension tests prepared integration inputs.
It never runs the external WAMN generator.
Prepare those inputs through the [fixture instructions](../examples/wamn/README.md).

## v0.0.8 release

Git tag `v0.0.8` points to commit `e4f8a6aaa3b52b669ba51e89a9e61398eed9fbbc`.
The tag adds adoption documentation after runtime commit `7c75de6`.
It includes shell overrides, optional field and section decoration, gallery geometry controls, and the owned icon catalog.

The shell override record covers 13 browser cases against source and built packages, plus 13 hydration cases in each mode.
Those four final reports contain no errors or warnings.
The source and built-package unit runs each passed 25 shell tests.
These cases cover supplied headers, navigation omission, accepted route changes, retained focus, lazy content ownership, and cleanup.

The shell change passed `pnpm check` with 44 repository tests before its final small lifecycle correction.
Targeted formatting, lint, types, unit, and browser runs followed that correction.
The earlier icon record contains two focused browser cases and 45 hydration cases in each of source and built-package modes.
These records do not establish a fresh complete qualification run for the release tag.
The native-tab investigation remained unresolved. The release does not claim that the full component hydration matrix passed.

The reviewed local records are `wfe-shell-overrides-{source-2,package,hydration,package-hydration}.json`,
`wfe-shell-overrides-unit-{final,package}.log`, and `wfe-shell-overrides-check.log` under `/tmp`.
Icon records are `wfe-icons-{source,package}-final.json` and `wfe-icons-{source,package}-hydration.json` under `/tmp`.
These files are temporary local evidence, not durable release artifacts.
This summary records their inspected results without a new test run or a claim about unrecorded stages.

## v0.0.7 release

The release includes runtime changes through commit `0a0d1309de9839f92570b71abeade5d48d53ca16`.
The release commit also updates documentation.

The form action and icon suites passed 39 browser cases and 45 hydration cases against both source and built packages.
The final column-control and form-row suites passed 24 browser cases and 28 hydration cases in both modes.
These suites reported no browser errors, warnings, or reactive diagnostics.
Tests cover accessible action names, disabled submission, icon cleanup, retained focus, shared action rows, per-column controls, and client/server sorting.
The contract suite compiled 28 documentation examples and the generator contracts.
Separate review approved the runtime changes. Browser captures covered action buttons and the column-controls example.

The release check uses `pnpm check` for formatting, lint, vendor integrity, builds, types, example types, and 43 repository tests.
This release uses focused browser suites. It does not claim a new run of the complete qualification matrix.

## v0.0.6 release

Git tag `v0.0.6` points to commit `87a5ebc74e3f8df33377804e40d9cd2cad3bab1e` on main.
The tag includes the sidebar context switcher, its examples and API guide, and the browser investigation records.
The release retains the dependency pins and Default theme from `v0.0.5`.

The feature passed `pnpm check`, including package builds, package and example types, and 43 tooling tests.
The release documentation run also passed `pnpm check`.
Source, built-package, and development browser runs each passed six context and existing navigation cases.
The hydration suites passed 27 assertions in each mode without server warnings, browser warnings, or errors.
After the final parent-label markup correction, all three focused browser runs and built-package hydration passed again.
Independent review approved the component boundaries, focus handling, identity preservation, and final markup.
Visual review covered light, dark, and narrow layouts.

These results cover this release change, not a fresh run of every qualification stage.
The [native tab investigation](native-tab-investigation.md) remains open under `wfe-x6o`.
The candidate browser toolchain remains unqualified, and the release does not upgrade it.
The [action disposal investigation](action-disposal-investigation.md) retains the existing disposal workaround.

Local evidence includes `/tmp/wfe-context-check-final.log` and `/tmp/wfe-v006-check.log`.
The final browser reports use `/tmp/wfe-context-label-{source,package,development}.json`.
The final hydration report is `/tmp/wfe-context-label-hydration-package.json`.
These temporary files are local evidence, not release artifacts.

## Vendor repairs

Run `pnpm audit:vendor` to record source ownership, external imports, and retained bundle contributions.
The [vendor procedure](../packages/components/src/vendor/kobalte/README.md) describes original comparisons and exact patch replay.
The audit requires unchanged license bytes and recorded source hashes.
Runtime qualification uses the owned source and does not require the original checkout.

## Performance

Heap captures and timing campaigns remain separate from qualification.
Run them through the moved performance examples and their documented configuration.
Elapsed times remain advisory because host load varies.
Record reads, retained scopes, and cleanup assertions remain correctness checks.

## Native tab diagnostics

The [native tab investigation](native-tab-investigation.md) records the isolated browser failure and bounded reproduction commands.
These diagnostics remain separate from the component qualification assertions.

## Solid rc.16 toolchain

The 2026-10-21 upgrade uses `solid-js`, `@solidjs/web`, `@solidjs/signals`,
`@solidjs/compiler`, and `@solidjs/babel-plugin` at `2.0.0-rc.16`.
The paired Vite plugin is `3.0.0-next.50`.
The npm registry identifies source commit `b0ad1df505b835058a4b3750ab37d6576bb18c01`.
The lockfile records archive integrity hashes, including the compiler binaries.
Solid pins `seroval` and `seroval-plugins` to `1.6.7`.

The owner explicitly approved this upgrade before the normal 24-hour release age.
Exact rc.16 exclusions cover these packages and their compiler binaries.
Automatic upgrades retain the age rule and the existing trust policy.
The existing interaction, scrolling, disposal, and native listener repairs remain in place.
This upgrade does not establish that upstream fixes replace those repairs.

Release references: [Solid rc.16](https://github.com/solidjs/solid/releases/tag/solid-js%402.0.0-rc.16)
and [Vite plugin next.50](https://github.com/solidjs/solid-vite-plugin/releases/tag/%40solidjs%2Fvite-plugin%403.0.0-next.50).

The release review found no owned module-level reactive state or use of the removed nonce and binding-slot APIs.
Application factories and providers retain state ownership.
The compiler now evaluates ref setup beside spreads during server rendering.
Our ref factories defer DOM work to attachment or effects; the qualification suite exercises server rendering and hydration.
The cleanup-write guard relaxation does not replace application guards against late responses after disposal.
The root initialization closure fix does not establish that the separate action disposal workaround is obsolete.

The [signals notes](https://github.com/solidjs/solid/releases/tag/%40solidjs%2Fsignals%402.0.0-rc.16)
cover cleanup, diagnostics, and root disposal.
The [compiler notes](https://github.com/solidjs/solid/releases/tag/%40solidjs%2Fcompiler%402.0.0-rc.16)
cover ref setup and diagnostic locations.

The upgrade qualification ran serially because this host had high variable load.
The unit suite passed 786 tests across 79 files before the focused sidebar regression was added.
The four sidebar tests also pass, including retained icon ownership and cleanup.
Source, built-package, and development browser and hydration stages pass after the recorded repairs.
Live browser interactions, stylesheet updates, and concurrent preview isolation also pass.
Reports remain in `test-results/solid-rc16-functional` and the numbered `solid-rc16-functional-resumed` directories.
These are staged runs with preserved failures, not one uninterrupted passing run.

Qualification found duplicate sidebar icon construction during hydration (`wfe-1pf`).
The repair caches the icon and retains its server-rendered node.
It also found that CSS provenance hashed font URLs before Vite resolved them (`wfe-kg3`).
The repair hashes transformed CSS while retaining source and asset freshness assertions.
Cosmetic assertions were removed separately in `wfe-gjk`; interaction and accessibility assertions remain.
The existing native-tab timeout (`wfe-x6o`) recurred and then passed unchanged.
Its cause remains open; this upgrade does not claim to fix it.

The [action disposal investigation](action-disposal-investigation.md) preserves the runtime-only heap reproduction and the current removal decision.

## Shared browser runner pilot

The generator runner and its records workflow use `examples/shared/browser/runner.mjs` for static serving, browser launch, diagnostics, serial recording, and cleanup. Suites still own their cases, build commands, SSR rendering, module provenance, and application fixture disposal. The optional WAMN generator caller keeps the same `run({ root, applications, hydration })` boundary.

`BENCH_APPLICATION_PATTERN` is a regular expression over complete application names. A nonempty expression must select at least one group. The report records selected and skipped groups. Every selected group's cases run in their original order, including records-workflow prerequisites. This pilot does not support skipping individual cases with `BENCH_CASE_PATTERN`. Without a group filter, all applications run and stop on the first failure. Aggregate qualification strips inherited filters and other `BENCH_` settings, preserving only the executable override before applying its own stage settings.

`BENCH_EXECUTABLE_PATH` selects the Chromium executable. The runner retains the host's `NODE_OPTIONS` transport preload and Playwright browser installation. It adds no retries or timeout changes. Static paths are decoded and checked against both the lexical asset root and the actual filesystem root. Missing files return 404; rendering, asset-read, server and response-body failures are recorded separately and fail the run.

Generator console warnings and errors remain failures, including console text containing `HOT_SCOPE_TIME`. Reactive diagnostic events retain their existing separate rule: only `HOT_SCOPE_TIME` is advisory. Raw console and reactive events retain their classifications in the report. Event listeners belong to the page review and are removed after page cleanup.

The first operation failure remains the primary failure. Cleanup attempts continue after an earlier cleanup rejects. Reports retain diagnostic-capture failures, each cleanup failure and output failures separately, including non-Error thrown values. When writing the report fails, the console report still contains the output failure. A failed operation, diagnostic capture, resource cleanup, output or server callback produces a nonzero runner result. Successful cases keep their original names and report order.

The dashboard and raw-style runners use the shared browser lifecycle helpers.
Each runner exposes one complete application group: `dashboard` or `styles`.
`BENCH_APPLICATION_PATTERN` selects that whole group and rejects a zero-match filter.
Individual dashboard cases retain their existing reset and viewport setup.
The style suite retains its raw-scope isolation checks and page-error-only policy.
Its console events are recorded, but this migration does not make them fatal.
Dashboard console warnings and errors remain fatal. Its reactive timing diagnostics
remain advisory, while other reactive diagnostics fail the run.
Both runners support the shared executable override and `BENCH_OUTPUT` report path.
Their source, package, and development build variants remain separate runs.

The status-tile and grid runners share the normal and hydration lifecycle.
Each remains one complete filter group: `status-tiles` or `grid`.
Hydration still builds server first, then client, with `HYDRATION_SERVER`.
Only that identical build loop is shared. Each runner retains its template,
server import, adoption nodes, initial focus and module audit.
Source, package and development suffixes remain unchanged in both modes.
An external `BENCH_URL` is caller-owned and does not start a local server.
Existing hydration builds and module audits still run with that override.
The existing console policy rejects warnings and errors except messages that
start with `[HOT_SCOPE_TIME]`. Those timing messages remain observations.
These suites do not add a server-console capture or claim one exists.
Render and HTTP failures are reported separately from browser failures.
DOM snapshot failures cannot prevent browser, listener or server cleanup.

Shell and chart runners use the same shared lifecycle in normal and hydration modes.
Their complete filter groups are `shell` and `charts`.
They reuse the server-first hydration build helper introduced for tiles and grid.
Each keeps its own server module, query handling, template and adoption checks.
The render callback preserves the existing synthetic request origin.
It renders each request separately, including direct shell routes and hidden charts.
`BENCH_CHART_FALLBACK` remains a separate explicit scenario with the same setup.
The normal chart run does not imply fallback qualification.
Both suites retain their existing timing-message exemption and viewport timeout.
They do not add server-console capture or claim that coverage.

The platform runner keeps its application routes, mock authorization and case order.
The shared lifecycle supports its existing normal and hydration suffixes.
Its complete application group is `platform`. The existing `BENCH_CASE_PATTERN`
regular-expression filter still selects platform cases. An invalid expression or
nonempty zero-match filter now produces a failing report instead of a false pass.
The report lists selected and skipped case names separately from completed cases.
The SSR callback retains the platform request origin, query and adoption script.
Hydration still builds server first and renders each request without a new cache.
Accessibility inspection and modified-navigation instrumentation remain enabled.
Their cleanup is attempted without hiding the original failure.
First-failure screenshots and DOM snapshots are collected independently.
This migration changes no platform page, mock policy or application behavior.

The date runner and dedicated date and form hydration runners use the shared browser infrastructure.
Each runner remains one complete application group with its existing case order.
Their group names are `date-picker`, `date-picker-hydration`, and `form-contract-hydration`.
The normal date runner still resets its fixture before each case.
Its local-day and browser-timezone cases keep separate browser contexts.
Context cleanup preserves the original failure if cleanup also fails.

The dedicated date runner uses the shared server-first hydration build helper.
The form hydration runner retains its build loop because it audits server modules before it builds the client.
Both runners retain their existing server diagnostics, node adoption, native input, and disposal assertions.
The form runner still blocks client scripts until it examines server markup.
`BENCH_URL` replaces the owned preview server without skipping builds, server renders, or module audits.
Browser console warnings remain failures. Only the existing reactive `HOT_SCOPE_TIME` events remain advisory.

The shared hydration runner uses the common browser infrastructure and paired hydration builds.
Its complete application group is `shared-hydration`.
It keeps the existing server markup capture, module attachment, node adoption, and disposal checks in their original order.
The development mode still uses `.dist` and `.dist-server`, with development imports selected by the existing build configuration.
The package mode retains its separate artifact directories.
Server warning capture and strict browser console failures remain unchanged.
The native Tab checks remain required. The known `wfe-x6o` failure is not skipped or suppressed.
A failed check still stops later checks in that run, and the report records only completed assertions.
`BENCH_URL` replaces the owned preview server without skipping local builds or server rendering.
The runner saves and prints its JSON report, so output-file failures remain visible.

The Theme and virtualization runners retain Vite preview ownership. They share browser launch, group selection, reports, and cleanup. Theme rejects console warnings and errors. Virtualization retains its page-error-only policy and records console messages as observations.

### Static runner migration

The layout and normal form-contract runners use the pilot's static server,
launch, console diagnostics and final report cleanup. Each retains its module
provenance checks, viewport, fixture readiness, reactive diagnostic checks,
case names, case order, and case report shape. The form runner still restarts
its fixture before each case. Its hydration runner remains separate.

Each runner is one complete group named `layout` or `form-contract` for
`BENCH_APPLICATION_PATTERN`. The filter cannot skip prerequisites within that
workflow. An unmatched nonempty filter fails and produces a report. These
runners retain source, distribution and development asset selection and their
existing `BENCH_OUTPUT` destinations. Browser executable overrides and host
transport follow the shared launch contract. Console warnings and errors remain
failures; reactive `HOT_SCOPE_TIME` handling stays in each original suite.

Module-audit and startup failures now also reach the report. Browser closure,
diagnostic-listener removal and static-server closure are attempted separately.
Failures during closure or report output produce a nonzero result without
replacing the first operation failure. This migration does not change browser
assertions or add retries or longer timeouts.

The component runner uses the shared static server, browser launch, diagnostics, and report cleanup.
The `components` application group keeps the existing suite order and per-case fixture setup.
`BENCH_CASE_PATTERN` retains regular-expression case selection. Invalid expressions and expressions with no matching cases fail the run.
`BENCH_SCENARIOS=0` still disables interaction cases, and `BENCH_WORKLOAD=1` still enables the separate workload.
`BENCH_CONTINUE` retains case failures and continues through the remaining selected cases.
Heap capture, retained-object assertions, accessibility checks, and native keyboard checks remain required when their scenarios run.
The runner retains its existing advisory console timing messages.
Explicit CDP and listener cleanup preserves primary failures, including failures during heap stream cleanup or viewport restoration.
External preview URLs retain the existing module-audit exception because their modules are not the local build.

The component live runner and preview-isolation runner retain their Vite server ownership.
They use shared browser launch, diagnostics, and failure-preserving report cleanup.
Their application groups are `components-live` and `preview-isolation`.
The live runner retains its compound export checks, module reloads, CSS mutations and restoration, and child interaction run.
Each live run owns a separate Vite cache, so it preserves existing review servers.
The runner transforms the entry and waits for its static imports before browser navigation.
Its report records preparation time separately. The browser navigation deadline remains ten seconds.
The runner saves the first failure before resource cleanup and records whether cleanup finishes.
Closing each owned browser also releases its protocol sessions.
Its child clears the parent application-group filter because the child owns a different group.
The child retains the existing case filter and disabled workload settings.
The preview runner still starts four servers serially and reloads every earlier preview after each start.
Its cache-isolation, failed-response, and interaction checks remain unchanged.
Neither runner substitutes `BENCH_URL` for its owned Vite servers because those servers are the behavior under test.

## Table runner migration

Read-only, analytics, and editing use the shared browser launch, static-file server, failure capture, and report finalization helpers.
Their fixture setup, case bodies, viewport settings, and diagnostic policies remain suite-owned.
Analytics handles its mock API before delegating static requests to the shared server; the shared helper does not own query records or export behavior.
Editing retains its expected table-breadth and timing diagnostic classifications, CDP operations, heap files, attribution, screenshots, and opt-in workloads.
Heap listener and stream cleanup use the shared failure-preserving cleanup helper.

`BENCH_APPLICATION_PATTERN` selects the whole `table-read-only`, `analytics`, or `table-editing` group.
Read-only keeps all of its dependent setup and final message checks in that group.
Analytics retains literal substring matching for `BENCH_CASE`; its optional `BENCH_CASE_PATTERN` is a regular expression, and supplying both requires both to match.
Editing retains `BENCH_CASE_PATTERN`, `BENCH_SCENARIOS=0`, and `BENCH_CONTINUE` semantics.
A requested case filter that selects no cases fails; editing's explicit scenarios-disabled workload mode remains valid.
Case-selection reports list selected and skipped names without enabling any workload.

`BENCH_URL` leaves the external server under its caller's ownership and reports no local module audit. Without it, every existing public-module audit still runs before browser launch.
`BENCH_EXECUTABLE_PATH`, source/package/development suffixes, output paths, and existing workload controls remain available.
Server and browser failures, failed diagnostic captures, and cleanup failures are recorded without replacing the first failure.
Validate all three normal modes and compare complete ordered case inventories before accepting a migration. These runners do not add a hydration mode.

### Optional integration and diagnostic runners

The optional WAMN runner and the manual accessor-profile and editing-overhead
runners use the shared static server, browser launch, and report finalization.
Their fixture assertions, specialized console classifications, workload settings,
mode order, warmups, measurement callbacks, and heap checks remain suite-owned.
Setup failures now enter the report, and browser/server cleanup cannot replace
an earlier failure. These changes do not add the diagnostic runners to required
qualification or modify prepared external inputs.

The accessor and editing-overhead diagnostics retain their existing supported
source/package modes. They do not gain a development mode through this migration.
Small validation runs may check work counts and cleanup; they do not establish
performance results on a shared host. The WAMN generator already delegates to the
shared generator runner through its explicit root/application override.

## Example import ownership

The control integrity gate also runs `scripts/check-example-boundaries.mjs`.
Shared demonstrations live under `examples/shared`; normal example views do not import sibling application internals.
Exact diagnostic and integration harness edges remain listed with reasons in that script, and stale entries fail the gate.
See [shared example support](../examples/shared/README.md#example-boundaries) for the moved demonstrations and accepted harness boundaries.
The public import guard covers components, form, generator, and shell.

## Solid rc.18 toolchain

The 2026-10-23 upgrade uses `solid-js`, `@solidjs/web`, `@solidjs/signals`,
`@solidjs/compiler`, and `@solidjs/babel-plugin` at `2.0.0-rc.18`.
The Vite plugin stays at `3.0.0-next.50`. The workspace overrides pin its compiler and Babel plugin to rc.18.
The four workspace packages now declare the peer range `>=2.0.0-rc.18 <3.0.0`.
That range change made pnpm resolve one Solid runtime for the packages and the external primitives.
Before it, the packages kept a second rc.16 runtime, and server rendering lost its owner.
The npm registry identifies source commit `225014bf8757421a2ea0a9c6ddc148b965eed000`.
Solid now pins `seroval` and `seroval-plugins` to `1.7.0`. No other dependency changed.

The sync package epic requires rc.18 or later for its adapter.
The owner approved this upgrade in that epic before the normal 24-hour release age.
Exact rc.18 exclusions replace the rc.16 exclusions for these packages and their compiler binaries.
Automatic upgrades retain the age rule and the existing trust policy.
The existing interaction, scrolling, disposal, and native listener repairs remain in place.
This upgrade does not establish that upstream fixes replace those repairs.

The root check gate passed with the untracked sync plan excluded from the format stage.
The coverage inventory stage ran with that plan held outside `docs/` and restored afterwards.
A partial qualification run passed 103 stages, including every source and package browser stage.
In development mode, rc.18 reported two new diagnostics, and both are repaired.
The lazy icons gallery view now renders inside a `Loading` boundary.
`ControlFrame` now reads compound children inside JSX, which removes `STRICT_READ_UNTRACKED`.
Every `STRICT_READ_UNTRACKED` report in that run came from the one `ControlFrame` line.
After the repair, the read-only table stage passed in development mode. The other affected stages did not run again.
Two stages failed for causes outside rc.18: the known native-tab timeout `wfe-x6o` and a live-page navigation timeout.
The full qualification runs again at the next program milestone.

## Durable run artifacts

The migrated browser runners allocate a new directory under `test-results/runs` for every
invocation. Suite, source/package/development mode, hydration mode, time, and a
random suffix distinguish runs. A repeated run keeps the earlier directory.
The aggregate qualification command also allocates a new directory there and
passes fresh stage report destinations to its child processes.
`QUALIFICATION_OUTPUT` selects a parent directory, not a reusable run directory.
`--plan` prints the proposed stages without creating artifacts.

The sync example keeps its existing server and report writer.
This change does not migrate or qualify its report format.
The aggregate plan retains its sync stages without requiring canonical artifact metadata from that runner.

Each migrated run has a `manifest.json` and canonical `report.json`. The manifest records
the revision, a hash of the dirty diff and untracked source hashes, Node and
Playwright versions, actual launched browser/executable when applicable,
command, selected execution settings, declared limits, and final outcome.
Each manifest derives failure from its own operation errors and report, including
an explicit failure value, first failed stage, or unsuccessful stage status.
A process exit code remains caller-owned and does not mark unrelated nested or
concurrent run manifests as failed.

Unavailable revision metadata is recorded explicitly. Full environment variables
are not copied. Child processes own separate runs. Live review reports link to their child interaction reports and artifact manifests; asynchronous review helpers
inherit only their caller's run context.

Screenshots, DOM captures, and requested heap outputs belong to that same run.
Repeated attachment names receive a new suffix. Explicit `BENCH_OUTPUT`,
`BENCH_SCREENSHOT`, and heap destinations keep their caller-selected paths as
additional outputs, but must not already exist. A collision fails without
changing the existing file. The canonical report and failure manifest remain in
the new run directory. Choose a fresh explicit destination for a repeated run.
No helper deletes a previous run or cleans a user-selected directory.

GitHub Actions uploads `test-results/runs` even after a failed qualification.
This upload is the configured CI retention step; remote expiry follows the
artifact service's configured policy. Local files remain until an explicitly
authorized cleanup. This change adds no pruning command or automatic deletion.
The implementation does not move, recreate, or certify historical evidence.
Old `/tmp` and `test-results` references retain their recorded meaning; a missing
local artifact is not a passing result or proof that its contents survive elsewhere.

A read-only preparation review checked the literal paths cited by this guide,
`action-disposal-investigation.md`, and `native-tab-investigation.md` on
October 23, 2026: 30 resolved paths were present locally; one brace-pattern reference
was not expanded, and four command/descriptive references were not file checks.
`--import=` arguments were resolved as paths, and historical `table/` paths were
resolved against the adjacent repository. This was an existence check, not content
or hash verification. No cited artifact was copied, deleted, or recreated.

## Vendor integrity checks

The vendor integrity gate compares every file in all six captured subsets with
its manifest and explicit root support files, regardless of extension. It rejects
symlinks, missing files, unrecorded files, mismatched local hashes, and imports
outside each subset's allowed ownership boundary. Existing specialized guards
still check their original license, repair, and generation contracts.
Dependency patch evidence separately records verified original npm archives and
exact installed repairs. The offline gate checks patch inventory, declarations,
lockfile integrity, repaired installed targets and unchanged license bytes.

Vendor guards share byte hashing, exact regular-file walking, literal import
collection and relative resolution. Each caller supplies its own extensions and
ownership boundary. Chart reachability and repair categories, Kobalte's declared
external dependencies and owned helper imports, license equality, virtual map
parity and icon generation remain separate checks.

All six manifest formats remain unchanged: Kobalte records source archives and
local repairs; virtual-core retains original/local maps and npm integrity; Corvu
records extracted source paths; matching includes the remove-accents origin;
charts records per-file repairs and entrypoints; icons records artwork and the
generator/output hashes. The reporting adapter provides a common view without
rewriting that evidence. The icon generator keeps its existing local hash function
so this maintenance refactor does not alter its recorded generator bytes.

## v0.0.9 release

The release combines the UI feature branch with main, including the existing sync work and package build changes.
Every stage of `pnpm check` passed across the initial run and focused reruns.
The run passed 1,391 unit tests across 143 files, package and example types, integrity checks, builds, strict consumers, and server rendering.
The first run found a syntax error in the color picker documentation example. After its correction, all 35 documentation examples passed.
The Node suite then found an old output path in the license delivery helper. After its correction, all 160 Node tests passed.
The external Solid consumer resolved 13 public imports and inspected 487 built modules, including the new runtime entries.
Ten focused browser cases passed against the merged package build, with no page errors or reactivity diagnostics.
Those cases covered Gantt hierarchy and editing, command search, and the color picker in all three themes.
Sync engine source matches main commit `0b50ddd` at integration.
Focused ColorPicker checks pass in Sketchy, Vanilla, and Laser, with five unit tests and real browser keyboard interaction.
Vanilla styling received a source audit and browser review across the gallery, with focused calendar, pagination, datetime, and subtable interaction checks.

No full qualification run or performance benchmark accompanies this release.
The shared machine has high and variable load. Earlier performance results do not establish current timing guarantees.
Incremental Gantt acceptance work remains tracked in `wfe-5y6`.

## Solid RC21 upgrade

Beads `wfe-w2y.52` tracks the coordinated upgrade from RC18 to RC21.
Solid, Web, Signals, the compiler, the Babel plugin, and the compiler binaries use `2.0.0-rc.21`.
The Vite plugin uses `3.0.0-next.56`, and the testing library uses `1.0.0-rc.2`.
The five workspace packages declare `>=2.0.0-rc.21 <3.0.0` for their Solid peers.
This aligns consumers with the tested runtime and avoids the duplicate runtime problem from the RC18 upgrade.

The official registry manifests identify source commit `2105ffb8ca2fced55f5fac0763177fc93f97c2c2` for the RC21 family.
Exact release-age exclusions cover this authorized upgrade and its compiler binaries.
The general 24-hour release-age rule and trust policy remain active.
TypeScript 6.0.3, Vitest 4.1.11, Vite 8.3.0, Node requirements, and pnpm 12.4.1 remain unchanged.

The interaction, scroll, disposal, popup, and native listener repairs remain in place.
The dependency tree resolves one RC21 version for each runtime and compiler package.
The lockfile replaces only the Solid family and the two companion packages.
Registry manifests, installation logs, the baseline lockfile, and the dependency review reside under `test-results/solid-rc21/setup`.

The browser run found obsolete `dist/source` paths in two fixture guards.
The guards now recognize the existing `dist` output and retain their ownership assertions.
The virtual engine guard also requires at least one matching module.
A gallery assertion also omitted the two existing Laser theme boundaries.
Its expected count now includes all seven review boundaries and the gallery frame.

A compiler-free comparison reproduced the sync example confirmation delay on both RC18 and RC21.
The fake server completed its first follow pass before acknowledging the write.
Both runtimes retained the expected row until a later explicit follow pass.
The example now queues a pull after acknowledgment observers run, with disposal cleanup.
The generic sync contract, ten-second polling default, and browser assertion timeouts remain unchanged.
The comparison and its initial setup failure remain under `test-results/solid-rc21/sync-confirmation-fixture`.

The development sync run also detected `HUGE_FAN_IN` in `recordWrite.rows`.
Its nested projections subscribed separately to every authoritative row.
The adapter now composes pending writes over the plain array from its existing subscription.
One keyed output projection preserves row identity and updates.
A 2,100-row regression failed with 2,102 tracked sources before the repair and passed afterward.
The focused sync suites passed 74 tests without changing diagnostic filtering.

The complete canonical inventory contains 143 stages.
The serial campaign retains its first failures and uses focused continuations for cases that those failures prevented.
The repaired sync package passes all 18 browser cases in each delivery mode, with no rejected development diagnostics.
The corrected containment case passes in source, distribution, and development modes.
Desktop and phone captures show the default and Vanilla fields previews without browser errors.

Matched cleanup comparisons cover 24 disposal cases and 12 event cases across RC18 and RC21, with 72 actual heaps.
RC21 releases all tagged records in both standalone reproductions, while RC18 retains records in the historical failing cases.
The existing repairs remain until actual component fixtures qualify their retirement under `wfe-0dj.4` and `wfe-0dj.5`.

The native-tab timeout remains under `wfe-x6o`, and the initial live-preview load timeout remains under `wfe-4k8`.
The primary live run passes refresh and imported-CSS assertions before its interaction child hits a native-tab failure.
Its focused follow-up stops at initial navigation, before interaction assertions.
The isolated platform source rerun passes after its retained initial click timeout.
Host load varies throughout the serial campaign, so timings do not establish performance changes or timeout causes.
These results do not establish a clean full qualification pass.

The monolithic final gate stops with `SIGTERM` during the unit stage, after its first eight stages pass.
Its cause remains unproven, and the continuation runs the remaining stages serially.
The first complete unit continuation passes 1,419 cases and times out one unchanged datetime-label case at its five-second limit.
The test now scopes group and button searches to the labeled field, with the same accessibility assertions and timeout.
All six message tests pass in the focused follow-up.

The final required stages pass after the serial continuation and scoped test revalidation.
The full unit confirmation passes 1,420 tests across 143 files.
Server rendering, 35 UI contract examples, generator contracts, and 160 Node tests also pass.
Local runs use Node 24.19.0, pnpm 12.4.1, and Playwright 1.63.0 with Chromium 153.0.8010.12.
The other declared Node boundaries did not run in this campaign.
`test-results/solid-rc21/verification.json` records final input hashes, stage summaries, report hashes, and remaining limits.
The existing tagged releases and their historical evidence remain unchanged.

To undo this upgrade before a commit, restore only its changed files from the recorded baseline revision.
Preserve unrelated edits and all test evidence.
Then run `pnpm install --frozen-lockfile` from the repository root.
Rebuild the workspace before reviewing the restored previews.

## v0.0.10 release

The implementation is recorded through commit `a643231fb67e1dd3003171a57a61b68fbabf6139`.
The release commit adds the README and adoption references and this verification record.
The eight implementation commits preserve the tested working-tree contents.
They include the Solid RC21 upgrade, chart extensions, new controls, diagrams and Tree, layout repairs, and the codebase and theme audit fixes.

The required `pnpm check` run passed 1,586 unit tests across 155 files, 165 Node tests, SSR, and 35 UI documentation contracts.
Formatting, lint, integrity, package and example types, builds, and consumer checks also passed.
Two final CSS-only guards then preserved compound error cues and glyph-only action backgrounds.
After those guards, formatting, lint, builds, and 86 gallery cases each against source and built packages passed with no browser warnings or errors.
Earlier audit-repair validation also passed 26 serial affected-example build, browser, and hydration stages in source and package modes.

Visual review used fresh static builds, 60 representative gallery captures across three presets and light/dark modes, and targeted field, error, glyph, and role-override captures.
These captures do not certify every component, state, and viewport combination.
The broader source review and its three fixes are tracked in `wfe-w2y.60.45`.
The standalone disabled-clock comparison remains open as `wfe-w2y.60.46`.
Live gallery module-fetch instability remains tracked in `wfe-w2y.61`; it interrupted preliminary captures, so final visual review used static builds.

Local evidence is recorded in `test-results/theme-cohesion/verification.json`, `test-results/codebase-repairs/verification.json`, and `test-results/commit-completed/commits.json`.
These ignored local files are not distributed release artifacts.
No fresh full qualification campaign or performance benchmark accompanies this tag.
The tag does not publish npm packages or assert that earlier qualification limitations are resolved.
