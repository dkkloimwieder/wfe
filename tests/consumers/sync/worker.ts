// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type { precache, skipWaitingMessage } from '@wfe/sync/worker'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    precache: typeof precache
    skipWaitingMessage: typeof skipWaitingMessage
  }>
>
