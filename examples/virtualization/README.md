# Virtual table

The fixture exercises the shared virtual renderer with application-owned records.
Its browser runner covers scrolling, bounded rendered rows, editing, saving, and appended records.

Run commands from the repository root after installing dependencies.
Build the browser fixture:

```sh
pnpm exec vite build --config examples/virtualization/vite.config.ts
node examples/virtualization/run.mjs
```

For an interactive preview, start Vite with the same configuration and an unused port.
For built-package coverage, run `pnpm build` first and set `BENCH_DISTRIBUTION=1` for both fixture commands.
Run browser and profiling work serially on a shared host.
See [the example guide](../README.md) for shared browser setup and report configuration.
