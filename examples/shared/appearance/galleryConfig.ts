import type { ThemeOptions } from '@wfe/components/theme'
import {
  accents,
  defaultDecorations,
  defaultLayers,
  secondaryAccents,
} from './appearance'
import type { Decorations } from './appearance'

/** Gallery presentation defaults shared by the gallery and the theme explorer. */
export const states = ['normal', 'disabled', 'readonly', 'invalid'] as const
export type GalleryState = (typeof states)[number]
export type GalleryConfig = {
  preset: NonNullable<ThemeOptions['preset']>
  decorations: Decorations
  scheme: number
  accent: number
  layers: { canvas: 0 | 1 | 2; pane: 0 | 1 | 2; content: 0 | 1 | 2 }
  state: GalleryState
}
export const layersForPreset = (
  preset: GalleryConfig['preset'],
): GalleryConfig['layers'] =>
  preset === 'laser'
    ? { canvas: 0, pane: 1, content: 1 }
    : preset === 'vanilla'
      ? { canvas: 1, pane: 0, content: 0 }
      : { ...defaultLayers }
export const galleryThemeOptions = (route: GalleryConfig) => ({
  accent: accents[route.accent]!.name.toLowerCase() as ThemeOptions['accent'],
  secondaryAccent: secondaryAccents[
    route.decorations.secondary
  ]!.name.toLowerCase().replaceAll(' ', '-') as ThemeOptions['secondaryAccent'],
  layers: route.layers,
})
export const defaults: GalleryConfig = {
  preset: 'default',
  decorations: defaultDecorations,
  scheme: 1,
  accent: 1,
  layers: { ...defaultLayers },
  state: 'normal',
}
