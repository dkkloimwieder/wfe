import { trianglePath, triangleTransform } from '../internal/triangle'
import { styledClasses, type ClassValue } from '../internal/classes'

const paths = {
  form: 'M3 1h10v14H3zM5 4h6M5 8h6M5 12h3',
  grid: 'M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z',
  navigation: 'M2 4h12M2 8h8M2 12h5',
  layout: 'M1 2h14v12H1zM1 5h14M5 5v9',
  check: 'm2 8 4 4 8-9',
  view: 'M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Zm5 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  people:
    'M6 1a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5ZM1 14v-2a5 5 0 0 1 10 0v2M11 2a2.5 2.5 0 0 1 0 5m2 2a4 4 0 0 1 2 3v2',
  key: 'M5 2a3 3 0 1 0 0 6 3 3 0 1 0 0-6Zm2 5 7 7m-3-3 2-2m-4 0 2-2',
  minus: 'M3 8h10',
  cross: 'M3 3l10 10M13 3 3 13',
  'chevron-down': trianglePath,
  'chevron-right': trianglePath,
  'chevron-left': trianglePath,
  refresh:
    'M3 6a5.4 5.4 0 0 1 10 0M13 2v4H9M13 10a5.4 5.4 0 0 1-10 0M3 14v-4h4',
  controls: 'M2 4h3m3 0h6M2 12h7m3 0h2M5 2v4h3V2zM9 10v4h3v-4z',
  filter: 'M2 3h12L9 8v5l-2 1V8Z',
  calendar: 'M3 3h10v11H3zM5 1v4m6-4v4M3 6h10',
} as const

export type IconName = keyof typeof paths
// Snap only axis-aligned glyphs; curves and diagonals retain edge smoothing.
const pixelAligned = new Set<IconName>([
  'form',
  'grid',
  'navigation',
  'layout',
  'minus',
  'controls',
  'calendar',
])
export type IconProps = {
  name: IconName
  class?: ClassValue
}

/** Decorative glyph. The surrounding control supplies its accessible name. */
export function Icon(props: IconProps) {
  const direction = () =>
    props.name === 'chevron-down'
      ? 'down'
      : props.name === 'chevron-left'
        ? 'left'
        : props.name === 'chevron-right'
          ? 'right'
          : undefined
  return (
    <svg
      class={styledClasses('ui-icon', props.class)}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
      {...{ focusable: 'false' }}
    >
      <path
        d={paths[props.name]}
        class={direction() ? 'ui-direction-triangle' : undefined}
        transform={direction() ? triangleTransform(direction()!) : undefined}
        vector-effect={direction() ? 'non-scaling-stroke' : undefined}
        shape-rendering={pixelAligned.has(props.name) ? 'crispEdges' : 'auto'}
      />
    </svg>
  )
}
