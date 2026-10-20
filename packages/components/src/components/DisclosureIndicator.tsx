import { createUniqueId } from 'solid-js'
import { styledClasses, type ClassValue } from '../internal/classes'

/** Decorative disclosure glyph. Its surrounding control owns interaction and state. */
export function DisclosureIndicator(props: { class?: ClassValue }) {
  const decorationPattern = createUniqueId()
  return (
    <svg
      class={styledClasses('ui-disclosure-indicator', props.class)}
      width="8"
      height="12"
      viewBox="0 0 12 18"
      aria-hidden="true"
      {...{ focusable: 'false' }}
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
        d="M-1.18375 -2.64375 15.1175 9 -1.18375 20.64375Z"
        fill={`url(#${decorationPattern})`}
        stroke="var(--ui-sidebar-accent, var(--ui-accent))"
        stroke-opacity="var(--ui-decoration-border-opacity, 100%)"
        vector-effect="non-scaling-stroke"
      />
      <path
        class="ui-disclosure-arrow"
        d="M1.625 3.375 9.5 9 1.625 14.625Z"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  )
}
