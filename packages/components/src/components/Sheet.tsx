import { styledClasses } from '../internal/classes'
import { omit } from 'solid-js'
import { Dialog, DialogContent } from './Dialog'
import type { DialogContentProps, DialogRootProps } from './Dialog'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export type SheetRootProps = DialogRootProps
export type SheetSide = 'left' | 'right' | 'top' | 'bottom'
export type SheetContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = DialogContentProps<T> & {
  side?: SheetSide
  /** Give a left or right sheet more room, up to the viewport width. */
  size?: 'default' | 'wide'
}
export function SheetContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SheetContentProps<T>>,
) {
  const rest = omit(props, 'side', 'size') as typeof props
  const Primitive = DialogContent as Component<typeof props>
  return (
    <Primitive
      {...rest}
      class={styledClasses('ui-sheet', props.class)}
      data-side={props.side ?? 'right'}
      data-size={props.size === 'wide' ? 'wide' : undefined}
    />
  )
}
export function SheetRoot(props: SheetRootProps) {
  return <Dialog.Root {...props} />
}

export const Sheet = /* @__PURE__ */ Object.assign(SheetRoot, {
  // Refresh proxies hide function keys. Copy named parts without enumerating them.
  Portal: Dialog.Portal,
  Trigger: Dialog.Trigger,
  CloseButton: Dialog.CloseButton,
  Overlay: Dialog.Overlay,
  Title: Dialog.Title,
  Description: Dialog.Description,
  Root: SheetRoot,
  Content: SheetContent,
})
