import { resolveMessages } from '../internal/messages'
import { styledClasses, type ClassValue } from '../internal/classes'
import { buttonAttributes } from '../internal/buttonPresentation'
import type { ButtonAppearanceProps } from '../internal/buttonPresentation'
import { callHandler } from '../internal/events'
import * as Core from '../internal/controls/alert-dialog'
import { useDialogContext } from '../internal/controls/dialog'
import { untrack, createContext, useContext, omit } from 'solid-js'
import { Dialog, DialogRoot } from './Dialog'
import type { DialogCloseButtonProps, DialogTriggerProps } from './Dialog'
import { useDialogScope } from './dialogScope'
import { Button } from './NativeFields'
import type { ButtonProps } from './NativeFields'
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

function AlertDialogTrigger<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, DialogTriggerProps<T>>,
) {
  const context = useDialogContext()
  const Trigger = Dialog.Trigger as Component<typeof props>
  return (
    <Trigger
      {...props}
      onClick={(event) => {
        callHandler(event, props.onClick)
        if (context.isOpen()) event.preventDefault()
      }}
    />
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
      onEscapeKeyDown={(event) => {
        props.onEscapeKeyDown?.(event)
        if (event.defaultPrevented) return
        event.preventDefault()
        scope.activateAlertCancel()
      }}
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

function AlertDialogCloseButton<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, DialogCloseButtonProps<T>>,
) {
  const scope = useDialogScope()
  const CloseButton = Dialog.CloseButton as Component<typeof props>
  // The mounted button owns its forwarded ref for its lifetime.
  const ref = untrack(() => props.ref)
  return <CloseButton {...props} ref={[scope.setAlertClose, ref]} />
}

/** Run the action and close unless its click handler prevents the default. */
function AlertDialogAction(props: ButtonProps) {
  const context = useDialogContext()
  return (
    <Button
      {...props}
      onClick={(event) => {
        if (!callHandler(event, props.onClick) && context.isOpen())
          context.close()
      }}
    />
  )
}

export const AlertDialog = /* @__PURE__ */ Object.assign(AlertDialogRoot, {
  // Refresh proxies hide function keys. Copy named parts without enumerating them.
  Portal: Dialog.Portal,
  Trigger: AlertDialogTrigger,
  CloseButton: AlertDialogCloseButton,
  Overlay: Dialog.Overlay,
  Title: Dialog.Title,
  Description: Dialog.Description,
  Root: AlertDialogRoot,
  Content: AlertDialogContent,
  Cancel: AlertDialogCancel,
  Action: AlertDialogAction,
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
