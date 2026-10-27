# Date picker

The fixture exercises date selection, calendar navigation, and date field interaction.
Datetime cases use one combined input and a calendar and time popup with an Apply action.
They cover timezone conversion, daylight-saving changes, retained precision, rejected requests, and native form state.
The application supplies accepted values and date constraints.

Run commands from the repository root after installing dependencies.
Build the browser fixture:

```sh
pnpm exec vite build --config examples/date-picker/vite.config.ts
node examples/date-picker/run.mjs
```

For an interactive preview, start Vite with the same configuration and an unused port.
For built-package coverage, run `pnpm build` first and set `BENCH_DISTRIBUTION=1` for both fixture commands.
Run browser and profiling work serially on a shared host.
See [the example guide](../README.md) for shared browser setup and report configuration.

Run `node examples/date-picker/run-hydration.mjs` for the server/client hydration fixture.
That runner builds its server and client bundles.
