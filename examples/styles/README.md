# Shared styles

The fixture exercises shared controls through public package exports.
Its browser runner covers interaction and CSS provenance. Appearance review remains separate.

Run commands from the repository root after installing dependencies.
Build the browser fixture:

```sh
pnpm exec vite build --config examples/styles/vite.config.ts
node examples/styles/run.mjs
```

For an interactive preview, start Vite with the same configuration and an unused port.
For built-package coverage, run `pnpm build` first and set `BENCH_DISTRIBUTION=1` for both fixture commands.
Run browser and profiling work serially on a shared host.
See [the example guide](../README.md) for shared browser setup and report configuration.
