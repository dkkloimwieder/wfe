# Accessor profiling

This manual benchmark compares record access modes across configurable record counts.
Timing results depend on host load and do not establish a performance guarantee.

Run commands from the repository root after installing dependencies.
Build the browser fixture:

```sh
pnpm exec vite build --config examples/accessor-profile/vite.config.ts
node examples/accessor-profile/run.mjs
```

For an interactive preview, start Vite with the same configuration and an unused port.
For built-package coverage, run `pnpm build` first and set `BENCH_DISTRIBUTION=1` for both fixture commands.
Run browser and profiling work serially on a shared host.
See [the example guide](../README.md) for shared browser setup and report configuration.

`BENCH_SIZES`, `BENCH_ITERATIONS`, `BENCH_REPEATS`, and `BENCH_WARMUPS` control the workload.
`BENCH_OUTPUT` selects the JSON report path.
This benchmark is separate from the required qualification suite.
