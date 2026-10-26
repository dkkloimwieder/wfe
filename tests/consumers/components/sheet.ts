// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Sheet,
  SheetContent,
  SheetRoot,
  SheetRootProps,
  SheetSide,
} from '@wfe/components/sheet'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Sheet: typeof Sheet
    SheetContent: typeof SheetContent
    SheetRoot: typeof SheetRoot
    SheetRootProps: SheetRootProps
    SheetSide: SheetSide
  }>
>
