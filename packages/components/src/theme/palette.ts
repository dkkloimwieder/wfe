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
export type PaletteRoles = typeof paletteRoles
