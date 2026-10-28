// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  NumberInput,
  NumberInputMessages,
  NumberInputProps,
} from '@wfe/components/number-input'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    NumberInput: typeof NumberInput
    NumberInputMessages: NumberInputMessages
    NumberInputProps: NumberInputProps
  }>
>
