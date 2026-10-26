// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  FileInput,
  FileInputMessages,
  FileInputProps,
  FileRejection,
} from '@wfe/components/file-input'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    FileInput: typeof FileInput
    FileInputMessages: FileInputMessages
    FileInputProps: FileInputProps
    FileRejection: FileRejection
  }>
>
