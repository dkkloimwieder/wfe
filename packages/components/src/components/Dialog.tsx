import { styledClasses, type ClassValue } from '../internal/classes'
import { buttonAttributes } from '../internal/buttonPresentation'
import type { ButtonAppearanceProps } from '../internal/buttonPresentation'
import * as Core from '../internal/controls/dialog'
import { untrack } from 'solid-js'
import { DialogScope, createDialogScope, useDialogScope } from './dialogScope'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export type DialogRootProps = Core.DialogRootProps
export function DialogRoot(props: DialogRootProps) {
  const scope = createDialogScope()
  return (
    <DialogScope value={scope}>
      <Core.Root {...props} />
    </DialogScope>
  )
}
export type DialogPortalProps = Core.DialogPortalProps
export function DialogPortal(props: DialogPortalProps) {
  const scope = useDialogScope()
  return (
    <Core.Portal {...props} mount={props.mount ?? scope.mount()}>
      <div data-ui="" style={{ display: 'contents' }}>
        <div class="ui-dialog-portal">{props.children}</div>
      </div>
    </Core.Portal>
  )
}

export type DialogTriggerProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DialogTriggerProps<T> & ButtonAppearanceProps
export function DialogTrigger<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, DialogTriggerProps<T>>,
) {
  const attributes = buttonAttributes(props) as typeof props
  const Primitive = Core.Trigger as Component<typeof props>
  const scope = useDialogScope()
  return (
    <Primitive
      {...attributes}
      data-ui=""
      ref={[scope.setTrigger, untrack(() => props.ref)]}
    />
  )
}

export type DialogCloseButtonProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DialogCloseButtonProps<T> & ButtonAppearanceProps
export function DialogCloseButton<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, DialogCloseButtonProps<T>>,
) {
  const attributes = buttonAttributes(props) as typeof props
  const Primitive = Core.CloseButton as Component<typeof props>
  return <Primitive {...attributes} />
}

export type DialogOverlayProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DialogOverlayProps<T> & { class?: ClassValue }
export function DialogOverlay<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DialogOverlayProps<T>>,
) {
  const Primitive = Core.Overlay as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-dialog-overlay', props.class)}
    />
  )
}

export type DialogContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DialogContentProps<T> & { class?: ClassValue }
export function DialogContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DialogContentProps<T>>,
) {
  const Primitive = Core.Content as Component<typeof props>
  const scope = useDialogScope()
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-dialog-content', props.class)}
      ref={[scope.setContent, untrack(() => props.ref)]}
    />
  )
}

export type DialogTitleProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DialogTitleProps<T> & { class?: ClassValue }
export function DialogTitle<T extends ValidComponent = 'h2'>(
  props: PolymorphicProps<T, DialogTitleProps<T>>,
) {
  const Primitive = Core.Title as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-dialog-title', props.class)}
    />
  )
}

export type DialogDescriptionProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DialogDescriptionProps<T> & { class?: ClassValue }
export function DialogDescription<T extends ValidComponent = 'p'>(
  props: PolymorphicProps<T, DialogDescriptionProps<T>>,
) {
  const Primitive = Core.Description as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-dialog-description', props.class)}
    />
  )
}

export const Dialog = /* @__PURE__ */ Object.assign(DialogRoot, {
  Root: DialogRoot,
  Portal: DialogPortal,
  Trigger: DialogTrigger,
  CloseButton: DialogCloseButton,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
})
// Explicit compatibility exports retain the previously available primitive types.
export type {
  DialogCloseButtonCommonProps,
  DialogCloseButtonOptions,
  DialogCloseButtonRenderProps,
  DialogContentCommonProps,
  DialogContentOptions,
  DialogContentRenderProps,
  DialogDescriptionCommonProps,
  DialogDescriptionOptions,
  DialogDescriptionRenderProps,
  DialogOverlayCommonProps,
  DialogOverlayOptions,
  DialogOverlayRenderProps,
  DialogRootOptions,
  DialogTitleCommonProps,
  DialogTitleOptions,
  DialogTitleRenderProps,
  DialogTriggerCommonProps,
  DialogTriggerOptions,
  DialogTriggerRenderProps,
  CloseButton,
  Content,
  Description,
  Overlay,
  Portal,
  Root,
  Title,
  Trigger,
  DialogContextValue,
  useDialogContext,
} from '../internal/controls/dialog'
