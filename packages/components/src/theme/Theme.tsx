import { ThemePresetContext } from '../internal/themePreset'
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
import { accents, paletteRoles, schemes, secondaryAccents } from './palette'
import {
  presetDefaults,
  resolveTokenBlocks,
  tokenAttributes,
  tokenBlocks,
} from './tokens'
import type { TokenChoices } from './tokens'
import type { SurfaceLayers, TableDividers, Decorations } from './appearance'

export type ThemeMode = 'light' | 'dark' | 'monochrome'
export type ThemeDensity = 'default' | 'compact' | 'comfortable'
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
  accents,
  secondaryAccents,
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
    accent: options.accent,
    secondaryAccent: options.secondaryAccent,
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

/** Theme and portal owner. The application owns mode and accent state. */
export function Theme(props: ThemeProps) {
  const [element, setElement] = createSignal<HTMLDivElement>()
  const choices = createMemo(() => themeChoices(props))
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
          data-ui=""
          data-ui-tokens=""
          data-ui-preset={choices().preset}
          data-ui-mode={choices().mode}
          data-ui-density={choices().density}
          data-ui-accent={choices().accent}
          data-ui-secondary-accent={choices().secondaryAccent}
          data-ui-canvas={choices().canvas}
          data-ui-pane={choices().pane}
          data-ui-content={choices().content}
          data-ui-row-divider={choices().rowDivider}
          data-ui-column-divider={choices().columnDivider}
          data-ui-dot-color={choices().dotColor}
          data-ui-border-color={choices().borderColor}
          data-ui-input-decoration={choices().inputDecoration}
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
    </ThemePresetContext>
  )
}
