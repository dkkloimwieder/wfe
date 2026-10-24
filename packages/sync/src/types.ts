/** A row has a client-generated id and an integer version. */
export interface Row {
  id: string
  row_version: number
}

/** A change is deleted or carries data. */
export type Change<T extends Row> =
  | { id: string; row_version: number; deleted: true }
  | { id: string; row_version: number; deleted: false; data: T }

/** The consumer supplies the reads; the package never builds a URL. */
export interface Feed<T extends Row, S> {
  list(scope: S, signal?: AbortSignal): Promise<{ rows: T[]; cursor: string }>
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
  subscribe(scopeKey: string, fire: () => void): () => void
}
