# Sync store example

The example fills one `@wfe/sync` collection from a fake server and reads it through both adapters.
The fake server holds the rows, a change log, and a trigger. The collection follows the log through the trigger.
Synthetic rows carry a UUIDv7 id, `row_version` 1, a name, a quantity, a status, and a time.
The buttons choose 10,000 or 100,000 rows. The apply button sends 100 random changes through `applyChanges`.
The server button appends 100 random changes to the log and fires the trigger. A follow pass then reads them in pages of 50.
Each batch holds 70 updates, 20 inserts, and 10 deletes, so the row count grows by 10.
`liveRows` fills a plain table, and `liveList` fills a list. Each shape renders the first 200 rows.
The page shows `syncStatus` and the current-as-of time above both shapes. It has no timing instrumentation.

The recordWrite panel writes through an outbox in the IndexedDB database `wfe-sync-gallery:<size>`.
Add row records a create with a new UUIDv7 id. The page computes the request hash as SHA-256 of the request JSON.
The fake server applies each request hash once, appends the row to the log, and fires the trigger, so the follow pass brings the row back.
The Offline button makes the probe false and every send retriable. A second click goes online and asks for a replay.
Refuse next send makes the server refuse one send. The refused entry shows under Not uploaded, with Resubmit and Discard.
The status line shows the pending and refused counts and the last send time from `outboxStatus`.
A written row shows "recorded, not uploaded" while its entry is pending.

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
The browser cases cover the ready status, both row counts, one server change batch, one direct change batch at each size, an online write, an offline write and the reconnect, a refusal with resubmit and discard, and disposal.
Reports remain under `test-results/sync` unless `BENCH_OUTPUT` supplies another path.
