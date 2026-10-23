import { resolveDecorationGeometry } from './decorationGeometry'
import type { DecorationGeometry } from './decorationGeometry'
import type { ControlDecoration } from '../internal/controlDecoration'
import { createEffect, createSignal, onCleanup } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { styledClasses, type ClassValue } from '../internal/classes'
import { uiScope } from '../styles/density'
import { decorateActions } from './decorations'
import { resolveThemeSizing, type ThemeDensity } from './sizing'
import {
  accents,
  secondaryAccents,
  schemes,
  appearanceStyle,
  defaultDecorations,
  defaultDividers,
  defaultLayers,
} from './appearance'
import type {
  Depth,
  SurfaceLayers,
  TableDividers,
  Decorations,
} from './appearance'

export type ThemeMode = 'light' | 'dark' | 'monochrome'
export type ThemeAccent =
  | 'neutral'
  | 'blue'
  | 'teal'
  | 'green'
  | 'violet'
  | 'pink'
  | 'orange'
  | 'brown'
  | 'choco'
export type ThemeSecondaryAccent =
  ThemeAccent | 'yellow' | 'light-blue' | 'dark-blue'
export type ThemeOptions = {
  density?: ThemeDensity
  decorationGeometry?: Partial<DecorationGeometry>
  inputDecoration?: ControlDecoration
  mode?: ThemeMode
  accent?: ThemeAccent
  secondaryAccent?: ThemeSecondaryAccent
  depth?: Depth
  layers?: Partial<SurfaceLayers>
  dividers?: Partial<TableDividers>
  decorations?: Partial<Omit<Decorations, 'secondary'>>
}
export type ThemeProps = ThemeOptions & {
  children: JSX.Element
  id?: string
  class?: ClassValue
  style?: JSX.CSSProperties
}
const accentNames: readonly ThemeSecondaryAccent[] = [
  'neutral',
  'blue',
  'teal',
  'green',
  'violet',
  'pink',
  'orange',
  'brown',
  'choco',
  'yellow',
  'light-blue',
  'dark-blue',
]

function withDefaults<T extends object>(
  defaults: T,
  overrides?: Partial<T>,
): T {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [
      key,
      overrides?.[key as keyof T] ?? value,
    ]),
  ) as T
}

/** The approved default theme, resolved without browser state. */
export function themeStyle(options: ThemeOptions = {}): JSX.CSSProperties {
  const scheme =
    schemes[
      options.mode === 'dark' ? 2 : options.mode === 'monochrome' ? 0 : 1
    ]!
  const accent =
    accents[accentNames.indexOf(options.accent ?? 'blue')] ?? accents[1]!
  const secondary = accentNames.indexOf(options.secondaryAccent ?? 'blue')
  return {
    ...resolveThemeSizing(options.density),
    ...appearanceStyle(
      scheme,
      accent,
      options.depth ?? 0,
      withDefaults<SurfaceLayers>(defaultLayers, options.layers),
      withDefaults(defaultDividers, options.dividers),
      {
        ...withDefaults(defaultDecorations, options.decorations),
        secondary:
          secondary >= 0 && secondary < secondaryAccents.length ? secondary : 1,
      },
    ),
    '--ui-input-decoration-display':
      options.inputDecoration === false ? 'none' : 'block',
    '--ui-input-decoration-dot-color':
      options.inputDecoration === 'primary'
        ? 'var(--ui-accent)'
        : options.inputDecoration === 'secondary'
          ? 'var(--ui-secondary-accent)'
          : 'var(--ui-neutral-dot-color)',
    '--ui-input-decoration-border-color':
      options.inputDecoration === 'primary'
        ? 'var(--ui-accent)'
        : options.inputDecoration === 'secondary'
          ? 'var(--ui-secondary-accent)'
          : 'var(--ui-neutral-border-color)',
    '--ui-button-color': 'var(--ui-accent)',
    '--ui-button-on-color': 'var(--ui-on-accent)',
  }
}

/** Theme and portal owner. The application owns mode and accent state. */
export function Theme(props: ThemeProps) {
  const scope = uiScope()
  const [element, setElement] = createSignal<HTMLDivElement>()
  let controller: ReturnType<typeof decorateActions> | undefined
  let owner: HTMLDivElement | undefined
  createEffect(
    () => ({
      node: element(),
      geometry: resolveDecorationGeometry(props.decorationGeometry),
    }),
    ({ node, geometry }) => {
      if (!node) return
      if (owner !== node) {
        controller?.dispose()
        owner = node
        controller = decorateActions(node)
      }
      controller?.configure(geometry)
    },
  )
  onCleanup(() => {
    controller?.dispose()
    controller = undefined
  })
  return (
    <div
      {...scope}
      data-ui-density={props.density ?? 'default'}
      id={props.id}
      class={styledClasses('ui-theme', props.class)}
      data-ui-portal-root=""
      data-ui-theme-owner=""
      ref={setElement}
      style={{ ...scope.style, ...themeStyle(props), ...props.style }}
    >
      {props.children}
    </div>
  )
}
