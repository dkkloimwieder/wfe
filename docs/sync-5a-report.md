# Epic 5a close report: deviations

Epic wfe-w2y.39 is complete. Main is fast-forwarded to the commit that adds this report. The last `pnpm check` passed with 120 test files and 1139 tests. The sync gallery passes 18 cases in source, distribution and development modes.

The commits are 1f108b3 (issue .1), e718e3a (issue .2), cb0b0cf (issue .3) and 911c77a (issue .4). This report lists only the points where the work differs from the brief or adds to it.

## Deviations

1. Issue .1: the package exports did not change. The cause was in wamn. wamn holds wfe as the git submodule `web/wfe` and does not build it, so the `"types"` condition points at a missing `dist`. The owner chose this fix after two forks. The fixture `tests/sync-consumer` type-checks the built `dist` with the flags of wamn `web/runtime`: NodeNext, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noUnusedLocals` and `skipLibCheck`, with no paths and no conditions. The root script `types:sync-consumer` runs it through `types:examples`. A consumer builds the package before it type-checks. Epic 5b (wfe-w2y.40) covers the build on install.
2. Issue .1: two internal optional fields of the collection run, `pass` and `save`, now also accept `undefined`. A consumer that type-checks the source with `exactOptionalPropertyTypes` no longer gets two TS2412 errors. The public API does not change.
3. Issue .1: with the `wfe-source` condition and no `dist`, NodeNext rejects the extensionless relative imports of the source with TS2835. The owner decided against `.js` extensions and against a change to the exports order.
4. Issue .3: `Outbox.enqueue` takes the expected row as an optional second argument. `OperationCall` does not change. An entry stored before this change reads back with `expected` undefined, and `recordWrite` does not restore it.
5. Issue .3: the outbox loads its entries from IndexedDB after it opens. `recordWrite` therefore restores an entry when the outbox first reports it, not at the moment of creation. It restores each seq once and never an entry that its own write enqueued. It also restores entries that are refused at reload.
6. Issue .3: a restored refused entry keeps its row on screen until discard or resubmit. Discard reverts the row, and resubmit confirms it through the same wait. A new write still reverts at once on a refusal, as in 4a.
7. Issue .3: the `{ model }` option is optional. Without it, `recordWrite` restores nothing.
8. Issue .3: in the gallery, the probe also reads `navigator.onLine`, because the browser offline mode does not reach the fake host in the page. The written-row list keeps restored ids after their entries leave the outbox.
9. Issue .4: `apiPrefix` alone still bypasses only that prefix, as in 4b. It does not add to the default `['/api']`. With `bypassPrefixes`, it adds one entry to that list. An explicit empty `bypassPrefixes` with no `apiPrefix` bypasses nothing.

## Working mode

Codex (`gpt-6-astra`, reasoning effort high, sandbox `workspace-write`) wrote each issue. Claude reviewed each diff, ran the gate and the gallery, and committed.
