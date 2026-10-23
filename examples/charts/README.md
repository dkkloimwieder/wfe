# Chart example

This gallery uses the public chart and generator exports.
It shows line, area, bar, scatter, and generated bar charts.
The application owns records, series visibility, loading state, and all callbacks.
The area plot demonstrates a UTC time series.
The default tooltip contains data. Toggle the custom tooltip to test persistent controls and explicit dismissal.
Appearance controls reuse the shared review components.
The initial appearance uses Blue, Surface 1 components, Surface 2 background, outline buttons, and shadow depth 2.

From the wfe root, start the preview on an unused port:

```sh
pnpm exec vite --config examples/charts/vite.config.ts --host 127.0.0.1 --port 7793 --strictPort
```

Open `http://127.0.0.1:7793/`.
Read the [chart guide](../../docs/charts.md) for API boundaries and maintenance.

## Browser tests

Use Node 22.22.2 or newer in the 22.x line, or 24.15.0 or newer in the 24.x line.
Node 26 and newer are also supported.
Use pnpm 12.4.1.
Install dependencies and Chromium before the browser suite.
Run package builds before testing built exports.
Run heavy commands serially.

```sh
pnpm build
pnpm exec playwright install chromium
pnpm exec vite build --config examples/charts/vite.config.ts
node examples/charts/run.mjs
node examples/charts/run.mjs --hydration
```

For built exports, set `BENCH_DISTRIBUTION=1` for the Vite build and both browser commands.
For development code, set `BENCH_DEVELOPMENT=1` and `NODE_ENV=development` for those commands.
The hydration runner builds the server and client inputs before each run.
Set `BENCH_CHART_FALLBACK=1` to exercise tooltips without native popovers.
Set `BENCH_OUTPUT` to retain a report at another path.
The runner rejects browser errors and warnings. Host timing notices remain advisory.

The standard qualification runner includes this matrix.
`node scripts/check-chart-imports.mjs` tests source and built import boundaries.
`pnpm test:contracts` also tests the chart declarations and documented examples.
