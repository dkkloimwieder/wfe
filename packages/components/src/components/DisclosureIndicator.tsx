import { useThemePreset } from '../internal/themePreset'
import { Show } from 'solid-js'
import { trianglePath } from '../internal/triangle'
import { createUniqueId } from 'solid-js'
import { styledClasses, type ClassValue } from '../internal/classes'

/** Decorative disclosure glyph. Its surrounding control owns interaction and state. */
export function DisclosureIndicator(props: { class?: ClassValue }) {
  const decorationPattern = createUniqueId()
  const preset = useThemePreset()
  return (
    <svg
      class={styledClasses('ui-disclosure-indicator', props.class)}
      width="8"
      height="12"
      viewBox="0 0 12 18"
      aria-hidden="true"
      {...{ focusable: 'false' }}
    >
      <Show
        when={preset() === 'default'}
        fallback={
          <path
            class="ui-disclosure-chevron"
            d="M4 4 9 9 4 14"
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
              fill="var(--ui-sidebar-accent, var(--ui-accent))"
              fill-opacity="var(--ui-decoration-dot-opacity, 50%)"
              stroke="none"
            />
          </pattern>
        </defs>
        <path
          class="ui-disclosure-decoration"
          d="M-2.150625 -2.64375 14.150625 9 -2.150625 20.64375Z"
          fill={`url(#${decorationPattern})`}
          stroke="var(--ui-sidebar-accent, var(--ui-accent))"
          stroke-opacity="var(--ui-decoration-border-opacity, 100%)"
          vector-effect="non-scaling-stroke"
        />
        <g transform="translate(0.4375 0)">
          <path
            class="ui-disclosure-arrow"
            d={trianglePath}
            vector-effect="non-scaling-stroke"
          />
        </g>
      </Show>
    </svg>
  )
}
