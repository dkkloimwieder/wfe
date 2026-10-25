// The gallery's Persistence over IndexedDB. The package exports none: the
// consumer owns persistence, its database name and its object store.
import type { Persistence } from '@wfe/sync'

type Saved = { rows: unknown[]; cursor: string; saved_at: string }

/** Wraps one IndexedDB request in a promise. */
function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** One database with the object store `collections`, keyed by collection key. */
export function indexedPersistence(name: string): Persistence {
  const database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () =>
      request.result.createObjectStore('collections')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const store = async (mode: IDBTransactionMode) =>
    (await database).transaction('collections', mode).objectStore('collections')
  return {
    async load(key) {
      return (await done((await store('readonly')).get(key))) as
        Saved | undefined
    },
    async save(key, rows, cursor) {
      const saved: Saved = { rows, cursor, saved_at: new Date().toISOString() }
      await done((await store('readwrite')).put(saved, key))
    },
    async remove(key) {
      await done((await store('readwrite')).delete(key))
    },
  }
}
