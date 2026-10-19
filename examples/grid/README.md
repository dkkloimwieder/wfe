# Boolean grid example

The example renders 30 rows and five columns through public GridView imports.
Each cell uses the shared controlled Checkbox.
The application owns accepted values and receives one `{ row, column, value }` request for each change.
Verified is a read-only column. Record 30 is a disabled row.
The example keeps changes in memory and sends no server request.

The layout uses shared blue accents, outline controls, surface 1 components, surface 2 background, and shadow depth 2.
The grid fills its main region and scrolls inside its border on narrow screens.
The footer reports the latest requested value and the number of accepted changes.

## Preview

From the repository root, install dependencies with `pnpm install --frozen-lockfile`.
Start the preview on an unused port:

```sh
pnpm exec vite --config examples/grid/vite.config.ts --host 127.0.0.1 --port 7795 --strictPort
```

Open `http://127.0.0.1:7795/`.
Use Tab to focus a checkbox. Press Space to request a change.
The shared checkbox also accepts pointer activation.
Read-only columns retain focus and prevent changes. Disabled rows prevent interaction.

## Qualification

Build the packages with `pnpm build` before testing built exports.
Build and test the source example:

```sh
pnpm exec vite build --config examples/grid/vite.config.ts
node examples/grid/run.mjs
node examples/grid/run.mjs --hydration
```

Set `BENCH_DISTRIBUTION=1` for every command to test built exports.
Set `BENCH_DEVELOPMENT=1` and `NODE_ENV=development` for every command to test the development runtime.
The hydration runner builds server and client inputs serially.
The root qualification runner includes all three modes.

Browser cases cover 150 cells, initial focus, keyboard and pointer requests, controlled rejection, retained input nodes, reordered labels, narrow scrolling, and disposal.
The hydration case retains all 150 server inputs.
Only addresses with `qualification=1` expose the browser fixture API.
The API supplies rejected requests and metadata updates without adding test controls to the normal preview.
Reports remain under `test-results/grid` unless `BENCH_OUTPUT` supplies another path.
