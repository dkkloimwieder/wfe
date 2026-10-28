// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Command,
  CommandItem,
  commandMessages,
  CommandMessages,
  CommandPalette,
  CommandPaletteProps,
  CommandProps,
  CommandShortcutOptions,
  createCommandShortcut,
} from '@wfe/components/command'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Command: typeof Command
    CommandItem: CommandItem
    commandMessages: typeof commandMessages
    CommandMessages: CommandMessages
    CommandPalette: typeof CommandPalette
    CommandPaletteProps: CommandPaletteProps
    CommandProps: CommandProps
    CommandShortcutOptions: CommandShortcutOptions
    createCommandShortcut: typeof createCommandShortcut
  }>
>
