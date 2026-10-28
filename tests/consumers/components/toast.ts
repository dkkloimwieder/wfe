// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Toast,
  ToastCloseButton,
  ToastCloseButtonProps,
  ToastDescription,
  ToastDismissReason,
  toastMessages,
  ToastMessages,
  ToastRegion,
  ToastRegionProps,
  ToastRoot,
  ToastRootProps,
  ToastTitle,
} from '@wfe/components/toast'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Toast: typeof Toast
    ToastCloseButton: typeof ToastCloseButton
    ToastCloseButtonProps: ToastCloseButtonProps
    ToastDescription: typeof ToastDescription
    ToastDismissReason: ToastDismissReason
    toastMessages: typeof toastMessages
    ToastMessages: ToastMessages
    ToastRegion: typeof ToastRegion
    ToastRegionProps: ToastRegionProps
    ToastRoot: typeof ToastRoot
    ToastRootProps: ToastRootProps
    ToastTitle: typeof ToastTitle
  }>
>
