// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Change,
  collection,
  CursorExpired,
  Feed,
  KeyedCollection,
  liveList,
  liveRows,
  OperationCall,
  outbox,
  Outbox,
  OutboxCounts,
  OutboxDiscarded,
  OutboxEntry,
  OutboxRefused,
  outboxStatus,
  Persistence,
  recordWrite,
  Reply,
  Row,
  Send,
  shell,
  ShellResult,
  syncComplete,
  syncCurrentAt,
  syncStatus,
  Trigger,
} from '@wfe/sync'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Change: Change<import('@wfe/sync').Row>
    collection: typeof collection
    CursorExpired: typeof CursorExpired
    Feed: Feed<import('@wfe/sync').Row, string>
    KeyedCollection: KeyedCollection<import('@wfe/sync').Row>
    liveList: typeof liveList
    liveRows: typeof liveRows
    OperationCall: OperationCall
    outbox: typeof outbox
    Outbox: Outbox
    OutboxCounts: OutboxCounts
    OutboxDiscarded: typeof OutboxDiscarded
    OutboxEntry: OutboxEntry
    OutboxRefused: typeof OutboxRefused
    outboxStatus: typeof outboxStatus
    Persistence: Persistence
    recordWrite: typeof recordWrite
    Reply: Reply
    Row: Row
    Send: Send
    shell: typeof shell
    ShellResult: ShellResult
    syncComplete: typeof syncComplete
    syncCurrentAt: typeof syncCurrentAt
    syncStatus: typeof syncStatus
    Trigger: Trigger
  }>
>
