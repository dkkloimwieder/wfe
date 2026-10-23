import { resolveMessages } from '../internal/messages'
import { styledClasses, type ClassValue } from '../internal/classes'
import { buttonAttributes } from '../internal/buttonPresentation'
import type { ButtonAppearanceProps } from '../internal/buttonPresentation'
import * as Core from '../internal/controls/alert-dialog'
import { untrack, createContext, useContext, omit } from 'solid-js'
import { Dialog, DialogRoot } from './Dialog'
import { useDialogScope } from './dialogScope'
import { Button } from './NativeFields'
import type { Component } from 'solid-js'
import type { JSX, ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export interface AlertDialogMessages {
  cancel: string
}
export const alertDialogMessages: Readonly<AlertDialogMessages> = {
  cancel: 'Cancel',
}
const AlertMessagesContext =
  createContext<Readonly<AlertDialogMessages>>(alertDialogMessages)
export type AlertDialogRootProps = Omit<Core.AlertDialogRootProps, 'modal'> & {
  messages?: Partial<AlertDialogMessages>
}
export function AlertDialogRoot(props: AlertDialogRootProps) {
  const messages = resolveMessages(alertDialogMessages, () => props.messages)
  const attributes = omit(props, 'messages')
  return (
    <AlertMessagesContext value={messages}>
      <DialogRoot {...attributes} modal />
    </AlertMessagesContext>
  )
}
export type AlertDialogContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.AlertDialogContentProps<T> & { class?: ClassValue }
export function AlertDialogContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, AlertDialogContentProps<T>>,
) {
  const Primitive = Core.Content as Component<typeof props>
  const scope = useDialogScope()
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-dialog-content', props.class)}
      ref={[scope.setContent, untrack(() => props.ref)]}
      onOpenAutoFocus={(event) => {
        props.onOpenAutoFocus?.(event)
        scope.initialAlertFocus(event)
      }}
    />
  )
}
export type AlertDialogCancelProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.AlertDialogCloseButtonProps<T> &
  ButtonAppearanceProps & {
    children?: JSX.Element
    messages?: Partial<AlertDialogMessages>
  }
export function AlertDialogCancel<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, AlertDialogCancelProps<T>>,
) {
  const messages = resolveMessages(
    useContext(AlertMessagesContext),
    () => props.messages,
  )
  const attributes = buttonAttributes(omit(props, 'messages')) as typeof props
  const Primitive = Core.CloseButton as Component<typeof props>
  const scope = useDialogScope()
  return (
    <Primitive
      {...attributes}
      aria-label={
        props['aria-label'] ??
        (typeof props.children === 'string' ? props.children : messages.cancel)
      }
      ref={[scope.setCancel, untrack(() => props.ref)]}
    >
      {props.children ?? messages.cancel}
    </Primitive>
  )
}
export const AlertDialog = /* @__PURE__ */ Object.assign(AlertDialogRoot, {
  // Refresh proxies hide function keys. Copy named parts without enumerating them.
  Portal: Dialog.Portal,
  Trigger: Dialog.Trigger,
  CloseButton: Dialog.CloseButton,
  Overlay: Dialog.Overlay,
  Title: Dialog.Title,
  Description: Dialog.Description,
  Root: AlertDialogRoot,
  Content: AlertDialogContent,
  Cancel: AlertDialogCancel,
  Action: Button,
})
// Explicit compatibility exports retain the previously available primitive types.
export type {
  AlertDialogCloseButtonCommonProps,
  AlertDialogCloseButtonOptions,
  AlertDialogCloseButtonRenderProps,
  AlertDialogContentCommonProps,
  AlertDialogContentOptions,
  AlertDialogContentRenderProps,
  AlertDialogDescriptionCommonProps,
  AlertDialogDescriptionOptions,
  AlertDialogDescriptionRenderProps,
  AlertDialogOverlayCommonProps,
  AlertDialogOverlayOptions,
  AlertDialogOverlayRenderProps,
  AlertDialogRootOptions,
  AlertDialogTitleCommonProps,
  AlertDialogTitleOptions,
  AlertDialogTitleRenderProps,
  AlertDialogTriggerCommonProps,
  AlertDialogTriggerOptions,
  AlertDialogTriggerRenderProps,
  CloseButton,
  Content,
  Description,
  Overlay,
  Portal,
  Root,
  Title,
  Trigger,
} from '../internal/controls/alert-dialog'

export type {
  DialogTriggerProps as AlertDialogTriggerProps,
  DialogCloseButtonProps as AlertDialogCloseButtonProps,
} from './Dialog'

export type {
  DialogPortalProps as AlertDialogPortalProps,
  DialogOverlayProps as AlertDialogOverlayProps,
  DialogTitleProps as AlertDialogTitleProps,
  DialogDescriptionProps as AlertDialogDescriptionProps,
} from './Dialog'
