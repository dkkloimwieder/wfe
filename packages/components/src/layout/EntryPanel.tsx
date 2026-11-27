import { children, createUniqueId, omit, Show } from 'solid-js'
import { Dynamic } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
import { Card } from '../components/Display'
import { styledClasses } from '../internal/classes'
import { nativeEventProps, ownedElementEvents } from '../internal/events'

export type EntryPanelProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'title'
> & {
  /** Defaults to the viewport. Content uses the natural height of the surface. */
  size?: 'viewport' | 'container' | 'content'
  title?: JSX.Element
  /** Heading level for the title. Defaults to h2. */
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

/** Centers a content-sized surface without owning a form or application policy. */
export function EntryPanel(props: EntryPanelProps) {
  const attributes = omit(
    props,
    'size',
    'title',
    'titleAs',
    'children',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(props)
  const titleId = `entry-panel-title-${createUniqueId()}`
  const title = children(() => props.title)
  const hasTitle = () =>
    title
      .toArray()
      .some(
        (value) => value != null && typeof value !== 'boolean' && value !== '',
      )
  return (
    <div
      {...attributes}
      class={styledClasses('ui-entry-panel', props.class)}
      data-size={props.size ?? 'viewport'}
      aria-labelledby={
        props['aria-labelledby'] ??
        (props.role && !props['aria-label'] && hasTitle() ? titleId : undefined)
      }
      ref={[props.ref, events]}
    >
      <Card class="ui-entry-panel-surface">
        <Show when={hasTitle()}>
          <Dynamic
            component={props.titleAs ?? 'h2'}
            id={titleId}
            class="ui-entry-panel-title"
          >
            {title()}
          </Dynamic>
        </Show>
        {props.children}
      </Card>
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
