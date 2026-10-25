# Sync

This private package holds a browser store for rows that a change feed keeps current.
It wraps `@tanstack/db` collections and adds a Solid 2 adapter.
The application supplies a `Feed`, a scope, and a key. The package never builds a URL, reads a token, or names a header.

Import `collection`, `liveRows`, `liveList`, `syncStatus`, `shell`, and `CursorExpired` from `@wfe/sync`, and `precache` from `@wfe/sync/worker`.
If the host no longer holds a cursor, `feed.changes` must throw `CursorExpired`. The package inspects no other error shape.
`collection(feed, scope, options)` returns a collection keyed by `row.id`.
If the `persistence` option is given, the collection first loads the saved rows for the key. Saved rows land as one transaction, and the collection is ready.
It then calls `feed.list(scope)` and reconciles the page. If the list fails after saved rows landed, the status stays `ready` and `utils.error()` holds the failure.
A rejecting load counts as no saved rows. `utils.error()` holds the load error until a list succeeds.
`utils.refill()` reads the list again and reconciles it. Rows absent from the new page leave. Rows with a higher `row_version` land. Equal or lower versions are ignored.
The collection reads the version of a row through `options.version`. The default is `row => row.row_version`. A consumer whose rows carry `rowVersion` passes `version: r => r.rowVersion` and does not copy its rows.
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

The read adapters take any keyed collection: one made by `collection()`, a live query result such as a `groupBy`, or any other `@tanstack/db` collection. The rows need no id and no version.

`liveRows(c)` returns a store keyed by the collection's own key, as a string. Each change batch lands in one store write.
`liveList(c)` returns a store array reconciled by the collection's own key, in the order of the collection. Use it for small sets.
`syncStatus(c)` returns an accessor with `loading`, `ready`, or `error`. For a collection made by `collection()`, it reads the status of the sync source. For any other collection, it maps `c.status`: `ready` and `error` stay as they are, and every other status is `loading`.
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
3. It waits with `until` for a successful send to remove the entry from the outbox and for the collection to hold `expected.id`.

If `expected` has a version, the stored version must be greater. The collection reads both versions through `options.version`.
Without an expected version, any row with that id and a successful send are enough.
Changes to the collection or outbox update the wait, so the row can arrive before or after the send succeeds.

The wait reads the collection, never `rows`, so the guess of the action never ends it.
If the entry is refused, the wait throws `OutboxRefused` with the `code`, the `text` and the `seq`. If the entry is discarded, it throws `OutboxDiscarded` with the `seq`.
The action then rejects, and the guess reverts.
The wait has no timeout, because a page can stay offline for hours. One action stays open for each unsent entry.

`@wfe/sync/internal` exports `applyChanges(c, changes)` for tests and the gallery.
It applies one batch of changes as one transaction with the same `row_version` rule.

## Shell

`shell({ persist, onUpdate, workerUrl })` prepares the page for offline use. It never imports Solid and never throws.

1. If `workerUrl` is given and `navigator.serviceWorker` exists, it registers the worker at that URL.
2. If `persist` is true, the default, and `navigator.storage.persist` exists, it asks for persistent storage once. With `persist: false`, it reads `navigator.storage.persisted()`.
3. If `navigator.storage.estimate` exists, it reads the storage estimate.

It resolves `{ worker, persisted, quota: { usage, quota } }`. A missing or failing API gives `false` or zeros.

When a new worker waits behind an active one, the package calls `onUpdate(reload)`. The first install does not call it.
`reload()` posts the skip-waiting message to the waiting worker and reloads the page once that worker controls it.
The package never reloads on its own. The consumer chooses the time to call `reload`, for example after the outbox is empty.

## Worker

`@wfe/sync/worker` exports `precache(manifest, { buildId, apiPrefix, navigationFallback })`. The consumer imports it into its own worker entry. The module has no imports and never imports Solid.

The manifest lists the files to cache. The navigation fallback is the page that handles deep routes offline. The worker uses these rules:

- Each manifest entry is a URL relative to the worker scope, for example `./`, `index.html` or `assets/index-abc.js`.
- Install caches every manifest URL and `navigationFallback`, even when the manifest omits the fallback. The fallback defaults to `index.html` and resolves relative to the worker scope.
- The cache name holds the scope and the build id. The default build id is a hash of the manifest and the fallback name.
- A GET for a manifest URL uses the cache first. The worker ignores the query, so `./?tab=2` gets the cached `./`. On a miss, the request goes to the network.
- Other GET navigations use the network first. The worker returns the server response, including HTTP errors such as 404. Only a network failure uses the cached fallback. If the fallback is missing, the request fails with the network error. The consuming app handles deep routes.
- The worker leaves other requests to the network without interception. This includes requests outside the manifest that are not navigations.
- `apiPrefix`, default `/api`, matches the exact path or the path followed by '/'. The worker strips trailing slashes from the prefix. '/' matches every path. Matching requests never use the cache or the fallback. The worker never caches a manifest URL or fallback under that prefix.
- Activate deletes the older caches of the same scope and claims the open pages.
- The skip-waiting message from `reload()` of `shell()` makes a waiting worker take over.

The package does not ship a Vite plugin. The consumer writes the manifest with this recipe in its Vite configuration. The worker entry calls `precache(__PRECACHE_MANIFEST__)`, and the recipe replaces that name with the list of built files.

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

/**
 * Builds the worker entry as sw.js beside index.html and writes the list of
 * built files into it. Both paths are absolute. This is the recipe in
 * packages/sync/README.md.
 */
function precacheManifest(html: string, worker: string): Plugin {
  return {
    name: 'precache-manifest',
    enforce: 'post',
    config: () => ({
      build: {
        rollupOptions: {
          input: { index: html, sw: worker },
          output: {
            entryFileNames: (chunk) =>
              chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js',
          },
        },
      },
    }),
    generateBundle(_options, bundle) {
      const chunk = bundle['sw.js']
      if (chunk?.type !== 'chunk') throw new Error('sw.js was not built')
      const files = Object.keys(bundle).filter((name) => name !== 'sw.js')
      chunk.code = chunk.code.replace(
        '__PRECACHE_MANIFEST__',
        JSON.stringify(['./', ...files]),
      )
    },
  }
}

const path = (name: string) => fileURLToPath(new URL(name, import.meta.url))

export default defineConfig({
  plugins: [precacheManifest(path('index.html'), path('sw.ts'))],
})
```

```ts
// sw.ts
import { precache } from '@wfe/sync/worker'
declare const __PRECACHE_MANIFEST__: string[]
precache(__PRECACHE_MANIFEST__)
```

The page then calls `shell({ workerUrl: import.meta.env.BASE_URL + 'sw.js' })`. This resolves the worker from the Vite base on deep routes. The gallery in `examples/sync` uses the same recipe.
