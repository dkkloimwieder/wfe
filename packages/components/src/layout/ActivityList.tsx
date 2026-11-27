import { For, Show, omit } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Badge } from '../components/Display'
import type { DisplayTone } from '../components/Display'
import { styledClasses } from '../internal/classes'
import { nativeEventProps, ownedElementEvents } from '../internal/events'

export type ActivityListItem = {
  time: string
  dateTime?: string
  actor: string
  text: JSX.Element
  tone?: DisplayTone
}

export type ActivityListProps = Omit<
  JSX.HTMLAttributes<HTMLUListElement>,
  'children'
> & { items: readonly ActivityListItem[] }

/** Displays read-only history in the order supplied by the caller. */
export function ActivityList(props: ActivityListProps) {
  const rest = omit(props, 'items', 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <ul
      {...rest}
      class={styledClasses('ui-activity-list', props.class)}
      role="list"
      ref={[props.ref, events]}
    >
      <For each={props.items}>
        {(entry) => (
          <li>
            <div class="ui-activity-list-meta">
              <Show
                when={entry.dateTime}
                fallback={<span data-ui-text="system">{entry.time}</span>}
              >
                <time datetime={entry.dateTime} data-ui-text="system">
                  {entry.time}
                </time>
              </Show>
              <Show
                when={entry.tone}
                fallback={<span data-ui-text="system">{entry.actor}</span>}
              >
                <Badge tone={entry.tone} data-ui-text="system">
                  {entry.actor}
                </Badge>
              </Show>
            </div>
            <div data-ui-text="prose">{entry.text}</div>
          </li>
        )}
      </For>
    </ul>
  )
}
