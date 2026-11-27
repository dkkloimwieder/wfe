import { For, omit } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { styledClasses } from '../internal/classes'
import { nativeEventProps, ownedElementEvents } from '../internal/events'

export type SummaryListItem = Readonly<{
  label: JSX.Element
  value: JSX.Element
}>
export type SummaryListProps = Omit<
  JSX.HTMLAttributes<HTMLDListElement>,
  'children'
> & {
  items: readonly SummaryListItem[]
}

/** A native description list with responsive term and value pairs. */
export function SummaryList(props: SummaryListProps) {
  const attributes = omit(props, 'items', 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <dl
      {...attributes}
      class={styledClasses('ui-summary-list', props.class)}
      data-ui=""
      ref={[props.ref, events]}
    >
      <For each={props.items}>
        {(item) => (
          <div>
            <dt data-ui-text="system">{item.label}</dt>
            <dd data-ui-text="value">{item.value}</dd>
          </div>
        )}
      </For>
    </dl>
  )
}
