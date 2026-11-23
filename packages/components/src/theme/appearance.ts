// Open Props samples. MIT, Copyright (c) 2021 Adam Argyle.
// License: ../styles/OPEN-PROPS-LICENSE
// Source: https://raw.githubusercontent.com/argyleink/open-props/f39ab7c377a0e047f930982e3611bbc95254a260/src/props.colors.js
// Source SHA-256: 9197aaccf67264fa1f4acc6c19504f3b79fa7c4c1d684af7e29368dcca4cf39f
// Accent and table-divider samples retain the Open Props provenance above.
// Local adaptation: neutral roles match the measured reference presentation.
// Theme token values live in tokens.ts. This module holds application choice types.
export {
  primaryColors,
  secondaryColors,
  schemes,
  monochrome,
  neutralColor,
} from './palette'
export type { PaletteColor, SurfaceScheme } from './palette'

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
export { paletteColorName, presetDefaults, presetSchemes } from './tokens'
