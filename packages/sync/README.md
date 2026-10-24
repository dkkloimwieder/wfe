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
`utils.currentAt()` returns the ISO time of the last successful list, or undefined before one.
The `trigger` and `pollMs` options are accepted and unused until the follow commit.

`liveRows(c)` returns a store keyed by id. Each change batch lands in one store write.
`liveList(c)` returns a store array reconciled by id, in the key order of the collection. Use it for small sets.
`syncStatus(c)` returns an accessor with `loading`, `ready`, or `error`.
Create the adapters inside a Solid owner. When that owner disposes, the adapters unsubscribe.

`@wfe/sync/internal` exports `applyChanges(c, changes)` for tests and the gallery.
It applies one batch of changes as one transaction with the same `row_version` rule.
