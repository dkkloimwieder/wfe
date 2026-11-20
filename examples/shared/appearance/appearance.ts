export * from '@wfe/components/theme'
import { accentName, monochrome } from '@wfe/components/theme'
import type {
  Accent,
  SurfaceScheme,
  ThemeAccent,
  ThemeMode,
} from '@wfe/components/theme'

/** Theme mode for an appearance review surface scheme. */
export const schemeMode = (scheme: SurfaceScheme): ThemeMode =>
  scheme === monochrome ? 'monochrome' : scheme.mode

/** Theme accent option for an appearance review accent. */
export const accentOption = (accent: Accent) =>
  accentName(accent) as ThemeAccent
