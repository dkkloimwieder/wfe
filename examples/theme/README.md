# Default theme consumer

The fixture uses the public Theme component around controls, nested layout, and a table.
Applications own mode and appearance choices.

Run commands from the repository root after installing dependencies.
Run the browser fixture:

```sh
node examples/theme/run.mjs
```

The runner builds its own fixture with `examples/theme/vite.config.ts`.
For an interactive preview, start Vite with that configuration and an unused port.
For built-package coverage, run `pnpm build` first and set `BENCH_DISTRIBUTION=1` for the runner.
Run browser and profiling work serially on a shared host.
See [the example guide](../README.md) for shared browser setup and report configuration.

The standalone theme runner is required source-consumer coverage in the qualification gate.
The shared hydration fixture runs the same theme interaction cases against source, built-package, and development inputs.
