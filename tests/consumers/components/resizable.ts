// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Resizable,
  ResizableProps,
  ResizeHandle,
  ResizeHandleProps,
} from '@wfe/components/resizable'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Resizable: typeof Resizable
    ResizableProps: ResizableProps
    ResizeHandle: typeof ResizeHandle
    ResizeHandleProps: ResizeHandleProps
  }>
>
