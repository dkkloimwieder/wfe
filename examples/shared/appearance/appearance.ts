// Open Props samples. MIT, Copyright (c) 2021 Adam Argyle.
// License: ./OPEN-PROPS-LICENSE
// Source: https://raw.githubusercontent.com/argyleink/open-props/f39ab7c377a0e047f930982e3611bbc95254a260/src/props.colors.js
// Source SHA-256: 9197aaccf67264fa1f4acc6c19504f3b79fa7c4c1d684af7e29368dcca4cf39f
// Accent and table-divider samples retain the Open Props provenance above.
// Local adaptation: neutral roles match the measured reference presentation.
// Surface 1 is the section; Surface 2 provides slight canvas contrast.
import type { JSX } from '@solidjs/web'

export type SurfaceScheme = {
  name: string
  mode: 'light' | 'dark'
  surfaces: readonly [string, string, string, string]
  text: readonly [string, string]
}
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
export const defaultLayers: SurfaceLayers = { canvas: 0, pane: 0, content: 0 }
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
  dots: 35,
  border: 20,
  inside: 100,
  dotColor: 'neutral',
  borderColor: 'neutral',
}
export type Accent = { name: string; light: string; dark: string }
export const monochrome: SurfaceScheme = {
  name: 'Black / white',
  mode: 'light',
  surfaces: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
  text: ['#000000', '#000000'],
}
export const schemes: readonly SurfaceScheme[] = [
  monochrome,
  {
    name: 'Light',
    mode: 'light',
    surfaces: ['#ffffff', '#fcfcfd', '#f5f5f5', '#e5e5e5'],
    text: ['#0a0a0a', '#737373'],
  },
  {
    name: 'Dark',
    mode: 'dark',
    surfaces: ['#171717', '#1b1b1b', '#262626', '#404040'],
    text: ['#fafafa', '#a1a1a1'],
  },
]
export const neutralAccent: Accent = {
  name: 'Neutral',
  light: '#000000',
  dark: '#ffffff',
}
export const accents: readonly Accent[] = [
  neutralAccent,
  { name: 'Blue', light: '#1971c2', dark: '#4dabf7' },
  { name: 'Teal', light: '#087f5b', dark: '#63e6be' },
  { name: 'Green', light: '#2b8a3e', dark: '#8ce99a' },
  { name: 'Violet', light: '#7048e8', dark: '#e5dbff' },
  { name: 'Pink', light: '#a61e4d', dark: '#faa2c1' },
  { name: 'Orange', light: '#f76707', dark: '#ffe8cc' },
  { name: 'Brown', light: '#6f4b2d', dark: '#d3b79e' },
  { name: 'Choco', light: '#8a4513', dark: '#f1b280' },
]
export const secondaryAccents: readonly Accent[] = [
  ...accents,
  { name: 'Yellow', light: '#fcc419', dark: '#ffe066' },
  { name: 'Light blue', light: '#74c0fc', dark: '#74c0fc' },
  { name: 'Dark blue', light: '#1864ab', dark: '#1971c2' },
]
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
    ? (['#212529', '#343a40', '#495057', '#868e96'] as const)
    : (['#fcfcfd', '#e9ecef', '#dee2e6', '#ced4da'] as const)
}
export function appearanceStyle(
  scheme: SurfaceScheme,
  accent: Accent,
  depth: Depth,
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
    scheme === monochrome ? text : dark ? 'rgb(255 255 255 / 0.1)' : edge
  const controlBorder = dark ? 'rgb(255 255 255 / 0.15)' : border
  const controlSurface = dark
    ? `color-mix(in srgb, ${surface} 95.5%, white)`
    : surface
  const ring = dark ? '#737373' : '#a3a3a3'
  const focus = accentColor(accent, scheme)
  const onAccent = accentText(focus)
  const opposite =
    onAccent === monochrome.text[0]
      ? monochrome.surfaces[0]
      : monochrome.text[0]
  const hoverTarget = focus === opposite ? onAccent : opposite
  const secondaryAccent = accentColor(
    secondaryAccents[decorations.secondary]!,
    scheme,
  )
  const decorationColor = (role: DecorationColor) =>
    role === 'primary'
      ? focus
      : role === 'secondary'
        ? secondaryAccent
        : secondary
  return {
    '--ui-secondary-accent': secondaryAccent,
    '--ui-sidebar-accent': focus,
    '--ui-sidebar-neutral': text,
    '--ui-decoration-border': `color-mix(in srgb, ${decorationColor(decorations.borderColor)} ${decorations.border}%, transparent)`,
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
    '--ui-canvas-pattern': `radial-gradient(circle, color-mix(in srgb, ${decorationColor(decorations.dotColor)} ${decorations.dots}%, transparent) 0.5px, transparent 0.75px)`,
    '--ui-canvas-pattern-size': '0.3em 0.3em',
    '--ui-handle-border': border,
    '--ui-focus': focus,
    '--ui-focus-ring': `color-mix(in srgb, ${ring} 50%, transparent)`,
    '--ui-selection': focus,
    '--ui-on-selection': onAccent,
    '--ui-accent': focus,
    '--ui-on-accent': onAccent,
    '--ui-accent-hover': `color-mix(in srgb, ${focus} 90%, ${hoverTarget})`,
    '--ui-accent-inverted-hover': `color-mix(in srgb, ${onAccent} 95%, ${focus})`,
    '--ui-shadow-overflow': '24px',
    '--ui-panel-shadow': depth ? `var(--review-shadow-${depth})` : 'none',
    '--ui-popup-shadow': depth ? 'var(--review-shadow-3)' : 'none',
    '--review-shadow-color':
      scheme.mode === 'dark' ? '220 40% 2%' : '220 3% 15%',
    '--review-shadow-strength': scheme.mode === 'dark' ? '25%' : '1%',
  }
}
