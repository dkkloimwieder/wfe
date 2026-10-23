# Dashboard composition

The fixture composes the shared table workspace with application-owned records and actions.
Use `?composition=1` to inspect the navigation and record-form composition.

Run commands from the repository root after installing dependencies.
Build the browser fixture:

```sh
pnpm exec vite build --config examples/dashboard/vite.config.ts
node examples/dashboard/run.mjs
```

For an interactive preview, start Vite with the same configuration and an unused port.
For built-package coverage, run `pnpm build` first and set `BENCH_DISTRIBUTION=1` for both fixture commands.
Run browser and profiling work serially on a shared host.
See [the example guide](../README.md) for shared browser setup and report configuration.
