# Qualification

Run these commands from the wfe repository root.
Use Node 22.12 or newer and pnpm 12.4.1.
Install dependencies and Chromium before the suite:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:qualification
```

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
Status tile cases cover controlled values and states, raw formats, full text, shared themes, shadows, narrow wrapping, and forced colors.
Tile hydration retains server nodes and initial heading focus.
The bundle guard rejects modules outside the wfe checkout.

The runner executes stages serially and stops at the first failure.
Logs, browser reports, and the stage summary remain under `test-results/qualification`.
Set `QUALIFICATION_OUTPUT` to preserve a separate run.
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
