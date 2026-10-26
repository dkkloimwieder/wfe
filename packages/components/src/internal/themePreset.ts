import { createContext, useContext } from 'solid-js'
import type { Accessor } from 'solid-js'

export type ThemePreset = 'default' | 'vanilla' | 'laser'

/** An accessor keeps theme changes reactive without replacing component owners. */
export const ThemePresetContext = createContext<Accessor<ThemePreset>>(
  () => 'default',
)
export function useThemePreset() {
  return useContext(ThemePresetContext)
}
