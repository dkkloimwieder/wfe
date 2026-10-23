// Open Props samples. MIT, Copyright (c) 2021 Adam Argyle.
// License: ../styles/OPEN-PROPS-LICENSE
// Source: https://raw.githubusercontent.com/argyleink/open-props/f39ab7c377a0e047f930982e3611bbc95254a260/src/props.colors.js
// Source SHA-256: 9197aaccf67264fa1f4acc6c19504f3b79fa7c4c1d684af7e29368dcca4cf39f
// Accent and table-divider samples retain the Open Props provenance above.
// Local adaptation: neutral roles match the measured reference presentation.
// Defaults use Surface 1 for the canvas, Surface 3 for panes, and Surface 2 for content.
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
    surfaces: ['#ffffff', '#fcfcfd', '#f5f5f5', '#e5e5e5'],
    text: ['#262626', '#999999'],
  },
  {
    name: 'Dark',
    mode: 'dark',
    surfaces: ['#171717', '#1b1b1b', '#262626', '#404040'],
    text: ['#e0e0e0', '#bbbbbb'],
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

export const paletteRoles = {
  darkBorder: '#5c5c5c',
  darkRing: '#737373',
  lightRing: '#a3a3a3',
  darkNeutralDot: '#a8a8a8',
  darkDividers: ['#212529', '#343a40', '#495057', '#868e96'],
  lightDividers: ['#fcfcfd', '#e9ecef', '#dee2e6', '#ced4da'],
} as const

/** Frozen legacy entry-point profiles; new consumers use Theme. */
export const legacyPaletteProfiles = [
  {
    selector: ':where(:root)',
    declarations: {
      '--ui-text': '#000',
      '--ui-surface': '#fff',
      '--ui-muted-surface': '#fff',
      '--ui-muted-text': 'currentColor',
      '--ui-subtle-text': 'currentColor',
      '--ui-border': 'currentColor',
      '--ui-divider': 'currentColor',
      '--ui-control-border': 'currentColor',
      '--ui-button-border': 'currentColor',
      '--ui-handle-border': 'currentColor',
      '--ui-hover': '#fff',
      '--ui-disabled-opacity': '1',
    },
  },
  {
    selector: ":where([data-ui][data-ui-theme='dark'])",
    declarations: {
      '--ui-color-scheme': 'dark',
      '--ui-text': '#e8edf4',
      '--ui-surface': '#171d27',
      '--ui-muted-surface': '#252d3a',
      '--ui-muted-text': '#bac4d2',
      '--ui-subtle-text': '#9daabc',
      '--ui-border': '#515d70',
      '--ui-divider': '#3e4859',
      '--ui-control-border': '#72829a',
      '--ui-button-border': '#72829a',
      '--ui-handle-border': '#515d70',
      '--ui-highlight': '#263d5d',
      '--ui-hover': '#212a37',
      '--ui-focus': '#88baff',
      '--ui-error': '#ffa69b',
      '--ui-warning-surface': '#39301c',
      '--ui-warning-text': '#f1d68c',
      '--ui-warning-border': '#a78d4d',
      background: 'var(--ui-surface)',
    },
  },
] as const
