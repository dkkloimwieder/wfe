// Resolve package exports through the root node_modules workspace link.
import type {
  Row,
  Change,
  Feed,
  Persistence,
  Trigger,
  CursorExpired,
  OutboxDiscarded,
  OutboxRefused,
  collection,
  OperationCall,
  Reply,
  Send,
  OutboxEntry,
  OutboxCounts,
  Outbox,
  outbox,
  liveRows,
  liveList,
  syncStatus,
  syncComplete,
  syncCurrentAt,
  outboxStatus,
  recordWrite,
  KeyedCollection,
  shell,
  ShellResult,
} from '@wfe/sync'
import type { precache, skipWaitingMessage } from '@wfe/sync/worker'
import type { applyChanges } from '@wfe/sync/internal'

type Assert<T extends true> = T
type IsAny<T> = 0 extends 1 & T ? true : false
type AllTyped<T> = true extends {
  [K in keyof T]: IsAny<T[K]>
}[keyof T]
  ? false
  : true
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

// Keep this inventory aligned with index.ts, worker.ts, and internal.ts.
export type ExportedTypes = Assert<
  AllTyped<{
    Row: Row
    Change: Change<Row>
    Feed: Feed<Row, string>
    Persistence: Persistence
    Trigger: Trigger
    CursorExpired: typeof CursorExpired
    OutboxDiscarded: typeof OutboxDiscarded
    OutboxRefused: typeof OutboxRefused
    collection: typeof collection
    OperationCall: OperationCall
    Reply: Reply
    Send: Send
    OutboxEntry: OutboxEntry
    OutboxCounts: OutboxCounts
    Outbox: Outbox
    outbox: typeof outbox
    liveRows: typeof liveRows
    liveList: typeof liveList
    syncStatus: typeof syncStatus
    syncComplete: typeof syncComplete
    syncCurrentAt: typeof syncCurrentAt
    outboxStatus: typeof outboxStatus
    recordWrite: typeof recordWrite
    KeyedCollection: KeyedCollection<Row>
    shell: typeof shell
    ShellResult: ShellResult
    precache: typeof precache
    skipWaitingMessage: typeof skipWaitingMessage
    applyChanges: typeof applyChanges
  }>
>

// Inspect nested types too: a callable can hide an unresolved dependency.
export type SignatureTypes = Assert<
  AllTyped<{
    entry: OutboxEntry
    operation: OutboxEntry['operation']
    sequence: OutboxEntry['seq']
    sendEntry: Parameters<Send>[0]
    sendReply: Awaited<ReturnType<Send>>
    queuedEntry: Awaited<ReturnType<Outbox['enqueue']>>
    counts: Parameters<Parameters<Outbox['watch']>[0]>[0]
    collection: ReturnType<typeof collection<Row, string>>
    collectionRow: ReturnType<ReturnType<typeof collection<Row, string>>['get']>
    keyedEntries: ReturnType<KeyedCollection<Row>['entries']>
    rows: ReturnType<typeof liveRows<Row>>
    list: ReturnType<typeof liveList<Row>>
    status: ReturnType<ReturnType<typeof syncStatus<Row>>>
    complete: ReturnType<ReturnType<typeof syncComplete<Row>>>
    currentAt: ReturnType<ReturnType<typeof syncCurrentAt<Row>>>
    outbox: ReturnType<typeof outbox>
    outboxCounts: ReturnType<ReturnType<typeof outboxStatus>>
    recordRows: ReturnType<typeof recordWrite<Row>>['rows']
    recordWrite: ReturnType<typeof recordWrite<Row>>['write']
    shell: Awaited<ReturnType<typeof shell>>
    manifest: Parameters<typeof precache>[0]
    internalCollection: Parameters<typeof applyChanges<Row>>[0]
    internalChanges: Parameters<typeof applyChanges<Row>>[1]
  }>
>

export type CurrentAtContract = Assert<
  Equal<ReturnType<ReturnType<typeof syncCurrentAt<Row>>>, string | undefined>
>

export type OutboxContract = [
  Assert<Equal<IsAny<OutboxEntry>, false>>,
  Assert<Equal<Parameters<Send>[0], OutboxEntry>>,
  Assert<Equal<Awaited<ReturnType<Send>>, Reply>>,
  Assert<Equal<Awaited<ReturnType<Outbox['enqueue']>>, OutboxEntry>>,
  Assert<Equal<OutboxEntry['state'], 'pending' | 'sending' | 'refused'>>,
  Assert<Equal<OutboxEntry['seq'], number>>,
  Assert<Equal<ReturnType<ReturnType<typeof outboxStatus>>, OutboxCounts>>,
]

// The assertion itself must reject any, including a union absorbed by any.
type Untyped = ReturnType<typeof JSON.parse>
// @ts-expect-error An any type must fail the consumer contract.
export type RejectAny = Assert<AllTyped<{ entry: Untyped }>>
