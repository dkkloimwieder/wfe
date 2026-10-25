import { createEffect, createSignal, createUniqueId, omit } from 'solid-js'
import type { Accessor } from 'solid-js'
import { Portal, Show } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
import { IconButton } from '../components/NativeFields'
import type { ButtonProps } from '../components/NativeFields'
import { Icon } from '../components/Icon'
import { iconGripVertical } from '../icons'
import { styledClasses } from '../internal/classes'
import { portalMount } from '../internal/portalMount'
import type {
  DragDropEvent,
  DragDropScope,
  DragOperation,
  DraggableRegistration,
} from './types'

export type DragPresentationTone = 'neutral' | 'primary' | 'secondary'
export interface DragDropFeedbackProps<D = unknown> {
  scope: DragDropScope<D>
  /** Connect a handle's aria-describedby to this ID. */
  instructionsId?: string
  instructions?: string | false
  announce?: 'polite' | 'assertive' | 'off'
  message?: (event: DragDropEvent<D>) => string
}

function defaultMessage<D>(event: DragDropEvent<D>) {
  const { source, target } = event.operation
  switch (event.type) {
    case 'start':
      return `Picked up ${source.label}.`
    case 'over':
      return target
        ? `${source.label} over ${target.label}.`
        : `${source.label} has no drop target.`
    case 'drop':
      return `Move requested for ${source.label} to ${event.operation.target.label}.`
    case 'cancel':
      return `Moving ${source.label} canceled.`
  }
}

/** Optional feedback; a drop announces a request, not application acceptance. */
export function DragDropFeedback<D>(props: DragDropFeedbackProps<D>) {
  const id = createUniqueId()
  const [message, setMessage] = createSignal('', { ownedWrite: true })
  createEffect(
    () => props.scope,
    (scope) =>
      scope.subscribe((event) => {
        setMessage(props.message?.(event) ?? defaultMessage(event))
      }),
  )
  return (
    <>
      <Show when={props.instructions !== false}>
        <span class="ui-dnd-sr" id={props.instructionsId ?? id}>
          {props.instructions ??
            'Press Space or Enter to pick up. Use arrow keys to choose a target. Press Space or Enter to request a move, or Escape to cancel.'}
        </span>
      </Show>
      <span
        class="ui-dnd-sr"
        role="status"
        aria-live={props.announce ?? 'polite'}
        aria-atomic="true"
      >
        {message()}
      </span>
    </>
  )
}

export interface DragPreviewProps<D = unknown> {
  scope: DragDropScope<D>
  tone?: DragPresentationTone
  mount?: HTMLElement
  /** Supply display-only content. Do not reuse source DOM, IDs, controls, or field bindings. */
  children?: (operation: Accessor<DragOperation<D>>) => JSX.Element
}

/** Pointer preview; the default renders only a label and never copies source DOM. */
export function DragPreview<D>(props: DragPreviewProps<D>) {
  const [anchor, setAnchor] = createSignal<HTMLSpanElement>()
  const active = () => {
    const operation = props.scope.operation()
    return operation?.input === 'pointer' && operation.point ? operation : null
  }
  const position = (operation: DragOperation<D>): JSX.CSSProperties => {
    const point = operation.point!
    const window = anchor()?.ownerDocument.defaultView
    const width = window?.innerWidth ?? 0
    const height = window?.innerHeight ?? 0
    const x = Math.max(12, Math.min(point.x, width - 12))
    const y = Math.max(12, Math.min(point.y, height - 12))
    const left = x > width / 2
    const above = y > height / 2
    return {
      left: `${x + (left ? -12 : 12)}px`,
      top: `${y + (above ? -12 : 12)}px`,
      translate: `${left ? '-100%' : '0'} ${above ? '-100%' : '0'}`,
      'max-width': `min(30rem, ${Math.max(0, (left ? x : width - x) - 24)}px)`,
      'max-height': `${Math.max(0, (above ? y : height - y) - 24)}px`,
    }
  }
  return (
    <>
      <span hidden ref={setAnchor} />
      <Show when={anchor()}>
        <Show when={active()}>
          {(operation) => (
            <Portal mount={props.mount ?? portalMount(anchor())}>
              <div
                data-ui=""
                class="ui-dnd-preview"
                data-tone={props.tone ?? 'neutral'}
                aria-hidden="true"
                inert
                style={position(operation())}
              >
                {props.children
                  ? props.children(operation)
                  : operation().source.label}
              </div>
            </Portal>
          )}
        </Show>
      </Show>
    </>
  )
}

export interface DropIndicatorProps {
  active: boolean
  orientation?: 'horizontal' | 'vertical'
  tone?: DragPresentationTone
  class?: JSX.HTMLAttributes<HTMLDivElement>['class']
}
/** Place in caller-owned layout; target geometry does not prescribe a layout. */
export function DropIndicator(props: DropIndicatorProps) {
  return (
    <Show when={props.active}>
      <div
        class={styledClasses('ui-dnd-indicator', props.class)}
        aria-hidden="true"
        data-orientation={props.orientation ?? 'horizontal'}
        data-tone={props.tone ?? 'primary'}
      />
    </Show>
  )
}

export type DragHandleProps = Omit<ButtonProps, 'type'> & {
  drag: DraggableRegistration
  label: string
}
/** Shared button styling and decoration; registration owns pointer and keyboard behavior. */
export function DragHandle(props: DragHandleProps) {
  const attributes = omit(props, 'drag', 'label', 'ref', 'children')
  return (
    <IconButton
      {...attributes}
      tone={props.tone ?? 'neutral'}
      type="button"
      aria-label={props.label}
      class={styledClasses('ui-dnd-handle', props.class)}
      data-dragging={props.drag.dragging() ? '' : undefined}
      ref={[props.ref, (element) => props.drag.handleRef(element)]}
    >
      {props.children ?? <Icon glyph={iconGripVertical} />}
    </IconButton>
  )
}
