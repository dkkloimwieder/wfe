// Open Props samples. MIT, Copyright (c) 2021 Adam Argyle.
// License: ./OPEN-PROPS-LICENSE
// Source: https://raw.githubusercontent.com/argyleink/open-props/f39ab7c377a0e047f930982e3611bbc95254a260/src/props.colors.js
// Source SHA-256: 9197aaccf67264fa1f4acc6c19504f3b79fa7c4c1d684af7e29368dcca4cf39f
// Neutral roles follow extra/theme.light.css and extra/theme.dark.css at this commit.
// Local adaptation: Light Surface 1 uses #fcfcfd, between gray-0 and white.
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
export const defaultDividers: TableDividers = { rows: 0, columns: 0 }
export type SurfaceLayers = {
  canvas: SurfaceLevel
  pane: SurfaceLevel
  content: SurfaceLevel
}
export const defaultLayers: SurfaceLayers = { canvas: 0, pane: 0, content: 0 }
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
    surfaces: ['#fcfcfd', '#e9ecef', '#dee2e6', '#ced4da'],
    text: ['#030507', '#495057'],
  },
  {
    name: 'Dark',
    mode: 'dark',
    surfaces: ['#212529', '#343a40', '#495057', '#868e96'],
    text: ['#f8f9fa', '#ced4da'],
  },
]
export const neutralAccent: Accent = {
  name: 'Neutral',
  light: '#000000',
  dark: '#ffffff',
}
export const accents: readonly Accent[] = [
  neutralAccent,
  { name: 'Blue', light: '#1864ab', dark: '#74c0fc' },
  { name: 'Teal', light: '#087f5b', dark: '#63e6be' },
  { name: 'Green', light: '#2b8a3e', dark: '#8ce99a' },
  { name: 'Violet', light: '#5f3dc4', dark: '#b197fc' },
  { name: 'Pink', light: '#a61e4d', dark: '#faa2c1' },
  { name: 'Orange', light: '#d9480f', dark: '#ffc078' },
  { name: 'Brown', light: '#6f4b2d', dark: '#d3b79e' },
  { name: 'Choco', light: '#8a4513', dark: '#f1b280' },
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
  return (scheme === monochrome ? schemes[1]! : scheme).surfaces
}
export function appearanceStyle(
  scheme: SurfaceScheme,
  accent: Accent,
  depth: Depth,
  layers: SurfaceLayers,
  dividers: TableDividers = defaultDividers,
): JSX.CSSProperties {
  const [, , hover, edge] = scheme.surfaces
  const canvas = scheme.surfaces[layers.canvas]
  const pane = scheme.surfaces[layers.pane]
  const surface = scheme.surfaces[layers.content]
  const [text, secondary] = scheme.text
  const border = scheme === monochrome ? text : edge
  const focus = accentColor(accent, scheme)
  const onAccent = accentText(focus)
  const opposite =
    onAccent === monochrome.text[0]
      ? monochrome.surfaces[0]
      : monochrome.text[0]
  const hoverTarget = focus === opposite ? onAccent : opposite
  return {
    '--ui-color-scheme': scheme.mode,
    '--ui-canvas-surface': canvas,
    '--ui-pane-surface': pane,
    '--ui-surface': surface,
    '--ui-muted-surface': surface,
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
    '--ui-control-border': border,
    '--ui-button-border': border,
    '--ui-handle-border': border,
    '--ui-focus': focus,
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
