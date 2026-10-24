# Sync store example

The example fills one `@wfe/sync` collection from a fake feed and reads it through both adapters.
Synthetic rows carry a UUIDv7 id, `row_version` 1, a name, a quantity, a status, and a time.
The buttons choose 10,000 or 100,000 rows. The apply button sends 100 random changes through `applyChanges`.
Each batch holds 70 updates, 20 inserts, and 10 deletes, so the row count grows by 10.
`liveRows` fills a plain table. `liveList` fills a list limited to the first 200 rows.
The page shows `syncStatus` above both shapes. It has no timing instrumentation.

## Preview

From the repository root, install dependencies with `pnpm install --frozen-lockfile`.
Start the preview on an unused port:

```sh
pnpm exec vite --config examples/sync/vite.config.ts --host 127.0.0.1 --port 7798 --strictPort
```

Open `http://127.0.0.1:7798/`.

## Qualification

Build the packages with `pnpm build` before testing built exports.
Build and test the source example:

```sh
pnpm exec vite build --config examples/sync/vite.config.ts
node examples/sync/run.mjs
```

Set `BENCH_DISTRIBUTION=1` for every command to test built exports.
Set `BENCH_DEVELOPMENT=1` and `NODE_ENV=development` for every command to test the development runtime.
The browser cases cover the ready status, both row counts, one change batch at each size, and disposal.
Reports remain under `test-results/sync` unless `BENCH_OUTPUT` supplies another path.
