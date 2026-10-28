// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  createTableVirtualizer,
  TableVirtualizerOptions,
  VirtualRows,
  VirtualWindow,
} from '@wfe/components/virtual'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    createTableVirtualizer: typeof createTableVirtualizer
    TableVirtualizerOptions: TableVirtualizerOptions<string>
    VirtualRows: typeof VirtualRows
    VirtualWindow: VirtualWindow<string>
  }>
>
