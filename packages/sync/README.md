# Sync

This private package holds a browser store for rows that a change feed keeps current.
It wraps `@tanstack/db` collections and adds a Solid 2 adapter.
The application supplies a `Feed`, a scope, and a key. The package never builds a URL, reads a token, or names a header.

Import `collection`, `liveRows`, `liveList`, and `syncStatus` from `@wfe/sync`.
`collection(feed, scope, options)` returns a collection keyed by `row.id`.
It calls `feed.list(scope)` once and marks the collection ready.
`utils.refill()` reads the list again and reconciles it. Rows absent from the new page leave. Rows with a higher `row_version` land. Equal or lower versions are ignored.
`utils.error()` returns the error of the last failed list.
The `persistence`, `trigger`, and `pollMs` options are accepted and unused until the feed follow epic.

`liveRows(c)` returns a store keyed by id. Each change batch lands in one store write.
`liveList(c)` returns a store array reconciled by id, in the key order of the collection. Use it for small sets.
`syncStatus(c)` returns an accessor with `loading`, `ready`, or `error`.
Create the adapters inside a Solid owner. When that owner disposes, the adapters unsubscribe.

`@wfe/sync/internal` exports `applyChanges(c, changes)` for tests and the gallery.
It applies one batch of changes as one transaction with the same `row_version` rule.
