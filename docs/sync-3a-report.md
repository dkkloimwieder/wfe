# Epic 3a close report: @wfe/sync outbox and recordWrite

Epic wfe-w2y.34 is complete. Main is fast-forwarded to 68930c7. The last `pnpm check` passed with 118 test files and 1061 tests. The gallery passes 9 cases in source, distribution and development modes with no console errors or warnings.

## Commits

1. 32ad1ba: refill and follow passes run in one job queue.
2. f4288a4: the outbox store, its methods, Web Locks, and outboxStatus.
3. 1499387: replay by record, the probe, and the triggers.
4. aebef6a: recordWrite with createOptimisticStore, action and until.
5. 0df99e7: tests for a lost reply and two tabs under the lock.
6. 68930c7: the gallery write, offline and refusal paths.

## Public surface as exported

Types: `Row`, `Change`, `Feed`, `Persistence`, `Trigger`, `OperationCall`, `Reply`, `Send`, `OutboxEntry`, `OutboxCounts`, `Outbox`.

Values: `CursorExpired`, `OutboxDiscarded`, `collection`, `outbox`, `liveRows`, `liveList`, `syncStatus`, `outboxStatus`, `recordWrite`.

`@wfe/sync/internal` exports `applyChanges`, as before.

- `OutboxEntry` is `OperationCall` plus `seq`, `recorded_at`, `state` and `refusal?`. It has `append_only` and no `release`.
- `Outbox` has `enqueue`, `replay`, `resubmit`, `discard`, `entries`, `watch` and `close`.
- `OutboxCounts` is `{ pending, sending, refused, expired, lastSentAt }`.
- `recordWrite(c, o)` returns `{ rows, write }`. `write(call, expected)` returns a promise, and `expected` is `Partial<T> & { id; row_version? }`.

## Spec-versus-types deviations

1. The spec has no `Outbox` or counts type. The index exports `Outbox` and `OutboxCounts`, which the brief did not list.
2. The spec locks with a BroadcastChannel. The package uses the Web Lock `${database}:outbox`, as the brief says.
3. In the spec, a write ends at a `row_version` at or past the one in the reply. `Reply` carries no version, so the package uses the brief rule: the stored `row_version` is greater than `expected.row_version`. If `expected.row_version` is undefined, any row with the id is enough.
4. The wait throws the refusal object `{ code, text }`, not an Error. If a refused reply has no refusal, it throws `Error('The host refused the write')`.
5. The spec probe is a HEAD within 3 s. The package has no probe timeout, because the consumer's probe owns the request. A probe that throws counts as false.
6. A `send` that throws counts as a retriable reply.
7. `lastSentAt` lives in page memory. A reload or another tab does not see it.
8. `entries()` is synchronous and reads page memory. It is empty until the open loads the store. Inside the lock, each replay reads the store again.
9. `watch(fn)` calls `fn` at once with the current counts.
10. A retriable failure drops a replay that was asked for before the failure. A replay asked for during a failed probe probes again.
11. `close()` writes the entries in flight back to `pending` before the database closes.
12. `OutboxDiscarded` works for discards in the same page only. If another tab discards the entry, the wait in this page stays open.
13. 2a carry-over: `utils.refill()` now waits for a running pass, and a waiting list runs before a waiting pass.

## until and createOptimisticStore at rc.18, against the adapter table

1. The spec sample calls `createOptimisticStore(() => rows, {})`. At rc.18 a seed object selects the draft overload. The package passes `(fn, undefined, { key: 'id' })`, the overload for a function with no seed.
2. The function returns an async generator. It keys each array from `from(subscribe(c))` into a record by id.
3. `until` needs a reactive predicate. The collection and the outbox are not Solid sources. The package adds a memo over `from()` that moves on each collection change and each outbox change, and the predicate reads it.
4. At rc.18, `until` returns `Promise<Truthy<T>>` and must start outside a tracking scope. The action yields it after `yield o.enqueue(...)`, so it starts inside the transaction.
5. `yield o.enqueue(...)` has the type `any` in the generator, so the code casts it to `OutboxEntry`.
6. The rc.17 case passes: two overlapping writes keep both guesses, and neither row node remounts. A refusal and a discard revert the guess.
7. The adapter does not use `affects`.

## Web Locks fallback

If `navigator.locks` is absent, replay runs without the lock and never blocks.
Two tabs can then send the same entry at the same time, and the write log dedupes on `request_hash`.
A test shows the behavior: with the lock, each of two entries is sent once. Without it, the two tabs send each entry twice.
Without the lock, a tab that reads the store can also put another tab's `sending` entry back to `pending`.

## Other notes

- `fake-indexeddb` 6.2.5 is a new pinned dev dependency.
- Beads bug wfe-w2y.35 records a generator test that timed out three times under a machine load average of 26 to 30. It passes alone and is outside the sync scope.
- Mutation tests: 11 replay mutations and 7 recordWrite mutations each make a test fail.
