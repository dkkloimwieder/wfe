import {
  createContext,
  createEffect,
  createSignal,
  merge,
  omit,
  onCleanup,
  untrack,
  useContext,
} from 'solid-js'
import type { JSX } from '@solidjs/web'
import { styledClasses } from '../internal/classes'
import {
  callHandler,
  nativeEventProps,
  ownedElementEvents,
} from '../internal/events'
import { Collapsible, type CollapsibleProps } from './Collapsible'

export type AccordionRootProps = JSX.HTMLAttributes<HTMLDivElement> & {
  value?: readonly string[]
  defaultValue?: readonly string[]
  multiple?: boolean
  onValueChange?: (value: string[]) => void
}
export type AccordionItemProps = Omit<
  CollapsibleProps,
  'open' | 'defaultOpen' | 'onOpenChange'
> & {
  value: string
  open?: never
  defaultOpen?: never
  onOpenChange?: never
}
type AccordionState = {
  values: () => readonly string[]
  change: (value: string, open: boolean) => void
}
const AccordionContext = createContext<AccordionState>()

function validValues(values: readonly string[], multiple: boolean) {
  if (
    values.some((value) => typeof value !== 'string' || !value) ||
    new Set(values).size !== values.length
  )
    throw new Error('Accordion values must be unique nonempty strings')
  if (!multiple && values.length > 1)
    throw new Error('A single-open Accordion accepts at most one value')
  return values
}

/** A native disclosure group with retained content and optional application control. */
export function AccordionRoot(props: AccordionRootProps) {
  const controlled = untrack(() => props.value !== undefined)
  let acceptedLocal = untrack(() => [...(props.defaultValue ?? [])])
  const [local, setLocal] = createSignal<readonly string[]>(acceptedLocal)
  const values = () => props.value ?? local()
  validValues(
    untrack(values),
    untrack(() => props.multiple ?? false),
  )
  createEffect(
    () => [props.value, props.multiple, local()] as const,
    ([value, multiple, current]) => {
      if ((value !== undefined) !== controlled)
        throw new Error('Accordion cannot change control mode')
      validValues(controlled ? value! : current, multiple ?? false)
    },
  )
  let root: HTMLDivElement | undefined
  const state: AccordionState = {
    values,
    change(value, open) {
      const current = controlled ? values() : acceptedLocal
      if (current.includes(value) === open) return
      const next = open
        ? props.multiple
          ? [...current, value]
          : [value]
        : current.filter((item) => item !== value)
      if (!controlled) {
        // Signals defer writes. Accumulate accepted requests within the same task.
        acceptedLocal = next
        setLocal(next)
      }
      props.onValueChange?.([...next])
    },
  }
  const events = ownedElementEvents(
    merge(props, {
      onKeyDown(
        event: KeyboardEvent & {
          currentTarget: HTMLDivElement
          target: Element
        },
      ) {
        if (
          callHandler(event, props.onKeyDown) ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        )
          return
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        const node = root
        const target = event.target
        if (
          !node ||
          target.tagName !== 'SUMMARY' ||
          target.parentElement?.parentElement?.closest(
            '[data-accordion-root]',
          ) !== node ||
          !target.parentElement?.hasAttribute('data-accordion-item')
        )
          return
        const summaries = Array.from(
          node.querySelectorAll<HTMLElement>('[data-accordion-item] > summary'),
        ).filter(
          (summary) =>
            summary.parentElement?.parentElement?.closest(
              '[data-accordion-root]',
            ) === node &&
            !summary.closest('[inert]') &&
            summary.tabIndex >= 0 &&
            summary.getClientRects().length > 0,
        )
        const index = summaries.indexOf(target as HTMLElement)
        if (index < 0) return
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? summaries.length - 1
              : (index +
                  (event.key === 'ArrowDown' ? 1 : -1) +
                  summaries.length) %
                summaries.length
        event.preventDefault()
        summaries[next]?.focus()
      },
    }),
  )
  const references = untrack(() => [
    (node: HTMLDivElement) => {
      root = node
    },
    props.ref,
    events,
  ])
  onCleanup(() => {
    root = undefined
  })
  const attributes = omit(
    props,
    'value',
    'defaultValue',
    'multiple',
    'onValueChange',
    'class',
    'ref',
    ...nativeEventProps,
  )
  return (
    <AccordionContext value={state}>
      <div
        {...attributes}
        data-ui=""
        data-accordion-root=""
        class={styledClasses('ui-accordion', props.class)}
        ref={references}
      />
    </AccordionContext>
  )
}

export function AccordionItem(props: AccordionItemProps) {
  const state = useContext(AccordionContext)
  if (!state) throw new Error('Accordion.Item requires Accordion.Root')
  function value() {
    if (typeof props.value !== 'string' || !props.value)
      throw new Error('Accordion.Item requires a nonempty string value')
    return props.value
  }
  untrack(value)
  createEffect(
    () => props.value,
    () => {
      value()
    },
  )
  const attributes = omit(props, 'value', 'open', 'defaultOpen', 'onOpenChange')
  return (
    <Collapsible
      {...attributes}
      data-accordion-item=""
      open={state.values().includes(value())}
      onOpenChange={(open) => state.change(value(), open)}
    />
  )
}

export const Accordion = Object.assign(AccordionRoot, {
  Root: AccordionRoot,
  Item: AccordionItem,
})
