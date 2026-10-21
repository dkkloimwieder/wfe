import { omit } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Card } from '../components/Display'
import { styledClasses } from '../internal/classes'
import { nativeEventProps, ownedElementEvents } from '../internal/events'

export type EntryPanelProps = JSX.HTMLAttributes<HTMLDivElement> & {
  /** A full screen by default, or the height supplied by a containing layout. */
  size?: 'viewport' | 'container'
}

/** Centers a content-sized surface without owning a form or application policy. */
export function EntryPanel(props: EntryPanelProps) {
  const attributes = omit(props, 'size', 'children', 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <div
      {...attributes}
      class={styledClasses('ui-entry-panel', props.class)}
      data-size={props.size ?? 'viewport'}
      ref={[props.ref, events]}
    >
      <Card class="ui-entry-panel-surface">{props.children}</Card>
    </div>
  )
}

export type EntryPanelActionsProps = JSX.HTMLAttributes<HTMLDivElement>

/** Equal-width actions fill the content width without changing button behavior. */
export function EntryPanelActions(props: EntryPanelActionsProps) {
  const attributes = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <div
      {...attributes}
      class={styledClasses('ui-entry-panel-actions', props.class)}
      ref={[props.ref, events]}
    />
  )
}
