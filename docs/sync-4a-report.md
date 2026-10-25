# Epic 4a close report: @wfe/sync shell, worker, and the 3a and wamn findings

Epic wfe-w2y.36 is complete. Main is fast-forwarded to the commit that adds this report. The last `pnpm check` passed with 120 test files and 1080 tests. The sync gallery passes 15 cases in source, distribution and development modes. The read-only table gallery, the other gallery of `ReadOnlyTable`, passes in the source and development modes. In the distribution mode, one selection case fails about one run in three, with and without the `renderBody` change. Beads bug wfe-w2y.37 records it.

## Commits

1. 0b156a1: the 3a close report, as it was, in `docs/sync-3a-report.md`.
2. 613944b: a refused write rejects with `OutboxRefused`.
3. 79ecee8: `options.version` reads the row version (wamn finding 7e86p).
4. 473fc1a: `liveRows`, `liveList` and `syncStatus` read any keyed collection (wamn finding b4icu).
5. 1629b7b: the `renderBody` slot of `ReadOnlyTable` (wamn finding 5dcm4). This is the only commit in `@wfe/components`.
6. 68be85d: `shell()`, with its unit tests.
7. 1f0c6d1: the precache worker and the manifest recipe.
8. a38b5ab: the gallery registers the worker, with three browser cases.
9. 5faf05e: the shell result, the IndexedDB Persistence and the offline reload in the gallery.

## Public surface as exported

`@wfe/sync` types: `Row`, `Change`, `Feed`, `Persistence`, `Trigger`, `OperationCall`, `Reply`, `Send`, `OutboxEntry`, `OutboxCounts`, `Outbox`, `KeyedCollection`, `ShellResult`.

`@wfe/sync` values: `CursorExpired`, `OutboxDiscarded`, `OutboxRefused`, `collection`, `outbox`, `liveRows`, `liveList`, `syncStatus`, `outboxStatus`, `recordWrite`, `shell`.

`@wfe/sync/worker` values: `precache`, `skipWaitingMessage`. This subpath is new.

`@wfe/sync/internal` exports `applyChanges`, as before.

- `Row` is `{ id: string; row_version?: number }`. `Change` keeps `row_version` on the change.
- `collection(feed, scope, options)` takes `options.version?: (row: T) => number`. The default is `row => row.row_version`.
- `OutboxRefused` extends `Error` and has `code`, `text` and `seq`. Its message is the text.
- `KeyedCollection<T extends object>` is the part of `Collection<T, string | number>` that the read adapters use.
- `recordWrite(c, o).write(call, expected)` takes `expected` as `Partial<T> & { id: string }`.
- `shell({ persist, onUpdate, workerUrl })` resolves `ShellResult`: `{ worker, persisted, quota: { usage, quota } }`.
- `precache(manifest, { buildId, apiPrefix })` installs the worker listeners in the worker scope.
- `@wfe/components/table`: `ReadOnlyTable` takes `renderBody`, the same slot shape as `Table`.

## Worker size and the manifest choice

The gallery build writes `sw.js` at 1,153 bytes minified and 672 bytes gzipped, with the manifest. It has no import statement, so it registers as a classic worker. There is no workbox and no vite-plugin-pwa.

The manifest step is a documented recipe in `packages/sync/README.md`, not a Vite plugin. Shipped from the package, the plugin measured 440 bytes minified and 340 bytes gzipped. It also needed a declaration file and a type dependency on vite. The recipe adds nothing to the package and is 26 lines, 768 bytes, in the consumer's Vite configuration. The gallery uses the same recipe.

## Deviations

1. The brief names `docs/wamn-sync.md`. The spec is at `docs/plan/wamn-sync.md`, the place that the owner chose in 2a. This epic did not edit it.
2. A refused reply without a refusal rejects with `OutboxRefused` with the code `refused` and the text `The host refused the write`.
3. `Row.row_version` is optional in the type, so the default accessor returns `row.row_version` as a number without a check. A consumer whose rows have no `row_version` must pass `options.version`. The `Version` type is internal, and the option is typed inline.
4. `applyChanges` reads the version of `change.data` through the accessor, not `change.row_version`. This is the rule that 2a used.
5. `recordWrite` reads the version of `expected` through the accessor. When `expected` has no version, any row with the id ends the wait, as in 3a.
6. The brief names `Collection<T, string | number>`. Collection is invariant in its key type, so a `Collection<T, string>` is not assignable to it. The adapters take `KeyedCollection<T>`, a structural part of that type. The index exports it as a type.
7. `liveRows` keys its store by `String(key)`. It now subscribes before it seeds the store. A live query starts on its first subscription and loads its first rows inside `subscribeChanges`, without change events.
8. `liveList` reconciles by the collection's own key through a WeakMap from row to key.
9. `@tanstack/db` 0.15.2 is now also a root dev dependency, at the pin of the package, so the unit tests can build live queries. pnpm links one copy.
10. `renderBody` replaces the rows, the groups and the row details of `ReadOnlyTable`. The header, the controls and the footer stay.
11. The gallery table over 100,000 rows made the size switch slower. The 100,000-row case now waits up to 30 s for the ready status. The old 5 s default was already close to the time of the switch.
12. `shell()` takes `workerUrl` as optional. Without it, no worker is registered. With `persist: false`, it reads `persisted()`. It registers a classic worker.
13. `onUpdate` fires only for a worker that waits behind an active one. `reload()` posts the message once and reloads on the first `controllerchange`.
14. The shell unit tests of item 7 came with the shell commit, so that `shell()` landed tested.
15. The worker answers a manifest URL with any query from the cached URL without the query. A path outside the manifest, such as a deep route of a single-page application, goes to the network and does not open offline.
16. The precache needs the scope root, `./`, in the manifest so that a reload of the root works offline. The recipe adds it.
17. The API prefix is a literal path prefix, so `/apiary` also matches `/api`. A manifest URL under the prefix is dropped before the install.
18. The cache name holds the scope and the build id, so the cleanup of one application never deletes the caches of another scope. The default build id is a hash of the manifest. A new `sw.js` with the same manifest keeps the same cache name.
19. Activate also calls `clients.claim()`, so the first load comes under the worker without a reload.
20. `shell.ts` and `worker.ts` each hold the string `wfe-sync:skip-waiting`, because the page and the worker share no module. A unit test checks the string.
21. The recipe takes absolute paths of `index.html` and the worker entry, because `config.root` can be undefined. Its manifest holds every built file. In the gallery, that includes `modules.json`.
22. The coverage inventory lists `packages/sync/README.md` as excluded. Its two fences need Node types, and the gallery builds the same recipe in every mode.
23. The browser case "the gallery reloads and renders from persistence" came with item 8, because it needs the gallery Persistence.
24. The update case asks the registration for the update check after the build changes. After the offline reload, a reload did not find the new build within the wait.
25. The gallery fake server has `net.reachable`. A page that loads with no network cannot list, so the saved rows fill the collection. An `Errored` boundary now covers `liveList`.
26. The runner ignores one console error, `net::ERR_INTERNET_DISCONNECTED`, and only for an `/api` URL in the second context. That is the blocked `/api` request of the case.

## Other notes

- Beads bug wfe-w2y.35 records the generator test that times out under load. It timed out once more in this epic, in the issue 2 gate, and passed alone. The rerun of the gate passed.
- Beads bug wfe-w2y.37 records the flaky drag-selection case of the read-only table gallery. It failed 1 of 3 distribution runs with the change and 1 of 3 without it.
- Mutation checks: each of these changes makes a test fail. The collection ignores `options.version`. `shell()` offers the first install, or posts the message twice. `ReadOnlyTable` does not forward `renderBody`. The worker caches a manifest URL under the API prefix.
