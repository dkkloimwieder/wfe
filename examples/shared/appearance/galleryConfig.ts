import type { ThemeOptions } from '@wfe/components/theme'
import {
  primaryColors,
  defaultDecorations,
  defaultLayers,
  presetDefaults,
  secondaryColors,
} from './appearance'
import type { Decorations } from './appearance'

/** Gallery presentation defaults shared by the gallery and the theme explorer. */
export const states = ['normal', 'disabled', 'readonly', 'invalid'] as const
export type GalleryState = (typeof states)[number]
export type GalleryConfig = {
  preset: NonNullable<ThemeOptions['preset']>
  decorations: Decorations
  scheme: number
  primary: number
  layers: { canvas: 0 | 1 | 2; pane: 0 | 1 | 2; content: 0 | 1 | 2 }
  state: GalleryState
}
/** The theme owns preset defaults; the gallery only copies them into its route. */
export const layersForPreset = (
  preset: GalleryConfig['preset'],
): GalleryConfig['layers'] => ({ ...presetDefaults[preset].layers })
/** Surface scheme index of the preset's default mode: 0 black and white, 1 light, 2 dark. */
export const schemeForPreset = (preset: GalleryConfig['preset']) =>
  ({ monochrome: 0, light: 1, dark: 2 })[presetDefaults[preset].mode]
export const galleryThemeOptions = (route: GalleryConfig) => ({
  // Decoration choices configure Sketchy only, as in the appearance review.
  decorations:
    route.preset === 'default'
      ? {
          dots: route.decorations.dots,
          border: route.decorations.border,
          inside: route.decorations.inside,
          dotColor: route.decorations.dotColor,
          borderColor: route.decorations.borderColor,
        }
      : undefined,
  primary: primaryColors[
    route.primary
  ]!.name.toLowerCase() as ThemeOptions['primary'],
  secondary: secondaryColors[
    route.decorations.secondary
  ]!.name.toLowerCase().replaceAll(' ', '-') as ThemeOptions['secondary'],
  layers: route.layers,
})
export const defaults: GalleryConfig = {
  preset: 'default',
  decorations: defaultDecorations,
  scheme: 1,
  primary: 1,
  layers: { ...defaultLayers },
  state: 'normal',
}
