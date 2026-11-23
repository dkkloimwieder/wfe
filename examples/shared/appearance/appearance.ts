export * from '@wfe/components/theme'
import { paletteColorName, monochrome } from '@wfe/components/theme'
import type {
  PaletteColor,
  SurfaceScheme,
  ThemePrimary,
  ThemeMode,
} from '@wfe/components/theme'

/** Theme mode for an appearance review surface scheme. */
export const schemeMode = (scheme: SurfaceScheme): ThemeMode =>
  scheme === monochrome ? 'monochrome' : scheme.mode

/** Theme primary option for an appearance review color. */
export const primaryOption = (color: PaletteColor) =>
  paletteColorName(color) as ThemePrimary
