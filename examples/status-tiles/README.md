# Status tile example

The example renders six read-only tiles through public component imports.
It shows all three states, number/date/boolean formats, missing detail, and long labels, values, and detail.
The application supplies raw values and states. No threshold or request logic belongs to the components.
TileRow uses the existing responsive grid.

The page uses shared blue accents, outline defaults, surface 1 components, surface 2 background, and shadow depth 2.
On narrow screens, the tiles form one column inside the scrolling main region.
Labels and detail retain their full text when the visual line ends in an ellipsis.

## Preview

From the repository root, install dependencies with `pnpm install --frozen-lockfile`.
Start the preview on an unused port:

```sh
pnpm exec vite --config examples/status-tiles/vite.config.ts --host 127.0.0.1 --port 7796 --strictPort
```

Open `http://127.0.0.1:7796/`.

## Qualification

Build the packages with `pnpm build` before testing built exports.
Build and test the source example:

```sh
pnpm exec vite build --config examples/status-tiles/vite.config.ts
node examples/status-tiles/run.mjs
node examples/status-tiles/run.mjs --hydration
```

Set `BENCH_DISTRIBUTION=1` for every command to test built exports.
Set `BENCH_DEVELOPMENT=1` and `NODE_ENV=development` for every command to test the development runtime.
The hydration runner builds server and client inputs serially.
The root qualification runner includes all three modes.

The cases cover accessible state text, shared formats, retained nodes, raw values, shared surfaces, shadows, narrow wrapping, forced colors, and disposal.
Hydration retains every server tile and the initial heading focus.
Only addresses with `qualification=1` expose the browser fixture API.
The normal preview contains no test controls.
Reports remain under `test-results/status-tiles` unless `BENCH_OUTPUT` supplies another path.
