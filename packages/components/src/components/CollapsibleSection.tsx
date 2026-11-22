import { Show, createMemo, omit } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Collapsible, type CollapsibleProps } from './Collapsible'
import { buttonAttributes } from '../internal/buttonPresentation'
import { styledClasses } from '../internal/classes'

export type CollapsibleSectionProps = Omit<
  CollapsibleProps,
  'summary' | 'indicatorPlacement' | 'title'
> & {
  /** Visible section title. It also names the summary. */
  title: JSX.Element
  /** Optional short count after the title, such as "3 active". */
  count?: JSX.Element
  /** Optional decorative icon before the title. */
  icon?: JSX.Element
  /** Marks the section that holds the current selection. */
  active?: boolean
}

/** Titled disclosure section for forms, filters and navigation groups. */
export function CollapsibleSection(props: CollapsibleSectionProps) {
  const icon = createMemo(() => props.icon)
  const attributes = omit(
    props,
    'title',
    'count',
    'icon',
    'active',
    'class',
    'children',
  )
  // The section face shares the action colors and typography of the theme.
  const presentation = buttonAttributes({
    get class() {
      return styledClasses('ui-section', props.class)
    },
  })
  return (
    <Collapsible
      {...attributes}
      {...presentation}
      data-ui-active={props.active ? 'true' : undefined}
      data-text-only={icon() ? undefined : ''}
      indicatorPlacement="end"
      summary={
        <span class="ui-section-control">
          <Show when={icon()} keyed>
            {(value) => (
              <span class="ui-section-icon" aria-hidden="true">
                {value}
              </span>
            )}
          </Show>
          <span class="ui-section-label">
            {/* A count keeps the title in its own element, so the title
                stays findable by its exact text. */}
            <Show when={props.count !== undefined} fallback={props.title}>
              <span>{props.title}</span>
              <span class="ui-section-count">{props.count}</span>
            </Show>
          </span>
        </span>
      }
    >
      {props.children}
    </Collapsible>
  )
}
