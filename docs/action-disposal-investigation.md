# Action disposal investigation

Beads `wfe-0dj.4` tracks removal of the Solid disposal workaround.
The workaround calls the root disposer inside a generator-based `action()`, then calls `flush()` outside that action.
It uses public Solid APIs. It does not change the runtime or write application records.

Normal example root shutdowns share `examples/shared/fixtureDisposal.ts`.
The helper preserves the generator action; each caller retains its existing outside-action flush and reference cleanup order.
See [shared example support](../examples/shared/README.md#fixture-disposal) for consumers and deliberate diagnostic exceptions.
This extraction does not retire the workaround or change the independent runtime-only reproduction.

## Current result

The matched rc.13, rc.16, and rc.18 comparisons retain all 1,000 records after plain disposal in both `onSettled` cases.
The action wrapper releases all tagged records in those cases.
Direct `onCleanup` releases the records with either disposal method.
Setup and cleanup callbacks each run once.

The rc.16 and rc.18 strong retaining paths include `pendingNodes`, a queued callback, its closure, and the records array.
This reproduces retention without WFE components, JSX, stores, tables, or virtualization.
The root initialization fix does not remove this separate retention path.
Keep the existing action wrapper. No runtime dependency or component behavior changes follow from this investigation.

## Recorded comparison

On October 21, 2026, both runtimes completed all six cases twice with 1,000 records per case.
The runs used Playwright 1.63.0 and Chromium 153.0.8010.12 with the same local HTTP preload.
The 24 cases produced 48 actual heap snapshots. Both runs completed without browser, assertion, or cleanup errors.
Every plain `onSettled` case retained 1,000 records. Every action-disposal and direct-cleanup case retained zero tagged records.

The reports are `/tmp/wfe-disposal-rc13-final/summary.json` and `/tmp/wfe-disposal-rc16-final/summary.json`.
Compressed heaps and inspector summaries sit beside each report.
Each report includes the exact fixture, runner, inspector, and bundle hashes, plus the loaded module inventory.
The earlier probe reports remain under `/tmp/wfe-disposal-rc16-first` and `/tmp/wfe-disposal-rc13-matched` and `/tmp/wfe-disposal-rc16-matched`.
They remain separate from the final comparison.

The retirement issue remains open for a future runtime candidate. The current workaround remains required by this reproduction.

## October 25 RC18 recheck

The installed `solid-js@2.0.0-rc.18` and `@solidjs/signals@2.0.0-rc.18`
were compared with the untouched preserved RC16 bundle. Both used Playwright
1.63.0 and matching Chromium 153.0.8010.12, without an HTTP preload. Each run
covered all six arms twice at 1,000 records: 24 cases and 48 actual heaps across
the comparison. Both completed with no browser, assertion, or cleanup errors.
The loaded count was 1,000 in every case. Plain disposal retained 1,000 records
in both `onSettled` arms. Action disposal and direct `onCleanup` retained zero.
The RC18 strong sample path still passes through `pendingNodes` and callback
closures to the records array. The workaround remains unchanged and required.

Reports and their compressed heaps are under
`/tmp/wfe-disposal-rc18-20261025/summary.json` and
`/tmp/wfe-disposal-rc16-20261025/summary.json`.
The runner, fixture, and inspector are unchanged from the October 21 comparison.
Their SHA-256 values are, respectively,
`6f5c2462952b2773081af134cee83aa448dc9cabb20f36ca6c3cf62b6735a523`,
`3f100658f290bdbaa3680e5261acc1555f84fa8f147c00c2c12066e6aeced91d`, and
`e9304f44a98a1884dd4a3ffb0955adda8bc6fceb4a828f1ba5d146918663bc13`.
The captured RC18 JavaScript bundle has SHA-256
`02140072c0916053ffbea16e5dd00667eb7f106b230693e3cc57804353f14476`.
The preserved RC16 bundle remains
`2202684d3df7aadc826cc2e641787b7d041c5155ead7616be5f2c5217de6ca7c`.
No runtime upgrade or workaround removal follows from this recheck.

## Reproduction

The owned fixture is `bench/action-disposal/main.js`.
It preserves the original runtime-only cases and disposal sequence, with formatting and lint annotations added.
The original source remains at `table/test-results/solid-pending-node-retention-repro/fixture/main.js` in the historical repository.
Its SHA-256 is `1dadc9f23e798d348e78530c3f0a4c4a7f24acfb9dc7cbd045497ad64aaceb12`.
The preserved rc.13 JavaScript bundle has SHA-256 `e3974fbfe5f08e91e678456c60604c8c489407b0a53b36069e7f65b806381952`.

Install the Chromium build paired with the repository Playwright version before running the diagnostic.
From the WFE root, run:

```sh
DISPOSAL_OUTPUT=/tmp/action-disposal-current \
  node scripts/reproduce-action-disposal.mjs
```

The output directory must not exist. This prevents replacement of earlier evidence.
The script builds the fixture against the installed runtime without changing dependencies.
It runs six cases twice, with a fresh browser context for each case.
Set `DISPOSAL_SIZE` or `DISPOSAL_REPETITIONS` to change the record count or repetition count.
Both values must be positive integers.

For a preserved bundle, use the same browser and environment:

```sh
DISPOSAL_OUTPUT=/tmp/action-disposal-baseline \
DISPOSAL_DIST=/path/to/preserved/dist \
DISPOSAL_SOURCE=/path/to/preserved/fixture/main.js \
DISPOSAL_LABEL=rc13 \
  node scripts/reproduce-action-disposal.mjs
```

The preserved directory must contain `index.html`, its assets, and `modules.json` from the original build.
`DISPOSAL_SOURCE` identifies the matching historical fixture for its source hash.
The label describes the run. Bundle hashes and the module inventory identify the actual runtime input.
The script records the browser version, executable path, Playwright version, inspector hash, runner hash, and host load.
Set `PLAYWRIGHT_BROWSERS_PATH` for a custom browser cache.
Keep any local HTTP preload identical across compared runs.
The report records whether an import preload exists, without copying environment values.

Each case captures actual loaded and disposed heaps.
Before each capture, it performs two rounds of flush, two animation frames, and garbage collection.
The runner requires the loaded record count to match the requested size.
It also requires one setup, one cleanup, and zero retained records for action disposal and the direct-cleanup controls.
Plain `onSettled` disposal is an observation, not an assertion that the old leak must persist.
The requested record group bypasses the inspector's top-80 display limit.
Retained samples must have a path from the heap root through strong edges.
A sample path describes that object, not the retained size or reachability of every instance.

A completed run reports `workaround-required` when plain disposal retains records.
A completed run with no retained records reports `candidate-for-fixture-qualification`.
That result does not authorize workaround removal by itself.
Actual application fixtures must also release records and reactive resources across source, built, development, and hydration runs.
The heap inspector's historical runtime-shape categories do not independently qualify rc.16 graph cleanup.

Errors, failed controls, and cleanup failures produce an `incomplete` report and a nonzero exit status.
The report and compressed heap files remain available after failure.
The runner does not retry failed cases or weaken the control assertions.
