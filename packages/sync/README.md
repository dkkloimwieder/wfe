# Sync

This private package holds a browser store for rows that a change feed keeps current.
It wraps `@tanstack/db` collections and adds a Solid 2 adapter.
The application supplies a `Feed`, a scope, and a key. The package never builds a URL, reads a token, or names a header.

Import `collection`, `liveRows`, `liveList`, `syncStatus`, and `CursorExpired` from `@wfe/sync`.
If the host no longer holds a cursor, `feed.changes` must throw `CursorExpired`. The package inspects no other error shape.
`collection(feed, scope, options)` returns a collection keyed by `row.id`.
If the `persistence` option is given, the collection first loads the saved rows for the key. Saved rows land as one transaction, and the collection is ready.
It then calls `feed.list(scope)` and reconciles the page. If the list fails after saved rows landed, the status stays `ready` and `utils.error()` holds the failure.
A rejecting load counts as no saved rows. `utils.error()` holds the load error until a list succeeds.
`utils.refill()` reads the list again and reconciles it. Rows absent from the new page leave. Rows with a higher `row_version` land. Equal or lower versions are ignored.
`utils.error()` returns the error of the last failed read.
`utils.currentAt()` returns the ISO time of the last successful list or change read, or undefined before one.

## Follow

After the first successful list, or after saved rows when the list failed, the collection follows the change feed.
A timer runs a pass every `pollMs`, default 10000. If `trigger` is given, the collection subscribes with the key, and each fire runs a pass.
`utils.pull()` runs a pass now and resolves when it ends. `utils.refill()` lists again.
Passes and lists run one at a time, after the start. A fire or refill during one runs once after it, and a waiting list runs first.

In one pass, the collection first calls `feed.moved(scope, cursor)` if the feed has it. A false result ends the pass.
The collection then calls `feed.changes(scope, cursor, pageSize)` and applies each page as one transaction, until a page is complete.
The cursor moves to `next_cursor` after every page. The package never parses a cursor.
The status stays `ready` during a pass. If `changes` throws `CursorExpired`, the collection lists again and goes on following.
Any other error sets the status to `error`, keeps the rows, and sets `utils.error()`. The next successful pass sets `ready` and clears the error.

With `persistence`, the collection saves its rows and cursor after a successful list and after every change page.
A save waits 250 ms, and a later save in that wait replaces it. A failed save changes no status. The package never calls `remove`.
`c.cleanup()` writes a waiting save at once, stops the timer, unsubscribes the trigger, and aborts the pass in flight.
A later subscriber restarts the collection. The restart loads, lists, and follows again.

`liveRows(c)` returns a store keyed by id. Each change batch lands in one store write.
`liveList(c)` returns a store array reconciled by id, in the key order of the collection. Use it for small sets.
`syncStatus(c)` returns an accessor with `loading`, `ready`, or `error`.
Create the adapters inside a Solid owner. When that owner disposes, the adapters unsubscribe.

## Outbox

`outbox({ database, send, probe, concurrency })` keeps writes in the IndexedDB database that the caller names, in the object store `outbox`.
The consumer supplies `send` and `probe`. The package never builds a request, a hash, a URL, or a header.

- `enqueue(call)` resolves with the entry after the IndexedDB put commits, and starts a replay.
- `replay()` sends pending entries. An ok reply removes the entry. A retriable reply puts it back to `pending` and ends the replay. Any other reply marks it `refused` with the refusal.
- `resubmit(seq)` puts a refused entry back to `pending` and starts a replay. `discard(seq)` removes the entry.
- `entries()` returns the entries that this page holds, in `seq` order. `watch(fn)` calls `fn` with the counts now and after each change.
- `close()` aborts the sends in flight, leaves their entries `pending`, and closes the database.

Replay sends the entries of one record (`expect.id`) in `seq` order, one at a time. Up to `concurrency` records, default 4, send at the same time.
A refused entry holds the later entries of its record as `pending`, except `append_only` entries.
A retriable reply stops the whole replay. The entry waits for the next trigger.
Every send gets an `AbortSignal`, and a `send` that throws counts as retriable.

A replay runs on open, after each `enqueue`, after a successful probe, and every 30 s while an entry is pending.
The probe runs before each replay, on the `online` event, and every 15 s while the last probe failed. The package never reads `navigator.onLine`.
A replay asked for during a replay runs once after it.

One tab replays at a time: a replay holds the Web Lock `${database}:outbox`.
In the lock, the outbox reads the store again, because another tab can change it. A stored `sending` entry lost its tab, so it goes back to `pending`.
The open does this reset in the lock before the first replay.
If `navigator.locks` is absent, replay runs without the lock. Two tabs can then send the same entry, and the write log dedupes on `request_hash`.
`lastSentAt` is the ISO time of the last ok reply in this page, or undefined.
`outboxStatus(o)` returns an accessor with the counts.

## Writes

`recordWrite(c, o)` returns `{ rows, write }`. `rows` is an optimistic store keyed by id: the rows of the collection with the guesses of open writes on top.
`write(call, expected)` is a Solid action:

1. It merges `expected` into `rows[expected.id]` as a guess.
2. It enqueues `call` in the outbox.
3. It waits with `until` until the collection holds `expected.id` with a `row_version` greater than `expected.row_version`. If `expected.row_version` is undefined, any row with that id is enough.

The wait reads the collection, never `rows`, so the guess of the action never ends it.
If the entry is refused, the wait throws the refusal `{ code, text }`. If the entry is discarded, it throws `OutboxDiscarded` with the `seq`.
The action then rejects, and the guess reverts.
The wait has no timeout, because a page can stay offline for hours. One action stays open for each unsent entry.

`@wfe/sync/internal` exports `applyChanges(c, changes)` for tests and the gallery.
It applies one batch of changes as one transaction with the same `row_version` rule.
