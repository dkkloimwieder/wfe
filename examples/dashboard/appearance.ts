// Open Props samples. MIT, Copyright (c) 2021 Adam Argyle.
// License: ./OPEN-PROPS-LICENSE
// Source: https://raw.githubusercontent.com/argyleink/open-props/f39ab7c377a0e047f930982e3611bbc95254a260/src/props.colors.js
// Source SHA-256: 9197aaccf67264fa1f4acc6c19504f3b79fa7c4c1d684af7e29368dcca4cf39f
// Neutral roles follow extra/theme.light.css and extra/theme.dark.css at this commit.
import type { JSX } from '@solidjs/web'

export type SurfaceScheme = {
  name: string
  mode: 'light' | 'dark'
  surfaces: readonly [string, string, string, string]
  text: readonly [string, string]
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
    surfaces: ['#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da'],
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
export function appearanceStyle(
  scheme: SurfaceScheme,
  accent: Accent,
  depth: boolean,
): JSX.CSSProperties {
  const [surface, header, hover, edge] = scheme.surfaces
  const [text, secondary] = scheme.text
  const border = scheme === monochrome ? text : edge
  const focus = accentColor(accent, scheme)
  return {
    '--ui-color-scheme': scheme.mode,
    '--ui-canvas-surface': surface,
    '--ui-pane-surface': header,
    '--ui-section-surface': hover,
    '--ui-surface': surface,
    '--ui-header-surface': header,
    '--ui-muted-surface': header,
    '--ui-popup-surface': header,
    '--ui-highlight': hover,
    '--ui-hover': hover,
    '--ui-text': text,
    '--ui-muted-text': secondary,
    '--ui-subtle-text': secondary,
    '--ui-border': border,
    '--ui-divider': border,
    '--ui-control-border': border,
    '--ui-button-border': border,
    '--ui-handle-border': border,
    '--ui-focus': focus,
    '--ui-panel-shadow': depth ? 'var(--review-shadow-1)' : 'none',
    '--ui-popup-shadow': depth ? 'var(--review-shadow-3)' : 'none',
    '--review-shadow-color':
      scheme.mode === 'dark' ? '220 40% 2%' : '220 3% 15%',
    '--review-shadow-strength': scheme.mode === 'dark' ? '25%' : '1%',
  }
}
