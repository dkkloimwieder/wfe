import { DisclosureIndicator } from './DisclosureIndicator'
import { createEffect, merge, omit, onCleanup, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { styledClasses, type ClassValue } from '../internal/classes'
import {
  callHandler,
  nativeEventProps,
  ownedElementEvents,
} from '../internal/events'
import { nativeEvents } from '../utils/nativeEvents'

export type CollapsibleProps = Omit<
  JSX.DetailsHtmlAttributes<HTMLDetailsElement>,
  'children' | 'open' | 'name' | 'onToggle' | 'onBeforeToggle'
> & {
  name?: never
  onToggle?: never
  onBeforeToggle?: never
  summary: JSX.Element
  indicatorPlacement?: 'start' | 'end'
  children: JSX.Element
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  contentClass?: ClassValue
}

/** Native disclosure with mounted content and optional application control. */
export function Collapsible(props: CollapsibleProps) {
  const controlled = untrack(() => props.open !== undefined)
  const initialOpen = untrack(() => props.open ?? props.defaultOpen ?? false)
  let details: HTMLDetailsElement | undefined
  let summary: HTMLElement | undefined
  let observedOpen = initialOpen

  function synchronize(open: boolean) {
    const node = details
    if (!node) return
    const active = node.ownerDocument.activeElement
    if (!open && active && node.contains(active) && !summary?.contains(active))
      summary?.focus({ preventScroll: true })
    if (node.open !== open) node.open = open
  }

  createEffect(
    () => props.open,
    (open) => {
      if ((open !== undefined) !== controlled)
        throw new Error(
          'Collapsible cannot change between controlled and uncontrolled modes',
        )
      if (controlled) synchronize(Boolean(open))
    },
  )

  const events = ownedElementEvents(
    merge(props, {
      onClick(
        event: MouseEvent & {
          currentTarget: HTMLDetailsElement
          target: Element
        },
      ) {
        if (
          callHandler(event, props.onClick) ||
          !controlled ||
          event.button !== 0
        )
          return
        const target = event.target
        // Native summary activation excludes nested interactive controls.
        if (
          !summary?.contains(target) ||
          target.closest(
            'summary, a[href], button, input, select, textarea, label, audio[controls], video[controls], iframe, embed, object, img[usemap], [contenteditable]:not([contenteditable="false"]), [tabindex], [role="button"], [role="link"]',
          ) !== summary
        )
          return
        event.preventDefault()
        props.onOpenChange?.(!Boolean(props.open))
      },
    }),
  )
  const toggles = nativeEvents<HTMLDetailsElement>({
    toggle: () =>
      untrack(() => {
        const node = details
        if (!node) return
        if (controlled) {
          // Prop writes also queue native toggle events. They are not requests.
          if (node.open === Boolean(props.open)) return
          props.onOpenChange?.(node.open)
          synchronize(Boolean(props.open))
        } else if (node.open !== observedOpen) {
          observedOpen = node.open
          props.onOpenChange?.(node.open)
        }
      }),
  })
  const attributes = omit(
    props,
    'summary',
    'indicatorPlacement',
    'children',
    'open',
    'defaultOpen',
    // Native exclusive groups can contradict application-controlled state.
    'name',
    'onToggle',
    'onBeforeToggle',
    'onOpenChange',
    'contentClass',
    'class',
    'ref',
    ...nativeEventProps,
  )
  const references = untrack(() => [
    (node: HTMLDetailsElement) => {
      details = node
    },
    props.ref,
    events,
    toggles,
  ])
  onCleanup(() => {
    details = undefined
    summary = undefined
  })
  return (
    <details
      {...attributes}
      data-ui=""
      class={styledClasses('ui-collapsible', props.class)}
      open={initialOpen}
      ref={references}
    >
      <summary
        class="ui-disclosure-trigger"
        data-indicator-placement={props.indicatorPlacement ?? 'start'}
        ref={(node) => {
          summary = node
        }}
      >
        <DisclosureIndicator />
        {props.summary}
      </summary>
      <div class={styledClasses('ui-collapsible-content', props.contentClass)}>
        {props.children}
      </div>
    </details>
  )
}
