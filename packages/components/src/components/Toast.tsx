import { resolveMessages } from '../internal/messages'
import { styledClasses } from '../internal/classes'
import { createToastState } from '../internal/controls/toast'
import {
  callHandler,
  nativeEventProps,
  ownedElementEvents,
} from '../internal/events'
import {
  Show,
  createContext,
  createSignal,
  merge,
  omit,
  onCleanup,
  useContext,
} from 'solid-js'
import { Button } from './NativeFields'
import type { ToastOptions } from '../internal/controls/toast'
import { isServer, type JSX } from '@solidjs/web'
import type { ButtonProps } from './NativeFields'

export interface ToastMessages {
  regionLabel: string
  dismissLabel: string
  close: string
}
export const toastMessages: Readonly<ToastMessages> = {
  regionLabel: 'Notifications',
  dismissLabel: 'Dismiss notification',
  close: 'Close',
}
const ToastMessagesContext =
  createContext<Readonly<ToastMessages>>(toastMessages)
const ToastContext = createContext<ReturnType<typeof createToastState> | null>(
  null,
)
export type ToastRootProps = JSX.HTMLAttributes<HTMLDivElement> &
  ToastOptions & {
    priority?: 'polite' | 'assertive'
    messages?: Partial<ToastMessages>
  }
export function ToastRoot(props: ToastRootProps) {
  const messages = resolveMessages(
    useContext(ToastMessagesContext),
    () => props.messages,
  )
  const [node, setNode] = createSignal<HTMLElement | undefined>(undefined, {
    ownedWrite: true,
  })
  const state = createToastState(props, node)
  return (
    <Show when={state.open()}>
      <ToastMessagesContext value={messages}>
        <ToastContext value={state}>
          <ToastSurface {...props} state={state} setNode={setNode} />
        </ToastContext>
      </ToastMessagesContext>
    </Show>
  )
}
function ToastSurface(
  props: ToastRootProps & {
    state: ReturnType<typeof createToastState>
    setNode: (node: HTMLElement | undefined) => void
  },
) {
  const state = props.state
  if (!isServer) onCleanup(() => props.setNode(undefined))
  const handlers = {
    onPointerEnter(
      event: PointerEvent & { currentTarget: HTMLDivElement; target: Element },
    ) {
      if (!callHandler(event, props.onPointerEnter)) state.pause('pointer')
    },
    onPointerLeave(
      event: PointerEvent & { currentTarget: HTMLDivElement; target: Element },
    ) {
      callHandler(event, props.onPointerLeave)
      state.resume('pointer')
    },
    onFocusIn(
      event: FocusEvent & { currentTarget: HTMLDivElement; target: Element },
    ) {
      callHandler(event, props.onFocusIn)
      state.pause('focus')
    },
    onFocusOut(
      event: FocusEvent & { currentTarget: HTMLDivElement; target: Element },
    ) {
      callHandler(event, props.onFocusOut)
      if (
        !(event.relatedTarget instanceof Node) ||
        !event.currentTarget.contains(event.relatedTarget)
      )
        state.resume('focus')
    },
    onKeyDown(
      event: KeyboardEvent & { currentTarget: HTMLDivElement; target: Element },
    ) {
      if (!callHandler(event, props.onKeyDown) && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        state.dismiss('escape')
      }
    },
  }
  const attributes = omit(
    props,
    'messages',
    'open',
    'defaultOpen',
    'duration',
    'persistent',
    'onOpenChange',
    'onDismiss',
    'onCloseAutoFocus',
    'priority',
    'state',
    'setNode',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(merge(props, handlers))
  return (
    <div
      {...attributes}
      role="status"
      aria-live={props.priority ?? 'polite'}
      aria-atomic="true"
      data-ui=""
      class={styledClasses('ui-toast', props.class)}
      ref={[props.setNode, props.ref, events]}
    />
  )
}
export type ToastRegionProps = JSX.HTMLAttributes<HTMLDivElement> & {
  messages?: Partial<ToastMessages>
}
export function ToastRegion(props: ToastRegionProps) {
  const messages = resolveMessages(toastMessages, () => props.messages)
  const attributes = omit(props, 'messages', 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <ToastMessagesContext value={messages}>
      <div
        {...attributes}
        data-ui=""
        role="region"
        aria-label={props['aria-label'] ?? messages.regionLabel}
        class={styledClasses('ui-toast-region', props.class)}
        ref={[props.ref, events]}
      />
    </ToastMessagesContext>
  )
}
export function ToastTitle(props: JSX.HTMLAttributes<HTMLHeadingElement>) {
  const attributes = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <h3
      {...attributes}
      class={styledClasses('ui-toast-title', props.class)}
      ref={[props.ref, events]}
    />
  )
}
export function ToastDescription(
  props: JSX.HTMLAttributes<HTMLParagraphElement>,
) {
  const attributes = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <p
      {...attributes}
      class={styledClasses('ui-toast-description', props.class)}
      ref={[props.ref, events]}
    />
  )
}
export type ToastCloseButtonProps = ButtonProps & {
  messages?: Partial<ToastMessages>
}
export function ToastCloseButton(props: ToastCloseButtonProps) {
  const messages = resolveMessages(
    useContext(ToastMessagesContext),
    () => props.messages,
  )
  const attributes = omit(props, 'messages')
  const state = useContext(ToastContext)
  if (!state) throw new Error('Use Toast.CloseButton inside Toast.Root')
  return (
    <Button
      {...attributes}
      aria-label={props['aria-label'] ?? messages.dismissLabel}
      onClick={(event) => {
        if (!callHandler(event, props.onClick)) state.dismiss('close')
      }}
    >
      {props.children ?? messages.close}
    </Button>
  )
}
export const Toast = /* @__PURE__ */ Object.assign(ToastRoot, {
  Root: ToastRoot,
  Region: ToastRegion,
  Title: ToastTitle,
  Description: ToastDescription,
  CloseButton: ToastCloseButton,
})
export type { ToastDismissReason } from '../internal/controls/toast'
