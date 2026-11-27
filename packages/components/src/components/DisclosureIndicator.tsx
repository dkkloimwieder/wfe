import { useThemeDecoration } from '../internal/themePreset'
import { Show } from 'solid-js'
import { trianglePath } from '../internal/triangle'
import { createUniqueId } from 'solid-js'
import { styledClasses, type ClassValue } from '../internal/classes'

const glyphLines = {
  plus: 'M4 9H14M9 4V14',
  minus: 'M4 9H14',
  chevron: 'M4 4 9 9 4 14',
}

const glyphFills = {
  plus: 'M6 0H12V6H18V12H12V18H6V12H0V6H6Z',
  minus: 'M0 6H18V12H0Z',
  chevron: 'M2 1 11 9 2 17 2 12 6 9 2 6Z',
}

/** Decorative disclosure glyph. Its surrounding control owns interaction and state. */
export function DisclosureIndicator(props: {
  class?: ClassValue
  shape?: keyof typeof glyphLines
}) {
  const decorationPattern = createUniqueId()
  const decorated = useThemeDecoration()
  const line = () => glyphLines[props.shape ?? 'chevron']
  return (
    <svg
      class={styledClasses('ui-disclosure-indicator', props.class)}
      data-shape={props.shape}
      width="8"
      height="12"
      viewBox={
        props.shape === 'plus' || props.shape === 'minus'
          ? '0 0 18 18'
          : '0 0 12 18'
      }
      aria-hidden="true"
      {...{ focusable: 'false' }}
    >
      <Show
        when={decorated()}
        fallback={
          <path
            class="ui-disclosure-chevron"
            d={line()}
            fill="none"
            vector-effect="non-scaling-stroke"
          />
        }
      >
        <defs>
          <pattern
            id={decorationPattern}
            width="0.3em"
            height="0.3em"
            patternUnits="userSpaceOnUse"
          >
            <rect
              width="100%"
              height="100%"
              fill="var(--ui-canvas-surface, white)"
              stroke="none"
            />
            <circle
              cx="0.75"
              cy="0.75"
              r="0.75"
              fill="var(--ui-sidebar-primary, var(--ui-primary))"
              fill-opacity="var(--ui-decoration-dot-opacity, 50%)"
              stroke="none"
            />
          </pattern>
        </defs>
        <path
          class="ui-disclosure-decoration"
          d={
            props.shape
              ? glyphFills[props.shape]
              : 'M-2.150625 -2.64375 14.150625 9 -2.150625 20.64375Z'
          }
          fill={`url(#${decorationPattern})`}
          stroke="var(--ui-sidebar-primary, var(--ui-primary))"
          stroke-opacity="var(--ui-decoration-border-opacity, 100%)"
          vector-effect="non-scaling-stroke"
        />
        <g transform={props.shape ? undefined : 'translate(0.4375 0)'}>
          <path
            class="ui-disclosure-arrow"
            d={props.shape ? line() : trianglePath}
            vector-effect="non-scaling-stroke"
          />
        </g>
      </Show>
    </svg>
  )
}
