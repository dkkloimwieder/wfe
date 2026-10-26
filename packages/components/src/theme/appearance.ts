// Open Props samples. MIT, Copyright (c) 2021 Adam Argyle.
// License: ../styles/OPEN-PROPS-LICENSE
// Source: https://raw.githubusercontent.com/argyleink/open-props/f39ab7c377a0e047f930982e3611bbc95254a260/src/props.colors.js
// Source SHA-256: 9197aaccf67264fa1f4acc6c19504f3b79fa7c4c1d684af7e29368dcca4cf39f
// Accent and table-divider samples retain the Open Props provenance above.
// Local adaptation: neutral roles match the measured reference presentation.
// Defaults use Surface 1 for the canvas, Surface 3 for panes, and Surface 2 for content.
import type { JSX } from '@solidjs/web'
import { secondaryAccents, monochrome, paletteRoles } from './palette'
import type { Accent, SurfaceScheme } from './palette'
export {
  accents,
  secondaryAccents,
  schemes,
  monochrome,
  neutralAccent,
} from './palette'
export type { Accent, SurfaceScheme } from './palette'

export type Depth = 0 | 1 | 2 | 3
export type SurfaceLevel = 0 | 1 | 2
export type DividerLevel = 0 | 1 | 2 | 3
export type TableDividers = { rows: DividerLevel; columns: DividerLevel }
export const defaultDividers: TableDividers = { rows: 1, columns: 1 }
export type SurfaceLayers = {
  canvas: SurfaceLevel
  pane: SurfaceLevel
  content: SurfaceLevel
}
export const defaultLayers: SurfaceLayers = { canvas: 0, pane: 2, content: 1 }
export const decorationColors = ['neutral', 'primary', 'secondary'] as const
export type DecorationColor = (typeof decorationColors)[number]
export type Decorations = {
  secondary: number
  dots: number
  border: number
  inside: number
  dotColor: DecorationColor
  borderColor: DecorationColor
}
export const defaultDecorations: Decorations = {
  secondary: 1,
  dots: 50,
  border: 100,
  inside: 0,
  dotColor: 'neutral',
  borderColor: 'neutral',
}
export function accentColor(accent: Accent, scheme: SurfaceScheme) {
  return accent[scheme.mode]
}
function accentText(color: string) {
  const channels = color
    .slice(1)
    .match(/../g)!
    .map((part) => {
      const value = parseInt(part, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
  const luminance =
    channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
  return luminance > 0.179 ? monochrome.text[0] : monochrome.surfaces[0]
}
export function dividerSurfaces(scheme: SurfaceScheme) {
  // Table separators retain their independent contrast scale. Canvas and panel
  // surfaces can match without making the default gridlines disappear.
  return scheme.mode === 'dark'
    ? paletteRoles.darkDividers
    : paletteRoles.lightDividers
}
export function appearanceStyle(
  scheme: SurfaceScheme,
  accent: Accent,
  _depth: Depth,
  layers: SurfaceLayers,
  dividers: TableDividers = defaultDividers,
  decorations: Decorations = defaultDecorations,
): JSX.CSSProperties {
  const [, , hover, edge] = scheme.surfaces
  const canvas = scheme.surfaces[layers.canvas]
  const pane = scheme.surfaces[layers.pane]
  const surface = scheme.surfaces[layers.content]
  const [text, secondary] = scheme.text
  const dark = scheme.mode === 'dark'
  const border =
    scheme === monochrome ? text : dark ? paletteRoles.darkBorder : edge
  const controlBorder = border
  const controlSurface = dark
    ? `color-mix(in srgb, ${surface} 95.5%, white)`
    : surface
  const ring = dark ? paletteRoles.darkRing : paletteRoles.lightRing
  const focus = accentColor(accent, scheme)
  const onAccent = accentText(focus)
  const secondaryAccent = accentColor(
    secondaryAccents[decorations.secondary]!,
    scheme,
  )
  const neutralBorder = dark ? border : secondary
  const neutralDot = dark ? paletteRoles.darkNeutralDot : secondary
  const decorationColor = (role: DecorationColor) =>
    role === 'primary'
      ? focus
      : role === 'secondary'
        ? secondaryAccent
        : secondary
  return {
    '--ui-surface-1': scheme.surfaces[0],
    '--ui-surface-2': scheme.surfaces[1],
    '--ui-surface-3': scheme.surfaces[2],
    '--ui-surface-4': scheme.surfaces[3],
    '--ui-secondary-accent': secondaryAccent,
    '--ui-sidebar-accent': focus,
    '--ui-sidebar-neutral': text,
    '--ui-decoration-border': `color-mix(in srgb, ${decorations.borderColor === 'neutral' ? neutralBorder : decorationColor(decorations.borderColor)} ${decorations.border}%, transparent)`,
    '--ui-decoration-dot-opacity': `${decorations.dots}%`,
    '--ui-decoration-border-opacity': `${decorations.border}%`,
    '--ui-action-dot-visibility': `${decorations.inside}%`,
    '--ui-color-scheme': scheme.mode,
    '--ui-canvas-surface': canvas,
    '--ui-pane-surface': pane,
    '--ui-surface': surface,
    '--ui-muted-surface': surface,
    '--ui-skeleton-surface': hover,
    '--ui-popup-surface': surface,
    '--ui-highlight': hover,
    '--ui-hover': hover,
    '--ui-text': text,
    '--ui-heading-color': `color-mix(in srgb, ${text} 80%, ${secondary})`,
    '--ui-muted-text': secondary,
    '--ui-subtle-text': secondary,
    '--ui-border': border,
    '--ui-divider': border,
    '--ui-table-row-divider': dividerSurfaces(scheme)[dividers.rows],
    '--ui-table-column-divider': dividerSurfaces(scheme)[dividers.columns],
    '--ui-control-border': controlBorder,
    '--ui-control-surface': controlSurface,
    '--ui-control-hover': controlSurface,
    '--ui-focus-width': '1px',
    '--ui-focus-offset': '0px',
    '--ui-field-focus-border': ring,
    '--ui-button-border': border,
    '--ui-neutral-dot-color': neutralDot,
    '--ui-neutral-border-color': neutralBorder,
    '--ui-neutral-button-border': dark
      ? border
      : 'var(--ui-button-color, var(--ui-button-border))',
    '--ui-canvas-pattern': `radial-gradient(circle, color-mix(in srgb, ${decorations.dotColor === 'neutral' ? neutralDot : decorationColor(decorations.dotColor)} ${decorations.dots}%, transparent) 0.75px, transparent 0.75px)`,
    '--ui-canvas-pattern-size': '0.3em 0.3em',
    '--ui-handle-border': border,
    '--ui-focus': focus,
    '--ui-focus-ring': ring,
    '--ui-selection': focus,
    '--ui-on-selection': onAccent,
    '--ui-accent': focus,
    '--ui-on-accent': onAccent,
    '--ui-accent-hover': focus,
    '--ui-accent-inverted-hover': onAccent,
    '--ui-shadow-overflow': '24px',
    '--ui-panel-shadow': 'none',
    '--ui-popup-shadow': 'none',
    '--ui-theme-shadow-color':
      scheme.mode === 'dark' ? '220 40% 2%' : '220 3% 15%',
    '--ui-theme-shadow-strength': '100%',
  }
}
