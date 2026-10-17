# Table development diagnostics

A memo caches a calculation and tracks its inputs.
Solid names an unnamed memo `computed` in development diagnostics.
The original native engine and the extracted engine omitted explicit names at the same scan points.
Their tracing and minification configuration also match.
The historical unnamed warnings therefore do not show a migration regression.

The engine now supplies stable names for five existing calculations.
Filtering uses `createNativeFiltering.filteredIds`.
Sorting uses `createNativeTable.sortedIds`.
Group membership and ordering use `createNativeGrouping.tree` and `createNativeGrouping.roots`.
Aggregate cells use `createGroupView.value`.
These names identify existing scans while preserving their callbacks, lazy evaluation, and equality rules.

The editing and optional WAMN runners share one exact policy in `examples/shared/table-diagnostics.mjs`.
They record `HUGE_FAN_IN` and `WIDE_SCOPE_DEPS` only when the diagnostic names one of those five calculations.
The console parser recognizes the historical `memo` wording and current `Computation` wording.
Unknown names, including `computed`, remain failures.
The runners also reject unrelated warning codes and malformed console messages.
The policy tests exercise these rejection cases.

The runners record `HOT_SCOPE_TIME` separately because host load affects elapsed time.
Timing results remain advisory on this shared machine.
Accessor counts, retained views, gesture listeners, and cleanup remain required assertions.
Qualification uses one bounded editing workload and one bounded WAMN workload, without heap snapshots.
The default editing sizes remain unchanged.

Historical evidence remains in `test-results/date-filter/final/table-editing-development.json`.
Its unnamed dependency warnings motivated Bead `wfe-0dj.6`.
The shared-renderer campaign also preserves the earlier WAMN warnings in `test-results/wamn-virtual-rows/dev.json`.
New evidence belongs in `test-results/named-diagnostics`.
Those generated reports remain local qualification artifacts.

The first named WAMN run identifies filtering with 2,004 inputs and sorting with 2,009 inputs at 1,000 rows.
Its accessor, mounted row, disposed row, cell, and peak owner counts match the earlier run exactly.
The source and package suites also retain the existing editing assertions for stable views and listener cleanup.

The named editing workload uses 999 rows and passes all 149 interaction cases.
Its warning counts match the historical report: filtering tracks 2,003 inputs, grouping tracks 3,005, and aggregate cells track 2,000.
Unknown diagnostics remain absent, and resize and reorder tests retain no gesture listeners.

From the repository root, use the Chromium installation described in the [example instructions](../examples/README.md#browser-cases).
Build and test the editing fixture in development mode:

```sh
BENCH_DEVELOPMENT=1 NODE_ENV=development pnpm exec vite build --config examples/table-editing/vite.config.ts
BENCH_DEVELOPMENT=1 NODE_ENV=development BENCH_WORKLOADS=1 BENCH_SIZES=999 node examples/table-editing/run.mjs
```

If the prepared WAMN inputs exist, compare their hashes before testing that fixture:

```sh
node examples/wamn/check-inputs.mjs
BENCH_DEVELOPMENT=1 NODE_ENV=development pnpm exec vite build --config examples/wamn/vite.config.ts
BENCH_DEVELOPMENT=1 NODE_ENV=development BENCH_WORKLOADS=1 BENCH_SIZES=1000 node examples/wamn/run.mjs
```

Run these workloads serially.
Set `BENCH_OUTPUT` to a different report path for each run.
