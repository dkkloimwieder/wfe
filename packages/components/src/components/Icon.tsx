import { styledClasses, type ClassValue } from '../internal/classes'

const paths = {
  check: 'm2 8 4 4 8-9',
  minus: 'M3 8h10',
  cross: 'M3 3l10 10M13 3 3 13',
  'chevron-down': 'm4 6 4 4 4-4',
  'chevron-right': 'm6 4 4 4-4 4',
  'chevron-left': 'm10 4-4 4 4 4',
  refresh:
    'M3 6a5.4 5.4 0 0 1 10 0M13 2v4H9M13 10a5.4 5.4 0 0 1-10 0M3 14v-4h4',
  controls: 'M2 4h3m3 0h6M2 12h7m3 0h2M5 2v4h3V2zM9 10v4h3v-4z',
  filter: 'M2 3h12L9 8v5l-2 1V8Z',
  calendar: 'M3 3h10v11H3zM5 1v4m6-4v4M3 6h10',
} as const

export type IconName = keyof typeof paths
export type IconProps = {
  name: IconName
  class?: ClassValue
}

/** Decorative glyph. The surrounding control supplies its accessible name. */
export function Icon(props: IconProps) {
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
      <path d={paths[props.name]} />
    </svg>
  )
}
