// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  ToggleGroupProps,
  ToggleProps,
} from '@wfe/components/toggle'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Toggle: typeof Toggle
    ToggleGroup: typeof ToggleGroup
    ToggleGroupItem: ToggleGroupItem
    ToggleGroupProps: ToggleGroupProps
    ToggleProps: ToggleProps
  }>
>
