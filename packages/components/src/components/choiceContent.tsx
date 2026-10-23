import { Show } from 'solid-js'
import { callHandler } from '../internal/events'
import type { JSX } from '@solidjs/web'
import type {
  FocusOutsideEvent,
  PointerDownOutsideEvent,
} from '@solid-primitives/interaction'
import type { useChoiceScope } from './choiceScope'

type ChoiceContentCallbacks<T> = {
  onPointerDownOutside?: (event: PointerDownOutsideEvent) => void
  onFocusOutside?: (event: FocusOutsideEvent) => void
  onKeyDown?: JSX.EventHandlerUnion<T, KeyboardEvent>
  onCloseAutoFocus?: (event: Event) => void
}

/** The two choice contents have the same caller-first event composition. */
export function choiceContentHandlers<T>(
  props: ChoiceContentCallbacks<T>,
  scope: Pick<
    ReturnType<typeof useChoiceScope>,
    'outside' | 'tab' | 'closeAutoFocus'
  >,
) {
  return {
    onPointerDownOutside: (event: PointerDownOutsideEvent) => {
      props.onPointerDownOutside?.(event)
      if (!event.defaultPrevented) scope.outside()
    },
    onFocusOutside: (event: FocusOutsideEvent) => {
      props.onFocusOutside?.(event)
      if (!event.defaultPrevented) scope.outside()
    },
    onKeyDown: (
      event: KeyboardEvent & { currentTarget: T; target: Element },
    ) => {
      callHandler(event, props.onKeyDown)
      scope.tab(event)
    },
    onCloseAutoFocus: (event: Event) => {
      props.onCloseAutoFocus?.(event)
      scope.closeAutoFocus(event)
    },
  }
}

/** Called in the existing content owner; does not add a root or provider. */
export function choiceContentSlots(props: {
  status?: JSX.Element
  footer?: JSX.Element
}) {
  return (
    <>
      <Show when={props.status}>
        <div class="choice-status" role="status">
          {props.status}
        </div>
      </Show>
      <Show when={props.footer}>
        <div class="choice-footer">{props.footer}</div>
      </Show>
    </>
  )
}
