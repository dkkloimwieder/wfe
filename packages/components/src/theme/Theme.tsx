import { vanillaStyle } from './vanilla'
import { laserStyle } from './laser'
import { ThemePresetContext } from '../internal/themePreset'
import type { ThemePreset } from '../internal/themePreset'
import { PortalOwner } from '../internal/portalOwner'
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
  preset?: ThemePreset
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
  const mode = options.mode ?? (options.preset === 'laser' ? 'dark' : 'light')
  const scheme = schemes[mode === 'dark' ? 2 : mode === 'monochrome' ? 0 : 1]!
  const accent =
    accents[accentNames.indexOf(options.accent ?? 'blue')] ?? accents[1]!
  const secondary = accentNames.indexOf(options.secondaryAccent ?? 'blue')
  const vanillaPrimary =
    options.mode === 'monochrome'
      ? '#000000'
      : scheme.mode === 'dark'
        ? '#fafafa'
        : '#18181b'
  const vanillaOnPrimary =
    options.mode === 'monochrome'
      ? '#ffffff'
      : scheme.mode === 'dark'
        ? '#18181b'
        : '#fafafa'
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
    '--ui-input-disclosure-arrow-visibility':
      options.inputDecoration === false ? 'visible' : 'hidden',
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
    '--ui-system-text-transform': 'uppercase',
    '--ui-border-width': '1px',
    '--ui-radius': '0px',
    '--ui-control-radius': 'var(--ui-radius)',
    '--ui-popup-radius': 'var(--ui-radius)',
    '--ui-panel-radius': 'var(--ui-radius)',
    '--ui-radio-radius': 'var(--ui-control-radius)',
    '--ui-switch-radius': 'var(--ui-control-radius)',
    '--ui-control-border-width': 'var(--ui-border-width)',
    '--ui-divider-width': 'var(--ui-border-width)',
    '--ui-icon-stroke-width': '1',
    '--ui-disabled-opacity': '1',
    '--ui-error': '#9d251e',
    '--ui-connector-stroke-width': '1.5',

    ...(options.preset === 'vanilla'
      ? {
          ...vanillaStyle(
            scheme,
            options.density,
            options.mode === 'monochrome',
            options.layers,
          ),
          ...(options.accent === undefined
            ? {
                '--ui-accent': vanillaPrimary,
                '--ui-on-accent': vanillaOnPrimary,
                '--ui-selection': vanillaPrimary,
                '--ui-on-selection': vanillaOnPrimary,
                '--ui-focus': vanillaPrimary,
              }
            : {}),
          '--ui-accent-hover': 'var(--ui-accent)',
          '--ui-accent-inverted-hover': 'var(--ui-on-accent)',
        }
      : {}),
    ...(options.preset === 'laser'
      ? laserStyle(
          mode,
          accent,
          secondaryAccents[secondary] ?? secondaryAccents[1]!,
          options.density,
          options.layers,
        )
      : {}),
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
      preset: props.preset ?? 'default',
      geometry: resolveDecorationGeometry(props.decorationGeometry),
    }),
    ({ node, geometry, preset }) => {
      if (!node || preset !== 'default') {
        controller?.dispose()
        controller = undefined
        owner = undefined
        return
      }
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
    <ThemePresetContext value={() => props.preset ?? 'default'}>
      <PortalOwner value={element}>
        <div
          {...scope}
          data-ui-preset={props.preset ?? 'default'}
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
      </PortalOwner>
    </ThemePresetContext>
  )
}
