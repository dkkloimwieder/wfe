// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type { Collapsible, CollapsibleProps } from '@wfe/components/collapsible'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Collapsible: typeof Collapsible
    CollapsibleProps: CollapsibleProps
  }>
>
