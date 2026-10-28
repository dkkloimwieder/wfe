/**
 * A row for the default key accessor has a string or number id.
 * Its integer version is `row_version` unless the collection reads it through
 * `options.version`. Collections with `options.getKey` accept any object row.
 */
export interface Row {
  id: string | number
  row_version?: number
}

/** Reads the key of a row. */
export type Key<T extends object> = (row: T) => string | number

/** The default key accessor. */
export const rowKey = (row: Row): string | number => row.id

/** Reads the integer version of a row. */
export type Version<T extends object> = (row: T) => number

/** The default version accessor. */
export const rowVersion = (row: object): number =>
  (row as { row_version?: number }).row_version as number

/**
 * A change is deleted or carries data. `id` and `row_version` are feed fields.
 * The id identifies the collection key, including its string or number type.
 * For an upsert, `id` must equal `getKey(data)`. A delete needs only that key.
 */
export type Change<T extends object> =
  | { id: string | number; row_version: number; deleted: true }
  | { id: string | number; row_version: number; deleted: false; data: T }

/** The consumer supplies the reads; the package never builds a URL. */
export interface Feed<T extends object, S> {
  /** `complete: false` reports a list stopped at a cap. Absent means true. */
  list(
    scope: S,
    signal?: AbortSignal,
  ): Promise<{ rows: T[]; cursor: string; complete?: boolean }>
  changes(
    scope: S,
    cursor: string,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<{ rows: Change<T>[]; next_cursor: string; complete: boolean }>
  /** A cheap poll. When absent, `changes` runs on the timer. */
  moved?(scope: S, since: string, signal?: AbortSignal): Promise<boolean>
}

/** Durable local storage for one collection, supplied by the consumer. */
export interface Persistence {
  load(
    key: string,
  ): Promise<{ rows: unknown[]; cursor: string; saved_at: string } | undefined>
  save(key: string, rows: unknown[], cursor: string): Promise<void>
  remove(key: string): Promise<void>
}

/** Fires when a scope may have moved. Poll now; an event channel later. */
export interface Trigger {
  subscribe(key: string, fire: () => void): () => void
}
