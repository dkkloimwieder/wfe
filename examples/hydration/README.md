# Shared hydration fixture

This fixture renders shared components on the server and hydrates them in the browser.
Its runner covers retained nodes, initial focus, controlled interactions, and cleanup.
Application data and callbacks remain in the fixture.
The Gantt case retains server-rendered bars, adopts controlled selection and keyboard edits, and removes an active gesture when the schedule unmounts.

From the repository root, install dependencies and Chromium as described in [the example guide](../README.md).
Run the fixture:

```sh
node examples/hydration/run.mjs
```

The runner builds its server and client bundles.
For built-package coverage, run `pnpm build` first and set `BENCH_DISTRIBUTION=1`.
Set `BENCH_DEVELOPMENT=1` for the development runtime.
Run these modes serially.
A fixture description is not a claim that every case currently passes.
See [the qualification record](../../docs/qualification.md) and [native tab investigation](../../docs/native-tab-investigation.md) for evidence limits.
