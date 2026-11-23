import { ThemeDecorationContext } from '../internal/themePreset'
import type { ThemePreset } from '../internal/themePreset'
import { PortalOwner } from '../internal/portalOwner'
import { resolveDecorationGeometry } from './decorationGeometry'
import type { DecorationGeometry } from './decorationGeometry'
import type { ControlDecoration } from '../internal/controlDecoration'
import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { styledClasses, type ClassValue } from '../internal/classes'
import { UI_DENSITIES } from '../styles/density'
import { decorateActions } from './decorations'
import {
  primaryColors,
  paletteRoles,
  schemes,
  secondaryColors,
  accentColors,
} from './palette'
import {
  presetDefaults,
  resolveTokenBlocks,
  resolveTokenSources,
  tokenAttributes,
  tokenBlocks,
} from './tokens'
import type { TokenChoices } from './tokens'
import type { SurfaceLayers, TableDividers, Decorations } from './appearance'

export type ThemeMode = 'light' | 'dark' | 'monochrome'
export type ThemeDensity = 'default' | 'compact' | 'comfortable'
export type ThemePrimary =
  | 'neutral'
  | 'blue'
  | 'teal'
  | 'green'
  | 'violet'
  | 'pink'
  | 'orange'
  | 'brown'
  | 'choco'
export type ThemeSecondary =
  ThemePrimary | 'yellow' | 'light-blue' | 'dark-blue'
export type ThemeAccent = ThemeSecondary
export type ThemeOptions = {
  preset?: ThemePreset
  density?: ThemeDensity
  decorationGeometry?: Partial<DecorationGeometry>
  inputDecoration?: ControlDecoration
  mode?: ThemeMode
  /** Dotted decoration and its randomized geometry. Sketchy turns it on by default. */
  decoration?: boolean
  /** Neon glow on hover, selection and checked controls. Laser turns it on by default. */
  glow?: boolean
  primary?: ThemePrimary
  secondary?: ThemeSecondary
  accent?: ThemeAccent
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

/** Every token block of the theme, in cascade order. styles/tokens.css holds the same blocks. */
export const themeTokenBlocks = tokenBlocks({
  schemes,
  primaryColors,
  secondaryColors,
  accentColors,
  roles: paletteRoles,
  densities: UI_DENSITIES,
})

/** The choices that select token blocks, with preset defaults applied. */
export function themeChoices(options: ThemeOptions = {}): TokenChoices {
  const preset = options.preset ?? 'default'
  return {
    preset,
    mode: options.mode ?? presetDefaults[preset].mode,
    density: options.density ?? 'default',
    primary: options.primary,
    secondary: options.secondary,
    accent: options.accent,
    canvas: options.layers?.canvas,
    pane: options.layers?.pane,
    content: options.layers?.content,
    rowDivider: options.dividers?.rows,
    columnDivider: options.dividers?.columns,
    dotColor: options.decorations?.dotColor,
    borderColor: options.decorations?.borderColor,
    inputDecoration:
      options.inputDecoration === false ? 'none' : options.inputDecoration,
  }
}

/** Whether the dotted decoration layer applies, with the preset default. */
export function themeDecoration(options: ThemeOptions = {}) {
  return (
    options.decoration ?? presetDefaults[options.preset ?? 'default'].decoration
  )
}

/** Whether the glow layer applies, with the preset default. */
export function themeGlow(options: ThemeOptions = {}) {
  return options.glow ?? presetDefaults[options.preset ?? 'default'].glow
}

/** Continuous decoration values have no block. They stay inline on the root. */
function decorationStyle(options: ThemeOptions): Record<string, string> {
  const style: Record<string, string> = {}
  const value = options.decorations
  if (value?.dots !== undefined)
    style['--ui-decoration-dot-opacity'] = `${value.dots}%`
  if (value?.border !== undefined)
    style['--ui-decoration-border-opacity'] = `${value.border}%`
  if (value?.inside !== undefined)
    style['--ui-action-dot-visibility'] = `${value.inside}%`
  return style
}

/** Root attributes and style that select the theme tokens without Theme. */
export function themeAttributes(options: ThemeOptions = {}) {
  const choices = themeChoices(options)
  const attributes: Record<string, string> = { 'data-ui-tokens': '' }
  for (const [key, value] of Object.entries(choices) as [
    keyof TokenChoices,
    TokenChoices[keyof TokenChoices],
  ][])
    if (value !== undefined) attributes[tokenAttributes[key]] = String(value)
  if (themeDecoration(options)) attributes['data-ui-decoration'] = ''
  if (themeGlow(options)) attributes['data-ui-glow'] = ''
  return { attributes, style: decorationStyle(options) as JSX.CSSProperties }
}

/** The declared token values for these options, as the style sheet resolves them. */
export function themeTokens(
  options: ThemeOptions = {},
): Record<string, string> {
  return {
    ...resolveTokenBlocks(themeTokenBlocks, themeChoices(options)),
    ...decorationStyle(options),
  }
}

/** The token block that sets each token for these options. */
export function themeTokenSources(
  options: ThemeOptions = {},
): Record<string, string> {
  return {
    ...resolveTokenSources(themeTokenBlocks, themeChoices(options)),
    ...Object.fromEntries(
      Object.keys(decorationStyle(options)).map((name) => [
        name,
        'Inline decoration choice',
      ]),
    ),
  }
}

/** Token values with var() references replaced where the theme defines them. */
export function resolveThemeTokens(
  options: ThemeOptions = {},
): Record<string, string> {
  const declared = themeTokens(options)
  const resolve = (value: string, depth = 0): string =>
    depth > 20
      ? value
      : value.replace(
          /var\(\s*(--[\w-]+)\s*(?:,([^()]*(?:\([^()]*\)[^()]*)*))?\)/g,
          (match, name: string, fallback?: string) => {
            const next = declared[name] ?? fallback?.trim()
            return next === undefined ? match : resolve(next, depth + 1)
          },
        )
  return Object.fromEntries(
    Object.entries(declared).map(([name, value]) => [name, resolve(value)]),
  )
}

/** Theme and portal owner. The application owns mode and palette state. */
export function Theme(props: ThemeProps) {
  const [element, setElement] = createSignal<HTMLDivElement>()
  const choices = createMemo(() => themeChoices(props))
  let controller: ReturnType<typeof decorateActions> | undefined
  let owner: HTMLDivElement | undefined
  createEffect(
    () => ({
      node: element(),
      decorated: themeDecoration(props),
      geometry: resolveDecorationGeometry(props.decorationGeometry),
    }),
    ({ node, geometry, decorated }) => {
      if (!node || !decorated) {
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
    <ThemeDecorationContext value={() => themeDecoration(props)}>
      <PortalOwner value={element}>
        <div
          data-ui=""
          data-ui-tokens=""
          data-ui-preset={choices().preset}
          data-ui-mode={choices().mode}
          data-ui-density={choices().density}
          data-ui-primary={choices().primary}
          data-ui-secondary={choices().secondary}
          data-ui-accent={choices().accent}
          data-ui-canvas={choices().canvas}
          data-ui-pane={choices().pane}
          data-ui-content={choices().content}
          data-ui-row-divider={choices().rowDivider}
          data-ui-column-divider={choices().columnDivider}
          data-ui-dot-color={choices().dotColor}
          data-ui-border-color={choices().borderColor}
          data-ui-input-decoration={choices().inputDecoration}
          data-ui-decoration={themeDecoration(props) ? '' : undefined}
          data-ui-glow={themeGlow(props) ? '' : undefined}
          id={props.id}
          class={styledClasses('ui-theme', props.class)}
          data-ui-portal-root=""
          data-ui-theme-owner=""
          ref={setElement}
          style={{ ...decorationStyle(props), ...props.style }}
        >
          {props.children}
        </div>
      </PortalOwner>
    </ThemeDecorationContext>
  )
}
