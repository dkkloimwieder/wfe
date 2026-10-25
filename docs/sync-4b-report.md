# Epic 4b-fix close report: deviations

Epic wfe-w2y.38 is complete. Main is fast-forwarded to the commit that adds this report. The last `pnpm check` passed with 120 test files and 1112 tests. The sync gallery passes 17 cases in source, distribution and development modes.

The commits are 5aa5a44 (issue .1), 0b1282d (issue .2), 53a86c2 (issue .3) and 0dd0ea9 (issue .4). This report lists only the points where the work differs from the brief or adds to it.

## Deviations

1. Issue .4: `liveRows` does not show completeness. Its result is a store of rows keyed by id, and a flag in it would mix with the rows. The owner chose a new accessor instead. `syncComplete(c)` works like `syncStatus` and returns true for a collection that `collection()` did not make. `liveRows` and `syncStatus` do not change.
2. Issue .4: the source registry holds completeness in a plain signal. `createStatus` now builds on a small generic `createSourceSignal` in `status.ts`. The `Source` type gains `complete`.
3. Issue .4: a failed list and saved rows from `Persistence` do not change `utils.complete()`. The brief did not say what a failure does.
4. Issue .4: the gallery fake host takes a cap. Two buttons refill with a 100-row cap and without one. The status line shows the text "partial: stopped at the cap" next to `data-sync-complete`.
5. Issue .2: install caches `navigationFallback` even when the manifest omits it. The default build id now hashes the manifest and the fallback name. The cache name of a build without a `buildId` therefore changes once. Activate deletes the old cache as before.
6. Issue .2: an online deep navigation returns the server response, including a 404 or a 500. Only a network failure uses the fallback. If the fallback is not in the cache, the request fails with the network error.
7. Issue .2: the gallery registers the worker at `import.meta.env.BASE_URL + 'sw.js'`, not `'./sw.js'`. On a deep route, `'./sw.js'` resolves under the route. The README recipe says the same.
8. Issue .3: the worker strips trailing slashes from `apiPrefix`, so `'/api/'` is the same as `'/api'`. A prefix of `'/'` matches every path.

## Working mode

Codex (`gpt-6-astra`, reasoning effort high, sandbox `workspace-write`) wrote each issue. Claude reviewed each diff, ran the gate and the gallery, and committed. Codex CLI 0.164 has no `--full-auto` flag, so the runs used only the sandbox flag.
